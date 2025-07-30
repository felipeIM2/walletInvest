const express = require('express');
const cors = require('cors');
const fs = require('fs'); 
const yf = require('yahoo-finance2').default;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


app.post('/api/buscarAcoes', async (req, res) => {
    const acoes = req.body.acoes;

    if (!Array.isArray(acoes) || acoes.length === 0) {
        return res.status(400).json({ erro: 'Envie uma lista de ações válida' });
    }

    const resultados = {
        acoes: {}
    };

    for (const acao of acoes) {
        try {
            const dados = await yf.quote(acao);
            resultados.acoes[acao] = {
                nome: dados.symbol,
                moeda: dados.currency,
                preco: dados.regularMarketPrice,
                dividendYield: dados.dividendYield
            };
        } catch (error) {
            console.error(`Erro ao buscar ${acao}:`, error.message);
            // Apenas pula a ação com erro (não adiciona ao objeto)
        }
    }

    
    const caminhoArquivo = 'cotacoes.json';
    try {
        if (Object.keys(resultados.acoes).length > 0) {
            fs.writeFileSync(caminhoArquivo, JSON.stringify(resultados, null, 2));
            console.log(`✅ Cotação salva em ${caminhoArquivo}`);
        } else {
            console.log('⚠️ Nenhuma cotação válida para salvar.');
        }
    } catch (erroEscrita) {
        console.error('❌ Erro ao salvar o arquivo:', erroEscrita.message);
    }

    res.json(resultados);
});

app.post('/api/salvarAcoes', async (req, res) => {
  const acoes = req.body.acoes;  // A lista de ações enviada pela requisição

  if (!Array.isArray(acoes) || acoes.length === 0) {
    return res.status(400).json({ erro: 'Envie uma lista de ações válida' });
  }

  const caminhoArquivo = 'acoes.json';  // Caminho para o arquivo onde as ações serão salvas

  try {
    // Salva as ações em um arquivo JSON
    fs.writeFileSync(caminhoArquivo, JSON.stringify({ acoes }, null, 2));
    console.log(`✅ Ações salvas em ${caminhoArquivo}`);
    res.json({ sucesso: 'Ações salvas com sucesso!' });
  } catch (erroEscrita) {
    console.error('❌ Erro ao salvar as ações:', erroEscrita.message);
    res.status(500).json({ erro: 'Erro ao salvar as ações.' });
  }
});


app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
