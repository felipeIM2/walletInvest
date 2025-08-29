 // Seu script de login integrado com melhorias visuais
    $("#logar").click(async (e) => {
      e.preventDefault();
      
      const login = $("#login").val();
      const senha = $("#senha").val();
      
      // Validação básica
      if (!login || !senha) {
        showMessage("Por favor, preencha todos os campos!", "error");
        return;
      }
      
      const btn = $("#logar");
      const loading = btn.find('.loading');
      const btnText = btn.find('.btn-text');
      
      // Estado de loading - esconde o texto e mostra loading
      btn.prop('disabled', true);
      btnText.hide();
      loading.show();
      
      // Marca o tempo de início do loading
      const startTime = Date.now();
      const minLoadingTime = 1200; // Tempo mínimo de loading em ms
      
      try {
        const response = await $.ajax({
          url: CONFIG.getUrl(CONFIG.ENDPOINTS.LOGIN),
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ login, senha })
        });

        // Calcula quanto tempo já passou
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        // Aguarda o tempo mínimo antes de processar a resposta
        setTimeout(() => {
          if (response.success) {
            loading.hide();
            btnText.text('Sucesso!').show();
            showMessage("Bem vindo!", "success");
            
            // Salvar usuário e token no sessionStorage
            const userData = {
              ...response.usuario,
              token: response.token
            };
            sessionStorage.setItem("usuario", JSON.stringify(userData));
            
            setTimeout(() => {
              location = "./pages/carteira";
            }, 1500);
          } else {
            showMessage("Usuário ou senha incorretos!", "error");
            resetButton();
          }
        }, remainingTime);

      } catch (error) {
        console.error('Erro no login:', error);
        
        // Também aplica o delay mínimo para erros
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        setTimeout(() => {
          showMessage("Erro ao tentar fazer login. Tente novamente.", "error");
          resetButton();
        }, remainingTime);
      }
      
      function resetButton() {
        btn.prop('disabled', false);
        loading.hide();
        btnText.text('Entrar na Conta').show();
      }
    });

    // Adiciona animação nos inputs
    $('input').on('focus', function() {
      $(this).parent().addClass('focused');
    });

    $('input').on('blur', function() {
      if ($(this).val() === '') {
        $(this).parent().removeClass('focused');
      }
    });

    // Validação em tempo real
    $('#login, #senha').on('input', function() {
      const login = $('#login').val();
      const senha = $('#senha').val();
      
      if (login && senha) {
        $('#logar').css('opacity', '1');
      } else {
        $('#logar').css('opacity', '0.8');
      }
    });

    // Permite login com Enter
    $('#login, #senha').on('keypress', function(e) {
      if (e.which === 13) {
        $('#logar').click();
      }
    });