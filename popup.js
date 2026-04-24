const btn = document.getElementById("export");
const btnScan = document.getElementById("scan");
const statusEl = document.getElementById("status");
const highlightsPanel = document.getElementById("highlights-panel");
const highlightsEmpty = document.getElementById("highlights-empty");
const cbRemoveStrike = document.getElementById("cb-remove-strike");
const cbIncludeHlTags = document.getElementById("cb-include-hl-tags");
const hlTagsHint = document.getElementById("hl-tags-hint");
const colorCheckboxesEl = document.getElementById("color-checkboxes");

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

function updateHlTagsHint() {
  const on = cbIncludeHlTags.checked;
  hlTagsHint.hidden = !on;
}

cbIncludeHlTags.addEventListener("change", updateHlTagsHint);

/**
 * @param {string[]} colors
 * @param {boolean} hasStrikethrough
 */
function renderHighlights(colors, hasStrikethrough) {
  lastColors = colors || [];
  colorCheckboxesEl.textContent = "";

  const hasColors = lastColors.length > 0;
  highlightsEmpty.hidden = hasColors;
  highlightsPanel.hidden = false;

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

  if (!hasColors) {
    highlightsEmpty.textContent = hasStrikethrough
      ? "Não foram encontradas cores de realce (fora de cabeçalhos/UI). Pode ainda marcar \"Remover conteúdo tachado\" no export."
      : "Não foram encontradas cores de realce (fora de cabeçalhos/UI).";
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

    const wantTags = cbIncludeHlTags.checked;
    /** @type {string[]} */
    const selectedColors = [];
    colorCheckboxesEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      if (el.checked && el.value) {
        selectedColors.push(el.value);
      }
    });

    if (wantTags && selectedColors.length === 0) {
      setStatus(
        "Selecione pelo menos uma cor de realce para etiquetar ou desative a opção de tags.",
        true,
      );
      return;
    }

    const payload = {
      type: "EXPORT_ITEM_MARKDOWN",
      tabId: tab.id,
      removeStrikethrough: cbRemoveStrike.checked,
    };
    if (wantTags && selectedColors.length > 0) {
      payload.tagHighlightHexes = selectedColors;
    }

    const response = await chrome.runtime.sendMessage(payload);

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateHlTagsHint();
    scanHighlights();
  });
} else {
  updateHlTagsHint();
  scanHighlights();
}
