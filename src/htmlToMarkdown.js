/**
 * Conversão HTML (fragmento do artefato ALM) → Markdown (GFM).
 */

import TurndownService from "../vendor/turndown.browser.es.js";
import { gfm } from "../vendor/turndown-plugin-gfm.browser.es.js";
import { normalizeTableCellParagraphs } from "./normalizeTableCells.js";
import { removeStrikethroughFromRoot } from "./highlightSlices.js";

/**
 * Converte o HTML limpo do artefato em Markdown.
 *
 * @param {string} htmlFragment - `outerHTML` do nó raiz extraído.
 * @param {string} [documentTitle] - Se definido, prefixa com um título nível 1.
 * @param {{ removeStrikethrough?: boolean }} [options]
 * @returns {string} Markdown final (termina com newline).
 */
export function artifactHtmlToMarkdown(htmlFragment, documentTitle, options = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="alm-export-root">${htmlFragment}</div>`,
    "text/html",
  );
  const root = doc.getElementById("alm-export-root");
  if (!root) {
    throw new Error("Falha ao analisar o HTML do artefato.");
  }

  if (options.removeStrikethrough) {
    removeStrikethroughFromRoot(root);
  }

  normalizeTableCellParagraphs(root);

  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  turndownService.use(gfm);

  let markdown = turndownService.turndown(root);

  if (documentTitle && documentTitle.trim()) {
    const t = documentTitle.trim().replace(/\s+/g, " ");
    markdown = `# ${t}\n\n${markdown}`;
  }

  return `${markdown.trim()}\n`;
}
