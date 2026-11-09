/*
 * APOENA — Conteúdo textual
 * ------------------------------------------------------------------
 * Todos os textos educativos ficam aqui, separados das telas, para que
 * a equipe e o arqueólogo possam revisá-los sem mexer na interface.
 * Trechos marcados com [VALIDAR] precisam de revisão do arqueólogo
 * antes da publicação.
 */
window.APOENA = window.APOENA || {};

window.APOENA.conteudo = {
  /* ----------------------------------------------------------------
   * Artefatos que o modelo pode reconhecer.
   * A CHAVE de cada entrada deve ser IGUAL ao campo "classe" devolvido
   * pelo modelo de visão computacional (ver servico-identificacao.js).
   * Ao treinar uma nova classe, acrescente uma entrada aqui.
   * ---------------------------------------------------------------- */
  artefatos: {
    lamina_machado_polida: {
      nome: "Lâmina de machado polida",
      // [VALIDAR] textos abaixo
      oQueE:
        "Ferramenta de pedra feita por povos indígenas. A rocha era desbastada e depois polida por atrito até formar uma peça lisa, com um lado cortante (o gume) e o lado oposto mais estreito (o talão).",
      funcao:
        "Presa a um cabo de madeira, era usada para cortar e trabalhar madeira, por exemplo para derrubar árvores, abrir roças e fazer canoas e utensílios.",
      materiaPrima:
        "Rochas duras e de grão fino, como o basalto e o diabásio. A rocha usada varia de região para região.",
      educativo:
        "Cada lâmina guarda informações sobre quem a fez e como vivia. Essas informações dependem do lugar exato onde a peça foi encontrada e do que estava ao redor dela. Por isso o objeto deve ficar onde está até ser avaliado por um especialista.",
      partes: [
        { termo: "Gume", definicao: "a borda afiada, usada para cortar" },
        { termo: "Talão", definicao: "a parte oposta ao gume, presa ao cabo" },
        { termo: "Faces", definicao: "os dois lados largos e polidos da peça" },
      ],
    },
  },

  /* Termo de compromisso (RF01 e RF02). */
  termo: {
    titulo: "Termo de compromisso",
    itens: [
      "Vou usar o APOENA para conhecer e proteger o patrimônio arqueológico, nunca para vender, trocar ou coletar objetos.",
      "Entendo que a identificação feita pelo aplicativo é uma estimativa e não substitui a avaliação de um arqueólogo ou do IPHAN.",
      "Vou evitar retirar ou mexer em objetos que possam ser arqueológicos e vou comunicar o achado ao órgão responsável.",
      "Sei que a fotografia enviada é usada apenas para a identificação.",
    ],
  },

  /* Legislação simplificada (RF09 — apresentada também no fluxo). */
  legislacao: {
    lei: "Lei nº 3.924, de 26 de julho de 1961",
    link: "https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-3924-26-julho-1961-353715-publicacaooriginal-1-pl.html",
    pontos: [
      { artigo: "Art. 1º", texto: "Os sítios arqueológicos e tudo o que há neles ficam sob a guarda e a proteção do poder público. Ser dono do terreno não torna a pessoa dona desses objetos." },
      { artigo: "Art. 18", texto: "Quem encontrar por acaso um objeto de interesse arqueológico deve comunicar o achado imediatamente ao IPHAN ou a outro órgão autorizado. Até a decisão do órgão, o proprietário ou ocupante do local é responsável por conservar o objeto." },
      { artigo: "Art. 19", texto: "Deixar de comunicar o achado leva à apreensão do objeto, e quem o encontrou responde pelos danos causados ao patrimônio." },
    ],
  },

  /* Comunicação ao IPHAN (RF13). Contatos: confirmar no site oficial. */
  comunicacao: {
    orgao: "IPHAN — Instituto do Patrimônio Histórico e Artístico Nacional",
    site: "https://www.gov.br/iphan/pt-br",
    passos: [
      "Procure a Superintendência do IPHAN no seu estado. Os endereços, telefones e e-mails estão no site do IPHAN.",
      "Envie o resumo da ocorrência gerado pelo APOENA, com a fotografia e a localização.",
      "Informe se o objeto continua no local ou se foi retirado, e por quê.",
      "Aguarde a orientação do IPHAN antes de mexer no objeto ou no local.",
    ],
  },
};
