

$(document).ready(() => {
  const carteira = JSON.parse(localStorage.getItem("carteira")) || []
  let cotacoes = []
  let valorRateio = 0

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)

  const salvarDados = () => {
    localStorage.setItem("carteira", JSON.stringify(carteira))
  }

  const carregarCotacoes = () => {
    return $.getJSON("../../server/cotacoes.json")
      .done((res) => {
        cotacoes = res.acoes
      })
      .fail(() => {
        console.warn("Erro ao carregar cotações, usando valores da carteira")
        cotacoes = {}
      })
  }

 
  function controlarCamposPercentual() {
    const estrategia = $("#estrategiaRateio").val()
    const inputs = $(".alocacao-percentual")
    const botoes = $(".btn-aumentar, .btn-diminuir")

    if (estrategia === "manual") {
      // Habilita campos e botões para edição manual
      inputs.prop("disabled", false).css({
        "background-color": "",
        cursor: "text",
      })
      botoes.prop("disabled", false).css({
        opacity: "1",
        cursor: "pointer",
      })
    } else {
      // Desabilita campos e botões para estratégias automáticas
      inputs.prop("disabled", true).css({
        "background-color": "#f0f0f0",
        cursor: "not-allowed",
      })
      botoes.prop("disabled", true).css({
        opacity: "0.5",
        cursor: "not-allowed",
      })
    }
  }

  function init() {
    if (carteira.length === 0) {
      mostrarAlertaCarteira()
      return
    }

    carregarCotacoes().then(() => {
      renderizarAlocacoes()
      configurarEventos()
      controlarCamposPercentual()
      
      // Calcula o rateio automaticamente ao carregar a página
      calcularRateio()
    })
  }

  function mostrarAlertaCarteira() {
    $("#alertaCarteira").show()
    $("#containerAlocacoes").html(
      '<p style="text-align: center; padding: 20px; color: #666;">Nenhuma ação na carteira. Adicione ações primeiro na página principal.</p>',
    )
    $("#btnAplicar").prop("disabled", true)
  }

  function renderizarAlocacoes() {
    const container = $("#containerAlocacoes")
    container.empty()

    carteira.forEach((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      const valorAtual = cotacao ? cotacao.preco : acao.valor
      const valorTotalAtual = valorAtual * acao.quantidade

      container.append(`
        <div class="alocacao-item" data-index="${index}">
          <div class="alocacao-info">
            <div>
              <span class="alocacao-codigo">${acao.codigo}</span>
              <span style="font-size: 12px; color: #888; margin-left: 8px;">(${acao.categoria})</span>
            </div>
            <div class="alocacao-valor">
              ${formatarMoeda(valorAtual)} × ${acao.quantidade} un. = ${formatarMoeda(valorTotalAtual)}
            </div>
            <div class="alocacao-nova" id="nova-${index}"></div>
          </div>
          <div class="alocacao-controle">
            <button class="btn-diminuir" type="button"><i class="fas fa-minus"></i></button>
            <input type="number" class="alocacao-percentual" value="0" min="0" max="100" step="1">
            <span>%</span>
            <button class="btn-aumentar" type="button"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      `)
    })

    atualizarResumo()
  }

  function configurarEventos() {
    // Botões de aumentar/diminuir porcentagem - só funciona se não estiver desabilitado
    $(document).on("click", ".btn-aumentar", function () {
      if ($(this).prop("disabled")) return

      const input = $(this).siblings(".alocacao-percentual")
      const valor = Number.parseInt(input.val()) || 0
      if (valor < 100) {
        input.val(valor + 1).trigger("change")
      }
    })

    $(document).on("click", ".btn-diminuir", function () {
      if ($(this).prop("disabled")) return

      const input = $(this).siblings(".alocacao-percentual")
      const valor = Number.parseInt(input.val()) || 0
      if (valor > 0) {
        input.val(valor - 1).trigger("change")
      }
    })

    // Atualiza o resumo quando muda a porcentagem - só se não estiver desabilitado
    $(document).on("change input", ".alocacao-percentual", function () {
      if ($(this).prop("disabled")) return

      const valor = Number.parseInt($(this).val()) || 0
      if (valor < 0) $(this).val(0)
      if (valor > 100) $(this).val(100)
      atualizarResumo()
    })

      $("#estrategiaRateio").change(function () {
        const estrategia = $(this).val()
        controlarCamposPercentual()
        
        if (estrategia !== "manual") {
          calcularRateio()
        } else {
          $(".alocacao-percentual").val(0)
          atualizarResumo() // Força atualização imediata
        }
      })

    // Aplica o rateio à carteira
    $("#btnAplicar").click(aplicarRateio)

    // Atualiza quando muda a estratégia
    $("#estrategiaRateio").change(function () {
      const estrategia = $(this).val()

      // Controla o estado dos campos baseado na estratégia selecionada
      controlarCamposPercentual()

      // Se não for manual, calcula automaticamente
      if (estrategia !== "manual") {
        calcularRateio()
      } else {
        // Se for manual, zera todos os campos para o usuário definir
        $(".alocacao-percentual").val(0).trigger("change")
      }
    })

    // Atualiza quando muda o valor
    $("#valorRateio").on("input", function() {
      if ($("#valorRateio").val() !== "") {
        calcularRateio();
      }
    });
  }

  function calcularRateio() {
    const estrategia = $("#estrategiaRateio").val();
    const inputs = $(".alocacao-percentual");
    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0;

    if (estrategia === "proporcional") {
      const totais = carteira.map((acao) => {
        const cotacao = cotacoes[acao.codigo + ".SA"];
        const valorAtual = cotacao ? cotacao.preco : acao.valor;
        return valorAtual * acao.quantidade;
      });

      const totalGeral = totais.reduce((sum, val) => sum + val, 0);

      if (totalGeral > 0) {
        inputs.each((index, input) => {
          const percentual = Math.round((totais[index] / totalGeral) * 100);
          $(input).val(percentual);
        });
      }
    } else if (estrategia === "igual") {
      const percentualBase = Math.floor(100 / carteira.length);
      const resto = 100 - percentualBase * carteira.length;

      inputs.each((index, input) => {
        const percentual = index < resto ? percentualBase + 1 : percentualBase;
        $(input).val(percentual);
      });
    }

    // Garante que a soma dos percentuais não ultrapasse 100%
    normalizarPercentuais();
    atualizarResumo();
  }

  function normalizarPercentuais() {
    const inputs = $(".alocacao-percentual");
    let total = 0;
    
    // Calcula o total atual
    inputs.each(function() {
      total += Number.parseInt($(this).val()) || 0;
    });

    // Se ultrapassar 100%, ajusta proporcionalmente
    if (total > 100) {
      inputs.each(function() {
        const valorAtual = Number.parseInt($(this).val()) || 0;
        const novoValor = Math.round((valorAtual / total) * 100);
        $(this).val(novoValor);
      });
    }
  }

  function atualizarResumo() {
    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0;
    const resumo = $("#resumoRateio");
    resumo.empty();

    let totalAlocado = 0;
    let valorTotalEfetivo = 0;

    // Primeiro calcula os percentuais totais
    $(".alocacao-item").each(function() {
      const percentual = Number.parseInt($(this).find(".alocacao-percentual").val()) || 0;
      totalAlocado += percentual;
    });

    // Depois calcula os valores respeitando a proporção
    $(".alocacao-item").each(function() {
      const index = $(this).data("index");
      const percentual = Number.parseInt($(this).find(".alocacao-percentual").val()) || 0;
      const percentualNormalizado = totalAlocado > 0 ? (percentual / totalAlocado) * 100 : 0;

      const valorAlocado = (valorRateio * percentualNormalizado) / 100;

      if (percentual > 0 && valorRateio > 0) {
        const acao = carteira[index];
        const cotacao = cotacoes[acao.codigo + ".SA"];
        const valorAtual = cotacao ? cotacao.preco : acao.valor;

        const novaQuantidade = Math.floor(valorAlocado / valorAtual);
        const valorEfetivo = novaQuantidade * valorAtual;
        valorTotalEfetivo += valorEfetivo;

        $(`#nova-${index}`).text(novaQuantidade > 0 ? `+${novaQuantidade} un. (${formatarMoeda(valorEfetivo)})` : "");

        resumo.append(`
          <div class="resumo-item">
            <span>${acao.codigo}: ${percentual}%</span>
            <span>+${novaQuantidade} un. (${formatarMoeda(valorEfetivo)})</span>
          </div>
        `);
      } else {
        $(`#nova-${index}`).text("");
      }
    });

    // Restante da função permanece igual...
  }

  function aplicarRateio() {
    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0

    if (valorRateio <= 0) {
      alert("⚠️ Informe um valor válido para rateio")
      return
    }

    let aplicouAlgum = false
    const operacoesRealizadas = []

    $(".alocacao-item").each(function () {
      const index = $(this).data("index")
      const percentual = Number.parseInt($(this).find(".alocacao-percentual").val()) || 0

      if (percentual > 0) {
        const acao = carteira[index]
        const cotacao = cotacoes[acao.codigo + ".SA"]
        const valorAtual = cotacao ? cotacao.preco : acao.valor
        const valorAlocado = (valorRateio * percentual) / 100
        const novaQuantidade = Math.floor(valorAlocado / valorAtual)

        if (novaQuantidade > 0) {
          // Calcula o novo preço médio - mesma lógica do script principal
          const totalInicial = acao.quantidade * acao.valor
          const totalAdicionado = novaQuantidade * valorAtual
          const novoTotalQuantidade = acao.quantidade + novaQuantidade
          const novoPrecoMedio = (totalInicial + totalAdicionado) / novoTotalQuantidade

          // Atualiza a carteira
          carteira[index] = {
            ...acao,
            quantidade: novoTotalQuantidade,
            valor: Number.parseFloat(novoPrecoMedio.toFixed(2)),
          }

          operacoesRealizadas.push({
            codigo: acao.codigo,
            quantidadeAnterior: acao.quantidade,
            quantidadeAdicionada: novaQuantidade,
            quantidadeNova: novoTotalQuantidade,
            precoMedioAnterior: acao.valor,
            precoMedioNovo: Number.parseFloat(novoPrecoMedio.toFixed(2)),
            valorInvestido: novaQuantidade * valorAtual,
          })

          aplicouAlgum = true
        }
      }
    })

    if (aplicouAlgum) {
      // Salva a carteira atualizada - usando mesma função do script principal
      salvarDados()

      // Mostra resumo detalhado das operações
      let mensagem = "✅ Rateio aplicado com sucesso!\n\nOperações realizadas:\n\n"
      operacoesRealizadas.forEach((op) => {
        mensagem += `${op.codigo}:\n`
        mensagem += `  • Quantidade: ${op.quantidadeAnterior} → ${op.quantidadeNova} (+${op.quantidadeAdicionada})\n`
        mensagem += `  • Preço médio: ${formatarMoeda(op.precoMedioAnterior)} → ${formatarMoeda(op.precoMedioNovo)}\n`
        mensagem += `  • Valor investido: ${formatarMoeda(op.valorInvestido)}\n\n`
      })

      alert(mensagem)

      // Limpa os campos
      $("#valorRateio").val("")
      $(".alocacao-percentual").val(0)

      // Atualiza a visualização
      renderizarAlocacoes()

      // Opcional: redirecionar para a página principal após alguns segundos
      setTimeout(() => {
        if (confirm("Deseja voltar para a página principal da carteira?")) {
          window.location.href = "../index.html"
        }
      }, 2000)
    } else {
      alert("⚠️ Nenhuma alocação válida foi encontrada. Verifique os percentuais e o valor do rateio.")
    }
  }

  init()
})
