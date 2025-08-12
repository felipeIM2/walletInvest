function aplicarRateio() {
    if (!podeAplicarRateio()) {
      // Mostra modal de erro em vez de alert
      $("#modalErroContent").html("Não é possível aplicar o rateio. Verifique os valores e quantidades.");
      $("#modalErro").show();
      return;
    }

    valorRateio = parseFloat($("#valorRateio").val()) || 0
    let aplicouAlgum = false
    const operacoesRealizadas = []
    const estrategia = $("#estrategiaRateio").val()

    $(".alocacao-item").each(function () {
      const index = $(this).data("index")
      let quantidade = 0
      let valorEfetivo = 0

      if (estrategia === "manual") {
        // No modo manual, pega a quantidade diretamente
        quantidade = parseInt($(this).find(".alocacao-quantidade").val()) || 0
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade)
          valorEfetivo = resultado.valorEfetivo
        }
      } else {
        // Nos outros modos, pega a quantidade calculada
        quantidade = parseInt($(this).find(".alocacao-quantidade-calculada").val()) || 0
        if (quantidade > 0) {
          const acao = carteira[index]
          const cotacao = cotacoes[acao.codigo + ".SA"]
          const valorAtual = cotacao ? cotacao.preco : acao.valor
          valorEfetivo = quantidade * valorAtual
        }
      }

      if (quantidade > 0) {
        const acao = carteira[index]
        const cotacao = cotacoes[acao.codigo + ".SA"]
        const valorAtual = cotacao ? cotacao.preco : acao.valor
        
        const totalInicial = acao.quantidade * acao.valor
        const totalAdicionado = valorEfetivo
        const novoTotalQuantidade = acao.quantidade + quantidade
        const novoPrecoMedio = (totalInicial + totalAdicionado) / novoTotalQuantidade

        carteira[index] = {
          ...acao,
          quantidade: novoTotalQuantidade,
          valor: parseFloat(novoPrecoMedio.toFixed(2)),
        }

        operacoesRealizadas.push({
          codigo: acao.codigo,
          quantidadeAnterior: acao.quantidade,
          quantidadeAdicionada: quantidade,
          quantidadeNova: novoTotalQuantidade,
          precoMedioAnterior: acao.valor,
          precoMedioNovo: parseFloat(novoPrecoMedio.toFixed(2)),
          valorInvestido: valorEfetivo,
        })

        aplicouAlgum = true
      }
    })

    if (aplicouAlgum) {
      salvarDados()

      let mensagem = "<h3>Operações realizadas:</h3><ul>"
      operacoesRealizadas.forEach((op) => {
        mensagem += `<li><strong>${op.codigo}:</strong><ul>`
        mensagem += `<li>Quantidade: ${op.quantidadeAnterior} → ${op.quantidadeNova} (+${op.quantidadeAdicionada})</li>`
        mensagem += `<li>Preço médio: ${formatarMoeda(op.precoMedioAnterior)} → ${formatarMoeda(op.precoMedioNovo)}</li>`
        mensagem += `<li>Valor investido: ${formatarMoeda(op.valorInvestido)}</li></ul></li>`
      })
      mensagem += "</ul>"

      // Mostra modal de sucesso
      $("#modalRateioContent").html(mensagem)
      $("#modalRateio").show()
      
      // Limpa os campos
      $("#valorRateio").val("")
      $(".alocacao-percentual").val(0)
      $(".alocacao-quantidade").val(0)
      $(".alocacao-quantidade-calculada").val(0)
      $(".percentual-display").text("0%")

      // Atualiza a visualização
      renderizarAlocacoes()
    } else {
      // Mostra modal de erro
      $("#modalErroContent").html("Nenhuma alocação válida foi encontrada. Verifique os valores e quantidades.")
      $("#modalErro").show()
    }
  }
  
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
    return $.getJSON("../../server/db/cotacoes.json")
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
    const inputsQuantidadeCalculada = $(".alocacao-quantidade-calculada")
    const percentualDisplay = $(".percentual-display")
    const percentSymbol = $(".percent-symbol")
    const unidadeSymbol = $(".unidade-symbol")
    const botoes = $(".btn-aumentar, .btn-diminuir")

    if (estrategia === "manual") {
      // No modo manual, mostra campos de quantidade e percentual como exibição
      inputsQuantidade.show().prop("disabled", false)
      inputsQuantidadeCalculada.hide()
      percentualDisplay.show()
      inputsPercentual.hide()
      percentSymbol.hide()
      unidadeSymbol.hide()
      botoes.show().prop("disabled", false).css({
        opacity: "1",
        cursor: "pointer",
      })
    } else {
      // Nos outros modos, mostra quantidade calculada e esconde percentual
      inputsQuantidade.hide()
      inputsQuantidadeCalculada.show().prop("disabled", true).css({
        "background-color": "#f0f0f0",
        cursor: "not-allowed",
      })
      percentualDisplay.hide()
      inputsPercentual.hide()
      percentSymbol.hide()
      unidadeSymbol.show()
      botoes.hide()
    }
  }

  // NOVA FUNÇÃO: Calcula rateio igualitário por unidades
  function calcularRateioIgual() {
    if (!valorRateio || valorRateio <= 0) {
      $(".alocacao-quantidade-calculada").val(0)
      return
    }

    // Pega os valores atuais de todas as ações
    const valoresAcoes = carteira.map((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      return cotacao ? cotacao.preco : acao.valor
    })

    const somaValores = valoresAcoes.reduce((sum, valor) => sum + valor, 0)
    
    // Calcula quantas unidades podem ser distribuídas igualmente
    const unidadesPorAcao = valorRateio / somaValores
    let quantidadeIgual = Math.floor(unidadesPorAcao + 0.5) // Arredonda com regra especificada
    
    // Verifica se é possível comprar essa quantidade para todas as ações
    let valorTotal = quantidadeIgual * somaValores
    
    // Se exceder o valor disponível, diminui em 1
    if (valorTotal > valorRateio) {
      quantidadeIgual = Math.max(0, quantidadeIgual - 1)
      valorTotal = quantidadeIgual * somaValores
    }
    
    // Verifica se ainda é possível fazer o rateio igualitário
    // Se não conseguir pelo menos 1 unidade para cada, retorna 0 para todas
    if (quantidadeIgual < 1) {
      $(".alocacao-quantidade-calculada").val(0)
      return
    }
    
    // Aplica a quantidade calculada para todas as ações
    $(".alocacao-quantidade-calculada").each(function(index) {
      $(this).val(quantidadeIgual)
    })
  }

  // NOVA FUNÇÃO: Calcula rateio proporcional com priorização
  function calcularRateioProporcional() {
    if (!valorRateio || valorRateio <= 0) {
      $(".alocacao-quantidade-calculada").val(0)
      return
    }

    // Identifica ações prioritárias (valorAtual < acao.valor)
    const acoesInfo = carteira.map((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      const valorAtual = cotacao ? cotacao.preco : acao.valor
      const isPrioritaria = valorAtual < acao.valor
      
      return {
        index: index,
        acao: acao,
        valorAtual: valorAtual,
        isPrioritaria: isPrioritaria,
        quantidade: acao.quantidade
      }
    })

    const acoesPrioritarias = acoesInfo.filter(info => info.isPrioritaria)
    const acoesNormais = acoesInfo.filter(info => !info.isPrioritaria)
    
    // Limpa todos os campos primeiro
    $(".alocacao-quantidade-calculada").val(0)
    
    if (acoesPrioritarias.length === 0) {
      // Se não há ações prioritárias, aplica filtros sequenciais
      aplicarFiltrosSequenciais(acoesInfo)
      return
    }
    
    let valorPrioritario = Math.floor(valorRateio * 0.6) // 60% para prioritárias
    let valorNormal = valorRateio - valorPrioritario // 40% para normais
    
    // Caso especial: múltiplas ações prioritárias
    if (acoesPrioritarias.length > 1) {
      const Z = calcularZ(acoesPrioritarias, acoesNormais)
      
      if (Z > 0) {
        const somaValoresPrioritarios = acoesPrioritarias.reduce((sum, info) => sum + info.valorAtual, 0)
        const proporcao = (Z * 100 / somaValoresPrioritarios) - 100
        
        if (proporcao > 30) {
          // 100% para prioritárias, 0% para normais
          valorPrioritario = valorRateio
          valorNormal = 0
        } else if (proporcao >= 40) {
          // Mantém 60% para prioritárias, 40% para normais
          valorPrioritario = Math.floor(valorRateio * 0.6)
          valorNormal = valorRateio - valorPrioritario
        }
      }
    }
    
    // Distribui entre ações prioritárias
    if (valorPrioritario > 0 && acoesPrioritarias.length > 0) {
      distribuirValorEntreAcoes(acoesPrioritarias, valorPrioritario)
    }
    
    // Distribui entre ações normais
    if (valorNormal > 0 && acoesNormais.length > 0) {
      distribuirValorEntreAcoes(acoesNormais, valorNormal)
    }
  }

  // NOVA FUNÇÃO: Aplica filtros sequenciais quando não há ações prioritárias
  function aplicarFiltrosSequenciais(acoesInfo) {
    // Filtro 1: Por quantidade (prioriza quem tem mais)
    const maxQuantidade = Math.max(...acoesInfo.map(info => info.quantidade))
    const acoesComMaisQuantidade = acoesInfo.filter(info => info.quantidade === maxQuantidade)
    
    if (acoesComMaisQuantidade.length === 1) {
      // Encontrou uma ação com mais quantidade
      const acaoEscolhida = acoesComMaisQuantidade[0]
      const demaisAcoes = acoesInfo.filter(info => info.index !== acaoEscolhida.index)
      
      distribuirComPrioridade(acaoEscolhida, demaisAcoes, 0.5) // 50% para a escolhida
      return
    }
    
    // Se há empate na quantidade, vai para o próximo filtro
    let acoesParaProximoFiltro = acoesComMaisQuantidade
    
    // Filtro 2: Por valor (prioriza a mais barata)
    const menorValor = Math.min(...acoesParaProximoFiltro.map(info => info.valorAtual))
    const acoesComMenorValor = acoesParaProximoFiltro.filter(info => info.valorAtual === menorValor)
    
    if (acoesComMenorValor.length === 1) {
      // Encontrou uma ação mais barata
      const acaoEscolhida = acoesComMenorValor[0]
      const demaisAcoes = acoesInfo.filter(info => info.index !== acaoEscolhida.index)
      
      distribuirComPrioridade(acaoEscolhida, demaisAcoes, 0.5) // 50% para a escolhida
      return
    }
    
    // Se ainda há empate, distribui igualmente
    calcularRateioIgual()
  }

  // NOVA FUNÇÃO: Distribui valor com prioridade para uma ação específica
  function distribuirComPrioridade(acaoEscolhida, demaisAcoes, percentualEscolhida) {
    const valorEscolhida = Math.floor(valorRateio * percentualEscolhida)
    const valorDemais = valorRateio - valorEscolhida
    
    // Distribui para a ação escolhida
    const quantidadeEscolhida = Math.floor(valorEscolhida / acaoEscolhida.valorAtual)
    if (quantidadeEscolhida > 0) {
      $(".alocacao-quantidade-calculada").eq(acaoEscolhida.index).val(quantidadeEscolhida)
    }
    
    // Distribui o restante entre as demais ações
    if (valorDemais > 0 && demaisAcoes.length > 0) {
      distribuirValorEntreAcoes(demaisAcoes, valorDemais)
    }
  }

  // NOVA FUNÇÃO: Calcula o valor Z para múltiplas ações prioritárias
  function calcularZ(acoesPrioritarias, acoesNormais) {
    if (acoesPrioritarias.length < 2 || acoesNormais.length === 0) return 0
    
    const acao2 = acoesPrioritarias[0].valorAtual
    const acao3 = acoesPrioritarias[1].valorAtual
    const acao1 = acoesNormais[0].valorAtual
    
    const resultado = (Math.pow(acao2, 2) + Math.pow(acao3, 2)) / 10 - acao1
    
    return resultado > 0 ? Math.floor(resultado) : 0
  }

  // NOVA FUNÇÃO: Distribui valor entre um conjunto de ações
  function distribuirValorEntreAcoes(acoes, valorDisponivel) {
    if (acoes.length === 0 || valorDisponivel <= 0) return
    
    // Calcula quantas unidades podem ser compradas para cada ação
    const distribuicoes = acoes.map(info => {
      const quantidadeMaxima = Math.floor(valorDisponivel / (acoes.length * info.valorAtual))
      return {
        ...info,
        quantidade: Math.max(1, quantidadeMaxima) // Mínimo de 1 unidade
      }
    })
    
    // Verifica se é possível comprar pelo menos 1 unidade de cada
    const valorNecessario = distribuicoes.reduce((sum, dist) => sum + (dist.quantidade * dist.valorAtual), 0)
    
    if (valorNecessario > valorDisponivel) {
      // Se não couber, tenta distribuir com quantidade menor
      const quantidadeReduzida = Math.floor(valorDisponivel / distribuicoes.reduce((sum, dist) => sum + dist.valorAtual, 0))
      
      if (quantidadeReduzida >= 1) {
        distribuicoes.forEach(dist => {
          dist.quantidade = quantidadeReduzida
        })
      } else {
        // Se nem assim couber, não distribui nada
        return
      }
    }
    
    // Aplica as quantidades calculadas
    distribuicoes.forEach(dist => {
      $(".alocacao-quantidade-calculada").eq(dist.index).val(dist.quantidade)
    })
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

  // NOVA FUNÇÃO: Calcula percentual baseado na quantidade
  function calcularPercentualPorQuantidade(index, quantidade) {
    if (!valorRateio || quantidade <= 0) return { percentual: 0, valorEfetivo: 0 }
    
    const acao = carteira[index]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor
    
    const valorEfetivo = quantidade * valorAtual
    const percentual = valorRateio > 0 ? Math.round((valorEfetivo / valorRateio) * 100) : 0
    
    return { percentual, valorEfetivo, valorAtual }
  }

  // NOVA FUNÇÃO: Calcula o percentual máximo disponível (para modo percentual)
  function calcularPercentualMaximo(indexAtual) {
    let totalUtilizado = 0
    
    $(".alocacao-percentual").each(function(index) {
      if (index !== indexAtual) {
        const percentual = parseInt($(this).val()) || 0
        const resultado = calcularValorEfetivo(index, percentual)
        totalUtilizado += resultado.percentualEfetivo
      }
    })
    
    return Math.max(0, 100 - totalUtilizado)
  }

  // NOVA FUNÇÃO: Atualiza os limites máximos dos inputs de percentual
  function atualizarLimitesInputs() {
    $(".alocacao-percentual").each(function(index) {
      const percentualMaximo = calcularPercentualMaximo(index)
      $(this).attr('max', percentualMaximo)
      
      // Se o valor atual excede o máximo, ajusta
      const valorAtual = parseInt($(this).val()) || 0
      if (valorAtual > percentualMaximo) {
        $(this).val(percentualMaximo)
      }
    })
  }

  // NOVA FUNÇÃO: Valida e ajusta o input de percentual
  function validarEAjustarPercentual(input) {
    const index = input.closest('.alocacao-item').data('index')
    const percentualDigitado = parseInt(input.val()) || 0
    const percentualMaximo = calcularPercentualMaximo(index)
    
    // Limita ao máximo disponível
    const percentualLimitado = Math.min(percentualDigitado, percentualMaximo)
    
    // Calcula o valor efetivo e ajusta o percentual
    const resultado = calcularValorEfetivo(index, percentualLimitado)
    
    // Atualiza o input com o percentual efetivo
    input.val(resultado.percentualEfetivo)
    
    return resultado
  }

  // NOVA FUNÇÃO: Calcula quantidade máxima disponível (para modo manual)
  function calcularQuantidadeMaxima(indexAtual) {
    let valorUtilizado = 0
    
    // Soma valores já utilizados por outras ações
    $(".alocacao-quantidade").each(function(index) {
      if (index !== indexAtual) {
        const quantidade = parseInt($(this).val()) || 0
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade)
          valorUtilizado += resultado.valorEfetivo
        }
      }
    })
    
    const valorDisponivel = Math.max(0, valorRateio - valorUtilizado)
    
    // Calcula quantas ações podem ser compradas com o valor disponível
    const acao = carteira[indexAtual]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor
    
    return Math.floor(valorDisponivel / valorAtual)
  }

  // NOVA FUNÇÃO: Atualiza os limites máximos dos campos de quantidade
  function atualizarLimitesQuantidade() {
    $(".alocacao-quantidade").each(function(index) {
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      $(this).attr('max', quantidadeMaxima)
      
      // Se o valor atual excede o máximo, ajusta
      const valorAtual = parseInt($(this).val()) || 0
      if (valorAtual > quantidadeMaxima) {
        $(this).val(quantidadeMaxima)
        atualizarPercentualPorQuantidade($(this))
      }
    })
  }

  // NOVA FUNÇÃO: Atualiza o percentual baseado na quantidade
  function atualizarPercentualPorQuantidade(inputQuantidade) {
    const index = inputQuantidade.closest('.alocacao-item').data('index')
    const quantidade = parseInt(inputQuantidade.val()) || 0
    const resultado = calcularPercentualPorQuantidade(index, quantidade)
    
    // Atualiza o display do percentual
    const percentualDisplay = inputQuantidade.siblings('.percentual-display')
    percentualDisplay.text(quantidade > 0 ? `${resultado.percentual}%` : '0%')
    
    return resultado
  }

  function init() {
    if (carteira.length === 0) {
      mostrarAlertaCarteira()
      return
    }

    // Configura eventos dos modais
    $(".close-modal, #btnFecharRateio, #btnFecharErro").click(function() {
      $(this).closest(".modal").hide();
    });

    $("#btnSimRedirecionar").click(function() {
      window.location.href = "../carteira/";
    });

    $("#btnNaoRedirecionar").click(function() {
      $("#modalRedirecionar").hide();
    });

    // Mostra modal de redirecionamento após 2 segundos do sucesso
    $("#btnFecharRateio").click(function() {
      $("#modalRateio").hide();
      setTimeout(() => {
        $("#modalRedirecionar").show();
      }, 500);
    });

    carregarCotacoes().then(() => {
      renderizarAlocacoes()
      configurarEventos()
      controlarCamposPercentual()
      calcularRateio()
    })
  }
