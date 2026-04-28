#!/bin/bash

# Script de teste para a API Async Queue

API_URL="http://localhost:3000/api"

echo "=== Testing Async Queue API ==="
echo ""

# Test 1: Health check
echo "[1] Testing health endpoint..."
curl -s "$API_URL/health" | jq .
echo ""
echo ""

# Test 2: List all tasks
echo "[2] Listing all tasks..."
curl -s "$API_URL/tasks" | jq .
echo ""
echo ""

# Test 3: Create a task
echo "[3] Creating a new task..."
RESPONSE=$(curl -s -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Processar Pagamento",
    "description": "Processar pagamento do cliente #123"
  }')

echo $RESPONSE | jq .
TASK_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "Task ID: $TASK_ID"
echo ""
echo ""

# Test 4: Get specific task
echo "[4] Getting task details (ID: $TASK_ID)..."
curl -s "$API_URL/tasks/$TASK_ID" | jq .
echo ""
echo ""

# Test 5: Create multiple tasks
echo "[5] Creating multiple tasks to demonstrate queue processing..."
for i in {1..3}; do
  echo "Creating task $i..."
  curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Task $i\",
      \"description\": \"Description for task $i\"
    }" | jq .
  echo ""
done

echo "[6] Final list of all tasks..."
curl -s "$API_URL/tasks" | jq .

echo ""
echo "=== Tests Complete ==="
