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

    const FALLBACK_DOCX_B64 =
      "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";

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

      const match = segment.match(/UEsDB[A-Za-z0-9+/=]+/);
      if (!match || !match[0]) return null;

      return normalizeBase64(match[0]);
    };

    const validateDocxBase64 = (raw) => {
      const normalized = normalizeBase64(raw);
      if (!normalized) return null;
      try {
        const buf = Buffer.from(normalized, "base64");
        if (!buf || !buf.length) return null;
        if (buf[0] !== 0x50 || buf[1] !== 0x4b) return null; // PK header
        return normalized;
      } catch {
        return null;
      }
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
    const validDocxB64 = validateDocxBase64(docxB64);
    const displayText = docxB64 ? stripDocxFromText(reply) : reply;

    const usage = data && typeof data === "object" ? data.usage || null : null;
    const model = data && typeof data === "object" ? data.model || data.model_id || null : null;

    const docxPayload = wantDocx ? validDocxB64 || FALLBACK_DOCX_B64 : null;
    const docxFallback = wantDocx ? !validDocxB64 : false;

    return res
      .status(200)
      .json({ reply: displayText || "", docx: docxPayload, docxFallback, usage, model });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
