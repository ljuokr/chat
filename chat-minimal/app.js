const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const versionEl = document.getElementById("version");
const tokenStatsEl = document.getElementById("token-stats");
let totalTokens = 0;

// 1) Nach dem Vercel-Deploy einsetzen:
const API_BASE = "https://chat-pearl-iota.vercel.app";

// Version + Deployzeit im Title und Header anzeigen (basis: lastModified des Dokuments)
const deployTime = new Date(document.lastModified);
const deployTimeText = deployTime.toLocaleString("de-DE");
const versionLabel = `Mini Chat v1.0 — Deploy: ${deployTimeText}`;
document.title = versionLabel;
if (versionEl) versionEl.textContent = versionLabel;
if (tokenStatsEl) tokenStatsEl.textContent = "Tokens gesamt: 0";

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
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const errText = await res.text();
      addMsg("System", `Fehler: ${res.status} ${errText}`);
      return;
    }

    const data = await res.json();
    addMsg("AI", data.reply || "(keine Antwort)");

    if (data.usage) {
      const prompt = data.usage.prompt_tokens ?? "?";
      const completion = data.usage.completion_tokens ?? "?";
      const total = data.usage.total_tokens ?? "?";
      if (typeof total === "number") {
        totalTokens += total;
      }
      const totalDisplay = Number.isFinite(totalTokens)
        ? ` | Gesamt: ${totalTokens}`
        : "";
      addMsg("Tokens", `Prompt: ${prompt} | Completion: ${completion} | Total: ${total}${totalDisplay}`);
      if (tokenStatsEl) {
        const sumText = Number.isFinite(totalTokens) ? totalTokens : "–";
        tokenStatsEl.textContent = `Tokens gesamt: ${sumText} (letzte Anfrage: Prompt ${prompt}, Completion ${completion}, Total ${total})`;
      }
    }
  } catch (err) {
    addMsg("System", `Netzwerkfehler: ${err.message}`);
  }
});
