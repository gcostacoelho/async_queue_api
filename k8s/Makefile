.PHONY: all infra db rabbit app clean status

# Deploy completo em ordem: namespace → infra (db + rabbit) → app
all: namespaces infra app
	@echo "✅ Deploy completo concluído!"

# Criar namespace
namespaces:
	@echo "📦 Criando namespace..."
	@kubectl apply -f namespaces.yaml

# Deploy da infra (DB + RabbitMQ)
infra: namespaces db rabbit
	@echo "✅ Infraestrutura deployada"

# Deploy do PostgreSQL
db:
	@echo "🗄️ Deployando PostgreSQL..."
	@kubectl apply -f infra/db/volumes/
	@kubectl apply -f infra/db/configmap.yaml
	@kubectl apply -f infra/db/secret.yaml
	@kubectl apply -f infra/db/service.yaml
	@kubectl apply -f infra/db/deployment.yaml
	@echo "⏳ Aguardando PostgreSQL ficar pronto..."
	@kubectl wait --for=condition=ready pod -l app=postgres -n async-queue --timeout=300s || true

# Deploy do RabbitMQ
rabbit:
	@echo "🐰 Deployando RabbitMQ..."
	@kubectl apply -f infra/rabbitmq/volumes/pv.yaml
	@kubectl apply -f infra/rabbitmq/volumes/pvc.yaml
	@kubectl apply -f infra/rabbitmq/configmap.yaml
	@kubectl apply -f infra/rabbitmq/service.yaml
	@kubectl apply -f infra/rabbitmq/deployment.yaml
	@echo "⏳ Aguardando RabbitMQ ficar pronto..."
	@kubectl wait --for=condition=ready pod -l app=rabbitmq -n async-queue --timeout=300s || true

# Deploy da aplicação (API + Worker)
app:
	@echo "🚀 Deployando aplicação..."
	@kubectl apply -f app/configmap.yaml
	@kubectl apply -f app/secret.yaml
	@kubectl apply -f app/service.yaml
	@kubectl apply -f app/deployment.yaml
	@kubectl apply -f app/worker/deployment.yaml
	@echo "✅ Aplicação deployada"

# Ver status
status:
	@echo "📊 Status dos Deployments:"
	@kubectl get deployment -n async-queue -o wide

# Limpar aplicação
clean-app:
	@echo "🗑️ Removendo aplicação..."
	@kubectl delete -f app/worker/deployment.yaml --ignore-not-found=true
	@kubectl delete -f app/deployment.yaml --ignore-not-found=true
	@kubectl delete -f app/service.yaml --ignore-not-found=true
	@kubectl delete -f app/secret.yaml --ignore-not-found=true
	@kubectl delete -f app/configmap.yaml --ignore-not-found=true
	@echo "✅ Aplicação removida"

# Limpar RabbitMQ
clean-rabbit:
	@echo "🗑️ Removendo RabbitMQ..."
	@kubectl delete -f infra/rabbitmq/deployment.yaml --ignore-not-found=true
	@kubectl delete -f infra/rabbitmq/service.yaml --ignore-not-found=true
	@kubectl delete -f infra/rabbitmq/configmap.yaml --ignore-not-found=true
	@kubectl delete -f infra/rabbitmq/volumes/pvc.yaml --ignore-not-found=true
	@kubectl delete -f infra/rabbitmq/volumes/pv.yaml --ignore-not-found=true
	@kubectl delete namespace message-broker --ignore-not-found=true

	@echo "✅ RabbitMQ removido"

# Limpar PostgreSQL
clean-db:
	@echo "🗑️ Removendo PostgreSQL..."
	@kubectl delete -f infra/db/deployment.yaml --ignore-not-found=true
	@kubectl delete -f infra/db/service.yaml --ignore-not-found=true
	@kubectl delete -f infra/db/secret.yaml --ignore-not-found=true
	@kubectl delete namespace database --ignore-not-found=true

	@echo "✅ PostgreSQL removido"

# Limpar toda a infra
clean-infra: clean-rabbit clean-db
	@echo "✅ Infraestrutura removida"

# Limpar tudo
clean: clean-app clean-infra
	@echo "🗑️ Removendo namespace..."
	@kubectl delete namespace async-queue --ignore-not-found=true
	@echo "✅ Tudo removido!"
