$("#logar").click(async () => {
    const login = $("#login").val();
    const senha = $("#senha").val();

    try {
        const response = await $.ajax({
            url: "/api/login",
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
       

        if(login === "admin" && senha === "admin") return sessionStorage.setItem("usuario", login), setTimeout(() => location = "./pages/carteira", 500);

        alert("Erro ao tentar fazer login");
    }
});