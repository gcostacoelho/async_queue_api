# Arquitetura

## Visão Geral

Arquitetura produtor-consumidor para processamento assíncrono de tarefas, implementando padrões de sistemas distribuídos.

## Padrões

### Producer-Consumer

```
API (Produtor) → RabbitMQ Queue ← Worker (Consumidor)
```

A API publica mensagens de tarefa na fila RabbitMQ. O Worker consome e processa de forma independente.

### Processamento Assíncrono

Requisições HTTP retornam imediatamente sem aguardar conclusão do processamento.

```
POST /tasks
├─ API: Valida
├─ API: Persiste em BD
├─ API: Publica em fila
└─ API: Retorna 201 (< 100ms)

[Background]
Worker: Consome → Processa → Atualiza BD
```

### Graceful Shutdown

Ambos os processos tratam sinais de encerramento corretamente, fechando conexões e finalizando tarefas em progresso.

## Componentes

### API Server (`src/api/`)

Servidor Express com endpoints:

- `GET /api/health` - Health check
- `GET /api/tasks` - Listar tarefas
- `GET /api/tasks/:id` - Obter tarefa
- `POST /api/tasks` - Criar tarefa

Fluxo ao criar tarefa:

1. Validar dados
2. Inserir em PostgreSQL
3. Publicar em RabbitMQ
4. Retornar 201

### Worker (`src/worker/`)

Processo de consumo:

1. Conecta ao RabbitMQ
2. Aguarda mensagens
3. Processa cada tarefa
4. Atualiza status em PostgreSQL
5. Confirma consumo (ACK)

### Banco de Dados (`src/db.js`)

PostgreSQL com tabela:

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
)
```

### Fila (`src/queue.js`)

RabbitMQ com fila `tasks`:

- Durable: persiste entre reinicializações
- Persistent: mensagens não se perdem
- ACK manual: confirma processamento
- NACK + requeue: reprocessa em erro

### Model (`src/models/Task.js`)

Abstração de dados com métodos CRUD:

- `create()` - Criar tarefa
- `findById()` - Consultar por ID
- `findAll()` - Listar todas
- `updateStatus()` - Alterar status
- `markAsProcessed()` - Marcar como processada

## Fluxo Completo

```
Cliente: POST /api/tasks
         {title: "Task", description: "Desc"}
             │
             ▼
API Server:
  ├─ Valida input
  ├─ INSERT PostgreSQL
  ├─ PUBLISH RabbitMQ
  └─ Return 201 (< 100ms)

[Paralelo]
Worker:
  ├─ Consume RabbitMQ
  ├─ Process (2s)
  ├─ UPDATE PostgreSQL (status=processed)
  └─ ACK (remove da fila)

Timeline:
t=0ms:    POST /tasks → 201 retornado
t=10ms:   Worker recebe mensagem
t=2010ms: Processamento concluído
t=2020ms: GET /tasks/:id → status=processed
```

## Escalabilidade

Múltiplos workers processam paralelamente:

```
RabbitMQ Queue
    │
    ├─→ Worker 1
    ├─→ Worker 2
    └─→ Worker N

Fila distribui mensagens entre workers.
```

## Tratamento de Erros

- **Worker falha**: NACK + requeue automático
- **Conexão cai**: Reconnect automático
- **BD indisponível**: Erro no worker, requeue
- **Graceful shutdown**: Sinal SIGTERM finaliza operações pendentes

## Persistência

| Componente | Persistência                  |
| ---------- | ----------------------------- |
| Dados      | PostgreSQL (ACID)             |
| Fila       | RabbitMQ durable + persistent |
| Estado     | Sincronizado em ambos         |

## Containerização

| Dockerfile        | Base           | CMD            |
| ----------------- | -------------- | -------------- |
| Dockerfile.api    | node:22-alpine | npm start      |
| Dockerfile.worker | node:22-alpine | npm run worker |

Docker Compose orquestra com health checks e networking.

CI/CD via GitHub Actions: build e push automático para Docker Hub.

## Isolamento

Cada serviço é independente. Falha em um não derruba os outros:

- API fail: requisições falham, fila persiste
- Worker fail: mensagens aguardam retry
- BD fail: transações falham, requeue automático
- RabbitMQ fail: sem perda (mensagens duram)
