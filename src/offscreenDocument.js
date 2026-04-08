/**
 * Garante um único documento offscreen (ambiente DOM) para conversão HTML → Markdown.
 */

const OFFSCREEN_PATH = "offscreen/offscreen.html";

/**
 * @returns {Promise<void>}
 */
export async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [url],
    });
    if (contexts.length > 0) {
      return;
    }
  }

  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["DOM_PARSER"],
      justification:
        "Converter HTML do artefato ALM em Markdown com Turndown (requer DOM).",
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (/single|already|exist/i.test(msg)) {
      return;
    }
    throw e;
  }
}

/**
 * @param {object} payload
 * @returns {Promise<{ ok: true } & Record<string, unknown> | { ok: false, error: string }>}
 */
async function sendOffscreenMessage(payload) {
  await ensureOffscreenDocument();

  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (res) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        resolve(res);
      });
    });

    if (response && typeof response === "object" && "ok" in response) {
      return response;
    }

    await new Promise((r) => setTimeout(r, 50));
  }

  return {
    ok: false,
    error:
      "Timeout ao falar com o conversor offscreen. Recarregue a extensão e tente de novo.",
  };
}

/**
 * @param {string} htmlFragment
 * @returns {Promise<{ ok: true, colors: string[], hasStrikethrough: boolean } | { ok: false, error: string }>}
 */
export async function analyzeHighlightsViaOffscreen(htmlFragment) {
  return sendOffscreenMessage({
    type: "ANALYZE_HIGHLIGHTS",
    htmlFragment,
  });
}

/**
 * @param {string} htmlFragment
 * @param {string} [documentTitle]
 * @param {string} [yamlFrontMatter]
 * @param {boolean} [removeStrikethrough]
 * @returns {Promise<{ ok: true, markdown: string } | { ok: false, error: string }>}
 */
export async function convertHtmlToMarkdownViaOffscreen(
  htmlFragment,
  documentTitle,
  yamlFrontMatter,
  removeStrikethrough,
) {
  return sendOffscreenMessage({
    type: "CONVERT_TO_MARKDOWN",
    htmlFragment,
    documentTitle,
    yamlFrontMatter,
    removeStrikethrough: Boolean(removeStrikethrough),
  });
}

/**
 * @param {string} htmlFragment
 * @param {string} [documentTitle]
 * @param {object} sliceOptions Opções de `buildSliceHtml` (união, cores).
 * @param {string} [yamlFrontMatter]
 * @param {boolean} [removeStrikethrough]
 * @returns {Promise<{ ok: true, markdown: string } | { ok: false, error: string }>}
 */
export async function buildSliceAndConvertViaOffscreen(
  htmlFragment,
  documentTitle,
  sliceOptions,
  yamlFrontMatter,
  removeStrikethrough,
) {
  return sendOffscreenMessage({
    type: "BUILD_SLICE_AND_CONVERT",
    htmlFragment,
    documentTitle,
    sliceOptions,
    yamlFrontMatter,
    removeStrikethrough: Boolean(removeStrikethrough),
  });
}
