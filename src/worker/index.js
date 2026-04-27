const queue = require('../queue');
const db = require('../db');
const Task = require('../models/Task');
require('dotenv').config();

// Inicializar worker
const startWorker = async () => {
    try {
        // Inicializar banco de dados
        await db.initializeDatabase();

        console.log('Worker started, listening for messages...');

        // Consumir mensagens da fila
        await queue.consumeMessages(async (message) => {
            console.log(`Processing task: ${message.title} (ID: ${message.taskId})`);

            try {
                // Simular processamento
                await processTask(message);

                // Marcar tarefa como processada
                await Task.markAsProcessed(message.taskId);

                console.log(`Task ${message.taskId} processed successfully`);
            } catch (error) {
                console.error(`Error processing task ${message.taskId}:`, error);
                throw error;
            }
        });
    } catch (error) {
        console.error('Worker error:', error);
        process.exit(1);
    }
};

// Simular processamento de tarefa
const processTask = async (message) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`Task processed: ${JSON.stringify(message)}`);
            resolve();
        }, 2000); // Simular 2 segundos de processamento
    });
};

// Tratamento de sinais para graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down worker gracefully...');
    await queue.closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down worker gracefully...');
    await queue.closeConnection();
    process.exit(0);
});

startWorker();