''
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
            <div style="display: flex; align-items: center;">
              <span class="alocacao-codigo">${acao.codigo}</span>
              <span style="font-size: 12px; color: #888; margin-left: 4px;">(${acao.categoria})</span>
              <span style="font-size: 12px; color: #888; margin-left: auto;">${acao.quantidade} unidade(s)</span>
            </div>
            <div class="alocacao-valor">
              ${formatarMoeda(valorAtual)} 
            </div>
            <div class="alocacao-nova" id="nova-${index}"></div>
          </div>
          <div class="alocacao-controle">
            <button class="btn-diminuir" type="button" style="display: none;"><i class="fas fa-minus"></i></button>
            <button class="btn-aumentar" type="button" style="display: none;"><i class="fas fa-plus"></i></button>
            
            <!-- Campo para quantidade (modo manual) -->
            <input type="number" class="alocacao-quantidade" value="0" min="0" step="1" 
                   style="display: none; width: 60px; margin-right: 5px;">
            <span class="percentual-display" style="display: none; font-size: 12px; color: #666; margin-right: 10px;">0%</span>
            
            <!-- Campo para quantidade calculada (outros modos) -->
            <input type="number" class="alocacao-quantidade-calculada" value="0" min="0" step="1" 
                   style="display: none; width: 60px;">
            <span class="unidade-symbol" style="display: none;">un</span>
            
            <!-- Campo para percentual (modo percentual - removido) -->
            <input type="number" class="alocacao-percentual" value="0" min="0" max="100" step="1" style="display: none;">
            <span class="percent-symbol" style="display: none;">%</span>
          </div>
        </div>
      `)
    })

    atualizarResumo()
  }

  function configurarEventos() {
    // Botões de aumentar quantidade (modo manual)
    $(document).on("click", ".btn-aumentar", function() {
      if ($(this).prop("disabled")) return
      
      const input = $(this).siblings(".alocacao-quantidade")
      const valorAtual = parseInt(input.val()) || 0
      const index = $(this).closest('.alocacao-item').data('index')
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      
      if (valorAtual < quantidadeMaxima) {
        input.val(valorAtual + 1)
        atualizarPercentualPorQuantidade(input)
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Botões de diminuir quantidade (modo manual)
    $(document).on("click", ".btn-diminuir", function() {
      if ($(this).prop("disabled")) return
      
      const input = $(this).siblings(".alocacao-quantidade")
      const valorAtual = parseInt(input.val()) || 0
      
      if (valorAtual > 0) {
        input.val(valorAtual - 1)
        atualizarPercentualPorQuantidade(input)
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Atualização quando muda quantidade manualmente
    $(document).on("change input", ".alocacao-quantidade", function() {
      if ($(this).prop("disabled")) return
      
      const index = $(this).closest('.alocacao-item').data('index')
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      let quantidade = parseInt($(this).val()) || 0
      
      // Limita à quantidade máxima
      if (quantidade > quantidadeMaxima) {
        quantidade = quantidadeMaxima
        $(this).val(quantidade)
      }
      
      atualizarPercentualPorQuantidade($(this))
      atualizarLimitesQuantidade()
      atualizarResumo()
    })

    // Controle da estratégia de rateio
    $("#estrategiaRateio").change(function() {
      controlarCamposPercentual()
      
      if ($(this).val() !== "manual") {
        calcularRateio()
      } else {
        // Limpa os campos ao entrar no modo manual
        $(".alocacao-quantidade").val(0)
        $(".alocacao-quantidade-calculada").val(0)
        $(".percentual-display").text("0%")
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Aplica o rateio à carteira
    $("#btnAplicar").click(aplicarRateio)

    // Atualiza quando muda o valor do rateio
    $("#valorRateio").on("input", function() {
      valorRateio = parseFloat($(this).val()) || 0
      
      if (valorRateio > 0) {
        const estrategia = $("#estrategiaRateio").val()
        
        if (estrategia === "manual") {
          // No modo manual, revalida as quantidades
          $(".alocacao-quantidade").each(function() {
            atualizarPercentualPorQuantidade($(this))
          })
          atualizarLimitesQuantidade()
        } else {
          // Nos outros modos, recalcula o rateio
          calcularRateio()
        }
        
        atualizarResumo()
      } else {
        // Limpa todos os campos
        $(".alocacao-percentual").val(0).attr('max', 100)
        $(".alocacao-quantidade").val(0)
        $(".alocacao-quantidade-calculada").val(0)
        $(".percentual-display").text("0%")
        atualizarResumo()
      }
    })
  }

  function calcularRateio() {
      const estrategia = $("#estrategiaRateio").val();
      valorRateio = parseFloat($("#valorRateio").val()) || 0;

      // Primeiro, limpa todos os valores para evitar interferências
      $(".alocacao-quantidade-calculada").val(0);

      if (estrategia === "igual") {
        calcularRateioIgual();
      } else if (estrategia === "proporcional") {
        calcularRateioProporcional();
      }

      atualizarResumo();
  }

  
  function podeAplicarRateio() {
    const valor = parseFloat($("#valorRateio").val()) || 0
    if (valor <= 0) return false

    let temAlocacao = false
    const estrategia = $("#estrategiaRateio").val()

    if (estrategia === "manual") {
      // No modo manual, verifica se há quantidade definida
      $(".alocacao-quantidade").each(function() {
        const q = parseInt($(this).val()) || 0
        if (q > 0) temAlocacao = true
      })
    } else {
      // Nos outros modos, verifica se há quantidade calculada
      $(".alocacao-quantidade-calculada").each(function() {
        const q = parseInt($(this).val()) || 0
        if (q > 0) temAlocacao = true
      })
    }

    return temAlocacao
  }

  function atualizarResumo() {
    valorRateio = parseFloat($("#valorRateio").val()) || 0
    const resumo = $("#resumoRateio")
    resumo.empty()

    let valorTotalEfetivo = 0
    const alocacoes = []
    const estrategia = $("#estrategiaRateio").val()

    // Calcula valores efetivos para cada ação
    $(".alocacao-item").each(function() {
      const index = $(this).data("index")
      let quantidade = 0
      let valorEfetivo = 0

      if (estrategia === "manual") {
        // No modo manual, pega a quantidade definida
        quantidade = parseInt($(this).find(".alocacao-quantidade").val()) || 0
        
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade)
          valorEfetivo = resultado.valorEfetivo
        }
      } else {
        // Nos outros modos, pega a quantidade calculada
        quantidade = parseInt($(this).find(".alocacao-quantidade-calculada").val()) || 0
        
        if (quantidade > 0) {
          const acao = carteira[index]
          const cotacao = cotacoes[acao.codigo + ".SA"]
          const valorAtual = cotacao ? cotacao.preco : acao.valor
          valorEfetivo = quantidade * valorAtual
        }
      }
      
      if (quantidade > 0) {
        const acao = carteira[index]
        const percentual = valorRateio > 0 ? Math.round((valorEfetivo / valorRateio) * 100) : 0
        
        alocacoes.push({
          codigo: acao.codigo,
          quantidade: quantidade,
          valorEfetivo: valorEfetivo,
          percentual: percentual
        })
        
        valorTotalEfetivo += valorEfetivo
      }
      
      // Atualiza a exibição da nova quantidade
      $(`#nova-${index}`).text(
        quantidade > 0 
          ? `+${quantidade} un (${formatarMoeda(valorEfetivo)})`
          : ""
      )
    })

    // Exibe resumo das alocações
    alocacoes.forEach(item => {
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
      // Mostra modal de erro em vez de alert
      $("#modalErroContent").html("Não é possível aplicar o rateio. Verifique os valores e quantidades.");
      $("#modalErro").show();
      return;
    }

    valorRateio = parseFloat($("#valorRateio").val()) || 0;
    let aplicouAlgum = false;
    const operacoesRealizadas = [];
    const estrategia = $("#estrategiaRateio").val();

    $(".alocacao-item").each(function () {
      const index = $(this).data("index");
      let quantidade = 0;
      let valorEfetivo = 0;

      if (estrategia === "manual") {
        quantidade = parseInt($(this).find(".alocacao-quantidade").val()) || 0;
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade);
          valorEfetivo = resultado.valorEfetivo;
        }
      } else {
        quantidade = parseInt($(this).find(".alocacao-quantidade-calculada").val()) || 0;
        if (quantidade > 0) {
          const acao = carteira[index];
          const cotacao = cotacoes[acao.codigo + ".SA"];
          const valorAtual = cotacao ? cotacao.preco : acao.valor;
          valorEfetivo = quantidade * valorAtual;
        }
      }

      if (quantidade > 0) {
        const acao = carteira[index];
        const cotacao = cotacoes[acao.codigo + ".SA"];
        const valorAtual = cotacao ? cotacao.preco : acao.valor;
        
        const totalInicial = acao.quantidade * acao.valor;
        const totalAdicionado = valorEfetivo;
        const novoTotalQuantidade = acao.quantidade + quantidade;
        const novoPrecoMedio = (totalInicial + totalAdicionado) / novoTotalQuantidade;

        carteira[index] = {
          ...acao,
          quantidade: novoTotalQuantidade,
          valor: parseFloat(novoPrecoMedio.toFixed(2)),
        };

        operacoesRealizadas.push({
          codigo: acao.codigo,
          quantidadeAnterior: acao.quantidade,
          quantidadeAdicionada: quantidade,
          quantidadeNova: novoTotalQuantidade,
          precoMedioAnterior: acao.valor,
          precoMedioNovo: parseFloat(novoPrecoMedio.toFixed(2)),
          valorInvestido: valorEfetivo,
        });

        aplicouAlgum = true;
      }
    });

    if (aplicouAlgum) {
      salvarDados();

      let mensagem = "<h3>Operações realizadas:</h3><ul>";
      operacoesRealizadas.forEach((op) => {
        mensagem += `<li><strong>${op.codigo}:</strong><ul>`;
        mensagem += `<li>Quantidade: ${op.quantidadeAnterior} → ${op.quantidadeNova} (+${op.quantidadeAdicionada})</li>`;
        mensagem += `<li>Preço médio: ${formatarMoeda(op.precoMedioAnterior)} → ${formatarMoeda(op.precoMedioNovo)}</li>`;
        mensagem += `<li>Valor investido: ${formatarMoeda(op.valorInvestido)}</li></ul></li>`;
      });
      mensagem += "</ul>";

      // Mostra modal de sucesso
      $("#modalRateioContent").html(mensagem);
      $("#modalRateio").show();
      
      // Limpa os campos
      $("#valorRateio").val("");
      $(".alocacao-percentual").val(0);
      $(".alocacao-quantidade").val(0);
      $(".alocacao-quantidade-calculada").val(0);
      $(".percentual-display").text("0%");

      // Atualiza a visualização
      renderizarAlocacoes();
    } else {
      // Mostra modal de erro
      $("#modalErroContent").html("Nenhuma alocação válida foi encontrada. Verifique os valores e quantidades.");
      $("#modalErro").show();
    }
  }

  init()
})