const sources = [
  "src/main.ts",
  "src/music/chords.ts",
  "src/learning/course.ts",
  "src/progress/store.ts",
];
try {
  await Deno.remove("dist", { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) throw e;
}
await Deno.mkdir("dist", { recursive: true });
for (const source of sources) {
  const target = `dist/${source.replace(/\.ts$/, ".js")}`;
  await Deno.mkdir(target.slice(0, target.lastIndexOf("/")), { recursive: true });
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["transpile", "--no-check", source, "-o", target],
  }).output();
  if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
  const js = (await Deno.readTextFile(target)).replace(
    /(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g,
    "$1.js$2",
  );
  await Deno.writeTextFile(target, js);
}
const files: string[] = sources.map((s) => s.replace(/\.ts$/, ".js"));
for await (const entry of Deno.readDir("public")) {
  if (entry.isFile) {
    await Deno.copyFile(`public/${entry.name}`, `dist/${entry.name}`);
    files.push(entry.name);
  }
}
files.sort();
const source = await Promise.all(files.map((f) => Deno.readTextFile(`dist/${f}`)));
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source.join("\n")));
const version = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("")
  .slice(0, 16);
await Deno.writeTextFile(
  "dist/sw.js",
  `
const CACHE = 'cadence-${version}';
const FILES = ${JSON.stringify(files)};
const base = new URL('./', self.location.href);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES.map(file => new Request(new URL(file, base), {cache: 'reload'})));
})()));
self.addEventListener('message', event => {
  if (event.data === 'activate') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Keep previous caches: an older open page may still need its own resources.
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== base.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const url = new URL(event.request.url);
    const key = event.request.mode === 'navigate' && (url.pathname === base.pathname || url.pathname === new URL('index.html', base).pathname) ? new URL('index.html', base).href : event.request;
    return await cache.match(key) || fetch(event.request);
  })());
});
`,
);
console.log(`Built ${files.length} files; offline release ${version}`);
