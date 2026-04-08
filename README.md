# ALM Item Markdown Export

Extensão **Chrome** (Manifest V3) que exporta o conteúdo de artefatos de texto no **DOORS Next** (ALM) para **Markdown** (GFM), com [Turndown](https://github.com/mixmark-io/turndown) e [turndown-plugin-gfm](https://github.com/domchristie/turndown-plugin-gfm). Suporta export **completo** e **segmentado** (só tachado e/ou realces de cor detetados no HTML), com índice no rodapé do ficheiro principal.

## Requisitos

- **Chrome 109+** (`chrome.offscreen`).

## Instalação

1. Clonar ou descarregar este repositório e abrir a pasta **`alm-item-html-export`** (é ela que se carrega como extensão).
2. Opcional: `npm install` e `npm run vendor` para regenerar `vendor/` a partir do `package.json`.
3. Chrome → `chrome://extensions` → **Modo do programador** → **Carregar sem compactação** → seleccionar `alm-item-html-export`.

## Uso

1. Abrir um artefato cuja URL contenha `showArtifactPage` e `artifactURI`.
2. **Baixar Markdown do item** — documento completo apenas.
3. No popup: análise automática de tachado e cores de fundo; marcar critérios, opcionalmente **um único ficheiro** (união) e **incluir Markdown completo** com secção de índice; **Exportar selecionados**.

**Nomes dos segmentos:** `basename__tachado.md`, `basename__bg-RRGGBB.md`, `basename__destaques-selecionados.md`. O índice usa caminhos `./…`; convém guardar todos na mesma pasta.

## Limitações

- Só miolo de texto (widget `.rdm-text-artifact-widget` ou iframe CKEditor em uso).
- **GFM** não representa cor de fundo; nos segmentos a cor aparece sobretudo no **YAML** inicial.
- Realce em **tabelas:** o contexto pode ser a célula/bloco inteiro, não só o fragmento mínimo.
- Documento completo: `saveAs: true`; segmentos: `saveAs: false` (pasta de downloads por defeito).
- HTML muito específico do DOORS pode converter de forma imperfeita; itens grandes via data URL podem aproximar limites do browser.

## Licença das dependências vendored

Ver `vendor/NOTICES.md`.
