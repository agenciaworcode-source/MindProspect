import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'https://comercial.idmindcorp.com.br', 
                'https://backendcomercial.idmincorp.com.br',
                'http://localhost:5173'
            ],
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['polling', 'websocket']
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
