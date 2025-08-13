$("#logar").click(async () => {
    const login = $("#login").val();
    const senha = $("#senha").val();

    try {
        const response = await $.ajax({
            url: CONFIG.getUrl(CONFIG.ENDPOINTS.LOGIN),
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ login, senha })
        });

        if (response.success) {
            alert("Bem vindo!");
            sessionStorage.setItem("usuario", JSON.stringify(response.usuario));
            setTimeout(() => location = "./pages/carteira", 500);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } catch (error) {
       
        alert("Erro ao tentar fazer login");
    }
});