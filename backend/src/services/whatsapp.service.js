import { WhatsAppManager } from './whatsapp.manager.js';

let whatsappManager = null;

export const initWhatsApp = (io) => {
    whatsappManager = new WhatsAppManager(io);
    console.log('WhatsApp Manager Initialized');
    return whatsappManager;
};

export const getWhatsAppManager = () => {
    if (!whatsappManager) {
        throw new Error('WhatsApp Manager not initialized');
    }
    return whatsappManager;
};

// Wrapper para manter consistência, mas agora exige userId
export const sendWhatsAppMessage = async (userId, number, message, mediaPath = null) => {
    if (!whatsappManager) {
        throw new Error('WhatsApp Manager não inicializado');
    }
    return whatsappManager.sendMessage(userId, number, message, mediaPath);
};

export const getStatus = (userId) => {
    if (!whatsappManager) {
        return { status: 'disconnected', qr: null };
    }
    return whatsappManager.getStatus(userId);
};
