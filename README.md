# APOENA — Frontend

Portal de educação patrimonial com identificação inicial de possíveis artefatos arqueológicos por imagem. Projeto do LUMIA — Laboratório de Usabilidade, Mídias e Inteligência Artificial, UFC Campus Quixadá.

Esta versão contém **apenas o frontend**. Os resultados de identificação são **simulados** até a integração com o modelo de visão computacional, que é feita sem alterar as telas (RNF02 do Documento de Visão).

## Como executar

**Acesse o sistema:** https://lumiaufc.github.io/apoena/

- Abra `dist/index.html` no navegador (arquivo único, sem instalação), ou
- sirva a pasta do projeto em um servidor estático (ex.: `python3 -m http.server`) e abra `index.html`.

Depois de editar os arquivos em `css/` e `js/`, gere o arquivo único com:

```
python3 build.py
```

A localização do celular exige HTTPS (ou `localhost`).

## Estrutura

```
index.html                     Estrutura da página: faixa de marca, navegação, rodapé
css/apoena.css                 Estilos com a identidade visual do LUMIA (Design System LUMIA)
js/config.js                   Configuração — modo simulado/API, endereço do serviço, limiar   ← INTEGRAÇÃO (passo 1)
js/conteudo.js                 Textos educativos, termo, legislação e artefatos por classe
js/servico-identificacao.js    Camada de integração com o modelo de visão computacional        ← INTEGRAÇÃO (passos 2 e 3)
js/app.js                      Telas e fluxo (não conhece o modelo)
assets/                        Logotipos da UFC Campus Quixadá e do LUMIA
build.py                       Gera dist/index.html (arquivo único)
.github/workflows/pages.yml    Publica dist/ no GitHub Pages a cada envio para a branch main
```

## Fluxo implementado

| Etapa | Tela | Requisitos |
| --- | --- | --- |
| — | Termo de compromisso (aceite obrigatório, lembrado na sessão) | RF01, RF02 |
| 1 | Foto: envio de imagem (escolher arquivo ou arrastar), com validação | RF03 |
| 2 | Análise e resultado: identificado, não identificado ou erro, com grau de confiança e aviso de incerteza | RF04 a RF08 |
| 3 | Orientações: objeto retirado? Sim → orientações para objeto retirado e legislação; Não → orientações de preservação | RF09, RF10, RF12 |
| 4 | Registro da ocorrência: apenas localização, município, zona rural/urbana e descrição do local | — |
| 5 | Comunicação: resumo para copiar e instruções para o IPHAN (sem envio real) | RF13 |

Também há as páginas Início, Educação patrimonial, Sobre o APOENA e Ajuda.

## Integração com o modelo de visão computacional

Os pontos de integração estão marcados no código com:

```
>>> INTEGRAÇÃO DO MODELO DE VISÃO COMPUTACIONAL — PASSO N <<<
```

1. **`js/config.js` (passo 1):** troque `MODO` de `"simulado"` para `"api"` e preencha `API_URL`.
2. **`js/servico-identificacao.js` → `chamarApi` (passo 2):** a chamada `fetch` já está escrita segundo o contrato abaixo, com tempo limite e cancelamento. Revise rota, campo do arquivo e cabeçalhos. Se o modelo rodar no navegador (TensorFlow.js, ONNX Runtime Web), troque o corpo da função pela inferência local e devolva o mesmo JSON.
3. **`js/servico-identificacao.js` → `normalizarResposta` (passo 3):** adapte os nomes de campo se a API responder em outro formato.
4. **`js/conteudo.js` → `artefatos`:** cada classe do modelo precisa de uma entrada com a mesma chave (ex.: `lamina_machado_polida`), com textos validados pelo arqueólogo.

### Contrato proposto (validar com a equipe do modelo)

Requisição: `POST {API_URL}/v1/identificar`, `multipart/form-data`, campo `imagem`.

Resposta `200`:

```json
{
  "status": "identificado",
  "classe": "lamina_machado_polida",
  "confianca": 0.87,
  "alternativas": [{ "classe": "nao_artefato", "confianca": 0.08 }],
  "modelo": { "nome": "apoena-vc", "versao": "0.1.0" },
  "id_analise": "a1b2c3"
}
```

`status` pode ser `"identificado"` ou `"nao_identificado"`. Erros HTTP (4xx/5xx), falta de rede e tempo esgotado (`TEMPO_LIMITE_MS`) são tratados pela interface, que oferece nova tentativa.

Regras aplicadas no frontend:

- Confiança abaixo de `LIMIAR_CONFIANCA` (0,6, provisório) ou classe sem conteúdo em `conteudo.js` → resultado tratado como "não identificado".
- Toda tela de resultado exibe o aviso de que a identificação é uma estimativa (RF06).

### Testar os estados sem o modelo

Com `MODO: "simulado"`, a etapa de foto mostra o painel **Modo de demonstração**, onde se escolhe o resultado simulado: peça identificada, não identificada, erro no serviço ou tempo esgotado.

## Dados coletados

O APOENA não pede dados pessoais nem justificativa para a retirada do objeto. Além da foto usada na identificação, o registro coleta apenas a localização (coordenadas do celular ou ponto de referência, município, estado e zona) e a descrição do lugar onde a peça foi encontrada. Nada é enviado: o usuário copia o resumo e o encaminha ao IPHAN.

## Acessibilidade (WCAG 2.2, nível AA)

- Contraste AA nos temas claro e escuro (tokens do Design System LUMIA); estado nunca indicado só por cor.
- Navegação completa por teclado, foco visível de 3px, link "Pular para o conteúdo" e foco no título a cada troca de tela.
- Rótulos visíveis, dicas e erros ligados aos campos (`aria-describedby`, `aria-invalid`), com resumo de erros clicável.
- Mensagens de carregando, resultado e erro anunciadas por leitores de tela (região `aria-live`).
- Alvos de toque com no mínimo 44 × 44 px; o texto pode ser ampliado e o layout se adapta a telas de 320px.
- Ajuda sempre no mesmo lugar (rodapé); a foto do objeto é reaproveitada no registro, sem pedir de novo.
- Animações respeitam `prefers-reduced-motion`.

## Conteúdo a validar

Os textos marcados com `[VALIDAR]` em `js/conteudo.js` precisam de revisão do arqueólogo antes da publicação. Os contatos do IPHAN devem ser conferidos no site oficial.

---

LUMIA · Laboratório de Usabilidade, Mídias e Inteligência Artificial · UFC Campus Quixadá
