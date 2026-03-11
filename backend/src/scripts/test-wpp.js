import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://127.0.0.1:3001/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testWhatsAppConnection() {
    console.log('--- Iniciando Teste de Servidor Web e Geração de QR Code ---\n');

    const testEmail = `wpp_${Date.now()}@exemplo.com`;
    const testPassword = 'senha_segura_123';
    let testUserId = null;
    let jwtToken = null;
    let socket = null;

    try {
        // 1. Criar usuário e logar
        console.log('1. Criando usuário para teste...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: { data: { name: 'User WPP Teste' } }
        });

        if (authError) throw new Error(authError.message);
        
        testUserId = authData.user.id;
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) throw new Error(signInError.message);
        jwtToken = signInData.session.access_token;

        console.log(`✅ Usuário criado e logado. ID: ${testUserId}`);

        // 2. Tentar acessar rota autenticada (Status)
        console.log('\n2. Buscando status do WhatsApp via HTTP com JWT...');
        const statusRes = await axios.get(`${API_URL}/whatsapp/status`, {
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        
        console.log('✅ Resposta de status obtida:', statusRes.data);

        // 3. Conectar via Socket
        console.log('\n3. Conectando via Socket.io...');
        socket = io('http://127.0.0.1:3001');

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout na conexão do socket')), 5000);
            
            socket.on('connect', () => {
                clearTimeout(timeout);
                console.log('✅ Socket conectado (ID:', socket.id, ')');
                socket.emit('join_user', testUserId);
                console.log(`✅ Entrou na sala user_${testUserId}`);
                resolve();
            });
        });

        // 4. Solicitar inicialização do WhatsApp (geração de QR Code)
        console.log('\n4. Solicitando inicialização de sessão do WhatsApp (POST /whatsapp/connect)...');
        
        const qrPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout: QR code não gerado')), 15000);
            
            socket.on('whatsapp_qr', (qr) => {
                clearTimeout(timeout);
                console.log('\n✅ Evento whatsapp_qr recebido via socket!');
                console.log(`QR gerado com ~${qr.length} caracteres.`);
                resolve();
            });
            
            socket.on('whatsapp_status', (status) => {
                 console.log(`-> Evento status recebido via socket: ${status}`);
            });
        });

        const connectRes = await axios.post(`${API_URL}/whatsapp/connect`, {}, {
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        console.log('✅ Resposta de connect HTTP:', connectRes.data);

        console.log('Aguardando evento de QR via socket (A biblioteca do baileys pode levar alguns segundos)...');
        await qrPromise;

        // 5. Verificar se a pasta persisente foi criada
        const authPath = path.join(__dirname, '../../.baileys_auth_sessions', testUserId);
        console.log('\n5. Verificando persistência (pasta .baileys_auth_sessions)...');
        if (fs.existsSync(authPath)) {
            const files = fs.readdirSync(authPath);
            console.log(`✅ Pasta do usuário criada: ${authPath}`);
            console.log(`✅ Arquivos de estado local: ${files.length}`);
            if (files.length === 0) {
                 console.warn('Pasta criada, mas ainda sem arquivos. O @whiskeysockets pode preenchê-la ao longo do tempo.');
            }
        } else {
            console.warn(`❌ Pasta não foi encontrada no caminho esperado: ${authPath}`);
        }

        console.log('\n--- ✅ Todos os testes da integração WhatsApp Backend completados com sucesso! ---');

    } catch (error) {
         console.error(`\n❌ ERRO DURANTE OS TESTES: ${error.message}`);
         if (error.response) console.error(error.response.data);
    } finally {
        if (socket) socket.disconnect();
        
        if (testUserId) {
            console.log('\nLimpando dados de teste do Auth...');
            await supabase.auth.admin.deleteUser(testUserId);
            
            const wipeAuthPath = path.join(__dirname, '../../.baileys_auth_sessions', testUserId);
            if (fs.existsSync(wipeAuthPath)) {
                fs.rmSync(wipeAuthPath, { recursive: true, force: true });
                console.log('✅ Arquivos temporários de sessão apagados.');
            }
        }
        process.exit(0);
    }
}

testWhatsAppConnection();
