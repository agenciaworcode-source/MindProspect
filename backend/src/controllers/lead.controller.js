import { searchLeads } from '../services/serpapi.service.js';
import { getIo } from '../config/socket.js';

export const getLeads = async (req, res) => {
  try {
    const { niche, city } = req.query;

    if (!niche || !city) {
      return res.status(400).json({ error: 'Nicho e Cidade são obrigatórios' });
    }

    const io = getIo();
    io.emit('search_status', { status: 'searching', message: `Buscando ${niche} em ${city}...` });

    const leads = await searchLeads(niche, city);

    io.emit('search_status', { status: 'completed', count: leads.length });
    res.json(leads);
  } catch (error) {
    console.error('Erro no LeadController:', error.message);
    res.status(500).json({
      error: 'Erro na API de busca',
      details: error.response?.data?.error || error.message
    });
  }
};
