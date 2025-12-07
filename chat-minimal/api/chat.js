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

    // Responses API
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // Nimm fuer den Start ein guenstigeres Modell, wenn verfuegbar
        model: "gpt-5.1",
        input: message
      })
    });

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      return res.status(openaiRes.status).json({ error: detail });
    }

    const data = await openaiRes.json();

    // Viele SDKs liefern output_text.
    // Bei raw JSON ist oft ein message-Block in output.
    const reply =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output
            .flatMap(i => i.content || [])
            .filter(c => c.type === "output_text")
            .map(c => c.text)
            .join("\n")
        : "");

    const usage = data && typeof data === "object" ? data.usage || null : null;

    return res.status(200).json({ reply: reply || "", usage });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
