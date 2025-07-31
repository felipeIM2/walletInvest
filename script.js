
let acesso = {
  login:"",
  senha:"",
}


$("#logar").click(() => {
$.getJSON('./server/db/usuario.json', (res) => {

    
    acesso.login = $("#login").val()
    acesso.senha = $("#senha").val()

    let encontrarUsuario = res.filter(u => u.login === acesso.login && u.senha === acesso.senha)[0]
    if(encontrarUsuario){
      alert("Bem vindo!")
      sessionStorage.setItem("usuario", JSON.stringify(encontrarUsuario))
      localStorage.removeItem("carteira")
      setTimeout(() => location = "./pages/carteira", 500);
    }else return alert("Usuário ou senha incorretos!")
    
  });
})