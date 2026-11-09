/*
 * APOENA — Serviço de identificação (camada de integração)
 * ------------------------------------------------------------------
 * As telas NUNCA falam com o modelo diretamente: elas chamam apenas
 *
 *     APOENA.identificacao.identificar(arquivoImagem, { sinal })
 *
 * e recebem sempre um objeto no FORMATO NORMALIZADO abaixo. Para trocar
 * a simulação pelo modelo real, basta implementar a chamada em
 * `chamarApi` (PASSO 2) e, se o modelo responder em outro formato,
 * adaptar `normalizarResposta` (PASSO 3). RNF02 do Documento de Visão.
 *
 * ------------------------------------------------------------------
 * CONTRATO DE INTEGRAÇÃO (proposta — validar com a equipe do modelo)
 * ------------------------------------------------------------------
 * Requisição
 *   POST {API_URL}{API_ROTA_IDENTIFICAR}
 *   Content-Type: multipart/form-data
 *   Campo "imagem": arquivo da foto (JPEG, PNG, WEBP ou HEIC)
 *
 * Resposta 200 (JSON)
 *   {
 *     "status": "identificado" | "nao_identificado",
 *     "classe": "lamina_machado_polida",     // id da classe prevista
 *     "confianca": 0.87,                     // 0 a 1
 *     "alternativas": [                      // opcional
 *       { "classe": "...", "confianca": 0.08 }
 *     ],
 *     "modelo": { "nome": "apoena-vc", "versao": "0.1.0" },
 *     "id_analise": "a1b2c3"                 // opcional, para rastreio
 *   }
 *
 * Erros: HTTP 4xx/5xx com { "erro": "mensagem" } são tratados como
 * falha de comunicação; a interface oferece nova tentativa.
 *
 * ------------------------------------------------------------------
 * FORMATO NORMALIZADO (o que as telas recebem)
 * ------------------------------------------------------------------
 *   {
 *     status: "identificado" | "nao_identificado" | "erro",
 *     classe: string | null,
 *     confianca: number | null,     // 0 a 1
 *     artefato: objeto de APOENA.conteudo.artefatos | null,
 *     modelo: { nome, versao } | null,
 *     simulado: boolean,            // true enquanto não houver modelo
 *     erro: { tipo: "tempo_esgotado" | "rede" | "servidor" | "cancelado", mensagem } | null
 *   }
 */
