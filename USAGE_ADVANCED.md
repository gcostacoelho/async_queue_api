# Guia de Uso Avançado

## Exemplos Práticos

### 1. Criar Task com cURL

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Enviar Email",
    "description": "Enviar email de confirmação para usuario@example.com"
  }'
```

### 2. Listar Todas as Tasks

```bash
curl http://localhost:3000/api/tasks | jq .
```

### 3. Monitorar Worker em Tempo Real

```bash
# Terminal 1: Inicie o worker com verbosidade
npm run worker

# Terminal 2: Crie algumas tasks
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"Task $i\"}"
  sleep 0.5
done
```

### 4. Testar com Python

```python
import requests
import json
import time

API_URL = "http://localhost:3000/api"

# Criar task
response = requests.post(f"{API_URL}/tasks", json={
    "title": "Processar Relatório",
    "description": "Gerar relatório mensal"
})

task = response.json()['data']
print(f"Task criada: {task['id']}")

# Aguardar processamento
time.sleep(3)

# Verificar status
response = requests.get(f"{API_URL}/tasks/{task['id']}")
updated_task = response.json()['data']
print(f"Status final: {updated_task['status']}")
```

### 5. Testar com Node.js

```javascript
const http = require("http");

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        resolve(JSON.parse(responseData));
      });
    });

    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Uso
(async () => {
  // Criar task
  const response = await makeRequest("POST", "/tasks", {
    title: "Minha Task",
    description: "Descrição",
  });
  console.log("Task criada:", response);

  // Aguardar
  await new Promise((r) => setTimeout(r, 3000));

  // Listar tasks
  const tasks = await makeRequest("GET", "/tasks");
  console.log("Todas as tasks:", tasks);
})();
```

## Monitoramento Local

### 1. Monitorar PostgreSQL

```bash
# Conectar ao PostgreSQL
psql -h localhost -U postgres -d async_queue_api

# Dentro do psql
\dt                                    # Listar tabelas
SELECT COUNT(*) FROM tasks;             # Contar tasks
SELECT * FROM tasks ORDER BY id DESC;  # Listar tasks
SELECT * FROM tasks WHERE status = 'pending'; # Tasks pendentes
```

### 2. Monitorar RabbitMQ

```bash
# Acessar dashboard
# http://localhost:15672
# Usuário: guest
# Senha: guest

# Ou via CLI
rabbitmqctl list_queues name messages consumers
```

### 3. Logs da Aplicação

```bash
# Capturar logs em arquivo
npm start > api.log 2>&1 &
npm run worker > worker.log 2>&1 &

# Monitorar em tempo real
tail -f api.log
tail -f worker.log

# Buscar erros
grep ERROR api.log
```

## Performance Testing

### 1. Apache Bench

```bash
# Teste simples de throughput
ab -n 1000 -c 10 http://localhost:3000/api/health

# Com POST
ab -n 100 -c 5 -p data.json -T application/json http://localhost:3000/api/tasks
```

### 2. Load Testing com Apache JMeter

```bash
# Instalar (macOS)
brew install jmeter

# GUI
jmeter

# Configurar:
# - Thread Group: 50 threads
# - Ramp-up: 10 seconds
# - HTTP Request: POST /api/tasks
```

### 3. Script de Stress Test

```bash
#!/bin/bash

echo "Starting stress test..."
echo "Creating 1000 tasks..."

for i in {1..1000}; do
  curl -s -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"Task $i\"}" > /dev/null &

  if [ $((i % 100)) -eq 0 ]; then
    echo "Progress: $i/1000"
  fi
done

wait
echo "Stress test complete!"
```

## Troubleshooting

### API não responde

```bash
# Verificar se está rodando
ps aux | grep "node src/api/server.js"

# Verificar porta
lsof -i :3000

# Verificar logs
npm start 2>&1 | head -20
```

### Worker não processa

```bash
# Verificar se está rodando
ps aux | grep "node src/worker"

# Verificar fila do RabbitMQ
rabbitmqctl list_queues

# Verificar conexão
curl http://localhost:5672  # Deve falhar com "connection refused" (esperado)
```

### Erro de conexão com PostgreSQL

```bash
# Verificar se está rodando
pg_isready -h localhost -p 5432

# Testar conexão
psql -h localhost -U postgres -d async_queue_api -c "SELECT 1"

# Verificar porta
lsof -i :5432
```

### Erro de conexão com RabbitMQ

```bash
# Verificar se está rodando
sudo systemctl status rabbitmq-server

# Verificar porta
lsof -i :5672

# Testar conexão
telnet localhost 5672
```

## Customização

### 1. Alterar Tempo de Processamento do Worker

Em `src/worker/index.js`:

```javascript
// Mudar de 2000ms para 5000ms
setTimeout(() => {
  console.log(`Task processed: ${JSON.stringify(message)}`);
  resolve();
}, 5000); // ← Aqui
```

### 2. Alterar Porta da API

Em `.env`:

```
API_PORT=8080  # Ao invés de 3000
```

### 3. Adicionar Novo Campo em Task

Em `src/db.js`:

```sql
ALTER TABLE tasks ADD COLUMN priority INT DEFAULT 0;
```

Em `src/models/Task.js`:

```javascript
static async create(title, description, priority = 0) {
  const result = await db.query(
    'INSERT INTO tasks (title, description, priority) VALUES ($1, $2, $3) RETURNING *',
    [title, description, priority]
  );
  return result.rows[0];
}
```

### 4. Adicionar Novo Endpoint

Em `src/api/routes.js`:

```javascript
// PATCH /tasks/:id - Atualizar tarefa
router.patch("/tasks/:id", async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await db.query(
      "UPDATE tasks SET title = $1, description = $2 WHERE id = $3 RETURNING *",
      [title, description, req.params.id],
    );

    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## Deployando em Docker (Preview)

Esse será seu próximo passo! Aqui está um exemplo básico:

```dockerfile
# Dockerfile.api
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
```

```dockerfile
# Dockerfile.worker
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

CMD ["npm", "run", "worker"]
```

## Próximas Etapas

1. ✅ Rodar localmente (você está aqui)
2. ⬜ Criar Dockerfiles
3. ⬜ Usar docker-compose para orquestração
4. ⬜ Deploy em Kubernetes
5. ⬜ Configurar CI/CD
6. ⬜ Adicionar monitoramento

## Recursos Úteis

- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RabbitMQ Docs](https://www.rabbitmq.com/documentation.html)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Docker Docs](https://docs.docker.com/)
- [Kubernetes Docs](https://kubernetes.io/docs/)

Boa sorte com seus estudos! 🚀
