# 📊 Diagrama Visual da Arquitetura

## Fluxo Completo

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│                  (curl, Python, JavaScript)                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP REQUEST
                         ▼
    ┌────────────────────────────────────────────────────────┐
    │          API SERVER (src/api/server.js)                │
    │                   PORT 3000                            │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │ GET /health                                      │ │
    │  │ GET /tasks                                       │ │
    │  │ GET /tasks/:id                                   │ │
    │  │ POST /tasks → CREATE + PUBLISH                   │ │
    │  └──────────────────────────────────────────────────┘ │
    └────┬────────────────────────────────────────────┬──────┘
         │                                            │
    SYNC RESPONSE                               ASYNC PUBLISH
    (< 100ms)                                        │
         │                                            ▼
    201 Created                        ┌──────────────────────────┐
    {                                  │  RABBITMQ (QUEUE)        │
      "id": 1,                         │  rabbitmq:5672           │
      "title": "...",                  │                          │
      "status": "pending"              │ ┌────────────────────┐  │
    }                                  │ │ tasks queue        │  │
         │                             │ │ (durable, persistent)  │
         │                             │ │ {taskId: 1, ...}  │  │
         │                             │ └────────────────────┘  │
         │                             └──────┬───────────────────┘
         │                                    │
         │                                    │ CONSUME
         │                                    ▼
         │                         ┌────────────────────────────┐
         │                         │  WORKER PROCESS            │
         │                         │  (src/worker/index.js)     │
         │                         │                            │
         │                         │ 1. Recebe mensagem         │
         │                         │ 2. Processa (2 seg)        │
         │                         │ 3. Update status           │
         │                         │ 4. ACK fila                │
         │                         └────────┬───────────────────┘
         │                                  │
         │                    UPDATE STATUS │
         │                                  ▼
         │                    ┌──────────────────────────────┐
         └───────────────────→│  POSTGRESQL (DATABASE)       │
                              │  localhost:5432              │
                              │                              │
                              │ ┌──────────────────────────┐ │
                              │ │ tasks                    │ │
                              │ │ ┌────────────────────┐   │ │
                              │ │ │ id: 1              │   │ │
                              │ │ │ title: ...         │   │ │
                              │ │ │ status: processed  │   │ │
                              │ │ │ processed_at: 2024 │   │ │
                              │ │ └────────────────────┘   │ │
                              │ └──────────────────────────┘ │
                              └──────────────────────────────┘
```

## Timeline de Execução

```
t=0ms    │ Client faz POST /tasks
         ├─ API recebe requisição
         ├─ Cria registro no PostgreSQL
         ├─ Publica mensagem em RabbitMQ
         └─ Retorna 201 Created

         │ [MEANWHILE] Worker ouve a fila

t=10ms   │ Worker recebe mensagem
         ├─ Começa processamento
         ├─ Status: pendente → processando

t=2010ms │ Worker termina processamento
         ├─ Atualiza status → processed
         ├─ Faz ACK na fila

t=2020ms │ Client faz GET /tasks/:id
         └─ Retorna status = "processed"
```

## Componentes Técnicos

```
┌─────────────────────────────────────────────────────────┐
│              APLICAÇÃO NODE.JS                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ EXPRESS SERVER (API)                             │  │
│  │ ├─ HTTP Listener (port 3000)                     │  │
│  │ ├─ Route Handlers                                │  │
│  │ └─ Middleware (JSON parser)                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ DATABASE LAYER                                   │  │
│  │ ├─ pg (PostgreSQL driver)                        │  │
│  │ ├─ Connection Pool                               │  │
│  │ └─ Query Executor                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ MESSAGE QUEUE LAYER                             │  │
│  │ ├─ amqplib (RabbitMQ client)                     │  │
│  │ ├─ Publisher                                     │  │
│  │ └─ Consumer                                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ WORKER PROCESS                                   │  │
│  │ ├─ Queue Listener                                │  │
│  │ ├─ Task Processor                                │  │
│  │ └─ Graceful Shutdown Handler                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ DATA MODELS                                      │  │
│  │ ├─ Task (CRUD operations)                        │  │
│  │ └─ Database Schema                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        │                      │                    │
        │                      │                    │
        ▼                      ▼                    ▼
   PostgreSQL              RabbitMQ          Environment
   (Persistence)          (Messaging)       (Configuration)
```

## Estado da Task Através do Fluxo

```
┌─────────────┐
│  Criação    │
├─────────────┤
│             │
│ POST /tasks │
│    ▼        │
│  INSERT DB  │
│    ▼        │
│ PUBLISH     │
│   QUEUE     │
└──────┬──────┘
       │ Status: "pending"
       │ published_at: NULL
       │ processed_at: NULL
       │
       ▼
   ┌─────────────┐
   │ Aguardando  │
   ├─────────────┤
   │             │
   │ Mensagem na │
   │   fila      │
   │   RabbitMQ  │
   │             │
   └──────┬──────┘
          │ Aguardando worker
          │
          ▼
   ┌─────────────┐
   │ Processando │
   ├─────────────┤
   │             │
   │ Worker      │
   │ ├─ Recebe   │
   │ ├─ Processa │
   │ │ (2 seg)   │
   │ └─ Completa │
   │             │
   └──────┬──────┘
          │ Status: "processed"
          │ processed_at: NOW()
          │
          ▼
   ┌─────────────┐
   │  Concluído  │
   ├─────────────┤
   │             │
   │ Status:     │
   │ "processed" │
   │             │
   │ Pronto para │
   │ Leitura     │
   └─────────────┘
```

## Escalabilidade Horizontal

```
Arquitetura Escalável (Multiple Workers):

                    ┌─────────────────┐
                    │    RabbitMQ     │
                    │      Queue      │
                    └────────┬────────┘
                             │ Distribui mensagens
                  ┌──────────┼──────────┐
                  │          │          │
                  ▼          ▼          ▼
              ┌────────┐ ┌────────┐ ┌────────┐
              │Worker 1│ │Worker 2│ │Worker N│
              └────┬───┘ └────┬───┘ └────┬───┘
                   │         │         │
                   └────┬────┴────┬────┘
                        │        │
                        ▼        ▼
                   ┌──────────────────┐
                   │  PostgreSQL      │
                   │  (Shared DB)     │
                   └──────────────────┘

Cada worker processa em paralelo!
Fila distribui automaticamente entre workers.
```

## Recuperação de Falhas

```
Normal Flow:
MESSAGE → PROCESS → ACK → REMOVE FROM QUEUE

Error Flow:
MESSAGE → PROCESS ✗ → NACK → REQUEUE
              │
              └─ Volta para fila
              └─ Outro worker tenta
              └─ Repeat até sucesso

Graceful Shutdown:
SIGTERM → CLOSE CONNECTIONS → EXIT
   │
   ├─ PostgreSQL: fecha pool
   ├─ RabbitMQ: fecha channel
   └─ Mensagens: requeue se em processamento
```

## Dependências do Sistema

```
Aplicação Node.js
    │
    ├─── express (HTTP Server)
    │
    ├─── pg (PostgreSQL Client)
    │    └─ Requer: PostgreSQL 12+
    │
    ├─── amqplib (RabbitMQ Client)
    │    └─ Requer: RabbitMQ 3.8+
    │
    └─── dotenv (Configuration)
         └─ Requer: .env file
```

---

Próximo: Leia [QUICKSTART.md](./QUICKSTART.md) para começar! 🚀
