import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { initSocket } from './config/socket.js';
import { initWhatsApp } from './services/whatsapp.service.js';
import apiRoutes from './routes/api.js';

const app = express();
const server = http.createServer(app);

// Inicializar Socket.io
const io = initSocket(server);

app.use(cors({
    origin: ['https://comercial.idmindcorp.com.br', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('src/uploads'));

// Middleware de Log para depuração
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Verificar variáveis de ambiente críticas
console.log('--- Verificação de Ambiente ---');
console.log('PORTA:', process.env.PORT || 3001);
console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? 'Configurada ✅' : 'AUSENTE ❌');
console.log('-------------------------------');

// Inicializar WhatsApp
initWhatsApp(io);

// Rotas API Backend
app.use('/api', apiRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Acoplar Frontend em Produção (Coolify)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    console.log(`Frontend estático localizado em: ${frontendDist}`);
    app.use(express.static(frontendDist));
    app.get('(.*)', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send('API de Prospecção Interna Rodando. Frontend não compilado na raiz /dist.'));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 Servidor pronto em: http://localhost:${PORT}`);
    console.log(`📍 Endpoint de Leads hospedado: http://localhost:${PORT}/api/leads`);
});
