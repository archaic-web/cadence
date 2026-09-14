import { chords, semitones } from "../src/music/chords.ts";
import { lessons } from "../src/learning/course.ts";
import { emptyProgress, parseProgress } from "../src/progress/store.ts";
function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
Deno.test("Every authored triad has the correct third and fifth", () => {
  for (const c of chords) {
    assert(
      semitones(c.notes[0], c.notes[1]) === (c.quality === "Dur" ? 4 : 3),
      `Wrong third: ${c.root}-${c.quality}`,
    );
    assert(semitones(c.notes[0], c.notes[2]) === 7, `Wrong fifth: ${c.root}-${c.quality}`);
  }
});
Deno.test("German H and B are distinct", () => {
  assert(semitones("H", "C") === 1, "H must be one semitone below C");
  assert(semitones("B", "C") === 2, "B must be two semitones below C");
  assert(
    chords.find((c) => c.root === "G" && c.quality === "Moll")?.notes[1] === "B",
    "G minor must use B",
  );
});
Deno.test("All exercises have one valid answer", () => {
  assert(new Set(lessons.map((l) => l.id)).size === lessons.length, "Duplicate lesson IDs");
  for (const l of lessons) {
    for (const q of l.questions) {
      assert(
        q.choices.filter((c) => c === q.answer).length === 1,
        "Missing/duplicate correct answer",
      );
      assert(new Set(q.choices).size === q.choices.length, "Duplicate choices");
    }
  }
});
Deno.test("Progress round trip preserves checkpoint and completion", () => {
  const p = emptyProgress();
  p.completed.dreiklang = 4;
  p.session = { lesson: "dreiklang", index: 1, answers: ["Drei"] };
  assert(
    JSON.stringify(parseProgress(JSON.parse(JSON.stringify(p)))) === JSON.stringify(p),
    "Round trip changed progress",
  );
});
Deno.test("Malformed imports cannot become trusted progress", () => {
  const bad: unknown[] = [
    null,
    {},
    { ...emptyProgress(), courseVersion: 99 },
    { ...emptyProgress(), completed: { dreiklang: 99 } },
    { ...emptyProgress(), session: { lesson: "dreiklang", index: 1, answers: [] } },
    { ...emptyProgress(), session: { lesson: "dreiklang", index: 1, answers: ["injected"] } },
  ];
  for (const value of bad) {
    let rejected = false;
    try {
      parseProgress(value);
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid data accepted");
  }
});
