const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
let totalTokens = 0;

// 1) Nach dem Vercel-Deploy einsetzen:
const API_BASE = "https://chat-pearl-iota.vercel.app";

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
      const totalDisplay = typeof totalTokens === "number" && Number.isFinite(totalTokens)
        ? ` | Gesamt: ${totalTokens}`
        : "";
      addMsg("Tokens", `Prompt: ${prompt} | Completion: ${completion} | Total: ${total}${totalDisplay}`);
    }
  } catch (err) {
    addMsg("System", `Netzwerkfehler: ${err.message}`);
  }
});
