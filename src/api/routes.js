const express = require('express');
const Task = require('../models/Task');
const queue = require('../queue');

const router = express.Router();

// GET /tasks - Listar todas as tarefas
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.findAll();
        res.json({
            success: true,
            data: tasks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// GET /tasks/:id - Obter uma tarefa específica
router.get('/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// POST /tasks - Criar uma nova tarefa e publicar na fila
router.post('/tasks', async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required',
            });
        }

        // Criar tarefa no banco
        const task = await Task.create(title, description);

        // Publicar mensagem na fila para processamento assíncrono
        await queue.publishMessage({
            taskId: task.id,
            title: task.title,
            description: task.description,
        });

        res.status(201).json({
            success: true,
            message: 'Task created and queued for processing',
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
    });
});

module.exports = router;
