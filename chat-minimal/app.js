const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const versionEl = document.getElementById("version");
const tokenStatsEl = document.getElementById("token-stats");
const modelInfoEl = document.getElementById("model-info");
const costInfoEl = document.getElementById("cost-info");
const modelsBtnEl = document.getElementById("models-btn");
const modelsOutputEl = document.getElementById("models-output");
const docxBtnEl = document.getElementById("docx-btn");
const docxListEl = document.getElementById("docx-list");
const wordToggleEl = document.getElementById("word-toggle");
const APP_VERSION = "1.4";
const STORAGE_KEY = "mini-chat-token-lifetime";
const TOKEN_PRICE_PER_M = 10; // USD pro 1 Mio Tokens
const PRICE_PER_TOKEN = TOKEN_PRICE_PER_M / 1_000_000;
let totalTokensSession = 0;
let totalTokensLifetime = 0;
let lastDocxB64 = null;
const docxList = [];

// 1) Nach dem Vercel-Deploy einsetzen:
const API_BASE = "https://chat-pearl-iota.vercel.app";

// Version + Deployzeit im Title und Header anzeigen (basis: lastModified des Dokuments)
const deployTime = new Date(document.lastModified);
const deployTimeText = deployTime.toLocaleString("de-DE");
const versionLabel = `Mini Chat v${APP_VERSION} — Deploy: ${deployTimeText}`;
document.title = versionLabel;
if (versionEl) versionEl.textContent = versionLabel;
if (modelInfoEl) modelInfoEl.textContent = "Modell: unbekannt";
if (tokenStatsEl) tokenStatsEl.textContent = "Tokens (Session): 0";
if (costInfoEl) costInfoEl.textContent = "Kosten: –";

function loadLifetimeTokens() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return 0;
    const parsed = Number.parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveLifetimeTokens(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* ignore storage errors */
  }
}

function fmtTokens(val) {
  return Number.isFinite(val) ? val.toLocaleString("de-DE") : "–";
}

function fmtCost(tokens) {
  return Number.isFinite(tokens) ? `$${(tokens * PRICE_PER_TOKEN).toFixed(4)}` : "–";
}

function extractDocxBase64(text) {
  if (!text || typeof text !== "string") return null;
  const markerStart = text.indexOf("BEGIN-DATEI");
  const markerEnd = text.indexOf("ENDE-DATEI");
  if (markerStart !== -1 && markerEnd !== -1 && markerEnd > markerStart) {
    const segment = text.slice(markerStart, markerEnd);
    const match = segment.match(/[A-Za-z0-9+/=]+/g);
    if (match && match.length) return match.join("");
  }
  const b64Match = text.match(/UEsDB[0-9A-Za-z+/=]+/); // ZIP header for docx
  if (b64Match && b64Match[0]) return b64Match[0];
  return null;
}

function renderDocxList() {
  if (!docxListEl) return;
  if (!docxList.length) {
    docxListEl.textContent = "Noch keine Dateien.";
    return;
  }
  docxListEl.innerHTML = "";
  docxList.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "docx-item";
    const label = document.createElement("span");
    label.textContent = item.label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Download";
    btn.addEventListener("click", () => downloadDocx(idx));
    row.appendChild(label);
    row.appendChild(btn);
    docxListEl.appendChild(row);
  });
}

function extractDocxBase64(text) {
  if (!text || typeof text !== "string") return null;
  const markerStart = text.indexOf("BEGIN-DATEI");
  const markerEnd = text.indexOf("ENDE-DATEI");
  if (markerStart !== -1 && markerEnd !== -1 && markerEnd > markerStart) {
    const segment = text.slice(markerStart, markerEnd);
    const match = segment.match(/[A-Za-z0-9+/=]+/g);
    if (match && match.length) return match.join("");
  }
  const b64Match = text.match(/UEsDB[0-9A-Za-z+/=]+/); // ZIP header for docx
  if (b64Match && b64Match[0]) return b64Match[0];
  return null;
}

