import express from 'express';
import * as leadController from '../controllers/lead.controller.js';
import * as whatsappController from '../controllers/whatsapp.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Leads
router.get('/leads', leadController.getLeads);

// WhatsApp
router.get('/whatsapp/status', whatsappController.getWhatsAppStatus);
router.post('/whatsapp/outreach', whatsappController.startOutreach);
router.post('/whatsapp/pause', whatsappController.pauseOutreach);
router.post('/whatsapp/resume', whatsappController.resumeOutreach);
router.post('/whatsapp/stop', whatsappController.stopOutreach);
router.post('/whatsapp/connect', whatsappController.connectSession);
router.post('/whatsapp/logout', whatsappController.logoutSession);

export default router;
