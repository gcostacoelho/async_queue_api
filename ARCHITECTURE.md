# Arquitetura da Aplicação

## Visão Geral

Esta é uma arquitetura simples baseada em padrões modernos de aplicações distribuídas, projetada especificamente para fins de aprendizado em DevOps.

## Padrões Utilizados

### 1. Producer-Consumer Pattern

A API publica mensagens na fila (Producer) e o Worker consome e processa (Consumer).

```
API → Publish → RabbitMQ Queue ← Consume ← Worker
      ↓
    Database
      ↑
    Worker atualiza status
```

### 2. Asynchronous Processing

As requisições HTTP retornam imediatamente, enquanto o processamento acontece em background.

```
Client
  │
  ├─→ [Fast] GET /tasks       → API retorna imediatamente
  │
  ├─→ [Fast] POST /tasks      → API cria task, publica na fila, retorna 201
  │                              (sem aguardar processamento)
  │
  └─→ [Background] Worker consome e processa a task
      └─→ Atualiza status no banco para "processed"
```

### 3. Graceful Shutdown

Ambos os processos tratam sinais de interrupção corretamente.

```
SIGTERM/SIGINT
    ↓
Close connections
    ↓
Persist state
    ↓
Exit cleanly
```

## Componentes da Arquitetura

### API Server (`src/api/server.js`)

- Responsável por receber requisições HTTP
- Validar dados de entrada
- Persistir em banco de dados
- Publicar mensagens na fila
- Retornar respostas imediatas

**Fluxo:**

1. Request chega em POST /api/tasks
2. Validar dados (title obrigatório)
3. Inserir no PostgreSQL
4. Publicar mensagem no RabbitMQ
5. Retornar 201 Created com dados da task

### Worker (`src/worker/index.js`)

- Consome mensagens da fila
- Processa as tarefas
- Atualiza status no banco
- Trata erros e requeue

**Fluxo:**

1. Aguardar mensagem na fila RabbitMQ
2. Receber mensagem com dados da task
3. Processar (simula 2 segundos)
4. Atualizar banco com status "processed"
5. Fazer ACK da mensagem
6. Voltar ao passo 1

### Banco de Dados (`src/db.js`)

- Inicializa tabela `tasks` automaticamente
- Gerencia pool de conexões
- Expõe interface simples para queries

**Tabela tasks:**

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

### Fila de Mensagens (`src/queue.js`)

- Conecta ao RabbitMQ
- Publica mensagens com persistência
- Consome mensagens com ACK/NACK
- Trata reconexão automática

**Características:**

- Fila durable (persiste entre reinicializações)
- Mensagens persistent (não se perdem)
- ACK manual (confirma processamento)
- NACK com requeue (reprocessa em caso de erro)

### Modelo de Dados (`src/models/Task.js`)

- Abstração para operações no banco
- Métodos CRUD
- Encapsulamento de lógica de dados

**Métodos:**

- `create(title, description)` - Criar nova task
- `findById(id)` - Buscar task específica
- `findAll()` - Listar todas tasks
- `updateStatus(id, status)` - Atualizar status
- `markAsProcessed(id)` - Marcar como processada

## Fluxo de Dados Completo

### Cenário: Criar e Processar uma Tarefa

```
1. CLIENT
   └─→ POST /api/tasks
       {
         "title": "Processar Pagamento",
         "description": "Cliente #123"
       }

2. API SERVER (src/api/routes.js)
   ├─→ Validar input (title required)
   ├─→ Task.create() → INSERT em PostgreSQL
   │   └─→ Database retorna task com ID
   ├─→ queue.publishMessage(message)
   │   └─→ RabbitMQ recebe e armazena
   └─→ Return 201 + dados da task
       └─→ CLIENT recebe resposta em <100ms

3. WORKER (src/worker/index.js) [simultâneo]
   ├─→ queue.consumeMessages() aguardando
   ├─→ Recebe mensagem do RabbitMQ
   ├─→ processTask() executa por 2 segundos
   ├─→ Task.markAsProcessed()
   │   └─→ UPDATE status='processed' em PostgreSQL
   ├─→ channel.ack() confirma consumo
   └─→ Volta para aguardar próxima mensagem

4. RESULTADO
   Task criada: status = 'pending' → 'processed'
   Processamento: assíncrono e não bloqueia API
```

