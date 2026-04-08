import { extractItemHtml } from "./src/extractArtifactHtml.js";
import {
  convertHtmlToMarkdownViaOffscreen,
  analyzeHighlightsViaOffscreen,
  buildSliceAndConvertViaOffscreen,
} from "./src/offscreenDocument.js";
import {
  sliceYamlFrontMatterColor,
  sliceYamlFrontMatterUnion,
} from "./src/highlightSlices.js";

/**
 * @param {string} basename Sem extensão.
 * @returns {string} Nome seguro com `.md`.
 */
function sanitizeMarkdownFilename(basename) {
  const base = (basename || "alm-item")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return `${base || "alm-item"}.md`;
}

/**
 * @param {string} suggestedBasename
 * @returns {string} Base sem caracteres inválidos e sem `.md`.
 */
function markdownBaseName(suggestedBasename) {
  const raw = (suggestedBasename || "alm-item")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  const noExt = raw.replace(/\.md$/i, "").trim();
  return noExt || "alm-item";
}

/**
 * @param {string} base
 * @param {string} hex `#RRGGBB` ou sem `#`
 * @returns {string}
 */
function sliceFilenameColor(base, hex) {
  const h = hex.replace(/^#/, "").toUpperCase();
  return `${base}__bg-${h}.md`;
}

/**
 * @param {string} base
 * @returns {string}
 */
function sliceFilenameUnion(base) {
  return `${base}__destaques-selecionados.md`;
}

/**
 * @param {string} markdown
 * @param {{ label: string, filename: string }[]} entries
 * @returns {string}
 */
function appendHighlightsIndexSection(markdown, entries) {
  if (!entries.length) return markdown;
  const lines = entries.map(
    (e) => `- ${e.label}: \`./${e.filename}\``,
  );
  return `${markdown.trimEnd()}\n\n## Trechos destacados (ficheiros auxiliares)\n\n${lines.join("\n")}\n`;
}

/**
 * Há corpo além do front matter YAML e do título nível 1 opcional.
 * @param {string} markdown
 */
function markdownSliceHasBody(markdown) {
  const noFm = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n?/, "");
  const noH1 = noFm.replace(/^#\s+.+\r?\n+/, "").trim();
  return noH1.length > 0;
}

/**
 * @param {string} filename
 * @param {string} markdown
 * @param {boolean} saveAs
 */
async function downloadMarkdown(filename, markdown, saveAs) {
  const url =
    "data:text/markdown;charset=utf-8," +
    encodeURIComponent(markdown);
  await chrome.downloads.download({
    url,
    filename,
    saveAs,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCAN_HIGHLIGHTS") {
    (async () => {
      try {
        const tabId = message.tabId;
        if (tabId == null) {
          sendResponse({ ok: false, error: "Aba inválida." });
          return;
        }

        const [injected] = await chrome.scripting.executeScript({
          target: { tabId },
          func: extractItemHtml,
        });

        const result = injected?.result;
        if (!result?.ok) {
          sendResponse({
            ok: false,
            error: result?.error || "Falha ao extrair HTML.",
          });
          return;
        }

        const analyzed = await analyzeHighlightsViaOffscreen(
          result.htmlFragment,
        );

        if (!analyzed.ok) {
          sendResponse({
            ok: false,
            error: analyzed.error || "Falha ao analisar destaques.",
          });
          return;
        }

        sendResponse({
          ok: true,
          colors: analyzed.colors,
          hasStrikethrough: analyzed.hasStrikethrough,
        });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e?.message || String(e),
        });
      }
    })();
    return true;
  }

  if (message?.type === "EXPORT_ITEM_MARKDOWN") {
    (async () => {
      try {
        const tabId = message.tabId;
        if (tabId == null) {
          sendResponse({ ok: false, error: "Aba inválida." });
          return;
        }

        const [injected] = await chrome.scripting.executeScript({
          target: { tabId },
          func: extractItemHtml,
        });

        const result = injected?.result;
        if (!result?.ok) {
          sendResponse({
            ok: false,
            error: result?.error || "Falha ao extrair HTML.",
          });
          return;
        }

        const conv = await convertHtmlToMarkdownViaOffscreen(
          result.htmlFragment,
          result.documentTitle,
          undefined,
          Boolean(message.removeStrikethrough),
        );

        if (!conv.ok) {
          sendResponse({
            ok: false,
            error: conv.error || "Falha ao converter para Markdown.",
          });
          return;
        }

        const filename = sanitizeMarkdownFilename(result.suggestedBasename);
        const url =
          "data:text/markdown;charset=utf-8," +
          encodeURIComponent(conv.markdown);

        await chrome.downloads.download({
          url,
          filename,
          saveAs: true,
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e?.message || String(e),
        });
      }
    })();

    return true;
  }

  if (message?.type === "EXPORT_MARKDOWN_BUNDLE") {
    (async () => {
      try {
        const tabId = message.tabId;
        if (tabId == null) {
          sendResponse({ ok: false, error: "Aba inválida." });
          return;
        }

        const exportFull = message.exportFull !== false;
        const removeStrikethrough = Boolean(message.removeStrikethrough);
        const colors = Array.isArray(message.colors) ? message.colors : [];
        const union = Boolean(message.union);

        const hasAnySlice = colors.length > 0;

        if (!exportFull && !hasAnySlice) {
          sendResponse({
            ok: false,
            error:
              "Marque pelo menos uma cor de realce ou inclua o documento completo.",
          });
          return;
        }

        const [injected] = await chrome.scripting.executeScript({
          target: { tabId },
          func: extractItemHtml,
        });

        const result = injected?.result;
        if (!result?.ok) {
          sendResponse({
            ok: false,
            error: result?.error || "Falha ao extrair HTML.",
          });
          return;
        }

        const base = markdownBaseName(result.suggestedBasename);
        const titleBase = (result.documentTitle || "").trim();

        /** @type {{ label: string, filename: string }[]} */
        const indexEntries = [];

        if (hasAnySlice) {
          if (union) {
            const sliceOpts = {
              union: true,
              colorHexes: colors,
            };
            const sliceTitle = titleBase
              ? `${titleBase} — destaques selecionados`
              : "Destaques selecionados";
            const conv = await buildSliceAndConvertViaOffscreen(
              result.htmlFragment,
              sliceTitle,
              sliceOpts,
              sliceYamlFrontMatterUnion(),
              removeStrikethrough,
            );
            if (!conv.ok) {
              sendResponse({
                ok: false,
                error: conv.error || "Falha ao gerar ficheiro unido de destaques.",
              });
              return;
            }
            if (markdownSliceHasBody(conv.markdown)) {
              const fn = sliceFilenameUnion(base);
              await downloadMarkdown(fn, conv.markdown, false);
              indexEntries.push({
                label: "Destaques selecionados",
                filename: fn,
              });
            }
          } else {
            for (const hex of colors) {
              const sliceTitle = titleBase
                ? `${titleBase} — realce ${hex}`
                : `Realce ${hex}`;
              const conv = await buildSliceAndConvertViaOffscreen(
                result.htmlFragment,
                sliceTitle,
                { union: false, colorHex: hex },
                sliceYamlFrontMatterColor(hex),
                removeStrikethrough,
              );
              if (!conv.ok) {
                sendResponse({
                  ok: false,
                  error: conv.error || `Falha ao gerar realce ${hex}.`,
                });
                return;
              }
              if (markdownSliceHasBody(conv.markdown)) {
                const fn = sliceFilenameColor(base, hex);
                await downloadMarkdown(fn, conv.markdown, false);
                indexEntries.push({
                  label: `Realce ${hex.toUpperCase()}`,
                  filename: fn,
                });
              }
            }
          }
        }

        if (exportFull) {
          const fullConv = await convertHtmlToMarkdownViaOffscreen(
            result.htmlFragment,
            result.documentTitle,
            undefined,
            removeStrikethrough,
          );
          if (!fullConv.ok) {
            sendResponse({
              ok: false,
              error: fullConv.error || "Falha ao converter documento completo.",
            });
            return;
          }
          let md = fullConv.markdown;
          if (indexEntries.length > 0) {
            md = appendHighlightsIndexSection(md, indexEntries);
          }
          const filename = sanitizeMarkdownFilename(result.suggestedBasename);
          await downloadMarkdown(filename, md, true);
        }

        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e?.message || String(e),
        });
      }
    })();
    return true;
  }
});
