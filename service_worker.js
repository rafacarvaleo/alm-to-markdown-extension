import { extractItemHtml } from "./src/extractArtifactHtml.js";
import {
  convertHtmlToMarkdownViaOffscreen,
  analyzeHighlightsViaOffscreen,
} from "./src/offscreenDocument.js";

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

        const tagHexes =
          Array.isArray(message.tagHighlightHexes) &&
          message.tagHighlightHexes.length > 0
            ? message.tagHighlightHexes
            : undefined;

        const conv = await convertHtmlToMarkdownViaOffscreen(
          result.htmlFragment,
          result.documentTitle,
          undefined,
          Boolean(message.removeStrikethrough),
          tagHexes,
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
});