totalTokensLifetime = loadLifetimeTokens();
if (tokenStatsEl) tokenStatsEl.textContent = `Tokens (Session): ${fmtTokens(totalTokensSession)} | Gesamt: ${fmtTokens(totalTokensLifetime)}`;
if (costInfoEl) costInfoEl.textContent = `Kosten geschätzt: ${fmtCost(totalTokensLifetime)}`;

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<span class="role">${role}:</span> ${text}`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  addMsg("Du", text);
  inputEl.value = "";

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, wantDocx: !!(wordToggleEl && wordToggleEl.checked) })
    });

    if (!res.ok) {
      const errText = await res.text();
      addMsg("System", `Fehler: ${res.status} ${errText}`);
      return;
    }

    const data = await res.json();
    addMsg("AI", data.reply || "(keine Antwort)");

    const usage = data.usage;
    if (data.model && modelInfoEl) {
      modelInfoEl.textContent = `Modell: ${data.model}`;
    } else if (modelInfoEl) {
      modelInfoEl.textContent = "Modell: (keine Angabe)";
    }

    if (usage && typeof usage === "object") {
      const prompt = usage.prompt_tokens ?? usage.input_tokens ?? "?";
      const completion = usage.completion_tokens ?? usage.output_tokens ?? "?";
      let total = usage.total_tokens ?? "?";
      if (total === "?" && typeof prompt === "number" && typeof completion === "number") {
        total = prompt + completion;
      }
      const numericTotal = typeof total === "number" ? total : undefined;
      if (Number.isFinite(numericTotal)) {
        totalTokensSession += numericTotal;
        totalTokensLifetime += numericTotal;
        saveLifetimeTokens(totalTokensLifetime);
      }
      const totalDisplay = Number.isFinite(totalTokensSession)
        ? ` | Gesamt (Session): ${totalTokensSession}`
        : "";
      addMsg("Tokens", `Prompt: ${prompt} | Completion: ${completion} | Total: ${total}${totalDisplay}`);
      if (tokenStatsEl) {
        const sumSession = Number.isFinite(totalTokensSession) ? fmtTokens(totalTokensSession) : "–";
        const sumLifetime = Number.isFinite(totalTokensLifetime) ? fmtTokens(totalTokensLifetime) : "–";
        tokenStatsEl.textContent = `Tokens (Session): ${sumSession} | Gesamt: ${sumLifetime} (letzte: Prompt ${prompt}, Completion ${completion}, Total ${total})`;
      }
      if (costInfoEl) {
        costInfoEl.textContent = `Kosten geschätzt: ${fmtCost(totalTokensLifetime)} (Basis: $${TOKEN_PRICE_PER_M}/1M Tokens)`;
      }
    } else {
      addMsg("Tokens", "Keine Usage-Daten zurückgegeben.");
      if (tokenStatsEl) tokenStatsEl.textContent = "Tokens gesamt: – (keine Usage-Daten)";
      if (costInfoEl) costInfoEl.textContent = "Kosten: –";
    }

    const docxB64 = extractDocxBase64(data.reply);
    if (docxB64) {
      lastDocxB64 = docxB64;
      const label = `Word #${docxList.length + 1}`;
      docxList.push({ label, b64: docxB64 });
      renderDocxList();
      addMsg("System", "Word-Datei erkannt: Panel \"Word-Dateien\" aktualisiert.");
      if (docxBtnEl) docxBtnEl.disabled = false;
    } else if (docxBtnEl && !docxList.length) {
      docxBtnEl.disabled = true;
    }
  } catch (err) {
    addMsg("System", `Netzwerkfehler: ${err.message}`);
  }
});

async function loadModels() {
  if (!modelsOutputEl) return;
  modelsOutputEl.textContent = "Lade Modelle...";
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) {
      const txt = await res.text();
      modelsOutputEl.textContent = `Fehler: ${res.status} ${txt}`;
      return;
    }
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    if (!models.length) {
      modelsOutputEl.textContent = "Keine Modelle gefunden.";
      return;
    }
    modelsOutputEl.textContent = models.join("\n");
  } catch (err) {
    modelsOutputEl.textContent = `Netzwerkfehler: ${err.message}`;
  }
}

if (modelsBtnEl) {
  modelsBtnEl.addEventListener("click", loadModels);
}

function downloadDocx(idx) {
  const entry = typeof idx === "number" ? docxList[idx] : null;
  const fallback = lastDocxB64 ? { b64: lastDocxB64, label: "Word" } : null;
  const target = entry || fallback;
  if (!target) {
    addMsg("System", "Keine Word-Datei gefunden. Bitte eine Antwort abwarten, die eine Datei enthält.");
    return;
  }
  try {
    const cleaned = target.b64.replace(/\s+/g, "");
    const bin = atob(cleaned);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.label || "word"}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    addMsg("System", `Konnte Word-Datei nicht erzeugen: ${err.message}`);
  }
}

if (docxBtnEl) {
  docxBtnEl.addEventListener("click", () => downloadDocx(docxList.length - 1));
  docxBtnEl.disabled = true;
}
