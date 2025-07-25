function aplicarRateio() {
    if (!podeAplicarRateio()) {
      alert("⚠️ Não é possível aplicar o rateio. Verifique os valores e quantidades.")
      return
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
        // Nos outros modos, calcula baseado no percentual
        const percentual = parseInt($(this).find(".alocacao-percentual").val()) || 0
        if (percentual > 0) {
          const resultado = calcularValorEfetivo(index, percentual)
          quantidade = resultado.quantidade
          valorEfetivo = resultado.valorEfetivo
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
      alert("⚠️ Nenhuma alocação válida foi encontrada. Verifique os valores e quantidades.")
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
    const percentualDisplay = $(".percentual-display")
    const percentSymbol = $(".percent-symbol")
    const botoes = $(".btn-aumentar, .btn-diminuir")

    if (estrategia === "manual") {
      // No modo manual, mostra campos de quantidade e percentual como exibição
      inputsQuantidade.show().prop("disabled", false)
      percentualDisplay.show()
      inputsPercentual.hide()
      percentSymbol.hide()
      botoes.show().prop("disabled", false).css({
        opacity: "1",
        cursor: "pointer",
      })
    } else {
      // Nos outros modos, mostra percentual e esconde quantidade
      inputsQuantidade.hide()
      percentualDisplay.hide()
      inputsPercentual.show().prop("disabled", true).css({
        "background-color": "#f0f0f0",
        cursor: "not-allowed",
      })
      percentSymbol.show()
      botoes.hide()
    }
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

  // NOVA FUNÇÃO: Calcula o percentual máximo disponível
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

  // NOVA FUNÇÃO: Atualiza os limites máximos dos inputs
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
      window.location.href = "../../index.html";
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
            <button class="btn-diminuir" type="button" style="display: none;"><i class="fas fa-minus"></i></button>
            <button class="btn-aumentar" type="button" style="display: none;"><i class="fas fa-plus"></i></button>
            
            <!-- Campo para quantidade (modo manual) -->
            <input type="number" class="alocacao-quantidade" value="0" min="0" step="1" 
                   style="display: none; width: 60px; margin-right: 5px;">
            <span class="percentual-display" style="display: none; font-size: 12px; color: #666; margin-right: 10px;">0%</span>
            
            <!-- Campo para percentual (outros modos) -->
            <input type="number" class="alocacao-percentual" value="0" min="0" max="100" step="1">
            <span class="percent-symbol">%</span>
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

    // Atualização quando muda porcentagem manualmente (outros modos)
    $(document).on("change input", ".alocacao-percentual", function() {
      if ($(this).prop("disabled")) return
      
      validarEAjustarPercentual($(this))
      atualizarLimitesInputs()
      atualizarResumo()
    })

    // Botões de aumentar/diminuir percentual (outros modos - se necessário)
    $(document).on("click", ".btn-aumentar-percentual", function() {
      if ($(this).prop("disabled")) return
      
      const input = $(this).siblings(".alocacao-percentual")
      const valorAtual = parseInt(input.val()) || 0
      const index = $(this).closest('.alocacao-item').data('index')
      const percentualMaximo = calcularPercentualMaximo(index)
      
      if (valorAtual < percentualMaximo) {
        input.val(valorAtual + 1)
        validarEAjustarPercentual(input)
        atualizarLimitesInputs()
        atualizarResumo()
      }
    })

    $(document).on("click", ".btn-diminuir-percentual", function() {
      if ($(this).prop("disabled")) return
      
      const input = $(this).siblings(".alocacao-percentual")
      const valorAtual = parseInt(input.val()) || 0
      
      if (valorAtual > 0) {
        input.val(valorAtual - 1)
        validarEAjustarPercentual(input)
        atualizarLimitesInputs()
        atualizarResumo()
      }
    })

    // Controle da estratégia de rateio
    $("#estrategiaRateio").change(function() {
      controlarCamposPercentual()
      
      if ($(this).val() !== "manual") {
        calcularRateio()
      } else {
        // Limpa os campos ao entrar no modo manual
        $(".alocacao-quantidade").val(0)
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
          // Nos outros modos, revalida os percentuais
          $(".alocacao-percentual").each(function() {
            if (parseInt($(this).val()) > 0) {
              validarEAjustarPercentual($(this))
            }
          })
          atualizarLimitesInputs()
          calcularRateio()
        }
        
        atualizarResumo()
      } else {
        // Limpa todos os campos
        $(".alocacao-percentual").val(0).attr('max', 100)
        $(".alocacao-quantidade").val(0)
        $(".percentual-display").text("0%")
        atualizarResumo()
      }
    })
  }

  function calcularRateio() {
      const estrategia = $("#estrategiaRateio").val();
      const inputs = $(".alocacao-percentual");
      valorRateio = parseFloat($("#valorRateio").val()) || 0;

      // Primeiro, limpa todos os valores para evitar interferências
      inputs.val(0);

      if (estrategia === "proporcional") {
        const totais = carteira.map((acao) => {
          const cotacao = cotacoes[acao.codigo + ".SA"];
          const valorAtual = cotacao ? cotacao.preco : acao.valor;
          return valorAtual * acao.quantidade;
        });

        const totalGeral = totais.reduce((sum, val) => sum + val, 0);

        if (totalGeral > 0) {
          // Aplica percentuais proporcionais sequencialmente
          inputs.each((index, input) => {
            const percentualTeorico = Math.round((totais[index] / totalGeral) * 100);
            $(input).val(percentualTeorico);
            validarEAjustarPercentual($(input));
          });
        }
      } else if (estrategia === "igual") {
          const numAcoes = carteira.length;
          let valorRestante = valorRateio;
          let acoesParaDistribuir = [];
          
          // Preparar lista de ações com seus valores
          for (let i = 0; i < numAcoes; i++) {
              const acao = carteira[i];
              const cotacao = cotacoes[acao.codigo + ".SA"];
              const valorAtual = cotacao ? cotacao.preco : acao.valor;
              
              acoesParaDistribuir.push({
                  index: i,
                  input: $(".alocacao-percentual").eq(i),
                  valorAtual: valorAtual,
                  valorAlocado: 0,
                  quantidade: 0
              });
          }
          
          // Ordenar do mais barato para o mais caro
          acoesParaDistribuir.sort((a, b) => a.valorAtual - b.valorAtual);
          
          // 1ª Fase: Distribuição mínima para todas as ações
          for (let acao of acoesParaDistribuir) {
              if (valorRestante >= acao.valorAtual) {
                  acao.quantidade = 1;
                  acao.valorAlocado = acao.valorAtual;
                  valorRestante -= acao.valorAtual;
              }
          }
          
          // 2ª Fase: Distribuição do restante de forma cíclica
          let index = 0;
          while (valorRestante > 0) {
              const acao = acoesParaDistribuir[index % numAcoes];
              
              if (valorRestante >= acao.valorAtual) {
                  acao.quantidade += 1;
                  acao.valorAlocado += acao.valorAtual;
                  valorRestante -= acao.valorAtual;
              }
              
              index++;
              
              // Proteção contra loop infinito
              if (index > 100) break;
          }
          
          // 3ª Fase: Atualizar os percentuais
          for (let acao of acoesParaDistribuir) {
              const percentual = Math.round((acao.valorAlocado / valorRateio) * 100);
              acao.input.val(percentual);
              validarEAjustarPercentual(acao.input);
          }
          
          atualizarLimitesInputs();
          atualizarResumo();
      }

      atualizarLimitesInputs();
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
      // Nos outros modos, verifica se há percentual definido
      $(".alocacao-percentual").each(function() {
        const p = parseInt($(this).val()) || 0
        if (p > 0) temAlocacao = true
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

    // Debug: vamos ver o que está acontecendo
    // console.log("Atualizando resumo - Estratégia:", estrategia, "Valor Rateio:", valorRateio)

    // Calcula valores efetivos para cada ação
    $(".alocacao-item").each(function() {
      const index = $(this).data("index")
      let quantidade = 0
      let percentual = 0
      let valorEfetivo = 0

      if (estrategia === "manual") {
        // No modo manual, pega a quantidade definida
        quantidade = parseInt($(this).find(".alocacao-quantidade").val()) || 0
        // console.log(`Ação ${index} - Quantidade manual:`, quantidade)
        
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade)
          percentual = resultado.percentual
          valorEfetivo = resultado.valorEfetivo
          // console.log(`Ação ${index} - Resultado:`, resultado)
        }
      } else {
        // Nos outros modos, pega o percentual e calcula a quantidade
        percentual = parseInt($(this).find(".alocacao-percentual").val()) || 0
        // console.log(`Ação ${index} - Percentual:`, percentual)
        
        if (percentual > 0) {
          const resultado = calcularValorEfetivo(index, percentual)
          quantidade = resultado.quantidade
          valorEfetivo = resultado.valorEfetivo
          percentual = resultado.percentualEfetivo // Usa o percentual efetivo
          // console.log(`Ação ${index} - Resultado:`, resultado)
        }
      }
      
      // Mudança aqui: condição menos restritiva
      if (quantidade > 0) {
        const acao = carteira[index]
        alocacoes.push({
          codigo: acao.codigo,
          percentual: percentual,
          quantidade: quantidade,
          valorEfetivo: valorEfetivo
        })
        
        valorTotalEfetivo += valorEfetivo
        // console.log(`Ação ${index} adicionada - Valor efetivo:`, valorEfetivo, "Total acumulado:", valorTotalEfetivo)
      }
      
      // Atualiza a exibição da nova quantidade
      $(`#nova-${index}`).text(
        quantidade > 0 
          ? `+${quantidade} un. (${formatarMoeda(valorEfetivo)})`
          : ""
      )
    })

    // console.log("Valor total efetivo final:", valorTotalEfetivo)
    // console.log("Alocações:", alocacoes)

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
        const percentual = parseInt($(this).find(".alocacao-percentual").val()) || 0;
        if (percentual > 0) {
          const resultado = calcularValorEfetivo(index, percentual);
          quantidade = resultado.quantidade;
          valorEfetivo = resultado.valorEfetivo;
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