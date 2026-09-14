import { Buffer } from "node:buffer";
// This test-only dependency stays outside the application import graph.
// deno-lint-ignore no-import-prefix
import { chromium } from "npm:playwright@1.62.1";

// Run against `deno task serve` in a second terminal.
const browser = await chromium.launch({ headless: true, channel: "chromium" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
try {
  await page.goto("http://127.0.0.1:8000/");
  await page.getByRole("heading", { name: "Akkorde verstehen.", exact: true }).waitFor();
  await page.getByText("Offline bereit", { exact: true }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
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
  await context.setOffline(true);
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
  assert(download.suggestedFilename() === "cadence-fortschritt.json", "Wrong export filename");
  await page.goBack();
  await page.getByRole("heading", { name: "Akkorde verstehen.", exact: true }).waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Ein Akkord nach dem anderen.", exact: true }).waitFor();
  await context.setOffline(false);
  const second = await context.newPage();
  await second.goto("http://127.0.0.1:8000/");
  await second.getByText(
    "Cadence ist bereits in einem anderen Fenster geöffnet. Schließe es und lade diese Seite neu.",
    { exact: true },
  ).waitFor();
  await second.close();
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
  await page.screenshot({ path: "/tmp/cadence-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "/tmp/cadence-desktop.png", fullPage: true });
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "Passed: lesson completion, restart, offline restart, history, export, invalid import, single writer, mobile layout, no browser errors.",
  );
} finally {
  await browser.close();
}
