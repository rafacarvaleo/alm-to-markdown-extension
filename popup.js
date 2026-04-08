const btn = document.getElementById("export");
const btnScan = document.getElementById("scan");
const btnBundle = document.getElementById("export-bundle");
const statusEl = document.getElementById("status");
const highlightsPanel = document.getElementById("highlights-panel");
const highlightsEmpty = document.getElementById("highlights-empty");
const cbStrikeRow = document.getElementById("cb-strike-row");
const cbStrike = document.getElementById("cb-strike");
const colorCheckboxesEl = document.getElementById("color-checkboxes");
const cbUnion = document.getElementById("cb-union");
const cbFull = document.getElementById("cb-full");

/** @type {string[]} */
let lastColors = [];

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", Boolean(isError));
}

function hexToCss(hex) {
  const h = hex.startsWith("#") ? hex : `#${hex}`;
  return h;
}

/**
 * @param {string[]} colors
 * @param {boolean} hasStrikethrough
 */
function renderHighlights(colors, hasStrikethrough) {
  lastColors = colors || [];
  colorCheckboxesEl.textContent = "";

  const hasAnything = hasStrikethrough || lastColors.length > 0;
  highlightsEmpty.hidden = hasAnything;
  highlightsPanel.hidden = false;

  cbStrikeRow.hidden = !hasStrikethrough;
  cbStrike.checked = false;

  for (const hex of lastColors) {
    const id = `cb-color-${hex.replace(/#/g, "")}`;
    const row = document.createElement("div");
    row.className = "row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = hex;
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = hexToCss(hex);
    swatch.title = hex;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = hex.toUpperCase();
    row.appendChild(input);
    row.appendChild(swatch);
    row.appendChild(label);
    colorCheckboxesEl.appendChild(row);
  }

  if (!hasAnything) {
    highlightsEmpty.textContent =
      "Não foram encontrados tachados nem realces de cor (fora de cabeçalhos/UI).";
    highlightsEmpty.hidden = false;
  }
}

async function scanHighlights() {
  setStatus("");
  btnScan.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) {
      setStatus("Não foi possível obter a aba ativa.", true);
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "SCAN_HIGHLIGHTS",
      tabId: tab.id,
    });

    if (response?.ok) {
      renderHighlights(response.colors || [], response.hasStrikethrough);
      setStatus("Análise concluída.");
    } else {
      setStatus(response?.error || "Erro ao analisar.", true);
    }
  } catch (e) {
    setStatus(e?.message || String(e), true);
  } finally {
    btnScan.disabled = false;
  }
}

btn.addEventListener("click", async () => {
  setStatus("");
  btn.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) {
      setStatus("Não foi possível obter a aba ativa.", true);
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "EXPORT_ITEM_MARKDOWN",
      tabId: tab.id,
    });

    if (response?.ok) {
      setStatus("Download iniciado.");
    } else {
      setStatus(response?.error || "Erro desconhecido.", true);
    }
  } catch (e) {
    setStatus(e?.message || String(e), true);
  } finally {
    btn.disabled = false;
  }
});

btnScan.addEventListener("click", () => {
  scanHighlights();
});

btnBundle.addEventListener("click", async () => {
  setStatus("");
  btnBundle.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) {
      setStatus("Não foi possível obter a aba ativa.", true);
      return;
    }

    const strikeOn = cbStrike.checked && !cbStrikeRow.hidden;
    /** @type {string[]} */
    const selectedColors = [];
    colorCheckboxesEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      if (el.checked && el.value) {
        selectedColors.push(el.value);
      }
    });

    const union = cbUnion.checked;
    const exportFull = cbFull.checked;

    const response = await chrome.runtime.sendMessage({
      type: "EXPORT_MARKDOWN_BUNDLE",
      tabId: tab.id,
      exportFull,
      strikethrough: strikeOn,
      colors: selectedColors,
      union,
    });

    if (response?.ok) {
      setStatus("Downloads iniciados.");
    } else {
      setStatus(response?.error || "Erro desconhecido.", true);
    }
  } catch (e) {
    setStatus(e?.message || String(e), true);
  } finally {
    btnBundle.disabled = false;
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    scanHighlights();
  });
} else {
  scanHighlights();
}
