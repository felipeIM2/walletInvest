# Password Migration Script Guide (API Version)

## Visão Geral
O script `migrate-passwords.js` foi desenvolvido para migrar senhas em texto puro para senhas criptografadas usando bcrypt, mantendo as senhas já criptografadas inalteradas. **Esta versão trabalha através da API do servidor WalletInvest**, não se conectando diretamente ao MongoDB.

## Como Funciona

### 1. Autenticação via API
- **Login de Administrador**: O script se autentica usando credenciais de administrador
- **Token JWT**: Obtém um token JWT válido para acessar as rotas protegidas
- **Acesso Privilegiado**: Usa a rota `/api/admin/usuarios` para buscar todos os usuários

### 2. Detecção Automática
- **Senhas Criptografadas**: O script detecta automaticamente senhas que já estão no formato bcrypt
- **Senhas em Texto Puro**: Identifica senhas que ainda estão em texto simples
- **Validação**: Verifica se os hashes bcrypt são válidos e funcionais

### 3. Processo de Migração
- **Preservação**: Senhas já criptografadas são mantidas EXATAMENTE como estão
- **Criptografia**: Apenas senhas em texto puro são criptografadas com bcrypt (12 salt rounds)
- **Validação**: Cada nova senha criptografada é testada para garantir que funciona corretamente

## Pré-requisitos

### 1. Servidor WalletInvest Rodando
```bash
# Inicie o servidor primeiro
npm start
# ou para desenvolvimento
npm run dev
```

### 2. Usuário Administrador
- Você precisa ter um usuário com privilégios de administrador (conta 0 ou 1)
- O usuário deve estar cadastrado no sistema
- Você deve saber o login e senha deste usuário

### 3. MongoDB Acessível
- O MongoDB deve estar rodando e acessível pelo servidor
- O servidor deve conseguir se conectar ao banco

## Configuração

### Método 1: Editar o Script Diretamente
Abra o arquivo `server/migrate-passwords.js` e modifique:

```javascript
const ADMIN_CREDENTIALS = {
    login: 'seu_login_admin',      // ← Substitua aqui
    senha: 'sua_senha_admin'       // ← Substitua aqui
};
```

### Método 2: Usar Variáveis de Ambiente
Crie um arquivo `.env` ou defina as variáveis:

```bash
ADMIN_LOGIN=seu_login_admin
ADMIN_PASSWORD=sua_senha_admin
SERVER_URL=http://localhost:3000  # opcional
```

## Como Usar

### Passo 1: Inicie o Servidor
```bash
# Navegar até o diretório do projeto
cd /caminho/para/walletInvest

# Instalar dependências (se necessário)
npm install

# Iniciar o servidor
npm start
```

### Passo 2: Configurar Credenciais
Edite o arquivo `server/migrate-passwords.js` ou configure variáveis de ambiente com as credenciais do administrador.

### Passo 3: Executar o Script
```bash
# Opção 1: Usar o comando npm (recomendado)
npm run migrate-passwords

# Opção 2: Executar diretamente
node server/migrate-passwords.js
```

## Exemplo de Saída

