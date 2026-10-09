const AUTH_BASE = "https://ep-dawn-dawn-a5y0y7ou.neonauth.us-east-2.aws.neon.tech/anstay/auth";
const HOP_BY_HOP = new Set(["connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","transfer-encoding","upgrade","host","content-length","x-forwarded-host","x-forwarded-proto"]);

export default async function handler(req, res) {
  try {
    const incoming = new URL(req.url || "/", "https://anstay-villa-ops.vercel.app");
    const routeParts = Array.isArray(req.query?.path) ? req.query.path : req.query?.path ? [req.query.path] : [];
    const routePath = incoming.pathname.replace(/^\\/api\\/auth\\/?/, "") || routeParts.join("/") || incoming.searchParams.get("path") || "";
    const target = new URL(AUTH_BASE + (routePath ? "/" + routePath.split("/").map(encodeURIComponent).join("/") : ""));
    incoming.searchParams.forEach((value, key) => {
      if (key !== "path") target.searchParams.append(key, value);
    });

    const headers = new Headers();
    for (const [key, raw] of Object.entries(req.headers || {})) {
      const name = key.toLowerCase();
      if (raw == null || HOP_BY_HOP.has(name)) continue;
      headers.set(name, Array.isArray(raw) ? raw.join(", ") : String(raw));
    }
    if (!headers.has("origin")) headers.set("origin", "https://anstay-villa-ops.vercel.app");

    let body;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body != null) {
      body = typeof req.body === "string" || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.statusCode = upstream.status;
    for (const [key, value] of upstream.headers.entries()) {
      const name = key.toLowerCase();
      if (HOP_BY_HOP.has(name) || name === "set-cookie" || name === "content-encoding" || name === "content-length") continue;
      res.setHeader(key, value);
    }
    const cookies = upstream.headers.getSetCookie?.() || [];
    if (cookies.length) res.setHeader("set-cookie", cookies);

    const payload = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("content-length", String(payload.length));
    res.end(payload);
  } catch (error) {
    console.error("[ANSTAY auth proxy]", error);
    res.status(502).json({ error: "Không kết nối được máy chủ đăng nhập", detail: error?.message || String(error) });
  }
}
