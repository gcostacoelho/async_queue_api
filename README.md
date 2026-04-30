# Async Queue API

A Async Queue API é uma aplicação Node.js que implementa o padrão produtor-consumidor para processamento assíncrono de tarefas. A API recebe requisições HTTP, persiste dados em PostgreSQL e publica mensagens em RabbitMQ para processamento em background.

## Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ HTTP
       ▼
┌──────────────────┐       ┌─────────────┐
│   API Server     │──────▶│ PostgreSQL  │
│   (port 3000)    │       │ (Storage)   │
└────────┬─────────┘       └─────────────┘
         │
         │ Publica
         ▼
┌──────────────────┐
│   RabbitMQ Queue │
│  (tasks)         │
└────────┬─────────┘
         │
         │ Consome
         ▼
┌──────────────────┐
│   Worker        │
│  (Processamento) │
└────────┬─────────┘
         │
         │ Atualiza
         ▼
┌─────────────────┐
│  PostgreSQL     │
│ (Status)        │
└─────────────────┘
```

## Componentes

| Componente | Função |
|-----------|--------|
| **API Server** | Servidor Express que fornece endpoints HTTP |
| **Worker** | Processo de consumo e processamento de tarefas |
| **PostgreSQL** | Persistência de tarefas |
| **RabbitMQ** | Fila de mensagens para processamento assíncrono |

## Execução

### Com Docker Compose

```bash
docker-compose up
```

### Localmente

Pré-requisitos: Node.js 22+, PostgreSQL 15+, RabbitMQ 3.12+

```bash
npm install
cp .env.example .env
```

Terminal 1:
```bash
npm start
```

Terminal 2:
```bash
npm run worker
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Listar Tarefas
```
GET /api/tasks
```

Resposta:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "Description",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "processed_at": null
    }
  ]
}
```

### Obter Tarefa
```
GET /api/tasks/:id
```

### Criar Tarefa
```
POST /api/tasks
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Optional"
}
```

## Estrutura

```
src/
├── api/
│   ├── server.js       # Servidor Express
│   └── routes.js       # Endpoints
├── worker/
│   └── index.js        # Processador
├── models/
│   └── Task.js         # Task model
├── db.js               # PostgreSQL connection
└── queue.js            # RabbitMQ connection

Docker/
├── Dockerfile.api
├── Dockerfile.worker
└── .dockerignore

.github/workflows/
└── ci.yaml             # GitHub Actions
```

## Fluxo de Processamento

1. Cliente POST /api/tasks
2. API valida e insere em PostgreSQL
3. API publica em RabbitMQ
4. API retorna 201 (não aguarda processamento)
5. Worker consome mensagem
6. Worker processa tarefa
7. Worker atualiza status para "processed"

## Variáveis de Ambiente

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=async_queue_db
DB_USER=postgres
DB_PASSWORD=password

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=user
RABBITMQ_PASSWORD=pass
RABBITMQ_QUEUE=tasks

API_PORT=3000
NODE_ENV=development
```

## Status de Tarefa

| Status | Significado |
|--------|------------|
| `pending` | Criada, aguardando processamento |
| `processed` | Processada com sucesso |

## Tecnologias

- Node.js 22
- Express
- PostgreSQL 15
- RabbitMQ 3.12
- Docker
- Docker Compose