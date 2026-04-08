/**
 * O CKEditor/DOORS mete frequentemente `<p>` como filho direto de `<th>` / `<td>`.
 * O Turndown trata cada `<p>` como bloco com newlines, o que parte linhas de tabelas GFM.
 *
 * Desembrulha só `<p>` filhos diretos das células; vários `<p>` na mesma célula
 * ficam separados por um espaço (uma linha de pipe).
 *
 * @param {ParentNode} root - Contentor parseado (ex.: `#alm-export-root`).
 */
export function normalizeTableCellParagraphs(root) {
  const doc = root.ownerDocument;
  if (!doc) return;

  for (const cell of root.querySelectorAll("th, td")) {
    const paragraphs = [...cell.querySelectorAll(":scope > p")];
    paragraphs.forEach((p, i) => {
      if (i > 0) {
        cell.insertBefore(doc.createTextNode(" "), p);
      }
      while (p.firstChild) {
        cell.insertBefore(p.firstChild, p);
      }
      p.remove();
    });
  }
}
