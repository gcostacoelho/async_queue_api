const amqp = require('amqplib');
require('dotenv').config();

let connection = null;
let channel = null;

const connectQueue = async () => {
    try {
        const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
        connection = await amqp.connect(url);
        channel = await connection.createChannel();

        // Garantir que a fila existe
        await channel.assertQueue(process.env.RABBITMQ_QUEUE, { durable: true });

        console.log('Queue connection established successfully');
        return channel;
    } catch (error) {
        console.error('Error connecting to queue:', error);
        throw error;
    }
};

const publishMessage = async (message) => {
    try {
        if (!channel) {
            await connectQueue();
        }

        const messageBuffer = Buffer.from(JSON.stringify(message));
        return channel.sendToQueue(process.env.RABBITMQ_QUEUE, messageBuffer, {
            persistent: true
        });
    } catch (error) {
        console.error('Error publishing message:', error);
        throw error;
    }
};

const consumeMessages = async (callback) => {
    try {
        if (!channel) {
            await connectQueue();
        }

        await channel.consume(process.env.RABBITMQ_QUEUE, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await callback(content);
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Requeue na fila se houver erro
                    channel.nack(msg, false, true);
                }
            }
        });
    } catch (error) {
        console.error('Error consuming messages:', error);
        throw error;
    }
};

const closeConnection = async () => {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('Queue connection closed');
    } catch (error) {
        console.error('Error closing queue connection:', error);
    }
};

module.exports = {
    connectQueue,
    publishMessage,
    consumeMessages,
    closeConnection,
};
