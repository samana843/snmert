
export const config = {
  runtime: "edge",
};

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");


const LANDING_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>smart tv</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: radial-gradient(circle at top left, #0d1117, #161b22); color: white; }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen font-sans">
    <div class="text-center space-y-6 p-8">
        <h1 class="text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            for chatgpt me
        </h1>
        <p class="text-gray-400 text-lg max-w-md mx-auto">
           smart from home .
        </p>
        <div class="flex justify-center gap-4">
            <span class="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium">contact</span>
            <span class="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium"> home</span>
        </div>
    </div>
</body>
</html>
`;

const STRIP_HEADERS = new Set([
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
]);

export default async function handler(req) {
  const url = new URL(req.url);

  // --- بخش استتار: اگر کاربر صفحه اصلی را باز کرد، سایت را نشان بده ---
  if (url.pathname === "/" && !url.searchParams.has("tunnel")) {
    return new Response(LANDING_PAGE, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  }

  // --- بخش پروکسی (بدون تغییر در ساختار اصلی) ---
  if (!TARGET_BASE) {
    return new Response("System Operational", { status: 200 }); // پیام عادی به جای خطا
  }

  try {
    const targetUrl = TARGET_BASE + url.pathname + url.search;
    const headers = new Headers();
    let clientIp = null;

    for (const [key, value] of req.headers) {
      const k = key.toLowerCase();
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") { clientIp = value; continue; }
      if (k === "x-forwarded-for") { if (!clientIp) clientIp = value; continue; }
      headers.set(k, value);
    }
    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const fetchOpts = {
      method,
      headers,
      redirect: "manual",
    };
    if (hasBody) {
      fetchOpts.body = req.body;
      fetchOpts.duplex = "half";
    }

    const upstream = await fetch(targetUrl, fetchOpts);
    const respHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      if (k.toLowerCase() === "transfer-encoding") continue;
      respHeaders.set(k, v);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response("Gateway Standard Response", { status: 502 });
  }
}
