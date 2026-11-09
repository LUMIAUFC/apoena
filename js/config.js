/*
 * APOENA — Configuração do frontend
 * ------------------------------------------------------------------
 * Este é o ÚNICO arquivo que precisa ser alterado para ligar o frontend
 * ao modelo de visão computacional (ver também js/servico-identificacao.js).
 */
window.APOENA = window.APOENA || {};

window.APOENA.config = {
  /* ================================================================
   * >>> INTEGRAÇÃO DO MODELO DE VISÃO COMPUTACIONAL — PASSO 1 <<<
   * ----------------------------------------------------------------
   * Enquanto o modelo não existir, MODO = "simulado": o frontend usa
   * respostas de exemplo (js/servico-identificacao.js → simularResposta).
   *
   * Quando a API do modelo estiver no ar:
   *   1. troque MODO para "api";
   *   2. preencha API_URL com o endereço do serviço (sem barra no fim);
   *   3. ajuste API_ROTA_IDENTIFICAR, se a rota for outra;
   *   4. confira o formato da resposta no contrato descrito em
   *      js/servico-identificacao.js e no README.md.
   * Nenhuma tela precisa ser alterada.
   * ================================================================ */
  MODO: "simulado", // "simulado" | "api"
  API_URL: "",      // ex.: "https://apoena-api.exemplo.ufc.br"
  API_ROTA_IDENTIFICAR: "/v1/identificar",
  API_TOKEN: "",    // se a API exigir chave, NÃO versionar o valor real

  // Tempo máximo de espera pela resposta do modelo (ms). RNF02.
  TEMPO_LIMITE_MS: 30000,

  // Abaixo deste grau de confiança (0 a 1), o resultado é tratado como
  // "não identificado". Valor provisório: definir com a equipe e o arqueólogo.
  LIMIAR_CONFIANCA: 0.6,

  // Imagens aceitas no envio.
  TIPOS_IMAGEM: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  TAMANHO_MAX_MB: 10,

  // Simulação: resultado padrão quando MODO = "simulado".
  // "identificado" | "nao_identificado" | "erro" | "tempo_esgotado"
  // Na interface, o painel "Modo de demonstração" permite trocar o cenário.
  SIMULACAO_PADRAO: "identificado",
  SIMULACAO_ATRASO_MS: 1800,
};