```
🚀 INICIANDO MIGRAÇÃO DE SENHAS VIA API
======================================================================
📋 Este script irá:
   1. Autenticar como administrador no servidor WalletInvest
   2. Buscar todos os usuários via API do servidor
   3. Analisar todas as senhas dos usuários
   4. Identificar senhas em texto puro vs criptografadas
   5. Criptografar APENAS as senhas em texto puro
   6. Manter as senhas já criptografadas INALTERADAS
   7. Validar todas as senhas após a migração

⚠️  PRÉ-REQUISITOS:
   - Servidor WalletInvest deve estar rodando (npm start)
   - Credenciais de administrador configuradas no script
   - MongoDB deve estar acessível ao servidor

🔑 Fazendo login como administrador...
✅ Login realizado com sucesso
📄 Usuário: admin (conta: 1)

🔍 Buscando usuários via API...
✅ Encontrados 3 usuários
📊 Encontrados 3 usuários. Analisando senhas...

🔍 Analisando usuário: admin
   Conta: 1
   Senha (primeiros 15 chars): $2b$12$abcdefg...
   ✅ Senha parece estar hasheada (formato bcrypt)
   ✅ Hash bcrypt válido - mantendo

🔍 Analisando usuário: user1
   Conta: 1002
   Senha (primeiros 15 chars): minhasenha123...
   🔄 Senha em texto puro - marcando para migração

📋 RELATÓRIO DA ANÁLISE:
   ✅ Usuários com senhas já hasheadas: 1
   🔄 Usuários que precisam de migração: 1
   ⚠️ Usuários com problemas: 0

📋 RESUMO DA MIGRAÇÃO:
   ➡️ 1 usuário(s) terão suas senhas criptografadas
   ✅ 1 usuário(s) já possuem senhas criptografadas (serão mantidas)

🚀 Iniciando migração de 1 usuários...

🔒 PROCESSO DE CRIPTOGRAFIA:

🔐 Criptografando senha para: user1 (conta 1002)
   Hash gerado: $2b$12$xyz789...
   ✅ Senha criptografada com sucesso para: user1
   ✅ Verificação: Hash salvo corretamente
   ✅ Teste final: Hash funciona corretamente

📊 RELATÓRIO FINAL DA MIGRAÇÃO:
   ✅ Sucessos: 1
   ❌ Falhas: 0
   📈 Taxa de sucesso: 100.0%

📋 STATUS FINAL:
   ✅ Senhas hasheadas corretamente: 2/2
   ❌ Senhas em texto plano: 0/2
   ⚠️ Senhas com problemas: 0/2

🎉 PARABÉNS! Todas as senhas estão criptografadas corretamente!

🎉 Script de migração finalizado com sucesso!
🔒 Todas as senhas em texto puro foram criptografadas
✅ Senhas já criptografadas foram preservadas
🌐 Migração realizada via API do servidor
```

## Características de Segurança

### ✅ O que o Script FAZ
- ✅ Detecta automaticamente senhas já criptografadas
- ✅ Preserva senhas já criptografadas EXATAMENTE como estão
- ✅ Criptografa apenas senhas em texto puro
- ✅ Usa bcrypt com 12 salt rounds (muito seguro)
- ✅ Valida cada hash gerado antes de salvar
- ✅ Testa se cada hash funciona corretamente
- ✅ Fornece relatórios detalhados
- ✅ Tratamento robusto de erros

### ❌ O que o Script NÃO faz
- ❌ NÃO modifica senhas já criptografadas
- ❌ NÃO remove dados existentes
- ❌ NÃO altera outros campos do usuário
- ❌ NÃO funciona sem confirmação manual

## Solução de Problemas

### Erro: Servidor não está rodando
```
❌ Servidor não está rodando. Inicie o servidor primeiro:
   npm start ou npm run dev
```
**Solução**: 
1. Abra outro terminal
2. Navegue até o diretório do projeto
3. Execute: `npm start`
4. Aguarde a mensagem "Servidor rodando em http://localhost:3000"
5. Execute o script de migração em outro terminal

### Erro: Acesso Negado
```
❌ Acesso negado. Certifique-se de que o usuário é administrador
```
**Solução**: 
1. Verifique se o usuário configurado existe no sistema
2. Certifique-se de que o usuário tem conta 0 ou 1 (administrador)
3. Confirme se as credenciais estão corretas

### Erro: Credenciais Inválidas
```
❌ Falha na autenticação: Usuário ou senha incorretos
```
**Solução**: 
1. Verifique o login e senha no arquivo de configuração
2. Teste o login manualmente no sistema web
3. Se necessário, crie um novo usuário administrador

### Erro: MongoDB Indisponível
```
❌ Erro: Banco de dados indisponível
```
**Solução**: 
1. Certifique-se de que o MongoDB está rodando
2. Verifique a conexão do servidor com o banco
3. Teste se o servidor consegue acessar outras funcionalidades

## Recomendações

1. **SEMPRE** faça backup do banco antes de executar
2. Execute primeiro em ambiente de teste
3. Verifique os logs cuidadosamente
4. Se houver problemas, restaure o backup e investigue

## Integração com o Sistema

Após a migração, o sistema de autenticação funcionará normalmente:
- O modelo `Usuario.js` já tem middleware para hash automático
- O método `comparePassword` funciona com hashes bcrypt
- O login continuará funcionando normalmente para todos os usuários