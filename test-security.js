// Script de teste para verificar as configurações de segurança
const config = require('./config');

console.log('🔍 VERIFICANDO CONFIGURAÇÕES DE SEGURANÇA...\n');

// 1. Verificar variáveis de ambiente
console.log('1. ✅ VARIÁVEIS DE AMBIENTE:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'Usando padrões'}`);

// 2. Verificar configurações carregadas
console.log('\n2. ✅ CONFIGURAÇÕES CARREGADAS:');
console.log(`   Porta: ${config.server.port}`);
console.log(`   CORS Origins: ${JSON.stringify(config.security.cors.origin)}`);
console.log(`   Rate Limit: ${config.security.rateLimit.max} req/${config.security.rateLimit.windowMs}ms`);

// 3. Verificar dependências
console.log('\n3. ✅ DEPENDÊNCIAS:');
try {
    require('jsonwebtoken');
    console.log('   ✅ jsonwebtoken: Instalado');
} catch (e) {
    console.log('   ❌ jsonwebtoken: NÃO INSTALADO - Execute: npm install jsonwebtoken');
}

try {
    require('express-rate-limit');
    console.log('   ✅ express-rate-limit: Instalado');
} catch (e) {
    console.log('   ❌ express-rate-limit: NÃO INSTALADO - Execute: npm install express-rate-limit');
}

try {
    require('dotenv');
    console.log('   ✅ dotenv: Instalado');
} catch (e) {
    console.log('   ❌ dotenv: NÃO INSTALADO - Execute: npm install dotenv');
}

// 4. Verificar modelos
console.log('\n4. ✅ MODELOS:');
try {
    require('./models/TokenAcesso');
    console.log('   ✅ TokenAcesso: Carregado');
} catch (e) {
    console.log('   ❌ TokenAcesso: Erro ao carregar -', e.message);
}

try {
    require('./models/Usuario');
    console.log('   ✅ Usuario: Carregado');
} catch (e) {
    console.log('   ❌ Usuario: Erro ao carregar -', e.message);
}

// 5. Verificar arquivos de autenticação
console.log('\n5. ✅ ARQUIVOS DE AUTENTICAÇÃO:');
try {
    require('./server/auth');
    console.log('   ✅ server/auth.js: Carregado');
} catch (e) {
    console.log('   ❌ server/auth.js: Erro ao carregar -', e.message);
}

// 6. Avisos de segurança
console.log('\n6. ⚠️  AVISOS DE SEGURANÇA:');

if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
        console.log('   🚨 JWT_SECRET não definido em produção!');
    }
    if (!process.env.SESSION_SECRET) {
        console.log('   🚨 SESSION_SECRET não definido em produção!');
    }
    if (!process.env.MONGODB_URI) {
        console.log('   🚨 MONGODB_URI não definido em produção!');
    }
    console.log('   ✅ Modo produção detectado - validações ativas');
} else {
    console.log('   ℹ️  Modo desenvolvimento - usando valores padrão');
    console.log('   ⚠️  Configure as variáveis de ambiente para produção');
}

console.log('\n🎯 PARA TESTAR A SEGURANÇA:');
console.log('   1. Execute: npm start');
console.log('   2. Tente acessar: http://localhost:3000/api/usuarios');
console.log('   3. Deve retornar erro 401 (não autorizado)');
console.log('   4. Faça login e teste o funcionamento normal');

console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');