/*
 * APOENA — Interface (telas, navegação e fluxo de identificação)
 * ------------------------------------------------------------------
 * As telas usam somente APOENA.identificacao.identificar(...).
 * Nenhuma tela conhece o modelo de visão computacional: a integração
 * fica em js/config.js e js/servico-identificacao.js.
 */
(function () {
  const C = window.APOENA.conteudo;
  const ID = window.APOENA.identificacao;
  const main = document.getElementById("conteudo");
  const live = document.getElementById("anuncio");

  /* ---------------- utilidades ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;
  function anunciar(msg) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 50); }
  function lerSessao(chave) { try { return sessionStorage.getItem(chave); } catch (e) { return null; } }
  function gravarSessao(chave, valor) { try { sessionStorage.setItem(chave, valor); } catch (e) { /* sem armazenamento: segue sem lembrar */ } }
  const estrela = '<svg class="estrela" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 3c1.2 6.6 6.4 11.8 13 13-6.6 1.2-11.8 6.4-13 13-1.2-6.6-6.4-11.8-13-13 6.6-1.2 11.8-6.4 13-13z"/></svg>';

  /* ---------------- estado do fluxo ---------------- */
  const ETAPAS = [
    { id: "foto", nome: "Foto" },
    { id: "resultado", nome: "Resultado" },
    { id: "orientacoes", nome: "Orientações" },
    { id: "ocorrencia", nome: "Ocorrência" },
    { id: "comunicar", nome: "Comunicação" },
  ];

  function estadoInicial() {
    return {
      tela: "foto",            // termo | foto | analise | resultado | retirada | ocorrencia | instrucoes | fim
      foto: null,              // { arquivo, url }
      erroFoto: null,
      resultado: null,         // formato normalizado do serviço
      retirado: null,          // "sim" | "nao"
      ocorrencia: { lat: null, lon: null, precisao: null, referencia: "", municipio: "", uf: "CE", zona: "", descricao: "" },
      erros: {},
      geoStatus: "",
    };
  }
  let fluxo = estadoInicial();
  let controleAnalise = null;

  function reiniciarFluxo() {
    if (fluxo.foto) URL.revokeObjectURL(fluxo.foto.url);
    fluxo = estadoInicial();
  }

  /* ---------------- rotas (hash simples: #inicio, #identificar...) ---------------- */
  const ROTAS = { inicio: telaInicio, identificar: telaIdentificar, educacao: telaEducacao, sobre: telaSobre, ajuda: telaAjuda };

  function rotaAtual() {
    const r = (location.hash || "").replace(/^#/, "");
    return ROTAS[r] ? r : "inicio";
  }

  function renderizar({ focar = true } = {}) {
    const rota = rotaAtual();
    main.innerHTML = ROTAS[rota]();
    document.querySelectorAll(".nav a").forEach((a) => {
      if (a.getAttribute("href") === "#" + rota) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const titulo = main.querySelector("h1");
    document.title = (titulo ? titulo.textContent.trim() + " · " : "") + "APOENA";
    ligarEventos(rota);
    if (focar && titulo) { titulo.setAttribute("tabindex", "-1"); titulo.focus({ preventScroll: false }); window.scrollTo(0, 0); }
  }

  window.addEventListener("hashchange", () => {
    if (rotaAtual() === "identificar" && fluxo.tela === "fim") reiniciarFluxo();
    renderizar();
  });

  /* ================================================================
   * TELAS INSTITUCIONAIS
   * ================================================================ */
  function telaInicio() {
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Patrimônio arqueológico</p>
        <h1>Encontrou uma peça que pode ser arqueológica?</h1>
        <p class="lede">Envie uma foto do objeto, veja o que ele pode ser e saiba como agir para preservá-lo. O APOENA reconhece, nesta fase, lâminas de machado polidas encontradas no Nordeste.</p>
        <div class="actions"><a class="btn primary" href="#identificar">Identificar objeto</a></div>
      </section>

      <div class="notice alerta" role="note">
        <h2>Não retire o objeto do lugar</h2>
        <p>O lugar onde a peça está conta parte da história dela. Fotografe sem mexer e comunique o achado ao IPHAN.</p>
      </div>

      <section class="block" aria-labelledby="como">
        <div class="block-head"><h2 id="como">Como funciona</h2></div>
        <ol class="passos">
          <li><span class="num">1</span><div><strong>Envie uma foto da peça</strong><p class="muted">Fotografe a peça no lugar onde ela está, com boa luz, e envie a imagem.</p></div></li>
          <li><span class="num">2</span><div><strong>Veja o resultado</strong><p class="muted">O APOENA indica o que a peça pode ser e explica sua função e matéria-prima.</p></div></li>
          <li><span class="num">3</span><div><strong>Comunique o achado</strong><p class="muted">Registre o local e receba as instruções para avisar o IPHAN.</p></div></li>
        </ol>
      </section>

      <section class="block" aria-labelledby="saiba">
        <div class="block-head"><h2 id="saiba">Saiba mais</h2></div>
        <div class="links-grid">
          <a class="link-card" href="#educacao"><strong>Educação patrimonial</strong><span class="muted">O que é patrimônio arqueológico, o que diz a lei e como proteger.</span></a>
          <a class="link-card" href="#sobre"><strong>Sobre o APOENA</strong><span class="muted">Quem faz o projeto, parceiros e limites da identificação.</span></a>
        </div>
      </section>`;
  }

  function desenhoLamina() {
    // Esquema simplificado de uma lâmina de machado polida, com as partes nomeadas.
    return `
      <figure class="esquema">
        <svg viewBox="0 0 320 200" role="img" aria-labelledby="esq-t">
          <title id="esq-t">Esquema de uma lâmina de machado polida: o gume é a borda larga e afiada, embaixo; o talão é a ponta mais estreita, em cima.</title>
          <path d="M120 22 Q160 12 200 22 L238 168 Q160 190 82 168 Z" class="pedra"/>
          <path d="M82 168 Q160 190 238 168" class="gume"/>
          <line x1="200" y1="22" x2="262" y2="22" class="guia"/>
          <text x="268" y="26" class="rot">Talão</text>
          <line x1="238" y1="168" x2="262" y2="168" class="guia"/>
          <text x="268" y="172" class="rot">Gume</text>
          <line x1="150" y1="96" x2="40" y2="96" class="guia"/>
          <text x="8" y="88" class="rot">Face</text>
          <text x="8" y="104" class="rot sub">polida</text>
        </svg>
        <figcaption class="small muted">Esquema simplificado. As peças variam em tamanho, formato e cor.</figcaption>
      </figure>`;
  }

  function telaEducacao() {
    const a = C.artefatos.lamina_machado_polida;
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Educação patrimonial</p>
        <h1>Patrimônio arqueológico: o que é e como proteger</h1>
        <p class="lede">Objetos deixados por povos indígenas no passado contam a história do lugar onde vivemos. Eles pertencem a todos e são protegidos por lei.</p>
      </section>

      <section class="block" aria-labelledby="ed1">
        <div class="block-head"><h2 id="ed1">O que é patrimônio arqueológico</h2></div>
        <p>São os vestígios de grupos humanos do passado: ferramentas de pedra, cerâmica, pinturas em rocha, restos de fogueiras e os lugares onde foram encontrados. No Nordeste, muitos desses vestígios foram deixados por povos indígenas ao longo de milhares de anos.</p>
      </section>

      <section class="block" aria-labelledby="ed2">
        <div class="block-head"><h2 id="ed2">Por que não retirar o objeto do lugar</h2></div>
        <p>Para o arqueólogo, a posição da peça, a camada de terra e os objetos ao redor são tão importantes quanto a peça. Quando ela é retirada, essas informações se perdem e não podem ser recuperadas.</p>
        <ul class="lista">
          <li>Não cave, não lave e não limpe a peça.</li>
          <li>Fotografe no lugar e anote como chegar até ele.</li>
          <li>Comunique o achado ao IPHAN.</li>
        </ul>
      </section>

      <section class="block" aria-labelledby="ed3">
        <div class="block-head"><h2 id="ed3">O que diz a lei</h2><span class="small muted">${esc(C.legislacao.lei)}</span></div>
        ${blocoLegislacao()}
      </section>

      <section class="block" aria-labelledby="ed4">
        <div class="block-head"><h2 id="ed4">Conheça: ${esc(a.nome.toLowerCase())}</h2></div>
        <div class="duas-colunas">
          ${desenhoLamina()}
          <dl class="info">
            <div><dt>O que é</dt><dd>${esc(a.oQueE)}</dd></div>
            <div><dt>Para que servia</dt><dd>${esc(a.funcao)}</dd></div>
            <div><dt>Matéria-prima</dt><dd>${esc(a.materiaPrima)}</dd></div>
          </dl>
        </div>
      </section>

      <section class="block" aria-labelledby="ed5">
        <div class="block-head"><h2 id="ed5">Como comunicar um achado</h2></div>
        ${blocoComunicacao()}
      </section>

      <div class="actions"><a class="btn primary" href="#identificar">Identificar um objeto</a></div>`;
  }

  function blocoLegislacao() {
    return `
      <dl class="lei">
        ${C.legislacao.pontos.map((p) => `<div><dt>${esc(p.artigo)}</dt><dd>${esc(p.texto)}</dd></div>`).join("")}
      </dl>
      <p class="small"><a href="${C.legislacao.link}" target="_blank" rel="noopener">Ler a lei completa (Câmara dos Deputados)</a></p>`;
  }

  function blocoComunicacao() {
    return `
      <ol class="lista numerada">${C.comunicacao.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
      <p class="small"><a href="${C.comunicacao.site}" target="_blank" rel="noopener">Site do IPHAN: contatos das superintendências</a></p>`;
  }

  function telaSobre() {
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Sobre</p>
        <h1>Sobre o APOENA</h1>
        <p class="lede">Um portal de educação patrimonial com identificação de artefatos por imagem, desenvolvido no LUMIA, da Universidade Federal do Ceará, Campus Quixadá.</p>
      </section>
      <section class="block" aria-labelledby="s1">
        <div class="block-head"><h2 id="s1">Objetivo</h2></div>
        <p>Ajudar quem encontra um possível artefato arqueológico a saber o que ele pode ser, a não retirá-lo do lugar e a comunicar o achado ao órgão responsável.</p>
      </section>
      <section class="block" aria-labelledby="s2">
        <div class="block-head"><h2 id="s2">Quem participa</h2></div>
        <ul class="lista">
          <li>LUMIA — Laboratório de Usabilidade, Mídias e Inteligência Artificial (UFC Campus Quixadá)</li>
          <li>Arqueólogo consultor, que valida os conteúdos e os resultados</li>
          <li>Instituto Tembetá</li>
        </ul>
      </section>
      <section class="block" aria-labelledby="s3">
        <div class="block-head"><h2 id="s3">Limites da identificação</h2></div>
        <ul class="lista">
          <li>O resultado é uma estimativa e não substitui a avaliação de um arqueólogo ou do IPHAN.</li>
          <li>Nesta fase, o APOENA reconhece apenas lâminas de machado polidas encontradas no Nordeste.</li>
          <li>O APOENA não envia a ocorrência ao IPHAN: ele prepara um resumo para você comunicar.</li>
        </ul>
      </section>
      <section class="block" aria-labelledby="s4">
        <div class="block-head"><h2 id="s4">Sua foto e seus dados</h2></div>
        <p>O APOENA não pede nome, telefone nem outros dados pessoais. A foto é usada apenas para a identificação, e o registro da ocorrência pede somente a localização e a descrição do lugar onde a peça foi encontrada. Essas informações ficam no seu aparelho até você decidir enviá-las ao IPHAN.</p>
      </section>`;
  }

  function telaAjuda() {
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Ajuda</p>
        <h1>Como usar o APOENA</h1>
      </section>
      <div class="faq">
        <details><summary>Como tirar uma boa foto?</summary><p>Use luz natural, mostre a peça inteira e chegue perto o bastante para ver a superfície. Se puder, coloque uma caneta ou chave ao lado, sem tocar na peça, para dar noção de tamanho.</p></details>
        <details><summary>O resultado diz que é uma lâmina de machado. E agora?</summary><p>Deixe a peça onde está, siga as orientações da tela e registre a ocorrência. No fim, você recebe um resumo para enviar ao IPHAN.</p></details>
        <details><summary>Já tirei a peça do lugar. O que faço?</summary><p>Não se preocupe: informe isso no aplicativo. Guarde a peça em local seguro, sem lavar, e anote o local exato onde ela estava.</p></details>
        <details><summary>O aplicativo não reconheceu o objeto.</summary><p>Tente outra foto, com mais luz. Se ainda assim você achar que é um artefato, registre a ocorrência mesmo sem identificação.</p></details>
      </div>
      <div class="actions"><a class="btn primary" href="#identificar">Identificar objeto</a></div>`;
  }

  /* ================================================================
   * FLUXO DE IDENTIFICAÇÃO
   * ================================================================ */
  function telaIdentificar() {
    if (!lerSessao("apoena-termo") && fluxo.tela !== "fim") fluxo.tela = "termo";
    else if (fluxo.tela === "termo") fluxo.tela = "foto";
    const t = {
      termo: etapaTermo, foto: etapaFoto, analise: etapaAnalise, resultado: etapaResultado,
      retirada: etapaRetirada, ocorrencia: etapaOcorrencia, instrucoes: etapaInstrucoes, fim: etapaFim,
    }[fluxo.tela];
    return t();
  }

  function indicador(idEtapa) {
    const i = ETAPAS.findIndex((e) => e.id === idEtapa);
    return `
      <div class="etapas">
        <p class="etapas-texto">Etapa <strong>${i + 1}</strong> de ${ETAPAS.length}: ${esc(ETAPAS[i].nome)}</p>
        <div class="meter" role="progressbar" aria-label="Progresso" aria-valuemin="1" aria-valuemax="${ETAPAS.length}" aria-valuenow="${i + 1}" aria-valuetext="Etapa ${i + 1} de ${ETAPAS.length}"><span style="--pct:${((i + 1) / ETAPAS.length) * 100}%"></span></div>
      </div>`;
  }

  function avisoSimulacao() {
    if (!ID.estaSimulando()) return "";
    const c = ID.obterCenarioSimulado();
    const op = [["identificado", "Peça identificada"], ["nao_identificado", "Não identificada"], ["erro", "Erro no serviço"], ["tempo_esgotado", "Tempo esgotado"]];
    return `
      <div class="notice demo" role="note">
        <h2>Modo de demonstração</h2>
        <p class="small">O modelo de visão computacional ainda não está integrado. O resultado mostrado é simulado.</p>
        <div class="field compacto">
          <label for="cenario">Resultado simulado</label>
          <select id="cenario">${op.map(([v, r]) => `<option value="${v}"${v === c ? " selected" : ""}>${r}</option>`).join("")}</select>
        </div>
      </div>`;
  }

  /* --- Termo de compromisso (RF01, RF02) --- */
  function etapaTermo() {
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Antes de começar</p>
        <h1>${esc(C.termo.titulo)}</h1>
        <p class="lede">Leia e aceite o termo para usar a identificação e o registro de ocorrências.</p>
      </section>
      <form id="form-termo" class="cartao" novalidate>
        <ul class="lista">${C.termo.itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <div class="check ${fluxo.erros.termo ? "has-error" : ""}">
          <input type="checkbox" id="aceite" ${fluxo.erros.termo ? 'aria-invalid="true" aria-describedby="aceite-erro"' : ""}>
          <label for="aceite">Li e concordo com o termo de compromisso.</label>
        </div>
        ${fluxo.erros.termo ? `<p class="err" id="aceite-erro">Marque a caixa para aceitar o termo.</p>` : ""}
        <div class="actions"><button type="submit" class="primary">Aceitar e continuar</button><a class="btn" href="#inicio">Voltar ao início</a></div>
      </form>`;
  }

  /* --- Foto (RF03) --- */
  function etapaFoto() {
    const f = fluxo.foto;
    return `
      ${indicador("foto")}
      <section class="masthead compacta">
        <p class="eyebrow">${estrela}Identificar objeto</p>
        <h1>Envie uma foto do objeto</h1>
        <p class="lede">Use uma foto tirada no lugar onde a peça está, sem mexer nela.</p>
      </section>
      ${avisoSimulacao()}
      <div class="cartao">
        <input type="file" id="in-galeria" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true">
        ${f ? `
          <figure class="preview">
            <img src="${f.url}" alt="Foto do objeto enviada por você">
            <figcaption class="small muted">${esc(f.arquivo.name || "Foto")} · <span class="data">${(f.arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB</span></figcaption>
          </figure>
          <div class="actions">
            <button type="button" class="primary" id="analisar">Analisar imagem</button>
            <button type="button" id="trocar">Trocar foto</button>
          </div>` : `
          <div class="envio" id="area-envio">
            <button type="button" class="primary grande" id="galeria">Escolher imagem</button>
            <p class="small muted">ou arraste a imagem para cá · JPG, PNG, WEBP ou HEIC, até ${window.APOENA.config.TAMANHO_MAX_MB} MB</p>
          </div>`}
        ${fluxo.erroFoto ? `<p class="err" role="alert">${esc(fluxo.erroFoto)}</p>` : ""}
      </div>
      <details class="dicas">
        <summary>Dicas para uma boa foto</summary>
        <ul class="lista">
          <li>Use luz natural e evite sombras fortes sobre a peça.</li>
          <li>Mostre a peça inteira e chegue perto o bastante para ver a superfície.</li>
          <li>Para dar noção de tamanho, coloque uma caneta ao lado, sem tocar na peça.</li>
        </ul>
      </details>`;
  }

  function receberFoto(arquivo) {
    const erro = ID.validarImagem(arquivo);
    if (erro) { fluxo.erroFoto = erro; renderizar({ focar: false }); anunciar(erro); return; }
    if (fluxo.foto) URL.revokeObjectURL(fluxo.foto.url);
    fluxo.foto = { arquivo, url: URL.createObjectURL(arquivo) };
    fluxo.erroFoto = null;
    renderizar({ focar: false });
    const b = document.getElementById("analisar");
    if (b) b.focus();
    anunciar("Foto carregada. Confira a imagem e escolha Analisar imagem.");
  }

  /* --- Análise (chama a camada de integração) --- */
  function etapaAnalise() {
    return `
      ${indicador("resultado")}
      <section class="analise" aria-busy="true">
        <div class="anel" aria-hidden="true"></div>
        <h1>Analisando a imagem</h1>
        <p class="muted" role="status">Isso pode levar alguns segundos.</p>
        <img class="mini" src="${fluxo.foto.url}" alt="Foto em análise">
        <button type="button" id="cancelar">Cancelar análise</button>
      </section>`;
  }

  async function iniciarAnalise() {
    fluxo.tela = "analise";
    renderizar();
    controleAnalise = new AbortController();
    // >>> As telas chamam SOMENTE este ponto. A integração com o modelo
    // >>> está em js/servico-identificacao.js (PASSOS 2 e 3).
    const r = await ID.identificar(fluxo.foto.arquivo, { sinal: controleAnalise.signal });
    controleAnalise = null;
    if (r.erro && r.erro.tipo === "cancelado") { fluxo.tela = "foto"; renderizar(); anunciar("Análise cancelada."); return; }
    fluxo.resultado = r;
    fluxo.tela = "resultado";
    renderizar();
    anunciar(r.status === "identificado" ? `Resultado: possível ${r.artefato.nome}.` : r.status === "erro" ? "A análise não foi concluída." : "O objeto não foi identificado.");
  }

  /* --- Resultado (RF04 a RF08) --- */
  function etapaResultado() {
    const r = fluxo.resultado;
    if (r.status === "erro") {
      return `
        ${indicador("resultado")}
        <section class="masthead compacta">
          <p class="eyebrow">${estrela}Resultado</p>
          <h1>A análise não foi concluída</h1>
        </section>
        <div class="notice erro" role="alert"><p>${esc(r.erro.mensagem)}</p></div>
        <div class="actions"><button type="button" class="primary" id="tentar">Tentar de novo</button><button type="button" id="outra">Escolher outra foto</button></div>`;
    }
    if (r.status === "nao_identificado") {
      return `
        ${indicador("resultado")}
        <section class="masthead compacta">
          <p class="eyebrow">${estrela}Resultado</p>
          <h1>Não foi possível identificar o objeto</h1>
          <p class="lede">Isso pode acontecer por três motivos: a peça pode não ser um artefato, a foto pode não estar nítida, ou o APOENA ainda não reconhece esse tipo de objeto. Nesta fase, ele reconhece apenas lâminas de machado polidas.</p>
        </section>
        ${r.simulado ? '<p class="selo">Resultado simulado</p>' : ""}
        <div class="notice info" role="note">
          <h2>Ainda acha que pode ser um artefato?</h2>
          <p>Deixe a peça onde está e registre a ocorrência mesmo assim. Um especialista poderá avaliar.</p>
        </div>
        <div class="actions"><button type="button" class="primary" id="outra">Tentar com outra foto</button><button type="button" id="seguir">Registrar mesmo assim</button></div>`;
    }
    const a = r.artefato;
    return `
      ${indicador("resultado")}
      <section class="masthead compacta">
        <p class="eyebrow">${estrela}Resultado da identificação</p>
        <h1>Possível ${esc(a.nome.toLowerCase())}</h1>
      </section>
      <div class="painel">
        <div class="painel-topo">
          <img class="mini" src="${fluxo.foto.url}" alt="Foto do objeto analisado">
          <div class="confianca">
            <p class="label-caps">Grau de confiança do modelo</p>
            <p class="valor data">${pct(r.confianca)}</p>
            <div class="escala" aria-hidden="true"><span style="--pct:${pct(r.confianca)}"></span></div>
            ${r.simulado ? '<p class="selo">Resultado simulado</p>' : ""}
          </div>
        </div>
        <div class="notice info" role="note">
          <h2>Esta identificação é uma estimativa</h2>
          <p>O resultado não substitui a avaliação de um arqueólogo ou do IPHAN.</p>
        </div>
        <dl class="info">
          <div><dt>O que é</dt><dd>${esc(a.oQueE)}</dd></div>
          <div><dt>Possível função</dt><dd>${esc(a.funcao)}</dd></div>
          <div><dt>Matéria-prima</dt><dd>${esc(a.materiaPrima)}</dd></div>
          <div><dt>Por que preservar</dt><dd>${esc(a.educativo)}</dd></div>
        </dl>
      </div>
      <div class="notice alerta" role="note">
        <h2>Não retire o objeto do local</h2>
        <p>Retirar a peça do lugar onde ela está apaga informações sobre a sua origem e prejudica a preservação e a interpretação do achado.</p>
      </div>
      <div class="actions"><button type="button" class="primary" id="seguir">Continuar: o que fazer agora</button><button type="button" id="outra">Analisar outra foto</button></div>`;
  }

  /* --- Retirada do objeto (RF10, RF11, RF12) --- */
  function etapaRetirada() {
    const e = fluxo.erros;
    const sim = fluxo.retirado === "sim", nao = fluxo.retirado === "nao";
    return `
      ${indicador("orientacoes")}
      <section class="masthead compacta">
        <p class="eyebrow">${estrela}Orientações</p>
        <h1>O que fazer com o objeto</h1>
      </section>
      ${resumoErros()}
      <form id="form-retirada" class="cartao" novalidate>
        <fieldset class="opcoes ${e.retirado ? "has-error" : ""}" id="grupo-retirado" ${e.retirado ? 'aria-describedby="retirado-erro"' : ""}>
          <legend>O objeto foi retirado do local onde estava?</legend>
          ${e.retirado ? `<p class="err" id="retirado-erro">${esc(e.retirado)}</p>` : ""}
          <label class="opcao"><input type="radio" name="retirado" value="nao" ${nao ? "checked" : ""}><span>Não, continua no local</span></label>
          <label class="opcao"><input type="radio" name="retirado" value="sim" ${sim ? "checked" : ""}><span>Sim, foi retirado</span></label>
        </fieldset>

        ${nao ? `
          <div class="orientacao">
            <h2>Mantenha o objeto onde está</h2>
            <ul class="lista">
              <li>Não cave ao redor, não lave e não limpe a peça.</li>
              <li>Fotografe o local de longe e de perto, sem mexer em nada.</li>
              <li>Anote como chegar ao lugar ou use a localização do celular.</li>
              <li>Comunique o achado ao IPHAN o quanto antes.</li>
            </ul>
          </div>` : ""}

        ${sim ? `
          <div class="orientacao">
            <h2>Objetos arqueológicos não devem ser removidos do seu contexto</h2>
            <p>Agora que a peça foi retirada, ajude a preservar o que ainda é possível:</p>
            <ul class="lista">
              <li>Guarde a peça em local seguro, sem lavar, colar ou marcar.</li>
              <li>Não separe a peça de outros objetos encontrados junto com ela.</li>
              <li>Anote o lugar exato onde ela estava e comunique o IPHAN.</li>
            </ul>
            <h3>O que diz a lei</h3>
            ${blocoLegislacao()}
          </div>` : ""}

        <div class="actions"><button type="submit" class="primary">Registrar a ocorrência</button><button type="button" id="voltar-resultado">Voltar ao resultado</button></div>
      </form>`;
  }

  /* --- Registro da ocorrência --- */
  const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  function campoTexto(id, rotulo, { dica = "", tipo = "input", valor = "", obrig = true } = {}) {
    const erro = fluxo.erros[id];
    const desc = [dica ? `${id}-dica` : "", erro ? `${id}-erro` : ""].filter(Boolean).join(" ");
    const attrs = `id="${id}" ${desc ? `aria-describedby="${desc}"` : ""} ${erro ? 'aria-invalid="true"' : ""} ${obrig ? 'aria-required="true"' : ""}`;
    return `
      <div class="field ${tipo === "textarea" ? "full" : ""} ${erro ? "has-error" : ""}">
        <label for="${id}">${esc(rotulo)}${obrig ? "" : ' <span class="muted">(opcional)</span>'}</label>
        ${dica ? `<span class="hint" id="${id}-dica">${esc(dica)}</span>` : ""}
        ${erro ? `<span class="err" id="${id}-erro">${esc(erro)}</span>` : ""}
        ${tipo === "textarea" ? `<textarea ${attrs}>${esc(valor)}</textarea>` : `<input type="text" ${attrs} value="${esc(valor)}" autocomplete="off">`}
      </div>`;
  }

  function etapaOcorrencia() {
    const o = fluxo.ocorrencia, e = fluxo.erros;
    const temCoord = o.lat !== null;
    return `
      ${indicador("ocorrencia")}
      <section class="masthead compacta">
        <p class="eyebrow">${estrela}Registro da ocorrência</p>
        <h1>Onde o objeto foi encontrado</h1>
        <p class="lede">Essas informações ajudam o IPHAN a localizar e avaliar o achado.</p>
      </section>
      ${resumoErros()}
      <form id="form-ocorrencia" novalidate>
        <section class="block" aria-labelledby="h-local">
          <div class="block-head"><h2 id="h-local">Localização</h2></div>
          <div class="cartao local ${e.local ? "has-error" : ""}" id="local">
            ${e.local ? `<p class="err">${esc(e.local)}</p>` : ""}
            <div class="actions"><button type="button" id="usar-local">${temCoord ? "Atualizar localização" : "Usar minha localização atual"}</button></div>
            <p class="small" role="status" id="geo-status">${temCoord
              ? `Localização registrada: <span class="data">${o.lat.toFixed(5)}, ${o.lon.toFixed(5)}</span>${o.precisao ? ` (precisão de ${Math.round(o.precisao)} m)` : ""}`
              : esc(fluxo.geoStatus || "A localização do celular é a forma mais precisa. Se não for possível, descreva um ponto de referência abaixo.")}</p>
            ${campoTexto("referencia", "Ponto de referência", { dica: "Ex.: Sítio Boa Vista, 2 km depois da ponte, à direita.", valor: o.referencia, obrig: !temCoord })}
          </div>
          <div class="fields">
            ${campoTexto("municipio", "Município", { valor: o.municipio })}
            <div class="field">
              <label for="uf">Estado</label>
              <select id="uf">${UFS.map((u) => `<option${u === o.uf ? " selected" : ""}>${u}</option>`).join("")}</select>
            </div>
          </div>
          <fieldset class="opcoes linha ${e.zona ? "has-error" : ""}" id="grupo-zona" ${e.zona ? 'aria-describedby="zona-erro"' : ""}>
            <legend>O local fica em zona</legend>
            ${e.zona ? `<p class="err" id="zona-erro">${esc(e.zona)}</p>` : ""}
            <label class="opcao"><input type="radio" name="zona" value="Rural" ${o.zona === "Rural" ? "checked" : ""}><span>Rural</span></label>
            <label class="opcao"><input type="radio" name="zona" value="Urbana" ${o.zona === "Urbana" ? "checked" : ""}><span>Urbana</span></label>
          </fieldset>
        </section>

        <section class="block" aria-labelledby="h-desc">
          <div class="block-head"><h2 id="h-desc">Descrição do local</h2></div>
          ${campoTexto("descricao", "Como é o lugar onde o objeto está", { tipo: "textarea", dica: "Ex.: roça de milho perto do açude; terra revirada pelo arado; há cacos de cerâmica por perto.", valor: o.descricao })}
        </section>

        <div class="toolbar"><button type="button" id="voltar-retirada">Voltar</button><button type="submit" class="primary">Gerar resumo da ocorrência</button></div>
      </form>`;
  }

  function resumoErros() {
    const lista = Object.entries(fluxo.erros);
    if (!lista.length) return "";
    const alvo = { retirado: "grupo-retirado", zona: "grupo-zona", local: "local" };
    return `
      <div class="notice erro" id="resumo-erros" tabindex="-1" role="alert">
        <h2>Corrija ${lista.length === 1 ? "o item abaixo" : `os ${lista.length} itens abaixo`}</h2>
        <ul>${lista.map(([k, m]) => `<li><a href="#${alvo[k] || k}" data-foco="${alvo[k] || k}">${esc(m)}</a></li>`).join("")}</ul>
      </div>`;
  }

  function lerOcorrencia() {
    const o = fluxo.ocorrencia;
    const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    o.referencia = v("referencia"); o.municipio = v("municipio"); o.descricao = v("descricao");
    o.uf = v("uf") || o.uf;
    const z = document.querySelector('input[name="zona"]:checked'); o.zona = z ? z.value : "";
  }

  function validarOcorrencia() {
    const o = fluxo.ocorrencia, e = {};
    if (o.lat === null && !o.referencia) e.local = "Informe a localização: use a do celular ou descreva um ponto de referência.";
    if (!o.municipio) e.municipio = "Informe o município.";
    if (!o.zona) e.zona = "Escolha se o local fica em zona rural ou urbana.";
    if (!o.descricao) e.descricao = "Descreva o lugar onde o objeto está.";
    return e;
  }

  /* --- Instruções de comunicação (RF13) --- */
  function textoResumo() {
    const r = fluxo.resultado, o = fluxo.ocorrencia;
    const data = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const resultado = r && r.status === "identificado"
      ? `Possível ${r.artefato.nome.toLowerCase()} (confiança do modelo: ${pct(r.confianca)}${r.simulado ? ", resultado simulado" : ""})`
      : "Não identificado pelo aplicativo";
    const linhas = [
      "COMUNICAÇÃO DE POSSÍVEL ACHADO ARQUEOLÓGICO — APOENA",
      `Data do registro: ${data}`,
      `Identificação: ${resultado}`,
      `Objeto retirado do local: ${fluxo.retirado === "sim" ? "Sim" : "Não"}`,
    ];
    if (o.lat !== null) linhas.push(`Coordenadas: ${o.lat.toFixed(5)}, ${o.lon.toFixed(5)}`);
    if (o.referencia) linhas.push(`Ponto de referência: ${o.referencia}`);
    linhas.push(`Município: ${o.municipio} – ${o.uf}`, `Zona: ${o.zona}`, `Descrição do local: ${o.descricao}`);
    linhas.push("Fotografia: anexar a foto do objeto ao enviar");
    linhas.push("Observação: a identificação feita pelo APOENA é uma estimativa e não substitui a avaliação de um profissional.");
    return linhas.join("\n");
  }

  function etapaInstrucoes() {
    return `
      ${indicador("comunicar")}
      <section class="masthead compacta">
        <p class="eyebrow">${estrela}Comunicação</p>
        <h1>Comunique o achado ao IPHAN</h1>
        <p class="lede">O resumo abaixo reúne o que o IPHAN precisa saber. Copie e envie junto com a foto do objeto.</p>
      </section>
      <div class="notice info" role="note">
        <p>Nesta versão, o APOENA não envia a ocorrência automaticamente. O envio é feito por você, pelos contatos do IPHAN.</p>
      </div>
      <section class="block" aria-labelledby="h-resumo">
        <div class="block-head"><h2 id="h-resumo">Resumo da ocorrência</h2></div>
        <div class="field full">
          <label for="resumo" class="sr-only">Texto do resumo</label>
          <textarea id="resumo" class="resumo" readonly rows="11">${esc(textoResumo())}</textarea>
        </div>
        <div class="actions"><button type="button" class="primary" id="copiar">Copiar resumo</button></div>
      </section>
      <section class="block" aria-labelledby="h-como">
        <div class="block-head"><h2 id="h-como">Como comunicar</h2></div>
        ${blocoComunicacao()}
      </section>
      <div class="toolbar"><button type="button" id="voltar-ocorrencia">Revisar ocorrência</button><button type="button" class="primary" id="concluir">Concluir</button></div>`;
  }

  function etapaFim() {
    return `
      <section class="masthead">
        <p class="eyebrow">${estrela}Concluído</p>
        <h1>Obrigado por proteger o patrimônio</h1>
        <p class="lede">Com a sua comunicação, o IPHAN pode avaliar o achado e garantir que ele seja preservado.</p>
        <div class="actions"><button type="button" class="primary" id="novo">Identificar outro objeto</button><a class="btn" href="#educacao">Ler sobre educação patrimonial</a></div>
      </section>`;
  }

  /* ================================================================
   * EVENTOS
   * ================================================================ */
  function irPara(tela) { fluxo.tela = tela; fluxo.erros = {}; renderizar(); }
  const $ = (id) => document.getElementById(id);
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  function focarErros() {
    const r = $("resumo-erros");
    if (r) r.focus();
    r && r.querySelectorAll("a[data-foco]").forEach((a) => a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const alvo = $(a.dataset.foco);
      const foco = alvo && (alvo.matches("input,textarea,select") ? alvo : alvo.querySelector("input,textarea,select,button"));
      if (foco) foco.focus();
    }));
  }

  function ligarEventos(rota) {
    if (rota !== "identificar") return;
    const t = fluxo.tela;

    if (t === "termo") {
      on("form-termo", "submit", (ev) => {
        ev.preventDefault();
        if (!$("aceite").checked) { fluxo.erros = { termo: true }; renderizar({ focar: false }); $("aceite").focus(); return; }
        gravarSessao("apoena-termo", "1");
        irPara("foto");
      });
    }

    if (t === "foto") {
      on("cenario", "change", (ev) => ID.definirCenarioSimulado(ev.target.value));
      on("galeria", "click", () => $("in-galeria").click());
      on("trocar", "click", () => $("in-galeria").click());
      on("in-galeria", "change", (ev) => { if (ev.target.files[0]) receberFoto(ev.target.files[0]); });
      const area = $("area-envio");
      if (area) {
        area.addEventListener("dragover", (ev) => { ev.preventDefault(); area.classList.add("arrastando"); });
        area.addEventListener("dragleave", () => area.classList.remove("arrastando"));
        area.addEventListener("drop", (ev) => {
          ev.preventDefault(); area.classList.remove("arrastando");
          const f = ev.dataTransfer && ev.dataTransfer.files[0];
          if (f) receberFoto(f);
        });
      }
      on("analisar", "click", iniciarAnalise);
    }

    if (t === "analise") on("cancelar", "click", () => controleAnalise && controleAnalise.abort());

    if (t === "resultado") {
      on("tentar", "click", iniciarAnalise);
      on("outra", "click", () => irPara("foto"));
      on("seguir", "click", () => irPara("retirada"));
    }

    if (t === "retirada") {
      document.querySelectorAll('input[name="retirado"]').forEach((r) => r.addEventListener("change", () => {
        fluxo.retirado = r.value; fluxo.erros = {};
        renderizar({ focar: false });
        document.querySelector(`input[name="retirado"][value="${r.value}"]`).focus();
      }));
      on("voltar-resultado", "click", () => irPara("resultado"));
      on("form-retirada", "submit", (ev) => {
        ev.preventDefault();
        const e = {};
        if (!fluxo.retirado) e.retirado = "Responda se o objeto foi retirado do local.";
        if (Object.keys(e).length) { fluxo.erros = e; renderizar({ focar: false }); focarErros(); return; }
        irPara("ocorrencia");
      });
    }

    if (t === "ocorrencia") {
      on("usar-local", "click", () => {
        lerOcorrencia();
        if (!("geolocation" in navigator)) { fluxo.geoStatus = "Este aparelho não informa a localização. Descreva um ponto de referência."; renderizar({ focar: false }); return; }
        $("geo-status").textContent = "Obtendo a localização…";
        navigator.geolocation.getCurrentPosition(
          (p) => { Object.assign(fluxo.ocorrencia, { lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy }); fluxo.geoStatus = ""; delete fluxo.erros.local; renderizar({ focar: false }); anunciar("Localização registrada."); $("usar-local").focus(); },
          () => { fluxo.geoStatus = "Não foi possível obter a localização. Verifique a permissão do navegador ou descreva um ponto de referência."; renderizar({ focar: false }); $("usar-local").focus(); },
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
      on("voltar-retirada", "click", () => { lerOcorrencia(); irPara("retirada"); });
      on("form-ocorrencia", "submit", (ev) => {
        ev.preventDefault();
        lerOcorrencia();
        const e = validarOcorrencia();
        if (Object.keys(e).length) { fluxo.erros = e; renderizar({ focar: false }); focarErros(); return; }
        irPara("instrucoes");
      });
    }

    if (t === "instrucoes") {
      on("copiar", "click", async () => {
        const txt = $("resumo");
        try { await navigator.clipboard.writeText(txt.value); anunciar("Resumo copiado."); $("copiar").textContent = "Resumo copiado"; }
        catch (e) { txt.focus(); txt.select(); anunciar("Texto selecionado. Use o comando copiar do seu aparelho."); }
      });
      on("voltar-ocorrencia", "click", () => irPara("ocorrencia"));
      on("concluir", "click", () => { reiniciarFluxo(); irPara("fim"); });
    }

    if (t === "fim") on("novo", "click", () => { reiniciarFluxo(); renderizar(); });
  }

  // "Pular para o conteúdo": foca o conteúdo sem mexer na rota.
  document.documentElement.lang = "pt-BR";
  const pular = document.querySelector(".pular");
  if (pular) pular.addEventListener("click", (ev) => { ev.preventDefault(); main.focus(); });

  renderizar({ focar: false });
})();
