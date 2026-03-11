import { sendWhatsAppMessage, getStatus, getWhatsAppManager } from '../services/whatsapp.service.js';
import { saveDispatchLog } from '../services/supabase.service.js';
import { getIo } from '../config/socket.js';

// Armazenamento em memória do estado de envio por usuário
// userId -> { isPaused: boolean, isActive: boolean }
const outreachStates = new Map();

const getOutreachState = (userId) => {
    if (!outreachStates.has(userId)) {
        outreachStates.set(userId, { isPaused: false, isActive: false });
    }
    return outreachStates.get(userId);
};

export const startOutreach = async (req, res) => {
    const io = getIo();
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID não fornecido' });
        }

        const { leads, messageConfig, delayConfig } = req.body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'Lista de leads é necessária' });
        }

        const status = getStatus(userId);
        if (status.status !== 'connected') {
            return res.status(400).json({ error: 'WhatsApp não conectado' });
        }

        // Responde imediatamente para o frontend e processa em background
        res.json({ message: 'Disparos iniciados' });

        const state = getOutreachState(userId);
        if (state.isActive) return; // Evita disparos duplicados para este usuário
        
        state.isActive = true;
        state.isPaused = false;

        const total = leads.length;
        let sentCount = 0;

        for (const lead of leads) {
            // Verificar se deve pausar
            while (state.isPaused) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!state.isActive) break; // Permite cancelar completamente se necessário
            if (!lead.phone) {
                console.log(`[User ${userId}] Pulando ${lead.name} - Sem telefone`);
                continue;
            }

            // Personalizar a mensagem - Escolher template aleatório
            const templates = messageConfig.templates || [messageConfig.text];
            const chosenTemplate = templates[Math.floor(Math.random() * templates.length)];

            let personalizedMessage = chosenTemplate
                .replace(/{{nome_empresa}}/g, lead.name)
                .replace(/{{cidade}}/g, lead.city || '');

            // Enviar mensagem
            const result = await sendWhatsAppMessage(userId, lead.phone, personalizedMessage, messageConfig.mediaPath);

            sentCount++;

            // Emitir progresso via socket para a sala do usuário
            io.to(`user_${userId}`).emit('outreach_progress', {
                total,
                sent: sentCount,
                remaining: total - sentCount,
                currentLead: lead.name,
                status: result.success ? 'success' : 'failed',
                error: result.error || null
            });

            // Log no Supabase com userId
            await saveDispatchLog({
                name: lead.name,
                phone: lead.phone,
                status: result.success ? 'ENVIADO' : 'FALHA',
                message: personalizedMessage
            }, userId);

            // Esperar um intervalo (delay configurável ou fixo entre 10 e 30 segundos)
            if (sentCount < total) {
                const min = delayConfig?.min || 10;
                const max = delayConfig?.max || 30;
                // Converter para milissegundos
                const minMs = min * 1000;
                const maxMs = max * 1000;

                const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
                console.log(`[User ${userId}] Aguardando ${delay / 1000}s antes do próximo envio...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        state.isActive = false;
        io.to(`user_${userId}`).emit('outreach_finished', { total: sentCount });

    } catch (error) {
        console.error('Erro no processo de outreach:', error);
        if (req.userId) {
             const state = getOutreachState(req.userId);
             state.isActive = false;
        }
    }
};

export const pauseOutreach = (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    const state = getOutreachState(userId);
    state.isPaused = true;
    res.json({ status: 'paused' });
};

export const resumeOutreach = (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const state = getOutreachState(userId);
    state.isPaused = false;
    res.json({ status: 'running' });
};

export const stopOutreach = (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const state = getOutreachState(userId);
    state.isActive = false;
    state.isPaused = false;
    res.json({ status: 'stopped' });
};

export const getWhatsAppStatus = (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const manager = getWhatsAppManager();
    
    const status = getStatus(userId);
    
    const state = getOutreachState(userId);
    
    res.json({
        ...status,
        outreachStatus: state.isActive ? (state.isPaused ? 'paused' : 'running') : 'idle'
    });
};

export const connectSession = async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const manager = getWhatsAppManager();
        await manager.createSession(userId);
        res.json({ message: 'Session initialization started' });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
};

export const logoutSession = async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const manager = getWhatsAppManager();
        await manager.logout(userId);
        res.json({ message: 'Session logged out' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
};
