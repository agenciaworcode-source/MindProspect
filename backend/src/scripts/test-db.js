import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env do backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Credenciais do Supabase ausentes no .env do backend.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
    console.log('--- Iniciando Testes de Integração Backend (Auth & Banco) ---\n');

    let testUserId = null;
    const testEmail = `teste_${Date.now()}@exemplo.com`;
    const testPassword = 'senha_segura_123';

    try {
        // 1. Testa Criação de Usuário (Auth)
        console.log('1. Testando criação de usuário no Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: { data: { name: 'Usuário de Teste' } }
        });

        if (authError) throw new Error(`Falha no Auth: ${authError.message}`);
        
        testUserId = authData.user.id;
        console.log(`✅ Usuário criado com sucesso. ID: ${testUserId}`);

        // Esperar um pouco para a trigger handle_new_user do PostgreSQL rodar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Testa Trigger (Tabela profiles)
        console.log('\n2. Verificando se a trigger criou o profile do usuário...');
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', testUserId)
            .single();

        if (profileError) throw new Error(`Falha ao buscar profile: ${profileError.message}`);
        console.log('✅ Profile encontrado:', profileData);

        // 3. Testa Inserção em user_configs
        console.log('\n3. Testando inserção em user_configs...');
        const { data: configData, error: configError } = await supabase
            .from('user_configs')
            .upsert({ 
                id: testUserId, 
                niche_default: 'Advogados', 
                city_default: 'São Paulo' 
            })
            .select()
            .single();

        if (configError) throw new Error(`Falha ao inserir config: ${configError.message}`);
        console.log('✅ Configuração salva:', configData);

        // 4. Testa Inserção em dispatch_logs
        console.log('\n4. Testando inserção em dispatch_logs...');
        const { data: logData, error: logError } = await supabase
            .from('dispatch_logs')
            .insert({
                user_id: testUserId,
                lead_name: 'Lead Teste',
                phone: '5511999999999',
                status: 'ENVIADO',
                message_sent: 'Olá, este é um teste.'
            })
            .select()
            .single();

        if (logError) throw new Error(`Falha ao inserir log: ${logError.message}`);
        console.log('✅ Log de disparo salvo:', logData);

        console.log('\n--- ✅ Todos os testes de banco de dados passaram! ---');

    } catch (error) {
        console.error(`\n❌ ERRO DURANTE OS TESTES: ${error.message}`);
    } finally {
        // Limpeza (opcional, vamos remover o usuário de teste)
        if (testUserId) {
            console.log('\nLimpando dados de teste...');
            const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId);
            if (deleteError) {
                console.error(`Falha ao deletar usuário de teste: ${deleteError.message}`);
            } else {
                console.log('✅ Usuário de teste removido do Auth.');
            }
        }
        process.exit(0);
    }
}

runTests();
