const express = require('express');
const db = require('../db');
const queue = require('../queue');
const routes = require('./routes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Rotas
app.use('/api', routes);

// Inicializar aplicação
const startServer = async () => {
    try {
        // Inicializar banco de dados
        await db.initializeDatabase();

        // Conectar à fila
        await queue.connectQueue();

        // Iniciar servidor
        const PORT = process.env.API_PORT || 3000;
        app.listen(PORT, () => {
            console.log(`API server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Tratamento de sinais para graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await queue.closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await queue.closeConnection();
    process.exit(0);
});

startServer();