(function () {
  const cfg = () => window.APOENA.config;

  /* Cenário de simulação escolhido no painel de demonstração. */
  let cenarioSimulado = null;
  function definirCenarioSimulado(cenario) { cenarioSimulado = cenario; }
  function obterCenarioSimulado() { return cenarioSimulado || cfg().SIMULACAO_PADRAO; }
  function estaSimulando() { return cfg().MODO !== "api"; }

  /* Validação local da imagem antes do envio. */
  function validarImagem(arquivo) {
    if (!arquivo) return "Escolha ou tire uma foto do objeto.";
    const tipoOk = cfg().TIPOS_IMAGEM.includes(arquivo.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(arquivo.name || "");
    if (!tipoOk) return "Formato não aceito. Envie uma foto em JPG, PNG, WEBP ou HEIC.";
    if (arquivo.size > cfg().TAMANHO_MAX_MB * 1024 * 1024) {
      return `A foto tem mais de ${cfg().TAMANHO_MAX_MB} MB. Tire outra foto ou reduza o tamanho da imagem.`;
    }
    return null;
  }

  /* Ponto de entrada usado pelas telas. */
  async function identificar(arquivo, { sinal } = {}) {
    try {
      const bruta = estaSimulando()
        ? await simularResposta(obterCenarioSimulado(), sinal)
        : await chamarApi(arquivo, sinal);
      return normalizarResposta(bruta);
    } catch (e) {
      return respostaDeErro(e);
    }
  }

  /* ================================================================
   * >>> INTEGRAÇÃO DO MODELO DE VISÃO COMPUTACIONAL — PASSO 2 <<<
   * ----------------------------------------------------------------
   * Chamada real ao serviço do modelo. Já está escrita segundo o
   * contrato acima; revise rota, campo do arquivo e cabeçalhos quando
   * a API for definida. Se o modelo rodar no próprio navegador
   * (ex.: TensorFlow.js ou ONNX Runtime Web), substitua o corpo desta
   * função pela inferência local e devolva o mesmo JSON do contrato.
   * ================================================================ */
  async function chamarApi(arquivo, sinalExterno) {
    const c = cfg();
    if (!c.API_URL) throw criarErro("servidor", "O endereço do serviço de identificação não foi configurado.");

    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort("tempo_esgotado"), c.TEMPO_LIMITE_MS);
    if (sinalExterno) sinalExterno.addEventListener("abort", () => controle.abort("cancelado"), { once: true });

    const corpo = new FormData();
    corpo.append("imagem", arquivo, arquivo.name || "foto.jpg");

    const cabecalhos = {};
    if (c.API_TOKEN) cabecalhos.Authorization = `Bearer ${c.API_TOKEN}`;

    let resposta;
    try {
      resposta = await fetch(c.API_URL + c.API_ROTA_IDENTIFICAR, {
        method: "POST", body: corpo, headers: cabecalhos, signal: controle.signal,
      });
    } catch (e) {
      if (controle.signal.aborted) {
        throw criarErro(controle.signal.reason === "cancelado" ? "cancelado" : "tempo_esgotado");
      }
      throw criarErro("rede");
    } finally {
      clearTimeout(limite);
    }
    if (!resposta.ok) throw criarErro("servidor", `O serviço respondeu com erro (${resposta.status}).`);
    return resposta.json();
  }

  /* ================================================================
   * >>> INTEGRAÇÃO DO MODELO DE VISÃO COMPUTACIONAL — PASSO 3 <<<
   * ----------------------------------------------------------------
   * Converte a resposta do modelo para o formato normalizado. Se a API
   * devolver outros nomes de campo (ex.: "label", "score"), faça o
   * mapeamento aqui. O conteúdo exibido ao usuário vem de
   * APOENA.conteudo.artefatos[classe]: cada nova classe do modelo
   * precisa de uma entrada lá, validada pelo arqueólogo.
   * ================================================================ */
  function normalizarResposta(bruta) {
    const classe = bruta.classe ?? null;
    const confianca = typeof bruta.confianca === "number" ? bruta.confianca : null;
    const artefato = classe ? window.APOENA.conteudo.artefatos[classe] || null : null;

    let status = bruta.status === "identificado" ? "identificado" : "nao_identificado";
    // Confiança abaixo do limiar ou classe sem conteúdo cadastrado → não identificado.
    if (status === "identificado" && (!artefato || confianca === null || confianca < cfg().LIMIAR_CONFIANCA)) {
      status = "nao_identificado";
    }
    return {
      status,
      classe,
      confianca,
      artefato: status === "identificado" ? artefato : null,
      modelo: bruta.modelo || null,
      simulado: estaSimulando(),
      erro: null,
    };
  }

  function criarErro(tipo, mensagem) {
    const e = new Error(mensagem || tipo);
    e.tipo = tipo;
    return e;
  }

  const MENSAGENS_ERRO = {
    tempo_esgotado: "A análise demorou mais que o esperado. Verifique a conexão e tente de novo.",
    rede: "Não foi possível falar com o serviço de identificação. Verifique a conexão com a internet e tente de novo.",
    servidor: "O serviço de identificação está indisponível no momento. Tente de novo em alguns minutos.",
    cancelado: "Análise cancelada.",
  };

  function respostaDeErro(e) {
    const tipo = e && e.tipo ? e.tipo : "servidor";
    return {
      status: "erro", classe: null, confianca: null, artefato: null, modelo: null,
      simulado: estaSimulando(),
      erro: { tipo, mensagem: (e && e.tipo && e.message !== e.tipo && e.message) || MENSAGENS_ERRO[tipo] },
    };
  }

  /* Respostas de exemplo no formato do contrato (somente MODO "simulado"). */
  function simularResposta(cenario, sinal) {
    return new Promise((resolver, rejeitar) => {
      const atraso = cenario === "tempo_esgotado" ? Math.min(cfg().SIMULACAO_ATRASO_MS * 2, 4000) : cfg().SIMULACAO_ATRASO_MS;
      const t = setTimeout(() => {
        const modelo = { nome: "simulação", versao: "—" };
        if (cenario === "erro") return rejeitar(criarErro("servidor"));
        if (cenario === "tempo_esgotado") return rejeitar(criarErro("tempo_esgotado"));
        if (cenario === "nao_identificado") {
          return resolver({ status: "nao_identificado", classe: null, confianca: 0.21, modelo });
        }
        resolver({ status: "identificado", classe: "lamina_machado_polida", confianca: 0.87, modelo });
      }, atraso);
      if (sinal) sinal.addEventListener("abort", () => { clearTimeout(t); rejeitar(criarErro("cancelado")); }, { once: true });
    });
  }

  window.APOENA.identificacao = {
    identificar, validarImagem, estaSimulando, definirCenarioSimulado, obterCenarioSimulado,
  };
})();
