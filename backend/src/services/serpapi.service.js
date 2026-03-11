import axios from 'axios';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

dotenv.config();

const cache = new NodeCache({ stdTTL: 86400 }); // Cache de 24 horas

/**
 * Busca leads usando a SerpAPI com o motor google_local (Google Meu Negócio)
 */
export const searchLeads = async (niche, city) => {
    const cacheKey = `search:${niche.toLowerCase()}:${city.toLowerCase()}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] Retornando dados em cache para: ${niche} em ${city}`);
        return cachedData;
    }

    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: "google_maps",
                type: "search",
                q: `${niche} em ${city}`,
                google_domain: "google.com.br",
                hl: "pt-br",
                gl: "br",
                api_key: process.env.SERPAPI_KEY
            }
        });

        const results = response.data.local_results || [];
        console.log(`[SerpAPI] Resultados: ${results.length}`);
        if (results.length > 0) {
            console.log('[SerpAPI] Exemplo de item (primeiro campo de telefone):', results[0].phone || results[0].phone_number || 'Sem telefone encontrado');
        }

        if (response.data.error) {
            const errorMsg = response.data.error;
            if (errorMsg.includes("Invalid API key")) {
                throw new Error("Chave da SerpAPI inválida. Verifique seu arquivo .env.");
            } else if (errorMsg.includes("Account out of credits")) {
                throw new Error("Seu plano da SerpAPI atingiu o limite de buscas.");
            }
            throw new Error(`Erro na SerpAPI: ${errorMsg}`);
        }

        const leads = results.map(item => ({
            name: item.title,
            category: item.type || item.category || 'Empresa',
            address: item.address,
            phone: item.phone || item.phone_number || '',
            whatsapp: (item.phone || item.phone_number || '').replace(/\D/g, ''),
            website: item.website || '',
            rating: item.rating || 0,
            reviews: item.reviews || 0,
            operating_hours: item.operating_hours ? 'Disponível' : 'Não informado',
            google_link: item.place_id ? `https://www.google.com/maps/place/?q=place_id:${item.place_id}` : '#',
        }));

        cache.set(cacheKey, leads);
        return leads;
    } catch (error) {
        let finalMessage = "Erro desconhecido ao buscar leads.";
        if (error.response) {
            const data = error.response.data;
            finalMessage = data.error || `Erro HTTP ${error.response.status}`;
        } else {
            finalMessage = error.message;
        }
        console.error("Erro na busca da SerpAPI:", finalMessage);
        throw new Error(finalMessage);
    }
};
