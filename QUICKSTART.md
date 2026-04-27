# Quick Start

Guia rápido para colocar a aplicação rodando em minutos!

## 1️⃣ Pré-requisitos (5 minutos)

### Opção A: Instalação Local (mais didático)

**PostgreSQL:**

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS
brew install postgresql@15
brew services start postgresql@15
```

**RabbitMQ:**

```bash
# Ubuntu/Debian
sudo apt install rabbitmq-server
sudo systemctl start rabbitmq-server

# macOS
brew install rabbitmq
brew services start rabbitmq
```

### Opção B: Docker (mais rápido)

```bash
# Terminal 1 - PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=async_queue_api \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Terminal 2 - RabbitMQ
docker run -d --name rabbitmq \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.12-management
```

## 2️⃣ Preparar Projeto (2 minutos)

```bash
# Ir para o diretório
cd async_queue_api

# Instalar dependências Node.js
npm install

# Copiar variáveis de ambiente
cp .env.example .env
```

## 3️⃣ Rodar Aplicação (1 minuto)

### Terminal 1 - API Server

```bash
npm start

# Você deve ver:
# Database initialized successfully
# Queue connection established successfully
# API server running on port 3000
```

### Terminal 2 - Worker

```bash
npm run worker

# Você deve ver:
# Database initialized successfully
# Queue connection established successfully
# Worker started, listening for messages...
```

## 4️⃣ Testar API (1 minuto)

### Terminal 3 - Testes

```bash
# Health check
curl http://localhost:3000/api/health

# Criar uma tarefa
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Minha primeira task", "description": "Teste"}'

# Listar tarefas
curl http://localhost:3000/api/tasks | jq .

# Ou execute o script de teste
bash test-api.sh
```

## 📋 O que Você Verá

### Na API:

```
POST /api/tasks 201 Created
{
  "success": true,
  "message": "Task created and queued for processing",
  "data": {
    "id": 1,
    "title": "Minha primeira task",
    "description": "Teste",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z",
    ...
  }
}
```

### No Worker:

```
Processing task: Minha primeira task (ID: 1)
Task processed: {"taskId":1,"title":"Minha primeira task",...}
Task 1 processed successfully
```

## 🏗️ Arquitetura em Ação

```
1. Você faz POST /api/tasks
        ↓
2. API cria no banco e publica na fila
        ↓
3. Retorna imediatamente (< 100ms)
        ↓
4. Worker recebe da fila
        ↓
5. Worker processa (simula 2 segundos)
        ↓
6. Worker atualiza status para "processed"
        ↓
7. GET /api/tasks/1 mostra status = "processed"
```

## 📚 Documentação Completa

- [README.md](./README.md) - Documentação principal
- [SETUP.md](./SETUP.md) - Guia detalhado de setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Explicação da arquitetura
- [USAGE_ADVANCED.md](./USAGE_ADVANCED.md) - Uso avançado e troubleshooting

## 🔧 Troubleshooting Rápido

| Problema                 | Solução                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| API não inicia           | Verificar se PostgreSQL está rodando: `pg_isready`                          |
| Worker não processa      | Verificar se RabbitMQ está rodando: `sudo systemctl status rabbitmq-server` |
| Porta 3000 em uso        | `lsof -i :3000` e mudar porta em `.env`                                     |
| Erro de conexão no banco | Verificar `.env` tem valores corretos                                       |

## ✅ Próximos Passos

### Imediato (hoje):

1. ✅ Rodar localmente
2. ✅ Testar endpoints
3. ✅ Monitorar logs

### Curto prazo (próxima semana):

1. ⬜ Criar Dockerfile para API e Worker
2. ⬜ Testar localmente em containers
3. ⬜ Criar docker-compose.yml

### Médio prazo (próximas semanas):

1. ⬜ Estudar Kubernetes
2. ⬜ Criar manifests K8s
3. ⬜ Deploy em cluster K8s

## 🎯 Comandos Úteis

```bash
# Ver processos Node rodando
ps aux | grep node

# Matar processo específico (ex: porta 3000)
lsof -i :3000
kill -9 <PID>

# Monitorar logs em tempo real
tail -f api.log
tail -f worker.log

# Testar performance
ab -n 100 -c 10 http://localhost:3000/api/health
```

## 🚀 Você está pronto!

Agora sua aplicação está rodando com:

- ✅ API em Node.js
- ✅ Banco de dados PostgreSQL
- ✅ Fila de mensagens RabbitMQ
- ✅ Worker assíncrono
- ✅ Graceful shutdown

Próximo: Docker e Kubernetes! 🐳☸️

---

**Dúvidas?** Consulte os documentos de guia: SETUP.md, ARCHITECTURE.md ou USAGE_ADVANCED.md
