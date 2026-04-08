/**
 * Função injetada na página (via `chrome.scripting.executeScript({ func })`).
 * Deve ser autocontida para serialização pelo motor da extensão.
 */

/**
 * @typedef {object} ExtractSuccess
 * @property {true} ok
 * @property {string} htmlFragment HTML do miolo do artefato (limpo).
 * @property {string} documentTitle `document.title` para cabeçalho opcional em Markdown.
 * @property {string} suggestedBasename Nome de ficheiro sugerido, sem extensão.
 */

/**
 * @typedef {object} ExtractFailure
 * @property {false} ok
 * @property {string} error
 */

/**
 * @returns {ExtractSuccess|ExtractFailure}
 */
export function extractItemHtml() {
  function parseArtifactParams() {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const search = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;
    for (const raw of [hash, search]) {
      if (!raw) continue;
      try {
        const sp = new URLSearchParams(raw);
        const action = sp.get("action") || "";
        const artifactURI = sp.get("artifactURI") || "";
        if (
          action.includes("showArtifactPage") &&
          artifactURI.length > 0
        ) {
          return { ok: true };
        }
      } catch {
        /* ignore */
      }
    }
    return { ok: false };
  }

  function findContentRoot() {
    const iframe = document.querySelector("iframe.cke_wysiwyg_frame");
    const ibody = iframe?.contentDocument?.body;
    if (ibody && ibody.textContent.trim()) {
      return ibody;
    }
    const widget = document.querySelector(".rdm-text-artifact-widget");
    if (widget && widget.textContent.trim()) {
      return widget;
    }
    return null;
  }

  function cleanClone(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("script").forEach((n) => n.remove());
    clone
      .querySelectorAll(".embeddedToolbar, .embeddedRTHeader")
      .forEach((n) => n.remove());
    return clone;
  }

  if (!parseArtifactParams().ok) {
    return {
      ok: false,
      error:
        "Abra um artefato no DOORS Next (URL com showArtifactPage e artifactURI).",
    };
  }

  const root = findContentRoot();
  if (!root) {
    return {
      ok: false,
      error:
        "Não foi possível localizar o conteúdo do item (editor / apresentação).",
    };
  }

  const cleaned = cleanClone(root);
  const documentTitle = (document.title || "").trim();
  const suggestedBasename = (
    (document.title || "alm-item").replace(/[\\/:*?"<>|]/g, "_").trim() ||
    "alm-item"
  ).slice(0, 200);

  return {
    ok: true,
    htmlFragment: cleaned.outerHTML,
    documentTitle,
    suggestedBasename,
  };
}
