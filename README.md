# Async Queue API

Uma API simples em Node.js que demonstra o padrão de arquitetura com requisições síncronas, persistência em banco de dados e processamento assíncrono via fila de mensagens.

## Arquitetura

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐        ┌──────────────┐
│  API Server │───────▶│  PostgreSQL  │
└──────┬──────┘        └──────────────┘
       │
       │ Publish Message
       ▼
┌──────────────────┐
│  RabbitMQ Queue  │
└────────┬─────────┘
         │
         │ Consume Message
         ▼
┌──────────────────┐
│  Worker Process  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Update Database │
└──────────────────┘
```

## Componentes

- **API Server**: Recebe requisições HTTP e grava as tarefas no banco
- **Worker**: Consome mensagens da fila e processa as tarefas
- **PostgreSQL**: Armazena as tarefas
- **RabbitMQ**: Fila de mensagens para processamento assíncrono

## Instalação

1. Clone o repositório:

```bash
cd async_queue_api
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

## Configuração de Dependências

Antes de executar, certifique-se de que possui:

- **Node.js** (versão 14+)
- **PostgreSQL** (versão 12+)
- **RabbitMQ** (versão 3.8+)

## Variáveis de Ambiente

Configure o arquivo `.env`:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=async_queue_api
DB_USER=postgres
DB_PASSWORD=password

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE=tasks

# API
API_PORT=3000
NODE_ENV=development
```

## Executando a Aplicação

### Terminal 1 - API Server

```bash
npm start
```

A API estará disponível em `http://localhost:3000`

### Terminal 2 - Worker

```bash
npm run worker
```

## Endpoints da API

### Health Check

```bash
GET /api/health
```

### Listar todas as tarefas

```bash
GET /api/tasks
```

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Exemplo de Tarefa",
      "description": "Descrição da tarefa",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "processed_at": null
    }
  ]
}
```

### Obter uma tarefa específica

```bash
GET /api/tasks/:id
```

### Criar uma nova tarefa

```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "Minha Tarefa",
  "description": "Descrição da tarefa (opcional)"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Task created and queued for processing",
  "data": {
    "id": 1,
    "title": "Minha Tarefa",
    "description": "Descrição da tarefa",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "processed_at": null
  }
}
```

## Exemplo de Uso com cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Listar tarefas
curl http://localhost:3000/api/tasks

# Criar tarefa
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Processar Pagamento",
    "description": "Processar pagamento do cliente #123"
  }'

# Obter tarefa específica
curl http://localhost:3000/api/tasks/1
```

## Fluxo de Operação

1. **Cliente faz requisição POST** para criar uma tarefa
2. **API Server** valida os dados e cria a tarefa no banco de dados
3. **API Server** publica uma mensagem na fila RabbitMQ
4. **API** retorna imediatamente com status 201 (sem aguardar processamento)
5. **Worker** consome a mensagem da fila em tempo real
6. **Worker** processa a tarefa (simula 2 segundos de processamento)
7. **Worker** atualiza o status da tarefa para "processed" no banco

## Estrutura de Diretórios

```
async_queue_api/
├── src/
│   ├── api/
│   │   ├── server.js       # Servidor Express
│   │   └── routes.js       # Rotas da API
│   ├── worker/
│   │   └── index.js        # Processo worker
│   ├── models/
│   │   └── Task.js         # Modelo de tarefas
│   ├── db.js               # Conexão com PostgreSQL
│   └── queue.js            # Conexão com RabbitMQ
├── package.json
├── .env.example
└── README.md
```

## Status da Tarefa

- **pending**: Tarefa criada e aguardando processamento
- **processed**: Tarefa processada com sucesso

## Graceful Shutdown

Ambos os processos (API e Worker) tratam sinais de interrupção corretamente:

```bash
# Pressione Ctrl+C para encerrar
# Os processos vão:
# 1. Fechar conexões com banco e fila
# 2. Finalizar com segurança
```

## Próximos Passos para DevOps

Com essa arquitetura simples, você pode aprender:

- **Docker**: Criar imagens para API e Worker
- **Docker Compose**: Orquestrar PostgreSQL, RabbitMQ, API e Worker
- **Kubernetes**: Fazer deploy em clusters K8s
- **CI/CD**: Criar pipelines de build e deploy
- **Monitoramento**: Adicionar observabilidade com Prometheus e Grafana
- **Logging**: Centralizar logs com ELK Stack

## Notas

- Esta aplicação foi desenvolvida com foco em simplicidade e aprendizado
- O worker processa uma tarefa por vez
- As mensagens da fila são persistentes e serão reprocessadas em caso de falha
- O banco de dados é criado automaticamente na primeira execução

## Licença

MIT
