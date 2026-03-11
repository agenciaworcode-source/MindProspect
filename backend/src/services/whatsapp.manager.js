import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import qrcode from 'qrcode';
import { saveConfig } from './supabase.service.js';

export class WhatsAppManager {
    constructor(io) {
        this.io = io;
        this.sessions = new Map(); // userId -> socket
        this.baseAuthPath = path.resolve(process.cwd(), '.baileys_auth_sessions');
        
        // Ensure base auth directory exists
        if (!fs.existsSync(this.baseAuthPath)) {
            fs.mkdirSync(this.baseAuthPath, { recursive: true });
        }
    }

    async getSession(userId) {
        if (this.sessions.has(userId)) {
            return this.sessions.get(userId);
        }
        return null;
    }

    async createSession(userId) {
        if (this.sessions.has(userId)) {
            const existing = this.sessions.get(userId);
            // Se já tem um Qr pronto, re-emite para evitar que o frontend trave no loading
            if (existing.status === 'qr_ready' && existing.qr) {
                this.io.to(`user_${userId}`).emit('whatsapp_qr', existing.qr);
                this.io.to(`user_${userId}`).emit('whatsapp_status', 'qr_ready');
            }
            return existing;
        }

        console.log(`Creating session for user ${userId}`);
        const authPath = path.join(this.baseAuthPath, userId);
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        // Buscar última versão Web para evitar bloqueio / 405
        const { version } = await fetchLatestBaileysVersion();
        console.log(`[User ${userId}] Using WA v${version.join('.')}`);

        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            linkPreviewImageThumbnailWidth: 192,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        const sessionData = {
            sock,
            status: 'disconnected',
            qr: null,
            userId,
            qrTimeout: null
        };

        this.sessions.set(userId, sessionData);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`QR Code raw received for user ${userId}`);
                try {
                    const qrImage = await qrcode.toDataURL(qr);
                    sessionData.qr = qrImage;
                    sessionData.status = 'qr_ready';
                    this.io.to(`user_${userId}`).emit('whatsapp_qr', qrImage);
                    this.io.to(`user_${userId}`).emit('whatsapp_status', 'qr_ready');
                    
                    // Reset e inicia o timer de expiração do QR Code (3 minutos)
                    if (sessionData.qrTimeout) clearTimeout(sessionData.qrTimeout);
                    sessionData.qrTimeout = setTimeout(() => {
                        console.log(`[User ${userId}] QR Code expirou (timeout). Encerrando sessão...`);
                        this.logout(userId);
                    }, 3 * 60 * 1000); // 3 minutos

                } catch (err) {
                    console.error('Erro ao gerar base64 qr code:', err);
                }
            }

            if (connection === 'close') {
                if (sessionData.qrTimeout) clearTimeout(sessionData.qrTimeout);
                
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                // Impede loop infinito verificando 405, 403, 401 ou loggedOut
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 405 && statusCode !== 403 && statusCode !== 401;
                console.log(`Connection closed for user ${userId} due to`, lastDisconnect?.error, ', reconnecting', shouldReconnect);
                
                sessionData.status = 'disconnected';
                this.io.to(`user_${userId}`).emit('whatsapp_status', 'disconnected');

                if (shouldReconnect) {
                    // Adicionando um delay para impedir loop de CPU / socket em caso de erros constantes
                    setTimeout(async () => {
                        this.sessions.delete(userId);
                        await this.createSession(userId);
                    }, 2000);
                } else {
                    // Logged out ou erro de bloqueio/auth
                    if (fs.existsSync(authPath)) {
                        fs.rmSync(authPath, { recursive: true, force: true });
                    }
                    this.sessions.delete(userId);
                }
            } else if (connection === 'open') {
                if (sessionData.qrTimeout) clearTimeout(sessionData.qrTimeout);
                console.log(`Connection opened for user ${userId}`);
                sessionData.status = 'connected';
                sessionData.qr = null;
                
                const remoteJid = sock.user.id.split(':')[0];
                
                this.io.to(`user_${userId}`).emit('whatsapp_status', 'connected');
            }
        });
        
        return sessionData;
    }

    async logout(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            try {
                await session.sock.logout();
            } catch (err) {
                console.log(`Logout socket warning para ${userId}:`, err.message);
            }
            this.sessions.delete(userId);
        }
        
        // Sempre forca limpação dos arquivos locais (mesmo pós restart da API)
        const authPath = path.join(this.baseAuthPath, userId);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        this.io.to(`user_${userId}`).emit('whatsapp_status', 'disconnected');
        return true;
    }

    getStatus(userId) {
        const session = this.sessions.get(userId);
        if (!session) return { status: 'disconnected', qr: null };
        return { status: session.status, qr: session.qr };
    }

    async sendMessage(userId, number, message, mediaPath = null) {
        const session = this.sessions.get(userId);
        if (!session || session.status !== 'connected') {
            return { success: false, error: 'WhatsApp não conectado' };
        }

        try {
            let cleanedNumber = number.replace(/\D/g, '');
            if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith('55')) {
                cleanedNumber = '55' + cleanedNumber;
            }
            
            const jid = `${cleanedNumber}@s.whatsapp.net`;

            // Verificar se o número existe no WhatsApp (evita envio para números inválidos)
            console.log(`[User ${userId}] Verificando número: ${jid}`);
            const [result] = await session.sock.onWhatsApp(jid);
            
            if (!result || !result.exists) {
                console.log(`[User ${userId}] Número ${cleanedNumber} não registrado no WhatsApp.`);
                return { success: false, error: 'Número não registrado no WhatsApp' };
            }

            if (mediaPath) {
                const buffer = fs.readFileSync(mediaPath);
                await session.sock.sendMessage(jid, { image: buffer, caption: message });
            } else {
                await session.sock.sendMessage(jid, { text: message });
            }
            
            return { success: true };
        } catch (err) {
            console.error(`[User ${userId}] Erro ao enviar para ${number}:`, err);
            return { success: false, error: err.message || 'Erro desconhecido no envio' };
        }
    }
}
