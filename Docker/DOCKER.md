# 🐳 Docker & Containerização

Guia completo sobre Docker, docker-compose e CI/CD para este projeto.

## Índice

1. [Dockerfiles](#dockerfiles)
2. [Docker Compose](#docker-compose)

---

## Dockerfiles

### Docker/Dockerfile.api

Arquivo para build da imagem da API:

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json .
RUN npm install --verbose

COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
```

**Linha por linha:**

| Linha                    | Explicação                                 |
| ------------------------ | ------------------------------------------ |
| `FROM node:22-alpine`    | Base image: Node 22 em Alpine Linux (leve) |
| `WORKDIR /app`           | Diretório de trabalho no container         |
| `COPY package*.json .`   | Copia package.json e package-lock.json     |
| `RUN npm install`        | Instala dependências                       |
| `COPY . .`               | Copia código-fonte                         |
| `EXPOSE 3000`            | Documenta que app ouve na 3000             |
| `CMD [ "npm", "start" ]` | Comando ao iniciar container               |

**Otimizações (Alpine):**

- Imagem base: 200 MB (Node 22 completo) → 170 MB (Alpine)
- Sem dependências desnecessárias
- Perfeito para produção

### Docker/Dockerfile.worker

Arquivo para build da imagem do Worker:

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json .
RUN npm install --verbose

COPY . .
CMD [ "npm", "run" ,"worker" ]
```

**Diferenças:**

- Sem `EXPOSE` (worker é background service)
- Comando: `npm run worker` em vez de `npm start`

### Docker/.dockerignore

Exclui arquivos do build para reduzir tamanho:

```
node_modules/      # Serão instalados no container
.env               # Usar variáveis do host
.md                # Documentação
.sh                # Scripts (desnecessários)
.git               # Versionamento
```

### Build Manual

```bash
# Build da API
docker build \
  -f Docker/Dockerfile.api \
  -t async-queue-api:latest \
  .

# Build do Worker
docker build \
  -f Docker/Dockerfile.worker \
  -t async-queue-worker:latest \
  .

# Listar imagens
docker images | grep async-queue

# Resultado esperado:
# async-queue-api       latest   2a3b4c5d6e7f   2 minutes ago   170MB
# async-queue-worker    latest   3b4c5d6e7f8a   2 minutes ago   170MB
```

### Run Manual (testes)

```bash
# Executar API isolada (requer BD externo)
docker run -d \
  --name api-container \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \  # Host para BD local
  -e DB_PORT=5432 \
  -e RABBITMQ_HOST=host.docker.internal \
  async-queue-api:latest

# Testar
curl http://localhost:3000/api/health

# Ver logs
docker logs -f api-container

# Parar
docker stop api-container
docker rm api-container
```

---

## Docker Compose

Orquestração de múltiplos containers, tendo um arquivo definindo:

- API container
- Worker container
- PostgreSQL container
- RabbitMQ container
- Networking
- Volumes
- Variáveis de ambiente

### docker-compose.yaml Explicado

```yaml
services:
  # ========== API SERVER ==========
  api:
    container_name: api
    restart: unless-stopped # Reinicia se falhar (menos ao parar manual)
    build:
      context: .
      dockerfile: ./Docker/Dockerfile.api
    image: async_queue-api # Nome da imagem
    ports:
      - 3000:3000 # HOST:CONTAINER
    environment:
      - DB_HOST=db # Hostname automático (docker networking)
      - DB_PORT=5432
      - DB_NAME=async_queue_db
      - DB_USER=postgres
      - DB_PASSWORD=password
      - RABBITMQ_HOST=rabbit
      - RABBITMQ_PORT=5672
      - RABBITMQ_USER=user
      - RABBITMQ_PASSWORD=pass
      - RABBITMQ_QUEUE=tasks
      - API_PORT=3000
    depends_on:
      db:
        condition: service_healthy # Aguarda PostgreSQL estar healthy
      rabbit:
        condition: service_healthy # Aguarda RabbitMQ estar healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s # Checa a cada 30s
      timeout: 10s # Timeout de 10s
      retries: 3 # 3 falhas = container considerado unhealthy
      start_period: 40s # Aguarda 40s antes de começar health checks
    networks:
      - app # Network compartilhada com outros serviços

  # ========== WORKER ==========
  worker:
    container_name: worker
    restart: unless-stopped
    build:
      context: .
      dockerfile: ./Docker/Dockerfile.worker
    image: async_queue-worker
    environment:
      # Mesmas variáveis da API
      - DB_HOST=db
      # ...
    depends_on:
      db:
        condition: service_healthy
      rabbit:
        condition: service_healthy
    networks:
      - app

  # ========== DATABASE ==========
  db:
    container_name: postgres_container
    image: postgres:18.3-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: async_queue_db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - app
    # ports:
    #   - 5432:5432  # Comentado = acessível apenas internamente

  # ========== RABBITMQ ==========
  rabbit:
    container_name: rabbitmq_container
    image: rabbitmq:3.12-management-alpine
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: user
      RABBITMQ_DEFAULT_PASS: pass
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s
    networks:
      - app
    # ports:
    #   - 5672:5672      # AMQP protocol (comentado = interno)
    #   - 15672:15672    # Management UI

# ========== NETWORK ==========
networks:
  app:
    driver: bridge # Bridge network (padrão, containers se veem)


# ========== VOLUMES (opcional) ==========
# volumes:
#   db_data:  # Para persistir dados PostgreSQL entre restarts
#   rabbit_data:
```

### Comandos Docker Compose

```bash
# Iniciar (build + start)
docker-compose up -d

# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f        # Todos
docker-compose logs -f api    # Só API
docker-compose logs -f worker # Só Worker
docker-compose logs api --tail=50  # Últimas 50 linhas

# Parar (containers continuam existindo)
docker-compose stop

# Parar e remover (limpa tudo)
docker-compose down

# Limpar tudo (incluindo volumes - ⚠️ deleta dados)
docker-compose down -v

# Rebuild após mudanças no código
docker-compose up -d --build

# Executar comando em container rodando
docker-compose exec api npm list
docker-compose exec db psql -U postgres -d async_queue_db -c "SELECT COUNT(*) FROM tasks;"

# Ver resource usage
docker stats
```

### Health Checks Explicados

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  # Executa: curl -f http://localhost:3000/api/health
  # -f = fail on HTTP errors (exit code 22-27)

  interval: 30s
  # A cada 30 segundos, faz o teste

  timeout: 10s
  # Timeout: se não responder em 10s, conta como falha

  retries: 3
  # 3 falhas consecutivas = container UNHEALTHY

  start_period: 40s
  # Aguarda 40s antes de começar os testes (app pode levar para iniciar)
```