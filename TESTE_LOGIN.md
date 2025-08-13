# 🧪 Teste do Sistema de Login

## ✅ Problemas Resolvidos

1. **Erro 405 Method Not Allowed**: Corrigido atualizando todas as URLs do frontend para apontar para `http://localhost:3000`
2. **CORS**: Configurado para permitir requisições das portas 5500 (Live Server) e 3000 (Backend)
3. **Rota faltante**: Adicionada a rota `/api/cotacoes/:conta` que estava faltando no servidor
4. **Configuração centralizada**: Criado `config-frontend.js` para gerenciar URLs da API

## 🚀 Como Testar

### 1. Verificar se o Servidor está Rodando
```bash
# Em um terminal, verifique se a porta 3000 está ativa
netstat -an | grep :3000

# Deve mostrar:
# TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

### 2. Iniciar o Servidor (se não estiver rodando)
```bash
npm run dev
```

### 3. Acessar a Aplicação
- **Opção A**: Acesse `http://127.0.0.1:5500` (Live Server)
- **Opção B**: Acesse `http://localhost:3000` (Backend + Frontend)

### 4. Testar o Login
Use as credenciais:
- **Login**: `admin`
- **Senha**: `admin123`
- **Conta**: `1`

## 🔧 Configurações Aplicadas

### Frontend (config-frontend.js)
- URLs da API configuradas para `http://localhost:3000`
- Detecção automática de ambiente
- Fácil alternância entre desenvolvimento e produção

### Backend (server/server.js)
- CORS configurado para permitir portas 5500 e 3000
- Rota `/api/cotacoes/:conta` adicionada
- Todas as rotas da API funcionais

### Arquivos Atualizados
- `script.js` (página principal)
- `pages/carteira/script.js`
- `pages/rateio/rateio.js`
- `server/server.js`
- `index.html`
- `pages/carteira/index.html`
- `pages/rateio/index.html`

## 🐛 Possíveis Problemas e Soluções

### 1. "Cannot connect to server"
- Verifique se o servidor está rodando na porta 3000
- Execute `npm run dev`

### 2. "CORS error"
- O servidor já está configurado para permitir requisições da porta 5500
- Se persistir, verifique se o servidor foi reiniciado após as mudanças

### 3. "Route not found"
- Todas as rotas necessárias foram implementadas
- Verifique se o servidor foi reiniciado

## 📱 Teste no Navegador

1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Tente fazer login
4. Verifique se não há erros de CORS ou 404

## 🎯 Próximos Passos

Após o login funcionar:
1. Teste a navegação para a página de carteira
2. Teste as operações CRUD de ações
3. Teste o sistema de rateio
4. Teste a busca de cotações

## 📞 Suporte

Se ainda houver problemas:
1. Verifique o console do navegador
2. Verifique o terminal do servidor
3. Confirme que todas as dependências estão instaladas (`npm install`)
