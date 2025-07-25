

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
    const inputsPercentual = $(".alocacao-percentual")
    const inputsQuantidade = $(".alocacao-quantidade")
    // const botoes = $(".btn-aumentar, .btn-diminuir")
    const botoesQuantidade = $(".btn-aumentar, .btn-diminuir")

    if (estrategia === "manual") {
      // Esconde controles de percentual e mostra controles de quantidade
      $(".controle-percentual").hide()
      $(".controle-quantidade").show()

      inputsQuantidade.prop("disabled", false).css({
        "background-color": "",
        cursor: "text",
      })
      botoesQuantidade.prop("disabled", false).css({
        opacity: "1",
        cursor: "pointer",
      })

      // Desabilita controles de percentual
      inputsPercentual.prop("disabled", true)
      // botoes.prop("disabled", true)
    } else {
      // Mostra controles de percentual e esconde controles de quantidade
      $(".controle-percentual").show()
      $(".controle-quantidade").hide()

      inputsPercentual.prop("disabled", false).css({
        "background-color": "",
        cursor: "text",
      })
      // botoes.prop("disabled", false).css({
      //   opacity: "1",
      //   cursor: "pointer",
      // })

      // Desabilita controles de quantidade
      inputsQuantidade.prop("disabled", true)
      botoesQuantidade.prop("disabled", true)
    }
  }

  // Calcula valores baseado na quantidade definida
  function calcularPorQuantidade(index, quantidade) {
    if (!valorRateio || quantidade <= 0) return { percentual: 0, valorNecessario: 0, quantidade: 0 }

    const acao = carteira[index]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor

    const valorNecessario = quantidade * valorAtual
    const percentual = valorRateio > 0 ? Math.round((valorNecessario / valorRateio) * 100) : 0

    return { percentual, valorNecessario, quantidade, valorAtual }
  }

  // Calcula a quantidade máxima disponível baseada no valor restante
  function calcularQuantidadeMaxima(indexAtual) {
    let valorUtilizado = 0

    $(".alocacao-quantidade").each(function (index) {
      if (index !== indexAtual) {
        const quantidade = Number.parseInt($(this).val()) || 0
        const resultado = calcularPorQuantidade(index, quantidade)
        valorUtilizado += resultado.valorNecessario
      }
    })

    const valorDisponivel = Math.max(0, valorRateio - valorUtilizado)
    const acao = carteira[indexAtual]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor

    return Math.floor(valorDisponivel / valorAtual)
  }

  // Atualiza os limites máximos dos inputs de quantidade
  function atualizarLimitesQuantidade() {
    $(".alocacao-quantidade").each(function (index) {
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      $(this).attr("max", quantidadeMaxima)

      // Se o valor atual excede o máximo, ajusta
      const valorAtual = Number.parseInt($(this).val()) || 0
      if (valorAtual > quantidadeMaxima) {
        $(this).val(quantidadeMaxima)
      }
    })
  }

  // Valida e atualiza a quantidade e percentual
  function validarEAtualizarQuantidade(input) {
    const index = input.closest(".alocacao-item").data("index")
    const quantidadeDigitada = Number.parseInt(input.val()) || 0
    const quantidadeMaxima = calcularQuantidadeMaxima(index)

    // Limita ao máximo disponível
    const quantidadeLimitada = Math.min(quantidadeDigitada, quantidadeMaxima)
    input.val(quantidadeLimitada)

    // Calcula e atualiza o percentual correspondente
    const resultado = calcularPorQuantidade(index, quantidadeLimitada)

    // Atualiza o display do percentual
    const percentualDisplay = input.closest(".alocacao-item").find(".percentual-display")
    percentualDisplay.text(resultado.percentual > 0 ? `${resultado.percentual}%` : "0%")

    // Atualiza o input de percentual oculto para manter compatibilidade
    input.closest(".alocacao-item").find(".alocacao-percentual").val(resultado.percentual)

    return resultado
  }

  // NOVA FUNÇÃO: Calcula o valor efetivo baseado no percentual e ajusta de volta
  function calcularValorEfetivo(index, percentual) {
    if (!valorRateio || percentual <= 0) return { percentualEfetivo: 0, quantidade: 0, valorEfetivo: 0 }

    const acao = carteira[index]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor

    const valorTeorico = (valorRateio * percentual) / 100
    const quantidade = Math.floor(valorTeorico / valorAtual)
    const valorEfetivo = quantidade * valorAtual
    const percentualEfetivo = valorRateio > 0 ? Math.round((valorEfetivo / valorRateio) * 100) : 0

    return { percentualEfetivo, quantidade, valorEfetivo, valorAtual }
  }

  // NOVA FUNÇÃO: Calcula o percentual máximo disponível
  function calcularPercentualMaximo(indexAtual) {
    let totalUtilizado = 0

    $(".alocacao-percentual").each(function (index) {
      if (index !== indexAtual) {
        const percentual = Number.parseInt($(this).val()) || 0
        const resultado = calcularValorEfetivo(index, percentual)
        totalUtilizado += resultado.percentualEfetivo
      }
    })

    return Math.max(0, 100 - totalUtilizado)
  }

  // NOVA FUNÇÃO: Atualiza os limites máximos dos inputs
  function atualizarLimitesInputs() {
    $(".alocacao-percentual").each(function (index) {
      const percentualMaximo = calcularPercentualMaximo(index)
      $(this).attr("max", percentualMaximo)

      // Se o valor atual excede o máximo, ajusta
      const valorAtual = Number.parseInt($(this).val()) || 0
      if (valorAtual > percentualMaximo) {
        $(this).val(percentualMaximo)
      }
    })
  }

  // NOVA FUNÇÃO: Valida e ajusta o input de percentual
  function validarEAjustarPercentual(input) {
    const index = input.closest(".alocacao-item").data("index")
    const percentualDigitado = Number.parseInt(input.val()) || 0
    const percentualMaximo = calcularPercentualMaximo(index)

    // Limita ao máximo disponível
    const percentualLimitado = Math.min(percentualDigitado, percentualMaximo)

    // Calcula o valor efetivo e ajusta o percentual
    const resultado = calcularValorEfetivo(index, percentualLimitado)

    // Atualiza o input com o percentual efetivo
    input.val(resultado.percentualEfetivo)

    return resultado
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
          
          <!-- Controles de Percentual (para estratégias automáticas) -->
          <div class="alocacao-controle controle-percentual">
            <input class="alocacao-percentual" value="0" min="0" max="100" step="1" >
            <span>%</span>
          </div>
          
          <!-- Controles de Quantidade (para modo manual) -->
          <div class="alocacao-controle controle-quantidade" style="display: none;">
            <button class="btn-diminuir" type="button"><i class="fas fa-minus"></i></button>
            <button class="btn-aumentar" type="button"><i class="fas fa-plus"></i></button>
            <input  class="alocacao-quantidade" value="0" min="0" step="1">
            <span>un.</span>
            <span class="percentual-display" style="margin-left: 10px; font-weight: bold; color: #007bff;">0%</span>
          </div>
        </div>
      `)
    })
    atualizarResumo()
  }

  function configurarEventos() {

  

    // Botões de aumentar quantidade
    $(document).on("click", ".btn-aumentar", function () {
      if ($(this).prop("disabled")) return

      const input = $(this).siblings(".alocacao-quantidade")
      const valorAtual = Number.parseInt(input.val()) || 0
      const index = $(this).closest(".alocacao-item").data("index")
      const quantidadeMaxima = calcularQuantidadeMaxima(index)

      if (valorAtual < quantidadeMaxima) {
        input.val(valorAtual + 1)
        validarEAtualizarQuantidade(input)
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Botões de diminuir quantidade
    $(document).on("click", ".btn-diminuir", function () {
      if ($(this).prop("disabled")) return

      const input = $(this).siblings(".alocacao-quantidade")
      const valorAtual = Number.parseInt(input.val()) || 0

      if (valorAtual > 0) {
        input.val(valorAtual - 1)
        validarEAtualizarQuantidade(input)
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Atualização quando muda porcentagem manualmente
    $(document).on("change input", ".alocacao-percentual", function () {
      if ($(this).prop("disabled")) return

      validarEAjustarPercentual($(this))
      atualizarLimitesInputs()
      atualizarResumo()
    })

    // Atualização quando muda quantidade manualmente
    $(document).on("change input", ".alocacao-quantidade", function () {
      if ($(this).prop("disabled")) return

      validarEAtualizarQuantidade($(this))
      atualizarLimitesQuantidade()
      atualizarResumo()
    })

    // Controle da estratégia de rateio
    $("#estrategiaRateio").change(function () {
      controlarCamposPercentual()

      if ($(this).val() !== "manual") {
        calcularRateio()
      } else {
        $(".alocacao-percentual").val(0)
        $(".alocacao-quantidade").val(0)
        $(".percentual-display").text("0%")
        atualizarLimitesInputs()
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Aplica o rateio à carteira
    $("#btnAplicar").click(aplicarRateio)

    // Atualiza quando muda o valor do rateio
    $("#valorRateio").on("input", function () {
      valorRateio = Number.parseFloat($(this).val()) || 0

      if (valorRateio > 0) {
        const estrategia = $("#estrategiaRateio").val()

        if (estrategia === "manual") {
          // Revalida todas as quantidades com o novo valor de rateio
          $(".alocacao-quantidade").each(function () {
            if (Number.parseInt($(this).val()) > 0) {
              validarEAtualizarQuantidade($(this))
            }
          })
          atualizarLimitesQuantidade()
        } else {
          // Revalida todos os percentuais com o novo valor de rateio
          $(".alocacao-percentual").each(function () {
            if (Number.parseInt($(this).val()) > 0) {
              validarEAjustarPercentual($(this))
            }
          })
          atualizarLimitesInputs()
          calcularRateio()
        }

        atualizarResumo()
      } else {
        $(".alocacao-percentual").val(0).attr("max", 100)
        $(".alocacao-quantidade").val(0)
        $(".percentual-display").text("0%")
        atualizarResumo()
      }
    })
  }

  function calcularRateio() {
    const estrategia = $("#estrategiaRateio").val()
    const inputs = $(".alocacao-percentual")
    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0

    // Primeiro, limpa todos os valores para evitar interferências
    inputs.val(0)
    $(".alocacao-quantidade").val(0)
    $(".percentual-display").text("0%")

    if (estrategia === "proporcional") {
      const totais = carteira.map((acao) => {
        const cotacao = cotacoes[acao.codigo + ".SA"]
        const valorAtual = cotacao ? cotacao.preco : acao.valor
        return valorAtual * acao.quantidade
      })

      const totalGeral = totais.reduce((sum, val) => sum + val, 0)

      if (totalGeral > 0) {
        // Aplica percentuais proporcionais sequencialmente
        inputs.each((index, input) => {
          const percentualTeorico = Math.round((totais[index] / totalGeral) * 100)
          $(input).val(percentualTeorico)
          validarEAjustarPercentual($(input))
        })
      }
    } else if (estrategia === "igual") {
      // Distribui igualmente, considerando as limitações de cada ação
      const percentualIdeal = Math.floor(100 / carteira.length)
      let percentualRestante = 100

      inputs.each((index, input) => {
        // Para as últimas ações, usa todo o percentual restante disponível
        const isUltima = index === inputs.length - 1
        const percentualTentativa = isUltima ? percentualRestante : percentualIdeal

        $(input).val(percentualTentativa)
        const resultado = validarEAjustarPercentual($(input))

        // Subtrai o percentual efetivamente usado
        percentualRestante -= resultado.percentualEfetivo
      })
    }

    atualizarLimitesInputs()
    atualizarResumo()
  }

  function podeAplicarRateio() {
    const valor = Number.parseFloat($("#valorRateio").val()) || 0
    if (valor <= 0) return false

    let temPercentualPositivo = false
    $(".alocacao-percentual").each(function () {
      const p = Number.parseInt($(this).val()) || 0
      if (p > 0) temPercentualPositivo = true
    })

    return temPercentualPositivo
  }

  function atualizarResumo() {
    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0
    const resumo = $("#resumoRateio")
    resumo.empty()

    let valorTotalEfetivo = 0
    const alocacoes = []

    // Calcula valores efetivos para cada ação
    $(".alocacao-item").each(function () {
      const index = $(this).data("index")
      const percentual = Number.parseInt($(this).find(".alocacao-percentual").val()) || 0
      const resultado = calcularValorEfetivo(index, percentual)

      if (resultado.quantidade > 0) {
        const acao = carteira[index]
        alocacoes.push({
          codigo: acao.codigo,
          percentual: resultado.percentualEfetivo,
          quantidade: resultado.quantidade,
          valorEfetivo: resultado.valorEfetivo,
        })

        valorTotalEfetivo += resultado.valorEfetivo
      }

      // Atualiza a exibição da nova quantidade
      $(`#nova-${index}`).text(
        resultado.quantidade > 0 ? `+${resultado.quantidade} un. (${formatarMoeda(resultado.valorEfetivo)})` : "",
      )
    })

    // Exibe resumo das alocações
    alocacoes.forEach((item) => {
      resumo.append(`
        <div class="resumo-item">
          <span>${item.codigo}: ${item.percentual}%</span>
          <span>+${item.quantidade} un. (${formatarMoeda(item.valorEfetivo)})</span>
        </div>
      `)
    })

    // Exibe totais
    if (valorTotalEfetivo > 0) {
      resumo.append(`
        <div class="resumo-total">
          <span>Total alocado:</span>
          <span>${formatarMoeda(valorTotalEfetivo)}</span>
        </div>
      `)
    }

    const valorNaoAlocado = valorRateio - valorTotalEfetivo
    if (valorNaoAlocado > 0) {
      resumo.append(`
        <div class="resumo-restante">
          <span>Valor não alocado:</span>
          <span>${formatarMoeda(valorNaoAlocado)}</span>
        </div>
      `)
    }

    // Atualiza estado do botão Aplicar
    $("#btnAplicar").prop("disabled", !podeAplicarRateio())
  }

  function aplicarRateio() {
    if (!podeAplicarRateio()) {
      alert("⚠️ Não é possível aplicar o rateio. Verifique os valores e percentuais.")
      return
    }

    valorRateio = Number.parseFloat($("#valorRateio").val()) || 0
    let aplicouAlgum = false
    const operacoesRealizadas = []

    $(".alocacao-item").each(function () {
      const index = $(this).data("index")
      const percentual = Number.parseInt($(this).find(".alocacao-percentual").val()) || 0
      const resultado = calcularValorEfetivo(index, percentual)

      if (resultado.quantidade > 0) {
        const acao = carteira[index]
        const totalInicial = acao.quantidade * acao.valor
        const totalAdicionado = resultado.valorEfetivo
        const novoTotalQuantidade = acao.quantidade + resultado.quantidade
        const novoPrecoMedio = (totalInicial + totalAdicionado) / novoTotalQuantidade

        carteira[index] = {
          ...acao,
          quantidade: novoTotalQuantidade,
          valor: Number.parseFloat(novoPrecoMedio.toFixed(2)),
        }

        operacoesRealizadas.push({
          codigo: acao.codigo,
          quantidadeAnterior: acao.quantidade,
          quantidadeAdicionada: resultado.quantidade,
          quantidadeNova: novoTotalQuantidade,
          precoMedioAnterior: acao.valor,
          precoMedioNovo: Number.parseFloat(novoPrecoMedio.toFixed(2)),
          valorInvestido: resultado.valorEfetivo,
        })

        aplicouAlgum = true
      }
    })

    if (aplicouAlgum) {
      salvarDados()

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
      $(".alocacao-quantidade").val(0)
      $(".percentual-display").text("0%")

      // Atualiza a visualização
      renderizarAlocacoes()

      // Redirecionamento opcional
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
