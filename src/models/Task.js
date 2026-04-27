const db = require('../db');

class Task {
    static async create(title, description) {
        try {
            const result = await db.query(
                'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
                [title, description]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error finding task:', error);
            throw error;
        }
    }

    static async findAll() {
        try {
            const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Error finding all tasks:', error);
            throw error;
        }
    }

    static async updateStatus(id, status) {
        try {
            const result = await db.query(
                'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [status, id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    }

    static async markAsProcessed(id) {
        try {
            const result = await db.query(
                'UPDATE tasks SET status = $1, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                ['processed', id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error marking task as processed:', error);
            throw error;
        }
    }
}

module.exports = Task;
