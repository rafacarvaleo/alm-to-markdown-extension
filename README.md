# ALM Item Markdown Export

Extensão **Chrome** (Manifest V3) que exporta o conteúdo de artefatos de texto no **DOORS Next** (ALM) para **Markdown** (GFM), com [Turndown](https://github.com/mixmark-io/turndown) e [turndown-plugin-gfm](https://github.com/domchristie/turndown-plugin-gfm). Há opção **Remover conteúdo tachado** (aplicada antes da conversão) e, de forma opt-in, **tags de cor** no próprio ficheiro: comentários `<!-- alm-hl: #RRGGBB -->` … `<!-- /alm-hl -->` em volta dos realces cujo `background-color` inline o utilizador escolher.

## Requisitos

- **Chrome 109+** (`chrome.offscreen`).

## Instalação

1. Clonar ou descarregar este repositório e abrir a pasta **`alm-item-html-export`** (é ela que se carrega como extensão).
2. Opcional: `npm install` e `npm run vendor` para regenerar `vendor/` a partir do `package.json`.
3. Chrome → `chrome://extensions` → **Modo do programador** → **Carregar sem compactação** → seleccionar `alm-item-html-export`.

## Uso

1. Abrir um artefato cuja URL contenha `showArtifactPage` e `artifactURI`.
2. **Remover conteúdo tachado** — se estiver marcado, o HTML passa por remoção de `del` / `s` / `strike` e de elementos com `text-decoration: line-through` antes do Turndown.
3. **Análise de cores** — **Atualizar análise** (ou a análise ao abrir o popup) lista `background-color` fora de cinzas de UI. Opcional: **Incluir tags de cor no Markdown** e marcar quais **cores** recebem comentários `alm-hl` no texto exportado.
4. **Baixar Markdown do item** — **um único** `.md` (diálogo *Guardar como*).

Cada ficheiro contém o documento completo. Os comentários `alm-hl` envolvem só os nós HTML com a cor de fundo selecionada (não o parágrafo/célula inteira, salvo se o nó realçado for o próprio bloco), tal como a deteção de realce.

## Limitações

- Só miolo de texto (widget `.rdm-text-artifact-widget` ou iframe CKEditor em uso).
- Realce só é detetado com `style` inline (`background-color`); classes CSS puras não entram.
- **GFM** não representa cor de fundo; a cor fica explícita nos comentários `alm-hl` quando essa opção está activa.
- HTML muito específico do DOORS pode converter de forma imperfeita; itens muito grandes via data URL podem aproximar limites do browser.

## Licença das dependências vendored

Ver `vendor/NOTICES.md`.
