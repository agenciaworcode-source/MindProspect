import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabase = null;

const isValidUrl = (url) => {
    return url && url.startsWith('http') && !url.includes('sua_supabase_url');
};

if (isValidUrl(process.env.SUPABASE_URL) && process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('sua_supabase_anon_key')) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
} else {
    console.warn('AVISO: Supabase não configurado ou URL inválida. Logs desabilitados.');
}

export const saveDispatchLog = async (logData, userId) => {
    try {
        if (!supabase) return null;
        const { data, error } = await supabase
            .from('dispatch_logs')
            .insert([
                {
                    user_id: userId,
                    lead_name: logData.name,
                    phone: logData.phone,
                    status: logData.status,
                    message_sent: logData.message,
                    created_at: new Date()
                }
            ]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao salvar log no Supabase:', error.message);
        return null;
    }
};

export const saveConfig = async (config, userId) => {
    try {
        if (!supabase || !userId) return null;

        const { data, error } = await supabase
            .from('user_configs')
            .upsert({ id: userId, ...config });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao salvar config no Supabase:', error.message);
        return null;
    }
};

export { supabase };
