export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server misconfigured" });

    const openaiRes = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      return res.status(openaiRes.status).json({ error: detail });
    }

    const data = await openaiRes.json();
    const models = Array.isArray(data.data)
      ? data.data
          .map(m => m.id)
          .filter(Boolean)
          .sort()
      : [];

    return res.status(200).json({ models });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
