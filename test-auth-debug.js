// Teste específico para debug do middleware de autenticação
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = 'fallback-secret-key'; // mesmo secret usado no servidor

async function testarAuth() {
    console.log('🧪 Testando middleware de autenticação diretamente...\n');
    
    try {
        // 1. Criar um token JWT manualmente
        console.log('1️⃣ Criando token JWT...');
        const payload = {
            conta: 1,
            timestamp: Date.now(),
            random: 'test-random-string'
        };
        
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        console.log('✅ Token criado:', token.substring(0, 50) + '...');
        
        // 2. Testar carteira com token
        console.log('\n2️⃣ Testando acesso à carteira...');
        try {
            const carteiraResponse = await axios.get(`${BASE_URL}/api/carteira/1`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Carteira acessada:', carteiraResponse.data);
        } catch (carteiraError) {
            console.log('❌ Erro na carteira:', carteiraError.response?.data || carteiraError.message);
            console.log('📊 Status:', carteiraError.response?.status);
        }
        
        // 3. Testar cotações com token
        console.log('\n3️⃣ Testando acesso às cotações...');
        try {
            const cotacoesResponse = await axios.get(`${BASE_URL}/api/cotacoes/1`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Cotações acessadas:', cotacoesResponse.data);
        } catch (cotacoesError) {
            console.log('❌ Erro nas cotações:', cotacoesError.response?.data || cotacoesError.message);
            console.log('📊 Status:', cotacoesError.response?.status);
        }
        
    } catch (error) {
        console.error('💥 Erro geral:', error.message);
    }
}

testarAuth();