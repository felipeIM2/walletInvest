$(document).ready(function() {
  // Verificar se CONFIG está disponível
  if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG não definido - você deve acessar via servidor WalletInvest');
    
    // Detectar se está em servidor estático e redirecionar automaticamente
    const currentUrl = window.location.href;
    const isStaticServer = currentUrl.includes(':5500') || currentUrl.includes('127.0.0.1:5500');
    
    if (isStaticServer) {
      console.log('🔄 Detectado servidor estático, redirecionando para servidor WalletInvest...');
      const targetUrl = 'http://localhost:3000/pages/configuracoes/usuarios/';
      
      // Tentar redirecionar automaticamente após 3 segundos
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 3000);
      
      $('body').html(`
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: Arial, sans-serif;
        ">
          <div style="
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            max-width: 500px;
          ">
            <h1 style="margin-bottom: 20px;">
              <i class="fas fa-exclamation-triangle"></i>
              Redirecionamento Automático
            </h1>
            <p style="font-size: 18px; margin-bottom: 20px;">
              Detectamos que você está acessando via servidor estático.<br>
              <strong>Redirecionando em 3 segundos...</strong>
            </p>
            <div style="
              background: rgba(255,255,255,0.2);
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 30px;
            ">
              <h3 style="margin-bottom: 15px;">🔗 URL Correta:</h3>
              <a href="${targetUrl}" 
                 style="
                   color: #ffeb3b;
                   text-decoration: none;
                   font-weight: bold;
                   font-size: 16px;
                 "
                 onclick="window.location.href=this.href; return false;">
                ${targetUrl}
              </a>
            </div>
            <div style="font-size: 14px; opacity: 0.8;">
              <p><strong>Pré-requisitos:</strong></p>
              <p>• Servidor WalletInvest rodando (npm run dev)</p>
              <p>• Login com conta adequada</p>
            </div>
            <button onclick="window.location.href='${targetUrl}'" style="
              background: #4CAF50;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            ">Ir Agora</button>
          </div>
        </div>
      `);
      return;
    }
    
    // Fallback para quando CONFIG não está disponível (acesso via servidor estático - não recomendado)
    $('body').html(`
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          max-width: 500px;
        ">
          <h1 style="margin-bottom: 20px;">
            <i class="fas fa-exclamation-triangle"></i>
            Acesso Incorreto
          </h1>
          <p style="font-size: 18px; margin-bottom: 30px;">
            Você está acessando via servidor estático.<br>
            O sistema de usuários deve ser acessado via servidor WalletInvest.
          </p>
          <div style="
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
          ">
            <h3 style="margin-bottom: 15px;">🔗 URL Correta:</h3>
            <a href="http://localhost:3000/pages/configuracoes/usuarios/" 
               style="
                 color: #ffeb3b;
                 text-decoration: none;
                 font-weight: bold;
                 font-size: 16px;
               "
               onclick="window.location.href=this.href; return false;">
              http://localhost:3000/pages/configuracoes/usuarios/
            </a>
          </div>
          <div style="font-size: 14px; opacity: 0.8;">
            <p><strong>Pré-requisitos:</strong></p>
            <p>• Servidor WalletInvest rodando (npm run dev)</p>
            <p>• Login com conta admin (admin/admin)</p>
          </div>
        </div>
      </div>
    `);
    return;
  }
  
  let usuarios = [];
  let usuarioParaExcluir = null;
  
  // Verificar se o usuário tem permissão para acessar usuários (apenas conta 1 = admin)
  const verificarPermissaoUsuarios = () => {
    const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  
    if (!usuario) {
      showMessage('Usuário não autenticado. Redirecionando...', 'error');
      setTimeout(() => {
        window.location.href = '../../../';
      }, 2000);
      return false;
    }
    
    // Se a conta for 1, é admin - apenas validar o token
    
    if (usuario.conta === 1) {
      if (!usuario.token) {
        showMessage('Token de acesso não encontrado. Faça login novamente.', 'error');
        setTimeout(() => {
          window.location.href = '../../../';
        }, 2000);
        return false;
      }
      // Token será validado no servidor durante a requisição
      console.log('✅ Usuário com conta 1 - administrador');
      return true;
    }
    
    // Para outras contas, negar acesso
    // return console.log(usuario);
    showMessage('Acesso negado. Apenas administradores (conta 1) podem acessar esta página.', 'error');
    setTimeout(() => {
      window.location.href = '../../carteira/';
    }, 2000);
    return false;
  };
  
  // Verificar permissão ao carregar a página
  if (!verificarPermissaoUsuarios()) {
    // Bloquear TODAS as funções do script - usuário sem permissão
    return;
  }
  
  // ===== TODO O CÓDIGO ABAIXO SÓ EXECUTA PARA ADMINISTRADORES (CONTA 1) =====
  // Se chegou até aqui, o usuário tem permissão (conta = 1)
  
  // Event listeners - SÓ FUNCIONA PARA ADMINISTRADORES
  $('#btnVoltar').click(function() {
    window.location.href = '../';
  });
  
  $('#btnCriarUsuario').click(function() {
    window.location.href = './criar/';
  });
  
  // Modal event listeners
  $('#closeModal, #btnCancelarExclusao').click(function() {
    fecharModal();
  });
  
  // Fechar modal clicando fora
  $('#modalConfirmarExclusao').click(function(e) {
    if (e.target === this) {
      fecharModal();
    }
  });
  
  // Confirmar exclusão
  $('#btnConfirmarExclusao').click(function() {
    confirmarExclusaoUsuario();
  });
  
  // Carregar usuários ao inicializar - SÓ EXECUTA PARA ADMINISTRADORES
  carregarUsuarios();
  
  // Função para carregar usuários
  async function carregarUsuarios() {
    try {
      $('.loading-usuarios').show();
      $('#usuariosLista, #noUsuarios').hide();
      
      // Verificar autenticação
      const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
      if (!usuario || !usuario.token) {
        showMessage('Usuário não autenticado', 'error');
        return;
      }
      
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.ADMIN_USUARIOS),
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usuario.token}`
        },
        timeout: 10000
      });
      
      usuarios = response.usuarios || [];
      renderizarUsuarios();
      
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      if (error.status === 401) {
        showMessage('Sessão expirada. Redirecionando...', 'error');
        setTimeout(() => {
          window.location.href = '../../../';
        }, 2000);
      } else {
        showMessage('Erro ao carregar usuários: ' + (error.responseJSON?.erro || error.message), 'error');
      }
      $('#noUsuarios').show();
    } finally {
      $('.loading-usuarios').hide();
    }
  }
  
  // Função para renderizar usuários na tabela
  function renderizarUsuarios() {
    const tbody = $('#tabelaUsuarios');
    tbody.empty();
    
    if (usuarios.length === 0) {
      $('#noUsuarios').show();
      $('#usuariosLista').hide();
      return;
    }
    
    usuarios.forEach(usuario => {
      const row = criarLinhaUsuario(usuario);
      tbody.append(row);
    });
    
    $('#usuariosLista').show();
    $('#noUsuarios').hide();
  }
  
  // Função para criar linha da tabela de usuário
  function criarLinhaUsuario(usuario) {
    const isAdmin = usuario.conta === 1;
    const contaBadgeClass = isAdmin ? 'conta-badge admin-badge' : 'conta-badge';
    
    return $(`
      <tr data-usuario-id="${usuario._id}">
        <td>
          <span class="${contaBadgeClass}">
            ${isAdmin ? 'ADMIN' : ''} ${usuario.conta}
          </span>
        </td>
        <td>${usuario.login}</td>
        <td>
          <span class="acesso-badge">Nível ${usuario.acesso}</span>
        </td>
        <td>
          <div class="acoes-usuario">
            <button class="btn-acao btn-editar" onclick="editarUsuario('${usuario._id}')" disabled>
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-acao btn-excluir" 
                    onclick="confirmarExclusao('${usuario._id}')"
                    ${isAdmin ? 'disabled title="Não é possível excluir o administrador"' : ''}>
              <i class="fas fa-trash"></i> Excluir
            </button>
          </div>
        </td>
      </tr>
    `);
  }
  
  // Função para confirmar exclusão (global para onclick)
  window.confirmarExclusao = function(usuarioId) {
    // Verificar permissão novamente antes de executar
    if (!verificarPermissaoUsuarios()) {
      return false;
    }
    
    const usuario = usuarios.find(u => u._id === usuarioId);
    if (!usuario) return;
    
    if (usuario.conta === 1) {
      showMessage('Não é possível excluir o usuário administrador', 'error');
      return;
    }
    
    usuarioParaExcluir = usuario;
    $('#usuarioExcluir').text(usuario.login);
    $('#contaExcluir').text(usuario.conta);
    $('#adminLogin, #adminSenha').val('');
    $('#modalConfirmarExclusao').fadeIn();
  };
  
  // Função para editar usuário (placeholder)
  window.editarUsuario = function(usuarioId) {
    // Verificar permissão novamente antes de executar
    if (!verificarPermissaoUsuarios()) {
      return false;
    }
    
    showMessage('Funcionalidade de edição ainda não implementada', 'info');
  };
  
  // Função para fechar modal
  function fecharModal() {
    $('#modalConfirmarExclusao').fadeOut();
    usuarioParaExcluir = null;
    $('#adminLogin, #adminSenha').val('');
  }
  
  // Função para confirmar exclusão do usuário
  async function confirmarExclusaoUsuario() {
    if (!usuarioParaExcluir) return;
    
    const adminLogin = $('#adminLogin').val().trim();
    const adminSenha = $('#adminSenha').val().trim();
    
    if (!adminLogin || !adminSenha) {
      showMessage('Por favor, preencha suas credenciais de administrador', 'error');
      return;
    }
    
    const btnExcluir = $('#btnConfirmarExclusao');
    const btnText = btnExcluir.find('.btn-text');
    const loading = btnExcluir.find('.loading');
    
    // Desabilitar botão e mostrar loading
    btnExcluir.prop('disabled', true);
    btnText.hide();
    loading.show();
    
    try {
      // Verificar autenticação
      const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || 'null');
      if (!usuarioLogado || !usuarioLogado.token) {
        showMessage('Usuário não autenticado', 'error');
        return;
      }
      
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.USUARIOS, `/${usuarioParaExcluir._id}`),
        method: 'DELETE',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${usuarioLogado.token}`
        },
        data: JSON.stringify({
          adminLogin: adminLogin,
          adminSenha: adminSenha
        }),
        timeout: 15000
      });
      
      if (response.success) {
        showMessage(`Usuário "${usuarioParaExcluir.login}" e todos os dados relacionados foram excluídos com sucesso`, 'success');
        fecharModal();
        
        // Recarregar lista de usuários
        setTimeout(() => {
          carregarUsuarios();
        }, 1000);
      } else {
        throw new Error(response.erro || 'Erro desconhecido');
      }
      
    } catch (error) {
      let errorMessage = 'Erro ao excluir usuário';
      
      if (error.responseJSON && error.responseJSON.erro) {
        errorMessage = error.responseJSON.erro;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      // Reabilitar botão
      btnExcluir.prop('disabled', false);
      btnText.show();
      loading.hide();
    }
  }
});