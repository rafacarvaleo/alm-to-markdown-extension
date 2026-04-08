/**
 * Deteção de realces (background-color) e tachado no HTML do artefato ALM,
 * remoção de tachado no DOM e construção de fragmentos só com nós realçados.
 */

/**
 * @param {string} style
 * @returns {string | null} `#RRGGBB` em maiúsculas
 */
export function parseBackgroundColorFromStyle(style) {
  if (!style) return null;
  const m = /background-color\s*:\s*([^;]+)/i.exec(style);
  if (!m) return null;
  let v = m[1].trim().replace(/\s+/g, "");
  if (/^rgba?\(/i.test(v)) {
    return rgbCssToHex(v);
  }
  if (v.startsWith("#")) {
    return expandHex(v);
  }
  return null;
}

/**
 * @param {string} rgb e.g. rgb(211,211,211)
 */
function rgbCssToHex(rgb) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(rgb);
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function expandHex(hex) {
  const h = hex.slice(1);
  if (h.length === 3) {
    return (
      "#" +
      h
        .split("")
        .map((c) => c + c)
        .join("")
        .toUpperCase()
    );
  }
  if (h.length === 6) {
    return "#" + h.toUpperCase();
  }
  return null;
}

/**
 * Ignora branco, quase-branco e cinzas típicos de UI/tabela.
 * @param {string} hex `#RRGGBB`
 */
export function isStructuralBackgroundColor(hex) {
  if (!hex) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (max >= 248 && sat < 0.08) return true;
  if (max <= 230 && max >= 200 && sat < 0.12) return true;
  return false;
}

/**
 * @param {Element} el
 */
export function elementHasStrikethrough(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.nodeName.toLowerCase();
  if (tag === "del" || tag === "s" || tag === "strike") return true;
  const st = el.getAttribute("style") || "";
  return /line-through/i.test(st) && /text-decoration/i.test(st);
}

/**
 * Profundidade do elemento relativamente a `root` (root = 0).
 * @param {Element} el
 * @param {Element} root
 */
function depthWithin(el, root) {
  let d = 0;
  let n = el;
  while (n && n !== root) {
    d += 1;
    n = n.parentElement;
  }
  return d;
}

/**
 * Remove do DOM os nós tachados (tags e estilos), do mais profundo para a raiz.
 * @param {HTMLElement} root
 */
export function removeStrikethroughFromRoot(root) {
  /** @type {Element[]} */
  const hits = [];
  root.querySelectorAll("*").forEach((el) => {
    if (root.contains(el) && elementHasStrikethrough(el)) {
      hits.push(el);
    }
  });
  const uniq = [...new Set(hits)];
  uniq.sort((a, b) => depthWithin(b, root) - depthWithin(a, root));
  for (const el of uniq) {
    if (el.parentNode && root.contains(el)) {
      el.parentNode.removeChild(el);
    }
  }
}

/**
 * @param {HTMLElement} root
 * @returns {{ colors: string[], hasStrikethrough: boolean }}
 */
export function collectHighlightKeys(root) {
  const colors = new Set();
  let hasStrikethrough = false;

  root.querySelectorAll("*").forEach((el) => {
    if (elementHasStrikethrough(el)) {
      hasStrikethrough = true;
    }
    const style = el.getAttribute("style");
    const hex = parseBackgroundColorFromStyle(style || "");
    if (hex && !isStructuralBackgroundColor(hex)) {
      colors.add(hex);
    }
  });

  return {
    colors: [...colors].sort(),
    hasStrikethrough,
  };
}

/**
 * Elementos que têm `background-color` igual a `colorHex` (sem subir ao parágrafo/célula).
 * Mantém só nós sem antepassado também com a mesma cor (evita duplicar texto).
 * @param {HTMLElement} root
 * @param {string} colorHex
 * @returns {Element[]}
 */
export function collectColorHighlightNodes(root, colorHex) {
  const target = colorHex.toUpperCase();
  /** @type {Element[]} */
  const matches = [];
  root.querySelectorAll("[style]").forEach((el) => {
    if (!root.contains(el)) return;
    const hex = parseBackgroundColorFromStyle(el.getAttribute("style") || "");
    if (!hex || hex.toUpperCase() !== target || isStructuralBackgroundColor(hex)) {
      return;
    }
    matches.push(el);
  });
  return matches.filter(
    (n) => !matches.some((o) => o !== n && o.contains(n)),
  );
}

/**
 * @param {Element[]} elements
 * @returns {Element[]}
 */
function sortElementsDocumentOrder(elements) {
  return [...elements].sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

/**
 * @typedef {object} SliceBuildOptions
 * @property {boolean} [union] — OR das cores em `colorHexes`.
 * @property {string[]} [colorHexes] — hex `#RRGGBB`; usado com `union: true`.
 * @property {string} [colorHex] — uma cor (`union: false`).
 */

/**
 * Devolve `outerHTML` de um div com clones dos nós com realce (só esses nós).
 * @param {HTMLElement} root - contentor do fragmento (ex. #alm-export-root)
 * @param {SliceBuildOptions} opts
 * @returns {string}
 */
export function buildSliceHtml(root, opts) {
  const doc = root.ownerDocument;
  const wrap = doc.createElement("div");
  wrap.className = "alm-slice-root";

  /** @type {Element[]} */
  let blocks = [];

  if (opts.union) {
    for (const h of opts.colorHexes || []) {
      blocks.push(...collectColorHighlightNodes(root, h));
    }
    blocks = sortElementsDocumentOrder(blocks);
  } else if (opts.colorHex) {
    blocks = collectColorHighlightNodes(root, opts.colorHex);
  }

  for (const b of blocks) {
    if (root.contains(b)) {
      wrap.appendChild(b.cloneNode(true));
    }
  }

  return wrap.outerHTML;
}

/**
 * @param {string} htmlFragment
 * @returns {HTMLElement | null}
 */
export function parseExportRoot(htmlFragment) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="alm-export-root">${htmlFragment}</div>`,
    "text/html",
  );
  return doc.getElementById("alm-export-root");
}

/**
 * @param {string} hex `#RRGGBB`
 */
export function sliceYamlFrontMatterColor(hex) {
  const h = (hex || "").toUpperCase();
  return `---\nalm-slice: realce\nalm-color: "${h}"\n---\n\n`;
}

export function sliceYamlFrontMatterUnion() {
  return "---\nalm-slice: destaques-selecionados\n---\n\n";
}