## Benefícios dessa Arquitetura

### 1. Separação de Responsabilidades

- API: recebe e persistem dados
- Worker: processa dados
- Fila: desacopla producer e consumer

### 2. Escalabilidade

- Múltiplos workers podem processar simultaneamente
- API não fica sobrecarregada
- Banco não sofre com picos de processamento

### 3. Resiliência

- Fila persiste mensagens (não se perdem)
- Worker restart automático continua processando
- Graceful shutdown evita perda de dados

### 4. Observabilidade

Você pode facilmente adicionar:

- Logs estruturados (JSON)
- Métricas (Prometheus)
- Tracing distribuído (Jaeger)
- Alertas (PagerDuty)

## Prática para DevOps

Esta arquitetura é perfeita para aprender:

### Docker

- Criar Dockerfile para API e Worker
- Multi-stage builds
- Otimização de imagens

### Docker Compose

- Orquestrar PostgreSQL, RabbitMQ, API, Worker
- Variáveis de ambiente
- Networking entre containers
- Volumes para persistência

### Kubernetes

- Deployments para API e Worker
- Services para exposição
- ConfigMaps para variáveis de ambiente
- Secrets para credenciais
- StatefulSets para PostgreSQL/RabbitMQ
- Health checks (liveness, readiness)

### CI/CD

- Build de imagens (GitHub Actions, GitLab CI)
- Push para registry (Docker Hub, ECR)
- Deploy automático em K8s
- Rollback em caso de erro

### Monitoramento

- Prometheus para métricas
- Grafana para dashboards
- ELK Stack para logs
- Alertas baseados em thresholds

## Performance Esperada

### Latência da API

- POST /tasks: ~50-100ms (sem I/O network)
- GET /tasks: ~10-50ms

### Throughput

- API: ~100-500 requests/segundo (sem otimizações)
- Worker: ~0.5 tasks/segundo (com processamento de 2s)

### Escalabilidade

- Adicionar workers: processamento cresce linearmente
- Adicionar replicas da API: throughput cresce
- PostgreSQL: pode ser problema com muitos workers

## Limitações Conhecidas

1. **Worker único**: Processa um task por vez (serial)
2. **Sem retry automático**: Requeue manual apenas
3. **Sem circuit breaker**: Sem proteção contra falhas em cascata
4. **Logs simples**: Apenas console.log
5. **Sem autenticação**: Endpoints públicos

## Próximos Passos

1. **Imediato**: Rodar localmente e testar
2. **Curto prazo**: Containerizar com Docker
3. **Médio prazo**: Orquestração com Docker Compose
4. **Longo prazo**: Deploy em Kubernetes

## Estrutura de Diretórios Explicada

```
async_queue_api/
├── src/
│   ├── api/
│   │   ├── server.js       # Ponto de entrada (inicializa servidor)
│   │   └── routes.js       # Definição de rotas (endpoints)
│   ├── worker/
│   │   └── index.js        # Worker que consome fila
│   ├── models/
│   │   └── Task.js         # Abstração de dados (ORM simples)
│   ├── db.js               # Inicialização PostgreSQL
│   └── queue.js            # Inicialização RabbitMQ
├── package.json            # Dependências Node.js
├── .env.example            # Template de variáveis
├── README.md               # Documentação principal
├── SETUP.md                # Guia de setup
├── ARCHITECTURE.md         # Este arquivo
└── test-api.sh             # Script de testes
```

## Conclusão

Esta é uma arquitetura simples mas produção-ready que demonstra os conceitos fundamentais de:

- Arquitetura de microsserviços
- Processamento assíncrono
- Message queuing
- Persistência de dados
- Graceful shutdown

Perfeita para estudar DevOps e containerização! 🚀
