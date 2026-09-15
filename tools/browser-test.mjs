import { startServer } from "./serve.ts";
import { Buffer } from "node:buffer";
// This test-only dependency stays outside the application import graph.
// deno-lint-ignore no-import-prefix
import { chromium, webkit } from "npm:playwright@1.62.1";

// Own the test server so recovery is tested with the origin actually unavailable.
const browserName = Deno.env.get("BROWSER") ?? "chromium";
if (!["chromium", "webkit"].includes(browserName)) throw new Error("Unknown browser");
const browser = await (browserName === "webkit" ? webkit : chromium).launch({ headless: true });
let server = startServer(8001);
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await Deno.mkdir(`test-results/${browserName}`, { recursive: true });
context.setDefaultTimeout(15_000);
context.setDefaultNavigationTimeout(30_000);
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
try {
  await page.goto("http://127.0.0.1:8001/");
  await page.getByRole("heading", { name: "Akkorde verstehen.", exact: true }).waitFor();
  await page.getByText("Offline bereit", { exact: true }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null).catch(async () => {
    // Initial activation can reload the document while the condition is evaluated.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  });
  await page.reload();
  // Wait for the initial service-worker takeover/reload to settle.
  await page.getByRole("heading", { name: "Akkorde verstehen.", exact: true }).waitFor();
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile layout overflows",
  );
  await page.locator('a[href="#lektion/dreiklang"]').click();
  await page.getByRole("button", { name: "Jetzt üben" }).click();
  await page.getByRole("button", { name: "Drei", exact: true }).click();
  await page.getByRole("heading", { name: "Richtig!", exact: true }).waitFor();
  await page.reload();
  await page.getByText("AUFGABE 2 VON 5", { exact: true }).waitFor();
  await server.shutdown();
  let unreachable = false;
  try {
    await fetch("http://127.0.0.1:8001/", { signal: AbortSignal.timeout(2000) });
  } catch {
    unreachable = true;
  }
  assert(unreachable, "Test origin must be unavailable during the recovery check");
  await page.reload();
  await page.getByText("AUFGABE 2 VON 5", { exact: true }).waitFor();
  for (const answer of ["C", "E", "G", "H"]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page.getByRole("button", { name: "Weiter", exact: true }).click();
  }
  await page.getByText("5 von 5 Aufgaben beim ersten Versuch richtig.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Lektion abschließen", exact: true }).click();
  await page.getByRole("link", { name: "Mein Fortschritt", exact: true }).click();
  await page.getByRole("heading", { name: "1 von 3 Lektionen abgeschlossen" }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fortschritt sichern", exact: true }).click();
  const download = await downloadPromise;
  const backupPath = `test-results/${browserName}/progress.json`;
  await download.saveAs(backupPath);
  const backup = JSON.parse(await Deno.readTextFile(backupPath));
  assert(backup.completed.dreiklang === 5, "Export did not contain the completed lesson");
  assert(download.suggestedFilename() === "cadence-fortschritt.json", "Wrong export filename");
  await page.goBack();
  await page.getByRole("heading", { name: "Akkorde verstehen.", exact: true }).waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Ein Akkord nach dem anderen.", exact: true }).waitFor();
  server = startServer(8001);
  const second = await context.newPage();
  await second.goto("http://127.0.0.1:8001/");
  await second.getByText(
    "Cadence ist bereits in einem anderen Fenster geöffnet. Schließe es und lade diese Seite neu.",
    { exact: true },
  ).waitFor();
  await second.close();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...backup, completed: { dreiklang: 3 } })),
  });
  await page.getByText("Drei Töne, ein Akkord: 3 von 5 beim ersten Versuch richtig", {
    exact: true,
  }).waitFor();
  await page.reload();
  await page.getByText("Drei Töne, ein Akkord: 3 von 5 beim ersten Versuch richtig", {
    exact: true,
  }).waitFor();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await page.getByRole("status").filter({ hasText: "Diese Datenversion wird nicht unterstützt." })
    .waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "1 von 3 Lektionen abgeschlossen" }).waitFor();
  await page.getByRole("link", { name: "Lernen", exact: true }).click();
  await page.screenshot({ path: `test-results/${browserName}/mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `test-results/${browserName}/desktop.png`, fullPage: true });
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "Passed: lesson completion, restart, offline restart, history, export, invalid import, single writer, mobile layout, no browser errors.",
  );
} catch (error) {
  await page.screenshot({ path: `test-results/${browserName}/failure.png`, fullPage: true }).catch(
    () => {},
  );
  await Deno.writeTextFile(`test-results/${browserName}/error.txt`, String(error));
  throw error;
} finally {
  await context.tracing.stop({ path: `test-results/${browserName}/trace.zip` }).catch(() => {});
  await browser.close();
  await server.shutdown();
}
