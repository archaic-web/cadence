import { lessons } from "./learning/course.ts";
import { openStore, parseProgress } from "./progress/store.ts";
import type { Progress } from "./progress/store.ts";

const root = document.querySelector<HTMLElement>("main")!;
const status = document.querySelector<HTMLElement>("#status")!;
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text: string, href: string, className = "button"): HTMLAnchorElement {
  const a = element("a", text, className);
  a.href = href;
  return a;
}

document.querySelector(".skip")!.addEventListener("click", (event) => {
  event.preventDefault();
  const heading = root.querySelector("h1");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
});

async function boot() {
  const store = await openStore();
  let progress = await store.read();
  let cleanup = new AbortController();
  let busy = false;
  let waiting: ServiceWorker | null = null;
  const updateButton = document.querySelector<HTMLButtonElement>("#update")!;
  function offerUpdate() {
    updateButton.hidden = !waiting || progress.session !== null;
  }
  updateButton.addEventListener("click", () => waiting?.postMessage("activate"));
  async function commit(next: Progress): Promise<boolean> {
    if (busy) return false;
    busy = true;
    try {
      await store.write(next);
      progress = next;
      status.textContent = "Fortschritt gespeichert";
      return true;
    } catch {
      status.textContent =
        "Nicht gespeichert. Bitte erneut versuchen oder den bisherigen Fortschritt sichern.";
      return false;
    } finally {
      busy = false;
      offerUpdate();
    }
  }
  function button(
    text: string,
    action: () => void | Promise<void>,
    className = "button",
  ): HTMLButtonElement {
    const b = element("button", text, className);
    b.type = "button";
    b.addEventListener("click", () => {
      if (!busy) void action();
    }, { signal: cleanup.signal });
    return b;
  }
  function heading(eyebrow: string, title: string, description: string) {
    root.append(
      element("p", eyebrow, "eyebrow"),
      element("h1", title),
      element("p", description, "lead"),
    );
  }
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let transition: ReturnType<Document["startViewTransition"]> | null = null;
  let renderVersion = 0;
  function render(animate = false) {
    const version = ++renderVersion;
    transition?.skipTransition();
    transition = null;
    if (!animate || reducedMotion.matches || !document.startViewTransition) {
      renderScreen();
      return;
    }
    const current = document.startViewTransition(() => {
      // A later navigation supersedes a queued screen update.
      if (version === renderVersion) renderScreen();
    });
    transition = current;
    void current.finished.catch(() => {}).finally(() => {
      if (transition === current) transition = null;
    });
  }
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) transition?.skipTransition();
  });
  function renderScreen() {
    cleanup.abort();
    cleanup = new AbortController();
    root.replaceChildren();
    const route = location.hash.slice(1) || "kurs";
    document.querySelectorAll("nav a").forEach((a) =>
      a.setAttribute("aria-current", a.getAttribute("href") === `#${route}` ? "page" : "false")
    );
    if (route === "fortschritt") {
      heading(
        "DEIN LERNWEG",
        "Ein Akkord nach dem anderen.",
        "Hier bleibt sichtbar, was du bereits geübt hast.",
      );
      const card = element("section", undefined, "panel");
      card.append(
        element(
          "h2",
          `${Object.keys(progress.completed).length} von ${lessons.length} Lektionen abgeschlossen`,
        ),
      );
      for (const lesson of lessons) {
        const score = progress.completed[lesson.id];
        card.append(
          element(
            "p",
            `${lesson.title}: ${
              score === undefined
                ? "noch offen"
                : `${score} von ${lesson.questions.length} beim ersten Versuch richtig`
            }`,
          ),
        );
      }
      card.append(
        element(
          "p",
          "Du kannst jede Lektion wiederholen. Angezeigt wird dein bestes Ergebnis. Browserdaten können gelöscht werden. Sichere deinen Fortschritt regelmäßig.",
        ),
      );
      card.append(button("Fortschritt sichern", () => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" }),
        );
        const a = link("Sicherung", url);
        a.download = "cadence-fortschritt.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }));
      const label = element("label", "Sicherung wiederherstellen", "file-label");
      const input = element("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          if (file.size > 1_000_000) throw new Error("Diese Datei ist zu groß.");
          const imported = parseProgress(JSON.parse(await file.text()));
          if (!confirm("Den aktuellen Lernfortschritt durch diese Sicherung ersetzen?")) return;
          if (await commit(imported)) render();
        } catch (error) {
          status.textContent = error instanceof Error
            ? error.message
            : "Die Datei konnte nicht gelesen werden.";
        }
      }, { signal: cleanup.signal });
      label.append(input);
      card.append(label);
      root.append(card);
    } else if (route.startsWith("lektion/")) {
      const lesson = lessons.find((l) => l.id === route.slice(8));
      if (!lesson) {
        heading(
          "NICHT GEFUNDEN",
          "Diese Lektion gibt es nicht.",
          "Wähle eine Lektion aus dem Kurs.",
        );
        root.append(link("Zum Kurs", "#kurs"));
      } else {
        const session = progress.session?.lesson === lesson.id ? progress.session : null;
        heading(
          `LEKTION ${String(lessons.indexOf(lesson) + 1).padStart(2, "0")}`,
          lesson.title,
          lesson.summary,
        );
        const panel = element("section", undefined, "panel");
        root.append(panel);
        if (!session) {
          for (const p of lesson.teaching) panel.append(element("p", p));
          if (progress.session) {
            panel.append(
              element(
                "p",
                "Beim Start wird deine andere angefangene Lektion ersetzt. Abgeschlossene Ergebnisse bleiben erhalten.",
                "muted",
              ),
            );
          }
          panel.append(button("Jetzt üben", async () => {
            if (
              await commit({ ...progress, session: { lesson: lesson.id, index: 0, answers: [] } })
            ) render();
          }));
        } else if (session.index === lesson.questions.length) {
          const score = session.answers.filter((answer, i) =>
            answer === lesson.questions[i].answer
          ).length;
          panel.append(
            element("p", "GESCHAFFT", "eyebrow"),
            element("h2", "Ein Stück weiter."),
            element(
              "p",
              `${score} von ${lesson.questions.length} Aufgaben beim ersten Versuch richtig.`,
            ),
          );
          if (score < lesson.questions.length) {
            panel.append(
              element("p", "Wiederhole die Lektion, um die Akkorde weiter zu festigen."),
            );
          }
          panel.append(button("Lektion abschließen", async () => {
            const completed = {
              ...progress.completed,
              [lesson.id]: Math.max(progress.completed[lesson.id] ?? 0, score),
            };
            if (await commit({ ...progress, completed, session: null })) location.hash = "kurs";
          }));
        } else {
          const question = lesson.questions[session.index];
          panel.append(
            element("p", `AUFGABE ${session.index + 1} VON ${lesson.questions.length}`, "eyebrow"),
          );
          const bar = element("progress");
          bar.max = lesson.questions.length;
          bar.value = session.index;
          bar.setAttribute("aria-label", "Lektionsfortschritt");
          panel.append(bar);
          const details = element("details");
          details.append(element("summary", "Erklärung nachlesen"));
          lesson.teaching.forEach((p) => details.append(element("p", p)));
          panel.append(details);
          panel.append(
            element("h2", question.prompt),
            element("p", question.display, "chord-display"),
          );
          const choices = element("div", undefined, "choices");
          choices.setAttribute("role", "group");
          choices.setAttribute("aria-label", "Antwort auswählen");
          const feedback = element("div");
          feedback.setAttribute("aria-live", "polite");
          for (const choice of question.choices) {
            const b = button(choice, async () => {
              const next = {
                ...progress,
                session: {
                  ...session,
                  index: session.index + 1,
                  answers: [...session.answers, choice],
                },
              };
              if (!await commit(next)) return;
              choices.querySelectorAll("button").forEach((b) => b.disabled = true);
              b.classList.add(choice === question.answer ? "correct" : "incorrect");
              feedback.className = "feedback";
              feedback.append(
                element(
                  "h3",
                  choice === question.answer
                    ? "Richtig!"
                    : `Die richtige Antwort ist: ${question.answer}.`,
                ),
                element("p", question.explanation),
              );
              const nextButton = button("Weiter", () => render(true));
              feedback.append(nextButton);
              nextButton.focus();
            }, "choice");
            choices.append(b);
          }
          panel.append(choices, feedback);
        }
        root.append(link("Zur Kursübersicht", "#kurs", "back-link"));
      }
    } else if (route === "kurs") {
      heading(
        "MUSIKTHEORIE · SCHRITT FÜR SCHRITT",
        "Akkorde verstehen.",
        "Drei Töne sind der Anfang. Lerne, wie Dreiklänge aufgebaut sind und was Dur von Moll unterscheidet.",
      );
      if (progress.session) {
        root.append(
          link("Angefangene Lektion fortsetzen →", `#lektion/${progress.session.lesson}`),
        );
      }
      const list = element("div", undefined, "lessons");
      lessons.forEach((lesson, i) => {
        const card = element("article", undefined, "lesson-card");
        card.append(
          element("span", String(i + 1).padStart(2, "0"), "number"),
          element(
            "p",
            progress.completed[lesson.id] === undefined
              ? `${lesson.questions.length} Aufgaben`
              : "Abgeschlossen · Wiederholung möglich",
            "eyebrow",
          ),
          element("h2", lesson.title),
          element("p", lesson.summary),
          link(
            progress.completed[lesson.id] === undefined ? "Lektion öffnen →" : "Noch einmal üben →",
            `#lektion/${lesson.id}`,
            "lesson-link",
          ),
        );
        list.append(card);
      });
      root.append(list);
      const note = element("aside", undefined, "note");
      note.append(
        element("h2", "H ist H. B ist B."),
        element(
          "p",
          "Cadence verwendet deutsche Noten- und Akkordnamen. Du lernst mit C-Dur, a-Moll und Fis – ganz ohne Tonwiedergabe.",
        ),
      );
      root.append(note);
    } else {
      heading(
        "NICHT GEFUNDEN",
        "Diese Seite gibt es nicht.",
        "Dein Kurs ist nur einen Schritt entfernt.",
      );
      root.append(link("Zum Kurs", "#kurs"));
    }
    const h = root.querySelector("h1");
    if (h) {
      h.tabIndex = -1;
      h.focus();
      document.title = `${h.textContent} · Cadence`;
    }
  }
  addEventListener("hashchange", () => render());
  render();
  offerUpdate();
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      const offline = document.querySelector<HTMLElement>("#offline")!;
      const ready = () => {
        offline.textContent = "Offline bereit";
        waiting = registration.waiting;
        offerUpdate();
      };
      if (registration.active) ready();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") ready();
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!reloading) {
          reloading = true;
          location.reload();
        }
      });
    } catch {
      document.querySelector("#offline")!.textContent = "Offline-Nutzung noch nicht bereit";
    }
  }
}
async function start() {
  if (!("indexedDB" in window) || !navigator.locks) {
    throw new Error("Bitte öffne Cadence in einem aktuellen Chromium-Browser.");
  }
  await navigator.locks.request("cadence-editor", { ifAvailable: true }, async (lock) => {
    if (!lock) {
      throw new Error(
        "Cadence ist bereits in einem anderen Fenster geöffnet. Schließe es und lade diese Seite neu.",
      );
    }
    await boot();
    await new Promise(() => {});
  });
}
void start().catch((error) => {
  root.replaceChildren(
    element("h1", "Cadence konnte nicht starten."),
    element(
      "p",
      error instanceof Error
        ? error.message
        : "Bitte prüfe, ob Browserdaten gespeichert werden dürfen.",
    ),
    link("Erneut laden", location.href),
  );
});
