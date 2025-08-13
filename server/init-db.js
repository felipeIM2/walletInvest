const mongoose = require('mongoose');
const connectDB = require('./db');
const config = require('../config');

// Modelos do MongoDB
const Usuario = require('../models/Usuario');
const Acao = require('../models/Acao');
const Cotacao = require('../models/Cotacao');

const inicializarBanco = async () => {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    console.log('🗄️ Inicializando banco de dados...');
    
    // Limpar dados existentes
    await Usuario.deleteMany({});
    await Acao.deleteMany({});
    await Cotacao.deleteMany({});
    
    // Criar usuários de exemplo
    const usuarios = [
      {
        login: 'admin',
        senha: 'admin',
        acesso: 1,
        conta: 1
      },
      {
        login: 'usuario1',
        senha: '123',
        acesso: 1,
        conta: 2
      },
      {
        login: 'usuario2',
        senha: '123',
        acesso: 1,
        conta: 3
      }
    ];
    
    for (const usuarioData of usuarios) {
      const usuario = new Usuario(usuarioData);
      await usuario.save();
      console.log(`✅ Usuário criado: ${usuarioData.login}`);
    }
    
    // Criar ações de exemplo
    const acoes = [
      {
        conta: 1,
        categoria: 'Bancos',
        codigo: 'BBAS3',
        valor: 12.35,
        quantidade: 2
      },
      {
        conta: 1,
        categoria: 'Petróleo',
        codigo: 'PETR4',
        valor: 10.00,
        quantidade: 1
      }
    ];
    
    for (const acaoData of acoes) {
      const acao = new Acao(acaoData);
      await acao.save();
      console.log(`✅ Ação criada: ${acaoData.codigo}`);
    }
    
    // Criar cotações de exemplo
    const cotacoes = [
      {
        codigo: 'BBAS3',
        conta: 1,
        nome: 'BBAS3.SA',
        moeda: 'BRL',
        preco: 19.83,
        dividendYield: 1.81
      },
      {
        codigo: 'PETR4',
        conta: 1,
        nome: 'PETR4.SA',
        moeda: 'BRL',
        preco: 32.66,
        dividendYield: 15.75
      }
    ];
    
    for (const cotacaoData of cotacoes) {
      const cotacao = new Cotacao(cotacaoData);
      await cotacao.save();
      console.log(`✅ Cotação criada: ${cotacaoData.codigo}`);
    }
    
    console.log('🎉 Banco de dados inicializado com sucesso!');
    console.log('📊 Dados de exemplo criados:');
    console.log('   - 3 usuários (admin/admin, usuario1/123, usuario2/123)');
    console.log('   - 2 ações (BBAS3, PETR4)');
    console.log('   - 2 cotações');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    process.exit(1);
  }
};

inicializarBanco();
