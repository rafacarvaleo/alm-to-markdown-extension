/**
 * Deteção de realces (background-color) e tachado no HTML do artefato ALM,
 * remoção de tachado e embrulho para export com tags de cor (Markdown).
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
/**
 * @param {Element} el
 */
function isPhrasingForWrap(el) {
  const t = el.nodeName;
  return (
    t === "SPAN" ||
    t === "A" ||
    t === "STRONG" ||
    t === "B" ||
    t === "EM" ||
    t === "I" ||
    t === "CODE" ||
    t === "S" ||
    t === "DEL" ||
    t === "MARK" ||
    t === "SUB" ||
    t === "SUP" ||
    t === "U"
  );
}

/**
 * Embrulha nós com realce (para uma ou mais cores) com `span` ou `div` que o Turndown
 * mapeia para comentários `<!-- alm-hl: … -->` / `<!-- /alm-hl -->`.
 * Aplica do mais profundo para o raso, para não partir árvore com aninhamentos.
 * @param {HTMLElement} root
 * @param {string[]} colorHexes — `#RRGGBB` (só as cores que o utilizador escolheu)
 */
export function wrapHighlightElementsForTagExport(root, colorHexes) {
  if (!colorHexes || colorHexes.length === 0) return;

  /** @type {Element[]} */
  const all = [];
  for (const h of colorHexes) {
    if (!h || !String(h).trim()) continue;
    all.push(...collectColorHighlightNodes(root, h));
  }
  const unique = [...new Set(all)];
  unique.sort(
    (a, b) => depthWithin(b, root) - depthWithin(a, root),
  );

  for (const el of unique) {
    if (!el.parentNode || !root.contains(el)) continue;
    const style = el.getAttribute("style");
    const hex = parseBackgroundColorFromStyle(style || "");
    if (!hex) continue;

    const doc = root.ownerDocument;
    const t = el.nodeName;
    if (t === "TD" || t === "TH") {
      const w = doc.createElement("div");
      w.setAttribute("class", "alm-hl-wrapped");
      w.setAttribute("data-alm-hex", hex.toUpperCase());
      while (el.firstChild) {
        w.appendChild(el.firstChild);
      }
      el.appendChild(w);
      continue;
    }
    if (t === "TR" || t === "TABLE" || t === "THEAD" || t === "TBODY" || t === "TFOOT") {
      continue;
    }

    const w = isPhrasingForWrap(el)
      ? doc.createElement("span")
      : doc.createElement("div");
    w.setAttribute("class", "alm-hl-wrapped");
    w.setAttribute("data-alm-hex", hex.toUpperCase());
    el.parentNode.insertBefore(w, el);
    w.appendChild(el);
  }
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
