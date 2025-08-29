$(document).ready(function() {
  let usuarios = [];
  let usuarioParaExcluir = null;
  
  // Verificar se o usuário tem permissão de admin (conta 1)
  const verificarPermissaoAdmin = () => {
    const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
    
    if (!usuario || usuario.conta !== 1) {
      showMessage('Acesso negado. Apenas administradores podem acessar esta página.', 'error');
      setTimeout(() => {
        window.location.href = '../../carteira/';
      }, 2000);
      return false;
    }
    
    return true;
  };
  
  // Verificar permissão ao carregar a página - SE NÃO TIVER PERMISSÃO, PARAR TUDO
  if (!verificarPermissaoAdmin()) {
    // Bloquear TODAS as funções do script - usuário sem permissão
    return;
  }
  
  // ===== IMPORTANTE: TODO O CÓDIGO ABAIXO SÓ EXECUTA PARA ADMINISTRADORES =====
  // Se chegou até aqui, o usuário tem permissão de admin (conta = 1)
  
  // Event listeners - SÓ FUNCIONA PARA ADMIN
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
  
  // Carregar usuários ao inicializar - SÓ EXECUTA PARA ADMIN
  carregarUsuarios();
  
  // Função para carregar usuários
  async function carregarUsuarios() {
    try {
      $('.loading-usuarios').show();
      $('#usuariosLista, #noUsuarios').hide();
      
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.USUARIOS),
        method: 'GET',
        timeout: 10000
      });
      
      usuarios = response.usuarios || [];
      renderizarUsuarios();
      
    } catch (error) {
      showMessage('Erro ao carregar usuários: ' + (error.responseJSON?.erro || error.message), 'error');
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
    if (!verificarPermissaoAdmin()) {
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
    if (!verificarPermissaoAdmin()) {
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
      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.USUARIOS, `/${usuarioParaExcluir._id}`),
        method: 'DELETE',
        contentType: 'application/json',
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