export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Accept both GET (query params) and POST (json body)
  const input = req.method === "GET" ? req.query || {} : req.body || {};
  const resourceRaw = input.resource || input.room || input.id || 8270866;
  const dateRaw = input.date || input.day || input.datepickerValue || null;

  const resource = Number.parseInt(resourceRaw, 10);
  if (!Number.isFinite(resource) || resource <= 0) {
    return res.status(400).json({ error: "invalid_resource", message: "resource must be a positive integer" });
  }

  // Expect dd.mm.yyyy; fall back to today in CH format
  const formatDate = (val) => {
    if (!val) return null;
    if (typeof val !== "string") return null;
    const parts = val.split(/[.\-\/]/).filter(Boolean);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length <= 2 && m.length <= 2 && y.length === 4) {
        return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
      }
    }
    return null;
  };

  const today = new Date();
  const todayLabel = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  const datepickerValue = formatDate(dateRaw) || todayLabel;

  try {
    const upstreamRes = await fetch("https://apps.phbern.ch/raumkalender/api/v1/resource/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, datepickerValue })
    });

    const text = await upstreamRes.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* leave data null */
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: "upstream_error", detail: text || "unknown error" });
    }

    if (!data || typeof data !== "object" || !Array.isArray(data.events)) {
      return res.status(502).json({ error: "bad_upstream_payload", detail: data });
    }

    return res.status(200).json({ resource, datepickerValue, ...data });
  } catch (err) {
    return res.status(500).json({ error: "proxy_error", message: err.message || "Unknown error" });
  }
}
