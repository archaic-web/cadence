import { courseVersion, lessons } from "../learning/course.ts";
export type Session = { lesson: string; index: number; answers: string[] };
export type Progress = {
  version: 1;
  courseVersion: number;
  completed: Record<string, number>;
  session: Session | null;
};
export function emptyProgress(): Progress {
  return { version: 1, courseVersion, completed: {}, session: null };
}
export function parseProgress(value: unknown): Progress {
  if (!value || typeof value !== "object") throw new Error("Ungültige Fortschrittsdatei.");
  const p = value as Record<string, unknown>;
  if (
    p.version !== 1 || p.courseVersion !== courseVersion || !p.completed ||
    typeof p.completed !== "object" || Array.isArray(p.completed)
  ) throw new Error("Diese Datenversion wird nicht unterstützt.");
  const completed: Record<string, number> = {};
  for (const [id, score] of Object.entries(p.completed)) {
    const lesson = lessons.find((l) => l.id === id);
    if (
      !lesson || typeof score !== "number" || !Number.isInteger(score) || score < 0 ||
      score > lesson.questions.length
    ) throw new Error("Ungültiger Lernstand.");
    completed[id] = score;
  }
  let session: Session | null = null;
  if (p.session !== null) {
    if (!p.session || typeof p.session !== "object") throw new Error("Ungültige Lektion.");
    const s = p.session as Record<string, unknown>;
    const lesson = lessons.find((l) => l.id === s.lesson);
    if (
      !lesson || !Array.isArray(s.answers) || !Number.isInteger(s.index) ||
      s.index !== s.answers.length || s.answers.length > lesson.questions.length ||
      !s.answers.every((a, i) => typeof a === "string" && lesson.questions[i].choices.includes(a))
    ) throw new Error("Ungültiger Lektionsfortschritt.");
    session = { lesson: lesson.id, index: s.answers.length, answers: [...s.answers] };
  }
  return { version: 1, courseVersion, completed, session };
}
export async function openStore() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("cadence", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("progress");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Bitte andere Cadence-Fenster schließen."));
  });
  db.onversionchange = () => db.close();
  return {
    async read(): Promise<Progress> {
      const value = await new Promise<unknown>((resolve, reject) => {
        const r = db.transaction("progress").objectStore("progress").get("current");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      return value === undefined ? emptyProgress() : parseProgress(value);
    },
    write(value: Progress): Promise<void> {
      return new Promise((resolve, reject) => {
        const tx = db.transaction("progress", "readwrite");
        tx.objectStore("progress").put(value, "current");
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}
