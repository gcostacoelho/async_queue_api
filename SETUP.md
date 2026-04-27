# Setup Guide - Configuração de Dependências

Este guia explica como configurar PostgreSQL e RabbitMQ para a aplicação rodar localmente.

## Pré-requisitos

- Linux (Ubuntu/Debian), macOS ou WSL no Windows
- `curl` ou similar para download
- Privilégios sudo (pode ser necessário)

## Opção 1: PostgreSQL

### No Ubuntu/Debian

```bash
# Atualizar repositórios
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql

# Verificar status
sudo systemctl status postgresql

# Acessar psql como superuser
sudo -u postgres psql

# Dentro do psql, criar banco de dados
CREATE DATABASE async_queue_api;
CREATE USER postgres WITH PASSWORD 'password';
ALTER ROLE postgres SET client_encoding TO 'utf8';
ALTER ROLE postgres SET default_transaction_isolation TO 'read committed';
ALTER ROLE postgres SET default_transaction_deferrable TO on;
ALTER ROLE postgres SET default_transaction_read_committed TO off;
GRANT ALL PRIVILEGES ON DATABASE async_queue_api TO postgres;
\q
```

### No macOS (com Homebrew)

```bash
# Instalar PostgreSQL
brew install postgresql@15

# Iniciar serviço
brew services start postgresql@15

# Criar banco de dados
createdb async_queue_api

# Verificar instalação
psql -V
```

## Opção 2: RabbitMQ

### No Ubuntu/Debian

```bash
# Adicionar repositório RabbitMQ
curl -1sLf 'https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh' | sudo bash

# Instalar RabbitMQ
sudo apt install rabbitmq-server

# Iniciar serviço
sudo systemctl start rabbitmq-server

# Verificar status
sudo systemctl status rabbitmq-server

# Habilitar plugin de management
sudo rabbitmq-plugins enable rabbitmq_management

# Acessar dashboard em http://localhost:15672
# Usuário: guest | Senha: guest
```

### No macOS (com Homebrew)

```bash
# Instalar RabbitMQ
brew install rabbitmq

# Iniciar serviço
brew services start rabbitmq

# Habilitar plugin de management
sudo rabbitmq-plugins enable rabbitmq_management

# Acessar dashboard em http://localhost:15672
```

## Opção 3: Docker (RECOMENDADO para aprendizado de DevOps)

Se quiser praticar Docker, você pode usar:

### PostgreSQL com Docker

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_DB=async_queue_api \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

### RabbitMQ com Docker

```bash
docker run -d \
  --name rabbitmq \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.12-management
```

### Verificar containers

```bash
docker ps
```

### Parar containers

```bash
docker stop postgres rabbitmq
```

## Verificar Conexões

### PostgreSQL

```bash
# Testar conexão
psql -h localhost -U postgres -d async_queue_api -c "SELECT 1"

# Deve retornar:
# ?column?
# ----------
#        1
```

### RabbitMQ

```bash
# Acessar dashboard
# http://localhost:15672
# Usuário: guest
# Senha: guest
```

## Variáveis de Ambiente

Após configurar os serviços, criar arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Verificar se as variáveis estão corretas:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=async_queue_api
DB_USER=postgres
DB_PASSWORD=password

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE=tasks

API_PORT=3000
NODE_ENV=development
```

## Próximas Etapas

1. Instale as dependências Node.js:

```bash
npm install
```

2. Inicie a API:

```bash
npm start
```

3. Em outro terminal, inicie o Worker:

```bash
npm run worker
```

4. Teste a API:

```bash
bash test-api.sh
# ou manualmente:
curl http://localhost:3000/api/health
```

## Troubleshooting

### PostgreSQL

- Erro: "could not connect to server"
  - Verificar se o serviço está rodando: `sudo systemctl status postgresql`
  - Verificar porta: `sudo lsof -i :5432`

### RabbitMQ

- Erro: "connection refused"
  - Verificar se o serviço está rodando: `sudo systemctl status rabbitmq-server`
  - Verificar porta: `sudo lsof -i :5672`

### Portas em uso

```bash
# Liberar porta
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :5672  # RabbitMQ
```

## Próximo: Infraestrutura com Docker/K8s

Depois de testar localmente, você está pronto para:

- Criar `Dockerfile` para API e Worker
- Usar `docker-compose` para orquestração local
- Fazer deploy em Kubernetes
- Configurar CI/CD pipeline

Boa sorte com seus estudos de DevOps! 🚀
