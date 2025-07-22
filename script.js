
let carteira = JSON.parse(localStorage.getItem('carteira')) || [];
let cotacoes = []
let meta = parseFloat(localStorage.getItem('meta')) || 0;
let totalInvestido;
let acoes;
let somaQuantidade = 0;
let somaAtual = 0;
let somaLucro = 0;
let somaLucroPorcento = 0;


  function salvarDados() {
    localStorage.setItem('carteira', JSON.stringify(carteira));
    localStorage.setItem('meta', meta.toString());
  }

  function calcularTotalInvestido() {
    return carteira.reduce((total, acao) => {
      return total + (acao.valor * acao.quantidade);
    }, 0);
  }

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  function atualizarTabela() {
    $.getJSON('./server/cotacoes.json', function(res) {
      
      cotacoes = res.acoes 

      totalInvestido = calcularTotalInvestido();
      let tbody = '';

      carteira.forEach((acao, index) => {
    
        let totalAcaoAtual = 0
        let valorAcaoAtual = 0
        let lucroPorcento = 0
        const totalAcao = acao.valor * acao.quantidade;
        const posicaoI = ((totalAcao * 100)/ totalInvestido).toFixed(2);
        const posicaoG = ((100 /carteira.length)).toFixed(2);

        
        if(cotacoes[acao.codigo+".SA"] !== undefined){
          totalAcaoAtual = cotacoes[acao.codigo+".SA"].preco * acao.quantidade
          valorAcaoAtual = cotacoes[acao.codigo+".SA"].preco 
        }
        
        let totalOperacao;
        if(totalAcaoAtual > 0){
          totalOperacao = totalAcaoAtual - totalAcao
        }else {
          totalOperacao = 0
        }

        lucroPorcento = ((totalOperacao*100)/totalAcao).toFixed(2)
        
        tbody += `
          <tr>
            <td>${acao.categoria}</td>
            <td>${acao.codigo}</td>
            <td>${formatarMoeda(acao.valor)}</td>
            <td>${formatarMoeda(valorAcaoAtual)}</td>
            <td>${acao.quantidade}</td>
            <td>${formatarMoeda(totalAcao)}</td>
            <td>${formatarMoeda(totalAcaoAtual)}</td>
            <td>${formatarMoeda(totalOperacao)}</td>
            <td>${lucroPorcento}%</td>
            <td>${posicaoI}%</td>
            <td>${posicaoG}%</td>
            <td>
              <button class="adicionar" data-index="${index}"><i class="fa-solid fa-plus"></i></button>
              <button class="editar" data-index="${index}"><i class="fa-solid fa-pen"></i></button>
              <button class="excluir" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        `;

        somaQuantidade += acao.quantidade;
        somaAtual += totalAcaoAtual;
        somaLucro += totalOperacao;
        somaLucroPorcento += Number(lucroPorcento)
      });

      $('#tabelaAcoes').html(tbody);

        $('#totalQuantidade').text(somaQuantidade);
        $('#totalAtual').text(formatarMoeda(somaAtual));
        $('#totalLucro').text(formatarMoeda(somaLucro));
        $("#totalLucroPorcento").text(somaLucroPorcento+"%")
      
      
      $('#totalInvestido').text(formatarMoeda(totalInvestido));
      $('#percentualMeta').text(meta > 0 ? ((totalInvestido / meta) * 100).toFixed(2) + '%' : '0%');
      
      // Salvar dados
      salvarDados();
    });
  }


  $('#adicionarAcao').click(async () => {

    const categoria = $('#acaoCategorias').val();
    let codigo = $('#acaoCodigo').val().toUpperCase().trim();
    const valor = parseFloat($('#acaoValor').val());
    const quantidade = parseInt($('#acaoQuantidade').val());

  
    const regexCodigo = /^[A-Z]{4}[0-9]{1,2}$/;
    if (!regexCodigo.test(codigo)) {
      alert('Código em formato inválido.');
      return;
    }

    const existeNaB3 = await validarCodigoExistenteNaB3(codigo);
    if (!existeNaB3) {
      alert('Código não encontrado na B3.');
      return;
    }

    if (!categoria || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
      alert('Preencha todos os campos corretamente com valores positivos.');
      return;
    }

    const codigoExistente = carteira.some(acao => acao.codigo === codigo);
    if (codigoExistente) {
      if (!confirm('Este código já existe na carteira. Deseja adicionar mesmo assim?')) {
        return;
      }
    }

    carteira.push({ categoria, codigo, valor, quantidade });
    atualizarTabela();
    console.log(carteira);

    $('#acaoCategorias').val('');
    $('#acaoCodigo').val('');
    $('#acaoValor').val('');
    $('#acaoQuantidade').val('');

    $('#modalCarteira').fadeOut();
  });


  $('#tabelaAcoes').on('click', '.editar', function() {
    const index = $(this).data('index');
    const acao = carteira[index];
    
    // Preencher modal com os dados da ação
    $('#acaoCategorias').val(acao.categoria);
    $('#acaoCodigo').val(acao.codigo);
    $('#acaoValor').val(acao.valor);
    $('#acaoQuantidade').val(acao.quantidade);
    
    // Alterar o botão para "Salvar Edição"
    $('#adicionarAcao').text('Salvar Edição').off('click').click(function() {
      const categoria = $('#acaoCategorias').val();
      const codigo = $('#acaoCodigo').val().toUpperCase();
      const valor = parseFloat($('#acaoValor').val());
      const quantidade = parseInt($('#acaoQuantidade').val());

      if (!categoria || !codigo || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
        alert('Preencha todos os campos corretamente com valores positivos.');
        return;
      }

      // Atualizar ação
      carteira[index] = { categoria, codigo, valor, quantidade };
      atualizarTabela();
      
      // Resetar modal
      $('#modalCarteira').fadeOut();
      $('#adicionarAcao').text('Adicionar').off('click').click(adicionarAcaoHandler);
    });
    
    // Abrir modal
    $('#modalCarteira').fadeIn();
  });

  // Excluir ação
  $('#tabelaAcoes').on('click', '.excluir', function() {
    const index = $(this).data('index');
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      carteira.splice(index, 1);
      atualizarTabela();
    }
  });

  
  $(document).ready(async function() {
    

    $("#atualizarPreco").click( () => {

      acoes = carteira.map(c => c.codigo+".SA")

      $.ajax({
        url: "http://localhost:3000/api/buscarAcoes",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ acoes })
      })

      setTimeout(() => {
        location.reload()
      }, 1500);

    })

    atualizarTabela();
    
    $('table').append(`
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:left;"><strong>Total Investido:</strong></td>
          <td id="totalQuantidade">0</td> 
          <td id="totalInvestido">R$ 0,00</td> 
          <td id="totalAtual">R$ 0,00</td> 
          <td id="totalLucro">R$ 0,00</td> 
          <td id="totalLucroPorcento"></td> 
        </tr>
      </tfoot>
    `);


    // Configurar meta
    $('#metaValor').val(meta).on('input', function() {
      meta = parseFloat($(this).val()) || 0;
      localStorage.setItem('meta', meta.toString());
      atualizarTabela();
    });
    
    $('#totalInvestido').text(formatarMoeda(totalInvestido));
    $('#percentualMeta').text(meta > 0 ? ((totalInvestido / meta) * 100).toFixed(2) + '%' : '0%');

    // Configurar modal
    $('#abrirModal').on('click', function() {
      // Resetar modal
      $('#acaoCategorias').val('');
      $('#acaoCodigo').val('');
      $('#acaoValor').val('');
      $('#acaoQuantidade').val('');
      $('#adicionarAcao').text('Adicionar').off('click').click(adicionarAcaoHandler);
      
      $('#modalCarteira').fadeIn();
    });

    $('.fechar, #modalCarteira').on('click', function(e) {
      if ($(e.target).is('#modalCarteira') || $(e.target).is('.fechar')) {
        $('#modalCarteira').fadeOut();
      }
    });

    // Evitar fechar modal ao clicar no conteúdo
    $('.modal-conteudo').on('click', function(e) {
      e.stopPropagation();
    });

  });

  async function adicionarAcaoHandler() {

      const categoria = $('#acaoCategorias').val();
      let codigo = $('#acaoCodigo').val().toUpperCase().trim();
      const valor = parseFloat($('#acaoValor').val());
      const quantidade = parseInt($('#acaoQuantidade').val());

    
      const regexCodigo = /^[A-Z]{4}[0-9]{1,2}$/;
      if (!regexCodigo.test(codigo)) {
        alert('Código em formato inválido.');
        return;
      }

      // const existeNaB3 = await validarCodigoExistenteNaB3(codigo);
      // if (!existeNaB3) {
      //   return alert('Código não encontrado na B3.');
      // }

      if (!categoria || isNaN(valor) || isNaN(quantidade) || valor <= 0 || quantidade <= 0) {
        alert('Preencha todos os campos corretamente com valores positivos.');
        return;
      }

      const codigoExistente = carteira.some(acao => acao.codigo === codigo);
      if (codigoExistente) {
        if (!confirm('Este código já existe na carteira. Deseja adicionar mesmo assim?')) {
          return;
        }
      }

      carteira.push({ categoria, codigo, valor, quantidade });
      atualizarTabela();
      console.log(carteira);

      $('#acaoCategorias').val('');
      $('#acaoCodigo').val('');
      $('#acaoValor').val('');
      $('#acaoQuantidade').val('');

      $('#modalCarteira').fadeOut();
  
  }

  // Configuração do menu hamburger
  $('#hamburgerMenu').click(function(e) {
    e.stopPropagation();
    $('#menuOptions').toggleClass('active');
  });

  // Fechar menu quando clicar fora
  $(document).click(function() {
    $('#menuOptions').removeClass('active');
  });

  // Configurar ações do menu
  $('#menuAdicionar').click(function() {
    $('#abrirModal').click();
    $('#menuOptions').removeClass('active');
  });

  $('#menuRatear').click(function() {
    alert('Funcionalidade de Ratear será implementada aqui');
    $('#menuOptions').removeClass('active');
  });

  $('#menuConfigurar').click(function() {
    alert('Funcionalidade de Configurar será implementada aqui');
    $('#menuOptions').removeClass('active');
  });




