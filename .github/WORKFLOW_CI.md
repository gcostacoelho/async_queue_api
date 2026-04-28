# GitHub Actions Workflow: CI/CD para Docker

Este repositório utiliza um workflow do GitHub Actions para automatizar o processo de build e push das imagens Docker dos serviços `api` e `worker` para o Docker Hub.

## Objetivo Atual

- **Buildar** as imagens Docker para os targets `api` e `worker`.
- **Fazer push** dessas imagens para o Docker Hub, utilizando as credenciais da conta pessoal do mantenedor.

## Estrutura do Workflow

O workflow está definido em `.github/workflows/ci.yaml` e possui dois jobs principais:

### 1. build-app

- **Ambiente:** Ubuntu
- **Passos:**
  - Checkout do código
  - Instalação das dependências Node.js (`npm install`)

### 2. deploy-image

- **Ambiente:** Ubuntu
- **Strategy Matrix:** Executa para cada target (`api`, `worker`)
- **Passos:**
  - Checkout do código
  - Setup do Docker Buildx
  - Login no Docker Hub (usando secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`)
  - Build e push da imagem Docker para o Docker Hub, com tag `${{secrets.DOCKERHUB_USERNAME}}/async-queue:${{ matrix.target }}`

## Como funciona

- O workflow é disparado em pushs para a branch `main` ou manualmente (`workflow_dispatch`).
- Para cada target, uma imagem é construída e enviada ao Docker Hub.
- As credenciais do Docker Hub são armazenadas como secrets no repositório.

## Melhorias Futuras

- Tornar o workflow reutilizável em outros repositórios (usar `workflow_call` e parametrização).
- Adicionar geração automática de tags (ex: tags semânticas, `latest`, etc).
- Incluir steps de teste automatizado antes do deploy.
- Publicar imagens em outros registries, se necessário.
- Notificações de sucesso/falha.

---

> **Dica:** Para usar este workflow, configure os secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` nas configurações do repositório.
