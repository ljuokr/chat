export default async function handler(req, res) {
  // CORS fuer GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message } = req.body || {};
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

    // Chat Completions API (gpt-5.1 chat latest)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.1-chat-latest",
        messages: [
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

    const usage = data && typeof data === "object" ? data.usage || null : null;
    const model = data && typeof data === "object" ? data.model || data.model_id || null : null;

    return res.status(200).json({ reply: reply || "", usage, model });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
