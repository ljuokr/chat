export default async function handler(req, res) {
  // CORS fuer GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, wantDocx } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const normalizeBase64 = (raw) => {
      if (!raw || typeof raw !== "string") return null;
      const cleaned = raw.replace(/[^A-Za-z0-9+/=]/g, "");
      if (!cleaned) return null;
      const rem = cleaned.length % 4;
      return rem ? cleaned + "=".repeat(4 - rem) : cleaned;
    };

    const extractDocxBase64 = (text) => {
      if (!text || typeof text !== "string") return null;
      // Bevorzugt Inhalt zwischen BEGIN/ENDE, sonst gesamte Antwort.
      const markerStart = text.indexOf("BEGIN-DATEI");
      const markerEnd = text.indexOf("ENDE-DATEI");
      const segment =
        markerStart !== -1 && markerEnd !== -1 && markerEnd > markerStart
          ? text.slice(markerStart, markerEnd)
          : text;
      const start = segment.indexOf("UEsDB"); // ZIP Header
      if (start === -1) return null;
      const sliced = segment.slice(start);
      return normalizeBase64(sliced);
    };

    const stripDocxFromText = (text) => {
      if (!text || typeof text !== "string") return text;
      let cleaned = text.replace(/BEGIN-DATEI[\\s\\S]*?ENDE-DATEI/gi, "").trim();
      cleaned = cleaned.replace(/UEsDB[0-9A-Za-z+/=]+/g, "[Word-Datei erstellt]").trim();
      return cleaned;
    };

    // Chat Completions API (gpt-5.1 chat latest)
    const systemMessages = [];
    if (wantDocx) {
      systemMessages.push({
        role: "system",
        content:
          "Wenn der Nutzer ein Word-Dokument möchte, liefere ein minimales gültiges .docx als Base64 zwischen BEGIN-DATEI und ENDE-DATEI. Sonst normal antworten."
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.1-chat-latest",
        messages: [
          ...systemMessages,
          { role: "user", content: message }
        ]
      })
    });

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      return res.status(openaiRes.status).json({ error: detail });
    }

    const data = await openaiRes.json();

    const reply =
      (data.choices &&
        Array.isArray(data.choices) &&
        data.choices[0] &&
        data.choices[0].message &&
        typeof data.choices[0].message.content === "string" &&
        data.choices[0].message.content) ||
      "";

    const docxB64 = extractDocxBase64(reply);
    const displayText = docxB64 ? stripDocxFromText(reply) : reply;

    const usage = data && typeof data === "object" ? data.usage || null : null;
    const model = data && typeof data === "object" ? data.model || data.model_id || null : null;

    return res.status(200).json({ reply: displayText || "", docx: docxB64 || null, usage, model });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
