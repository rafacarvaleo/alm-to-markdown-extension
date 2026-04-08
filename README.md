# ALM Item Markdown Export

Extensão **Chrome** (Manifest V3) que exporta o conteúdo de artefatos de texto no **DOORS Next** (ALM) para **Markdown** (GFM), com [Turndown](https://github.com/mixmark-io/turndown) e [turndown-plugin-gfm](https://github.com/domchristie/turndown-plugin-gfm). Suporta export **completo**, opção **Remover conteúdo tachado** (aplicada antes da conversão) e **segmentos por cor** (`background-color` inline), com índice no rodapé do ficheiro principal quando exporta em lote.

## Requisitos

- **Chrome 109+** (`chrome.offscreen`).

## Instalação

1. Clonar ou descarregar este repositório e abrir a pasta **`alm-item-html-export`** (é ela que se carrega como extensão).
2. Opcional: `npm install` e `npm run vendor` para regenerar `vendor/` a partir do `package.json`.
3. Chrome → `chrome://extensions` → **Modo do programador** → **Carregar sem compactação** → seleccionar `alm-item-html-export`.

## Uso

1. Abrir um artefato cuja URL contenha `showArtifactPage` e `artifactURI`.
2. **Remover conteúdo tachado** — se estiver marcado, o HTML passa por remoção de `del` / `s` / `strike` e de elementos com `text-decoration: line-through` antes do Turndown (export completo e segmentos).
3. **Baixar Markdown do item** — só o documento completo.
4. Análise automática de **cores de realce**; marcar uma ou mais cores, opcionalmente **um único ficheiro** (união) e **incluir Markdown completo** com índice; **Exportar selecionados**.

**Nomes dos segmentos:** `basename__bg-RRGGBB.md`, `basename__destaques-selecionados.md` (união). Cada ficheiro por cor contém **apenas** os elementos HTML que têm esse `background-color` (não o parágrafo ou célula inteira, salvo se o próprio nó pintado for o parágrafo/célula). O índice usa caminhos `./…`; convém guardar todos na mesma pasta.

## Limitações

- Só miolo de texto (widget `.rdm-text-artifact-widget` ou iframe CKEditor em uso).
- Realce só é detetado com `style` inline (`background-color`); classes CSS puras não entram.
- **GFM** não representa cor de fundo; nos segmentos a cor aparece sobretudo no **YAML** inicial.
- **União** de várias cores: se um realce estiver dentro de outro de cor diferente, o texto pode aparecer mais do que uma vez no `.md` unido.
- Documento completo: `saveAs: true`; segmentos: `saveAs: false` (pasta de downloads por defeito).
- HTML muito específico do DOORS pode converter de forma imperfeita; itens grandes via data URL podem aproximar limites do browser.

## Licença das dependências vendored

Ver `vendor/NOTICES.md`.
