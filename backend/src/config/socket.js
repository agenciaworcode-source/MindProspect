import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Cliente Socket.io conectado:', socket.id);

        socket.on('join_user', (userId) => {
            if (userId) {
                console.log(`Socket ${socket.id} entrando na sala user_${userId}`);
                socket.join(`user_${userId}`);
            }
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io não foi inicializado!');
    }
    return io;
};
