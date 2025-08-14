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
      // Aplicar rateio via API
      aplicarRateioAPI(operacoesRealizadas)

      let mensagem = "<h3>Operações realizadas:</h3><ul>"
      operacoesRealizadas.forEach((op) => {
        mensagem += `<li><strong>${op.codigo}:</strong><ul>`
        mensagem += `<li>Quantidade: ${op.codigo}:</strong><ul>`
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

  let carteira = []
  
  // Função para obter usuário do sessionStorage de forma segura
  const obterUsuario = () => {
    try {
      // console.log("obterUsuario: Tentando obter usuário do sessionStorage");
      const usuarioStr = sessionStorage.getItem("usuario");
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        // console.log("obterUsuario: Usuário encontrado:", usuario);
        return usuario;
      } else {
        // console.log("obterUsuario: Nenhum usuário encontrado no sessionStorage");
      }
    } catch (error) {
      console.error("obterUsuario: Erro ao parsear usuário:", error);
      sessionStorage.removeItem("usuario"); // Remove dados corrompidos
    }
    return null;
  };
  
  const carregarCarteira = async () => {
    try {
      // console.log("carregarCarteira: Iniciando carregamento da carteira");
      const usuario = obterUsuario();
      if (!usuario || !usuario.conta) {
        console.warn("carregarCarteira: Usuário não autenticado");
        return [];
      }
      
      // console.log("carregarCarteira: Usuário autenticado, conta:", usuario.conta);
      const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.CARTEIRA, `/${usuario.conta}`));
      // console.log("carregarCarteira: Resposta da API:", response);
      
      const acoes = response.acoes || [];
      // console.log("carregarCarteira: Ações carregadas:", acoes.length);
      
      return acoes;
    } catch (error) {
      console.warn("carregarCarteira: Erro ao carregar carteira:", error);
      return [];
    }
  }
  let cotacoes = []
  let valorRateio = 0

  const formatarMoeda = (valor) => {
    const resultado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
    
    // console.log(`formatarMoeda: ${valor} -> ${resultado}`);
    return resultado;
  }

  // Função removida - os dados são salvos via API quando aplicamos o rateio

  const carregarCotacoes = async () => {
    try {
      // console.log("carregarCotacoes: Iniciando carregamento das cotações");
      const usuario = obterUsuario();
      if (!usuario || !usuario.conta) {
        console.warn("carregarCotacoes: Usuário não autenticado");
        return {};
      }
      
      // console.log("carregarCotacoes: Usuário autenticado, conta:", usuario.conta);
      const response = await $.get(CONFIG.getUrl(CONFIG.ENDPOINTS.COTACOES, `/${usuario.conta}`));
      // console.log("carregarCotacoes: Resposta da API:", response);
      
      const cotacoesProcessadas = response.reduce((acc, cotacao) => {
        acc[cotacao.codigo] = cotacao;
        return acc;
      }, {});
      
      // console.log("carregarCotacoes: Cotações processadas:", Object.keys(cotacoesProcessadas));
      
      return cotacoesProcessadas;
    } catch (error) {
      console.warn("carregarCotacoes: Erro ao carregar cotações, usando valores da carteira:", error);
      return {};
    }
  }

  function controlarCamposPercentual() {
    const estrategia = $("#estrategiaRateio").val()
    // console.log("controlarCamposPercentual: Estratégia selecionada:", estrategia);
    
    const inputsPercentual = $(".alocacao-percentual")
    const inputsQuantidade = $(".alocacao-quantidade")
    const inputsQuantidadeCalculada = $(".alocacao-quantidade-calculada")
    const percentualDisplay = $(".percentual-display")
    const percentSymbol = $(".percent-symbol")
    const unidadeSymbol = $(".unidade-symbol")
    const botoes = $(".btn-aumentar, .btn-diminuir")

    if (estrategia === "manual") {
      // console.log("controlarCamposPercentual: Configurando modo manual");
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
      // console.log("controlarCamposPercentual: Configurando modo automático");
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
    
    // console.log("controlarCamposPercentual: Campos configurados");
  }

  // NOVA FUNÇÃO: Calcula rateio igualitário por unidades
  function calcularRateioIgual() {
    // console.log("calcularRateioIgual: Iniciando cálculo");
    
    if (!valorRateio || valorRateio <= 0) {
      // console.log("calcularRateioIgual: Valor rateio inválido:", valorRateio);
      $(".alocacao-quantidade-calculada").val(0)
      return
    }

    // Pega os valores atuais de todas as ações
    const valoresAcoes = carteira.map((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      const valor = cotacao ? cotacao.preco : acao.valor
      // console.log(`calcularRateioIgual: Ação ${acao.codigo} - valor: ${valor}`);
      return valor
    })

    const somaValores = valoresAcoes.reduce((sum, valor) => sum + valor, 0)
    // console.log("calcularRateioIgual: Soma dos valores:", somaValores);
    
    // Calcula quantas unidades podem ser distribuídas igualmente
    const unidadesPorAcao = valorRateio / somaValores
    let quantidadeIgual = Math.floor(unidadesPorAcao + 0.5) // Arredonda com regra especificada
    // console.log("calcularRateioIgual: Unidades por ação calculadas:", unidadesPorAcao, "Quantidade igual:", quantidadeIgual);
    
    // Verifica se é possível comprar essa quantidade para todas as ações
    let valorTotal = quantidadeIgual * somaValores
    
    // Se exceder o valor disponível, diminui em 1
    if (valorTotal > valorRateio) {
      quantidadeIgual = Math.max(0, quantidadeIgual - 1)
      valorTotal = quantidadeIgual * somaValores
      // console.log("calcularRateioIgual: Ajustando quantidade para:", quantidadeIgual);
    }
    
    // Verifica se ainda é possível fazer o rateio igualitário
    // Se não conseguir pelo menos 1 unidade para cada, retorna 0 para todas
    if (quantidadeIgual < 1) {
      // console.log("calcularRateioIgual: Quantidade < 1, retornando 0");
      $(".alocacao-quantidade-calculada").val(0)
      return
    }
    
    // Aplica a quantidade calculada para todas as ações
    $(".alocacao-quantidade-calculada").each(function(index) {
      $(this).val(quantidadeIgual)
      // console.log(`calcularRateioIgual: Aplicando quantidade ${quantidadeIgual} para índice ${index}`);
    })
    
    // console.log("calcularRateioIgual: Cálculo concluído");
  }

  // NOVA FUNÇÃO: Calcula rateio proporcional com priorização
  function calcularRateioProporcional() {
    // console.log("calcularRateioProporcional: Iniciando cálculo");
    
    if (!valorRateio || valorRateio <= 0) {
      // console.log("calcularRateioProporcional: Valor rateio inválido:", valorRateio);
      $(".alocacao-quantidade-calculada").val(0)
      return
    }

    // Identifica ações prioritárias (valorAtual < acao.valor)
    const acoesInfo = carteira.map((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      const valorAtual = cotacao ? cotacao.preco : acao.valor
      const isPrioritaria = valorAtual < acao.valor
      
      // console.log(`calcularRateioProporcional: Ação ${acao.codigo} - valor atual: ${valorAtual}, preço médio: ${acao.valor}, prioritária: ${isPrioritaria}`);
      
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
    
    // console.log("calcularRateioProporcional: Ações prioritárias:", acoesPrioritarias.length, "Ações normais:", acoesNormais.length);
    
    // Limpa todos os campos primeiro
    $(".alocacao-quantidade-calculada").val(0)
    
    if (acoesPrioritarias.length === 0) {
      // console.log("calcularRateioProporcional: Nenhuma ação prioritária, aplicando filtros sequenciais");
      // Se não há ações prioritárias, aplica filtros sequenciais
      aplicarFiltrosSequenciais(acoesInfo)
      return
    }
    
    let valorPrioritario = Math.floor(valorRateio * 0.6) // 60% para prioritárias
    let valorNormal = valorRateio - valorPrioritario // 40% para normais
    
    // console.log("calcularRateioProporcional: Valor prioritário:", valorPrioritario, "Valor normal:", valorNormal);
    
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
      // console.log("calcularRateioProporcional: Distribuindo valor prioritário:", valorPrioritario);
      distribuirValorEntreAcoes(acoesPrioritarias, valorPrioritario)
    }
    
    // Distribui entre ações normais
    if (valorNormal > 0 && acoesNormais.length > 0) {
      // console.log("calcularRateioProporcional: Distribuindo valor normal:", valorNormal);
      distribuirValorEntreAcoes(acoesNormais, valorNormal)
    }
    
    // console.log("calcularRateioProporcional: Cálculo concluído");
  }

  // NOVA FUNÇÃO: Aplica filtros sequenciais quando não há ações prioritárias
  function aplicarFiltrosSequenciais(acoesInfo) {
    // console.log("aplicarFiltrosSequenciais: Iniciando filtros sequenciais");
    
    // Filtro 1: Por quantidade (prioriza quem tem mais)
    const maxQuantidade = Math.max(...acoesInfo.map(info => info.quantidade))
    const acoesComMaisQuantidade = acoesInfo.filter(info => info.quantidade === maxQuantidade)
    
    // console.log("aplicarFiltrosSequenciais: Filtro 1 - Máxima quantidade:", maxQuantidade, "Ações com mais quantidade:", acoesComMaisQuantidade.length);
    
    if (acoesComMaisQuantidade.length === 1) {
      // Encontrou uma ação com mais quantidade
      const acaoEscolhida = acoesComMaisQuantidade[0]
      const demaisAcoes = acoesInfo.filter(info => info.index !== acaoEscolhida.index)
      
      // console.log("aplicarFiltrosSequenciais: Ação escolhida por quantidade:", acaoEscolhida.acao.codigo);
      distribuirComPrioridade(acaoEscolhida, demaisAcoes, 0.5) // 50% para a escolhida
      return
    }
    
    // Se há empate na quantidade, vai para o próximo filtro
    let acoesParaProximoFiltro = acoesComMaisQuantidade
    
    // Filtro 2: Por valor (prioriza a mais barata)
    const menorValor = Math.min(...acoesParaProximoFiltro.map(info => info.valorAtual))
    const acoesComMenorValor = acoesParaProximoFiltro.filter(info => info.valorAtual === menorValor)
    
    // console.log("aplicarFiltrosSequenciais: Filtro 2 - Menor valor:", menorValor, "Ações com menor valor:", acoesComMenorValor.length);
    
    if (acoesComMenorValor.length === 1) {
      // Encontrou uma ação mais barata
      const acaoEscolhida = acoesComMenorValor[0]
      const demaisAcoes = acoesInfo.filter(info => info.index !== acaoEscolhida.index)
      
      // console.log("aplicarFiltrosSequenciais: Ação escolhida por valor:", acaoEscolhida.acao.codigo);
      distribuirComPrioridade(acaoEscolhida, demaisAcoes, 0.5) // 50% para a escolhida
      return
    }
    
    // Se ainda há empate, distribui igualmente
    // console.log("aplicarFiltrosSequenciais: Empate nos filtros, aplicando rateio igualitário");
    calcularRateioIgual()
  }

  // NOVA FUNÇÃO: Distribui valor com prioridade para uma ação específica
  function distribuirComPrioridade(acaoEscolhida, demaisAcoes, percentualEscolhida) {
    // console.log("distribuirComPrioridade: Iniciando distribuição com prioridade");
    // console.log("distribuirComPrioridade: Ação escolhida:", acaoEscolhida.acao.codigo, "Percentual:", percentualEscolhida);
    
    const valorEscolhida = Math.floor(valorRateio * percentualEscolhida)
    const valorDemais = valorRateio - valorEscolhida
    
    // console.log("distribuirComPrioridade: Valor para ação escolhida:", valorEscolhida, "Valor para demais:", valorDemais);
    
    // Distribui para a ação escolhida
    const quantidadeEscolhida = Math.floor(valorEscolhida / acaoEscolhida.valorAtual)
    if (quantidadeEscolhida > 0) {
      $(".alocacao-quantidade-calculada").eq(acaoEscolhida.index).val(quantidadeEscolhida)
      // console.log("distribuirComPrioridade: Quantidade para ação escolhida:", quantidadeEscolhida);
    }
    
    // Distribui o restante entre as demais ações
    if (valorDemais > 0 && demaisAcoes.length > 0) {
      // console.log("distribuirComPrioridade: Distribuindo valor restante entre demais ações");
      distribuirValorEntreAcoes(demaisAcoes, valorDemais)
    }
    
    // console.log("distribuirComPrioridade: Distribuição concluída");
  }

  // NOVA FUNÇÃO: Calcula o valor Z para múltiplas ações prioritárias
  function calcularZ(acoesPrioritarias, acoesNormais) {
    // console.log("calcularZ: Iniciando cálculo do valor Z");
    
    if (acoesPrioritarias.length < 2 || acoesNormais.length === 0) {
      // console.log("calcularZ: Parâmetros insuficientes, retornando 0");
      return 0
    }
    
    const acao2 = acoesPrioritarias[0].valorAtual
    const acao3 = acoesPrioritarias[1].valorAtual
    const acao1 = acoesNormais[0].valorAtual
    
    // console.log("calcularZ: Valores - acao2:", acao2, "acao3:", acao3, "acao1:", acao1);
    
    const resultado = (Math.pow(acao2, 2) + Math.pow(acao3, 2)) / 10 - acao1
    
    // console.log("calcularZ: Resultado calculado:", resultado);
    
    const resultadoFinal = resultado > 0 ? Math.floor(resultado) : 0
    // console.log("calcularZ: Resultado final:", resultadoFinal);
    
    return resultadoFinal
  }

  // NOVA FUNÇÃO: Distribui valor entre um conjunto de ações
  function distribuirValorEntreAcoes(acoes, valorDisponivel) {
    // console.log("distribuirValorEntreAcoes: Iniciando distribuição");
    // console.log("distribuirValorEntreAcoes: Ações:", acoes.length, "Valor disponível:", valorDisponivel);
    
    if (acoes.length === 0 || valorDisponivel <= 0) {
      // console.log("distribuirValorEntreAcoes: Parâmetros inválidos, retornando");
      return
    }
    
    // Calcula quantas unidades podem ser compradas para cada ação
    const distribuicoes = acoes.map(info => {
      const quantidadeMaxima = Math.floor(valorDisponivel / (acoes.length * info.valorAtual))
      // console.log(`distribuirValorEntreAcoes: Ação ${info.acao.codigo} - quantidade máxima: ${quantidadeMaxima}`);
      return {
        ...info,
        quantidade: Math.max(1, quantidadeMaxima) // Mínimo de 1 unidade
      }
    })
    
    // Verifica se é possível comprar pelo menos 1 unidade de cada
    const valorNecessario = distribuicoes.reduce((sum, dist) => sum + (dist.quantidade * dist.valorAtual), 0)
    // console.log("distribuirValorEntreAcoes: Valor necessário:", valorNecessario);
    
    if (valorNecessario > valorDisponivel) {
      // console.log("distribuirValorEntreAcoes: Valor necessário excede disponível, ajustando...");
      // Se não couber, tenta distribuir com quantidade menor
      const quantidadeReduzida = Math.floor(valorDisponivel / distribuicoes.reduce((sum, dist) => sum + dist.valorAtual, 0))
      
      if (quantidadeReduzida >= 1) {
        distribuicoes.forEach(dist => {
          dist.quantidade = quantidadeReduzida
        })
        // console.log("distribuirValorEntreAcoes: Quantidade ajustada para:", quantidadeReduzida);
      } else {
        // Se nem assim couber, não distribui nada
        // console.log("distribuirValorEntreAcoes: Não foi possível distribuir, retornando");
        return
      }
    }
    
    // Aplica as quantidades calculadas
    distribuicoes.forEach(dist => {
      $(".alocacao-quantidade-calculada").eq(dist.index).val(dist.quantidade)
      // console.log(`distribuirValorEntreAcoes: Aplicando quantidade ${dist.quantidade} para ação ${dist.acao.codigo} (índice ${dist.index})`);
    })
    
    // console.log("distribuirValorEntreAcoes: Distribuição concluída");
  }

  // NOVA FUNÇÃO: Calcula o valor efetivo baseado no percentual e ajusta de volta
  function calcularValorEfetivo(index, percentual) {
    if (!valorRateio || percentual <= 0) {
      // console.log("calcularValorEfetivo: Parâmetros inválidos, retornando valores zerados");
      return { percentualEfetivo: 0, quantidade: 0, valorEfetivo: 0 }
    }
    
    const acao = carteira[index]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor
    
    // console.log(`calcularValorEfetivo: Ação ${acao.codigo} - percentual: ${percentual}%, valor atual: ${valorAtual}`);
    
    const valorTeorico = (valorRateio * percentual) / 100
    const quantidade = Math.floor(valorTeorico / valorAtual)
    const valorEfetivo = quantidade * valorAtual
    const percentualEfetivo = valorRateio > 0 ? Math.round((valorEfetivo / valorRateio) * 100) : 0
    
    // console.log(`calcularValorEfetivo: Resultado - valor teórico: ${valorTeorico}, quantidade: ${quantidade}, valor efetivo: ${valorEfetivo}, percentual efetivo: ${percentualEfetivo}%`);
    
    return { percentualEfetivo, quantidade, valorEfetivo, valorAtual }
  }

  // NOVA FUNÇÃO: Calcula percentual baseado na quantidade
  function calcularPercentualPorQuantidade(index, quantidade) {
    if (!valorRateio || quantidade <= 0) {
      // console.log("calcularPercentualPorQuantidade: Parâmetros inválidos, retornando valores zerados");
      return { percentual: 0, valorEfetivo: 0 }
    }
    
    const acao = carteira[index]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor
    
    // console.log(`calcularPercentualPorQuantidade: Ação ${acao.codigo} - quantidade: ${quantidade}, valor atual: ${valorAtual}`);
    
    const valorEfetivo = quantidade * valorAtual
    const percentual = valorRateio > 0 ? Math.round((valorEfetivo / valorRateio) * 100) : 0
    
    // console.log(`calcularPercentualPorQuantidade: Resultado - valor efetivo: ${valorEfetivo}, percentual: ${percentual}%`);
    
    return { percentual, valorEfetivo, valorAtual }
  }

  // NOVA FUNÇÃO: Calcula o percentual máximo disponível (para modo percentual)
  function calcularPercentualMaximo(indexAtual) {
    // console.log("calcularPercentualMaximo: Calculando percentual máximo para índice:", indexAtual);
    
    let totalUtilizado = 0
    
    $(".alocacao-percentual").each(function(index) {
      if (index !== indexAtual) {
        const percentual = parseInt($(this).val()) || 0
        const resultado = calcularValorEfetivo(index, percentual)
        totalUtilizado += resultado.percentualEfetivo
        // console.log(`calcularPercentualMaximo: Índice ${index} - percentual: ${percentual}%, utilizado: ${resultado.percentualEfetivo}%`);
      }
    })
    
    const percentualMaximo = Math.max(0, 100 - totalUtilizado)
    // console.log("calcularPercentualMaximo: Total utilizado:", totalUtilizado, "Percentual máximo:", percentualMaximo);
    
    return percentualMaximo
  }

  // NOVA FUNÇÃO: Atualiza os limites máximos dos inputs de percentual
  function atualizarLimitesInputs() {
    // console.log("atualizarLimitesInputs: Atualizando limites dos inputs de percentual");
    
    $(".alocacao-percentual").each(function(index) {
      const percentualMaximo = calcularPercentualMaximo(index)
      $(this).attr('max', percentualMaximo)
      
      // Se o valor atual excede o máximo, ajusta
      const valorAtual = parseInt($(this).val()) || 0
      if (valorAtual > percentualMaximo) {
        $(this).val(percentualMaximo)
        // console.log(`atualizarLimitesInputs: Ajustando valor do índice ${index} de ${valorAtual} para ${percentualMaximo}`);
      }
      
      // console.log(`atualizarLimitesInputs: Índice ${index} - máximo: ${percentualMaximo}, atual: ${valorAtual}`);
    })
    
    // console.log("atualizarLimitesInputs: Limites atualizados");
  }

  // NOVA FUNÇÃO: Valida e ajusta o input de percentual
  function validarEAjustarPercentual(input) {
    // console.log("validarEAjustarPercentual: Validando e ajustando percentual");
    
    const index = input.closest('.alocacao-item').data('index')
    const percentualDigitado = parseInt(input.val()) || 0
    const percentualMaximo = calcularPercentualMaximo(index)
    
    // console.log(`validarEAjustarPercentual: Índice ${index} - digitado: ${percentualDigitado}%, máximo: ${percentualMaximo}%`);
    
    // Limita ao máximo disponível
    const percentualLimitado = Math.min(percentualDigitado, percentualMaximo)
    
    // Calcula o valor efetivo e ajusta o percentual
    const resultado = calcularValorEfetivo(index, percentualLimitado)
    
    // Atualiza o input com o percentual efetivo
    input.val(resultado.percentualEfetivo)
    
    // console.log(`validarEAjustarPercentual: Percentual ajustado para: ${resultado.percentualEfetivo}%`);
    
    return resultado
  }

  // NOVA FUNÇÃO: Calcula quantidade máxima disponível (para modo manual)
  function calcularQuantidadeMaxima(indexAtual) {
    // console.log("calcularQuantidadeMaxima: Calculando quantidade máxima para índice:", indexAtual);
    
    let valorUtilizado = 0
    
    // Soma valores já utilizados por outras ações
    $(".alocacao-quantidade").each(function(index) {
      if (index !== indexAtual) {
        const quantidade = parseInt($(this).val()) || 0
        if (quantidade > 0) {
          const resultado = calcularPercentualPorQuantidade(index, quantidade)
          valorUtilizado += resultado.valorEfetivo
          // console.log(`calcularQuantidadeMaxima: Índice ${index} - quantidade: ${quantidade}, valor utilizado: ${resultado.valorEfetivo}`);
        }
      }
    })
    
    const valorDisponivel = Math.max(0, valorRateio - valorUtilizado)
    // console.log("calcularQuantidadeMaxima: Valor utilizado:", valorUtilizado, "Valor disponível:", valorDisponivel);
    
    // Calcula quantas ações podem ser compradas com o valor disponível
    const acao = carteira[indexAtual]
    const cotacao = cotacoes[acao.codigo + ".SA"]
    const valorAtual = cotacao ? cotacao.preco : acao.valor
    
    const quantidadeMaxima = Math.floor(valorDisponivel / valorAtual)
    // console.log(`calcularQuantidadeMaxima: Ação ${acao.codigo} - valor atual: ${valorAtual}, quantidade máxima: ${quantidadeMaxima}`);
    
    return quantidadeMaxima
  }

  // NOVA FUNÇÃO: Atualiza os limites máximos dos campos de quantidade
  function atualizarLimitesQuantidade() {
    // console.log("atualizarLimitesQuantidade: Atualizando limites dos campos de quantidade");
    
    $(".alocacao-quantidade").each(function(index) {
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      $(this).attr('max', quantidadeMaxima)
      
      // Se o valor atual excede o máximo, ajusta
      const valorAtual = parseInt($(this).val()) || 0
      if (valorAtual > quantidadeMaxima) {
        $(this).val(quantidadeMaxima)
        // console.log(`atualizarLimitesQuantidade: Ajustando quantidade do índice ${index} de ${valorAtual} para ${quantidadeMaxima}`);
        atualizarPercentualPorQuantidade($(this))
      }
      
      // console.log(`atualizarLimitesQuantidade: Índice ${index} - máximo: ${quantidadeMaxima}, atual: ${valorAtual}`);
    })
    
    // console.log("atualizarLimitesQuantidade: Limites atualizados");
  }

  // NOVA FUNÇÃO: Atualiza o percentual baseado na quantidade
  function atualizarPercentualPorQuantidade(inputQuantidade) {
    // console.log("atualizarPercentualPorQuantidade: Atualizando percentual baseado na quantidade");
    
    const index = inputQuantidade.closest('.alocacao-item').data('index')
    const quantidade = parseInt(inputQuantidade.val()) || 0
    const resultado = calcularPercentualPorQuantidade(index, quantidade)
    
    // console.log(`atualizarPercentualPorQuantidade: Índice ${index} - quantidade: ${quantidade}, percentual: ${resultado.percentual}%`);
    
    // Atualiza o display do percentual
    const percentualDisplay = inputQuantidade.closest('.alocacao-item').find('.percentual-display')
    percentualDisplay.text(quantidade > 0 ? `${resultado.percentual}%` : '0%')
    
    // console.log(`atualizarPercentualPorQuantidade: Display atualizado para: ${percentualDisplay.text()}`);
    
    return resultado
  }

  async function init() {
    try {
      // console.log("Iniciando carregamento da carteira...");
      carteira = await carregarCarteira();
      // console.log("Carteira carregada:", carteira);
      
      if (carteira.length === 0) {
        console.warn("Carteira vazia, mostrando alerta");
        mostrarAlertaCarteira()
        return
      }
    } catch (error) {
      console.error("Erro ao carregar carteira:", error);
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

    try {
      // console.log("Carregando cotações...");
      cotacoes = await carregarCotacoes();
      // console.log("Cotações carregadas:", cotacoes);
      
      renderizarAlocacoes()
      configurarEventos()
      controlarCamposPercentual()
      
      // Aguarda um pouco antes de calcular o rateio para garantir que tudo esteja carregado
      setTimeout(() => {
        // console.log("Calculando rateio inicial...");
        calcularRateio()
      }, 100);
      
    } catch (error) {
      console.error("Erro ao carregar cotações:", error);
      renderizarAlocacoes()
      configurarEventos()
      controlarCamposPercentual()
      
      setTimeout(() => {
        // console.log("Calculando rateio inicial (sem cotações)...");
        calcularRateio()
      }, 100);
    }
  }

  function mostrarAlertaCarteira() {
    // console.log("mostrarAlertaCarteira: Mostrando alerta de carteira vazia");
    $("#alertaCarteira").show()
    $("#containerAlocacoes").html(
      '<p style="text-align: center; padding: 20px; color: #666;">Nenhuma ação na carteira. Adicione ações primeiro na página principal.</p>',
    )
    $("#btnAplicar").prop("disabled", true)
    // console.log("mostrarAlertaCarteira: Alerta exibido");
  }

  function renderizarAlocacoes() {
    // console.log("renderizarAlocacoes: Iniciando renderização das alocações");
    // console.log("renderizarAlocacoes: Carteira:", carteira);
    // console.log("renderizarAlocacoes: Cotações:", cotacoes);
    
    const container = $("#containerAlocacoes")
    container.empty()

    carteira.forEach((acao, index) => {
      const cotacao = cotacoes[acao.codigo + ".SA"]
      const valorAtual = cotacao ? cotacao.preco : acao.valor
      const valorTotalAtual = valorAtual * acao.quantidade
      
      // console.log(`renderizarAlocacoes: Ação ${acao.codigo} - valor atual: ${valorAtual}, quantidade: ${acao.quantidade}, valor total: ${valorTotalAtual}`);

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

    // console.log("renderizarAlocacoes: Alocações renderizadas, atualizando resumo");
    atualizarResumo()
    // console.log("renderizarAlocacoes: Renderização concluída");
  }

  function configurarEventos() {
    // console.log("configurarEventos: Configurando eventos da interface");
    
    // Botões de aumentar quantidade (modo manual)
    $(document).on("click", ".btn-aumentar", function() {
      // console.log("configurarEventos: Botão aumentar clicado");
      if ($(this).prop("disabled")) return
      
      const input = $(this).siblings(".alocacao-quantidade")
      const valorAtual = parseInt(input.val()) || 0
      const index = $(this).closest('.alocacao-item').data('index')
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      
      // console.log(`configurarEventos: Aumentando quantidade - atual: ${valorAtual}, máxima: ${quantidadeMaxima}`);
      
      if (valorAtual < quantidadeMaxima) {
        input.val(valorAtual + 1)
        atualizarPercentualPorQuantidade(input)
        atualizarLimitesQuantidade()
        atualizarResumo()
      }
    })

    // Botões de diminuir quantidade (modo manual)
    $(document).on("click", ".btn-diminuir", function() {
      // console.log("configurarEventos: Botão diminuir clicado");
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
      // console.log("configurarEventos: Quantidade alterada manualmente");
      if ($(this).prop("disabled")) return
      
      const index = $(this).closest('.alocacao-item').data('index')
      const quantidadeMaxima = calcularQuantidadeMaxima(index)
      let quantidade = parseInt($(this).val()) || 0
      
      // Limita à quantidade máxima
      if (quantidade > quantidadeMaxima) {
        quantidade = quantidadeMaxima
        $(this).val(quantidade)
        // console.log(`configurarEventos: Quantidade limitada à máxima: ${quantidadeMaxima}`);
      }
      
      atualizarPercentualPorQuantidade($(this))
      atualizarLimitesQuantidade()
      atualizarResumo()
    })

    // Controle da estratégia de rateio
    $("#estrategiaRateio").change(function() {
      // console.log("configurarEventos: Estratégia alterada para:", $(this).val());
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
    $("#btnAplicar").click(async () => {
      // console.log("configurarEventos: Botão aplicar clicado");
      await aplicarRateio()
    })

    // Atualiza quando muda o valor do rateio
    $("#valorRateio").on("input", function() {
      valorRateio = parseFloat($(this).val()) || 0
      // console.log("configurarEventos: Valor do rateio alterado para:", valorRateio);
      
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
    
    // console.log("configurarEventos: Eventos configurados");
  }

  function calcularRateio() {
      const estrategia = $("#estrategiaRateio").val();
      valorRateio = parseFloat($("#valorRateio").val()) || 0;
      
      // console.log("Calculando rateio - Estratégia:", estrategia, "Valor:", valorRateio);

      // Primeiro, limpa todos os valores para evitar interferências
      $(".alocacao-quantidade-calculada").val(0);

      if (estrategia === "igual") {
        // console.log("Aplicando rateio igualitário");
        calcularRateioIgual();
      } else if (estrategia === "proporcional") {
        // console.log("Aplicando rateio proporcional");
        calcularRateioProporcional();
      }

      // console.log("Atualizando resumo...");
      atualizarResumo();
  }

  
  function podeAplicarRateio() {
    const valor = parseFloat($("#valorRateio").val()) || 0
    if (valor <= 0) {
      // console.log("podeAplicarRateio: Valor <= 0, retornando false");
      return false
    }

    let temAlocacao = false
    const estrategia = $("#estrategiaRateio").val()
    
    // console.log("podeAplicarRateio: Verificando estratégia", estrategia);

    if (estrategia === "manual") {
      // No modo manual, verifica se há quantidade definida
      $(".alocacao-quantidade").each(function() {
        const q = parseInt($(this).val()) || 0
        if (q > 0) {
          temAlocacao = true
          // console.log("podeAplicarRateio: Encontrada quantidade manual > 0:", q);
        }
      })
    } else {
      // Nos outros modos, verifica se há quantidade calculada
      $(".alocacao-quantidade-calculada").each(function() {
        const q = parseInt($(this).val()) || 0
        if (q > 0) {
          temAlocacao = true
          // console.log("podeAplicarRateio: Encontrada quantidade calculada > 0:", q);
        }
      })
    }

    // console.log("podeAplicarRateio: Resultado final:", temAlocacao);
    return temAlocacao
  }

  function atualizarResumo() {
    valorRateio = parseFloat($("#valorRateio").val()) || 0
    const resumo = $("#resumoRateio")
    resumo.empty()
    
    // console.log("Atualizando resumo - Valor rateio:", valorRateio);

    let valorTotalEfetivo = 0
    const alocacoes = []
    const estrategia = $("#estrategiaRateio").val()
    
    // console.log("Estratégia atual:", estrategia);

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
        
        // console.log(`Ação ${acao.codigo}: ${quantidade} un, ${formatarMoeda(valorEfetivo)}, ${percentual}%`);
      }
      
      // Atualiza a exibição da nova quantidade
      $(`#nova-${index}`).text(
        quantidade > 0 
          ? `+${quantidade} un (${formatarMoeda(valorEfetivo)})`
          : ""
      )
    })

    // console.log("Total efetivo:", valorTotalEfetivo, "Alocações:", alocacoes.length);

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
    const podeAplicar = podeAplicarRateio()
    $("#btnAplicar").prop("disabled", !podeAplicar)
    // console.log("Botão Aplicar habilitado:", podeAplicar);
  }

  async function aplicarRateio() {
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
      try {
        // Aplicar rateio via API
        await aplicarRateioAPI(operacoesRealizadas);
        
        // Recarregar a carteira do servidor para sincronizar
        carteira = await carregarCarteira();
        
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
      } catch (error) {
        console.error("Erro ao aplicar rateio:", error);
        $("#modalErroContent").html("Erro ao aplicar o rateio. Tente novamente.");
        $("#modalErro").show();
      }
    } else {
      // Mostra modal de erro
      $("#modalErroContent").html("Nenhuma alocação válida foi encontrada. Verifique os valores e quantidades.");
      $("#modalErro").show();
    }
  }

  // Função para aplicar rateio via API
  async function aplicarRateioAPI(operacoesRealizadas) {
    try {
      // console.log("aplicarRateioAPI: Iniciando aplicação do rateio via API");
      // console.log("aplicarRateioAPI: Operações:", operacoesRealizadas);
      
      const usuario = obterUsuario();
      if (!usuario || !usuario.conta) {
        throw new Error('Usuário não autenticado ou sem conta');
      }

      // console.log("aplicarRateioAPI: Usuário autenticado, conta:", usuario.conta);

      const alocacoes = operacoesRealizadas.map(op => {
        const acao = carteira.find(a => a.codigo === op.codigo);
        const alocacao = {
          codigo: op.codigo,
          categoria: acao.categoria,
          valor: op.precoMedioNovo,
          quantidade: op.quantidadeAdicionada
        };
        // console.log("aplicarRateioAPI: Alocação processada:", alocacao);
        return alocacao;
      });

      // console.log("aplicarRateioAPI: Alocações para enviar:", alocacoes);

      const response = await $.ajax({
        url: CONFIG.getUrl(CONFIG.ENDPOINTS.RATEIO),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          conta: usuario.conta,
          alocacoes: alocacoes
        })
      });

      // console.log("aplicarRateioAPI: Resposta da API:", response);

      if (response.success) {
        // console.log('aplicarRateioAPI: Rateio aplicado com sucesso via API');
        return true;
      } else {
        throw new Error('Erro ao aplicar rateio via API');
      }
    } catch (error) {
      console.error('aplicarRateioAPI: Erro ao aplicar rateio via API:', error);
      throw error;
    }
  }

  init()
})