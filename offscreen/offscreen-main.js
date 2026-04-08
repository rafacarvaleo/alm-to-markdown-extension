/**
 * Contexto com `document` / `DOMParser` para Turndown. O service worker não os expõe.
 */
import { artifactHtmlToMarkdown } from "../src/htmlToMarkdown.js";
import {
  parseExportRoot,
  collectHighlightKeys,
  buildSliceHtml,
} from "../src/highlightSlices.js";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") {
    return;
  }

  if (msg.type === "ANALYZE_HIGHLIGHTS") {
    try {
      const root = parseExportRoot(msg.htmlFragment);
      if (!root) {
        sendResponse({ ok: false, error: "Falha ao analisar o HTML do artefato." });
        return true;
      }
      const info = collectHighlightKeys(root);
      sendResponse({ ok: true, colors: info.colors, hasStrikethrough: info.hasStrikethrough });
    } catch (e) {
      sendResponse({
        ok: false,
        error: e?.message || String(e),
      });
    }
    return true;
  }

  if (msg.type === "CONVERT_TO_MARKDOWN") {
    try {
      let markdown = artifactHtmlToMarkdown(
        msg.htmlFragment,
        msg.documentTitle,
        { removeStrikethrough: Boolean(msg.removeStrikethrough) },
      );
      if (msg.yamlFrontMatter) {
        markdown = msg.yamlFrontMatter + markdown;
      }
      sendResponse({ ok: true, markdown });
    } catch (e) {
      sendResponse({
        ok: false,
        error: e?.message || String(e),
      });
    }
    return true;
  }

  if (msg.type === "BUILD_SLICE_AND_CONVERT") {
    try {
      const root = parseExportRoot(msg.htmlFragment);
      if (!root) {
        sendResponse({ ok: false, error: "Falha ao analisar o HTML do artefato." });
        return true;
      }
      const sliceHtml = buildSliceHtml(root, msg.sliceOptions);
      let markdown = artifactHtmlToMarkdown(sliceHtml, msg.documentTitle, {
        removeStrikethrough: Boolean(msg.removeStrikethrough),
      });
      if (msg.yamlFrontMatter) {
        markdown = msg.yamlFrontMatter + markdown;
      }
      sendResponse({ ok: true, markdown });
    } catch (e) {
      sendResponse({
        ok: false,
        error: e?.message || String(e),
      });
    }
    return true;
  }
});
