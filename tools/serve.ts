const types: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  webmanifest: "application/manifest+json",
};
Deno.serve({ hostname: "127.0.0.1", port: 8000 }, async (request) => {
  const path = new URL(request.url).pathname;
  if (path.includes("..") || path.includes("%") || path.includes("\\")) {
    return new Response("Ungültiger Pfad", { status: 400 });
  }
  const file = path === "/" ? "/index.html" : path;
  try {
    return new Response(await Deno.readFile(`dist${file}`), {
      headers: {
        "Content-Type": types[file.split(".").pop()!] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return new Response("Nicht gefunden", { status: 404 });
    return new Response("Datei nicht lesbar", { status: 500 });
  }
});
