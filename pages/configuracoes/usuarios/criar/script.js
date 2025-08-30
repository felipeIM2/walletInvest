$(document).ready(function() {
  // Verificar se o usuário tem permissão de admin (conta 1)
  const verificarPermissaoAdmin = () => {
    const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
    
    if (!usuario || usuario.conta !== 1) {
      showMessage('Acesso negado. Apenas administradores podem acessar esta página.', 'error');
      setTimeout(() => {
        window.location.href = '../../../carteira/';
      }, 800);
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
  
  // Event listeners
  $('#btnVoltar').click(function() {
    window.location.href = '../';
  });
  
  $('#btnCancelar').click(function() {
    window.location.href = '../';
  });
  
  // Submissão do formulário
  $('#formCriarUsuario').submit(async function(e) {
    e.preventDefault();
    
    const login = $('#login').val().trim();
    const senha = $('#senha').val().trim();
    
    // Desabilitar botão e mostrar loading
    const btnCriar = $('#btnCriar');
    const btnText = btnCriar.find('.btn-text');
    const loading = btnCriar.find('.loading');
    
    btnCriar.prop('disabled', true);
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
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.USUARIOS),
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${usuarioLogado.token}`
        },
        data: JSON.stringify({
          login: login,
          senha: senha
        }),
        timeout: 10000
      });
      
      if (response.success) {
        showMessage(`Usuário "${login}" criado com sucesso! Conta: ${response.usuario.conta}`, 'success');
        
        // Limpar formulário
        $('#login').val('');
        $('#senha').val('');
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          window.location.href = '../';
        }, 2000);
        
      } else {
        throw new Error(response.erro || 'Erro desconhecido');
      }
      
    } catch (error) {
      let errorMessage = 'Erro ao criar usuário';
      
      if (error.responseJSON && error.responseJSON.erro) {
        errorMessage = error.responseJSON.erro;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      // Reabilitar botão
      btnCriar.prop('disabled', false);
      btnText.show();
      loading.hide();
    }
  });
  
  // Focar no primeiro input
  $('#login').focus();
});