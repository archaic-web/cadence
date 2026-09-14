import { chordName, chords } from "../music/chords.ts";
export type Question = {
  prompt: string;
  display: string;
  choices: readonly string[];
  answer: string;
  explanation: string;
};
export type Lesson = {
  id: string;
  title: string;
  summary: string;
  teaching: readonly string[];
  questions: readonly Question[];
};
export const courseVersion = 1;
export const lessons: readonly Lesson[] = [
  {
    id: "dreiklang",
    title: "Drei Töne, ein Akkord",
    summary: "Grundton, Terz und Quinte kennenlernen.",
    teaching: [
      "Ein Dreiklang besteht aus drei verschiedenen Tönen: Grundton, Terz und Quinte. Wir betrachten zunächst die Grundstellung: Der Grundton liegt unten.",
      "Bei C-Dur sind das C, E und G. Zähle die Notennamen mit: C–D–E ergibt die Terz, C–D–E–F–G die Quinte.",
      "In der deutschen Benennung heißen die Stammtöne C, D, E, F, G, A und H. B bezeichnet das um einen Halbton erniedrigte H.",
    ],
    questions: [
      {
        prompt: "Wie viele verschiedene Töne hat ein Dreiklang?",
        display: "C · E · G",
        choices: ["Zwei", "Drei", "Vier"],
        answer: "Drei",
        explanation:
          "Ein Dreiklang besteht aus Grundton, Terz und Quinte: drei verschiedenen Tönen.",
      },
      {
        prompt: "Welcher Ton ist der Grundton von C-Dur?",
        display: "C · E · G",
        choices: ["E", "G", "C"],
        answer: "C",
        explanation: "C gibt C-Dur seinen Namen und ist der Grundton.",
      },
      {
        prompt: "Welcher Ton ist die Terz von C-Dur?",
        display: "C · E · G",
        choices: ["G", "E", "C"],
        answer: "E",
        explanation: "Zähle C als ersten Ton: C–D–E. E ist die Terz.",
      },
      {
        prompt: "Welcher Ton ist die Quinte von C-Dur?",
        display: "C · E · G",
        choices: ["C", "E", "G"],
        answer: "G",
        explanation: "C–D–E–F–G: G ist der fünfte Ton und damit die Quinte.",
      },
      {
        prompt: "Wie heißt der Stammton nach A?",
        display: "C · D · E · F · G · A · …",
        choices: ["B", "H", "Cis"],
        answer: "H",
        explanation: "Die deutsche Stammtonreihe endet mit H. B ist ein erniedrigtes H.",
      },
    ],
  },
  {
    id: "dur-moll",
    title: "Dur oder Moll?",
    summary: "Die Terz macht den Unterschied.",
    teaching: [
      "Ein Halbtonschritt führt auf der Klaviatur zur unmittelbar nächsten Taste, egal ob weiß oder schwarz. Zwischen E und F sowie H und C liegt ebenfalls nur ein Halbton.",
      "Dur: Vom Grundton zur Terz sind es vier Halbtöne, von der Terz zur Quinte drei. C-Dur besteht aus C–E–G.",
      "Moll: zuerst drei Halbtöne, dann vier. c-Moll besteht aus C–Es–G. Es ist das erniedrigte E. Die Quinte bleibt gleich: sieben Halbtöne über dem Grundton.",
    ],
    questions: [
      {
        prompt: "Welche Abstände bilden einen Dur-Dreiklang?",
        display: "Grundton → Terz → Quinte",
        choices: ["3 + 4 Halbtöne", "4 + 3 Halbtöne", "4 + 4 Halbtöne"],
        answer: "4 + 3 Halbtöne",
        explanation:
          "Dur besteht aus einer großen Terz (4 Halbtöne) und darüber einer kleinen Terz (3 Halbtöne).",
      },
      {
        prompt: "Welche Abstände bilden einen Moll-Dreiklang?",
        display: "Grundton → Terz → Quinte",
        choices: ["3 + 3 Halbtöne", "4 + 3 Halbtöne", "3 + 4 Halbtöne"],
        answer: "3 + 4 Halbtöne",
        explanation:
          "Moll beginnt mit einer kleinen Terz (3 Halbtöne), darüber liegt eine große Terz (4 Halbtöne).",
      },
      ...chords.filter((c) => ["C", "D", "G"].includes(c.root)).map((c) => ({
        prompt: "Ist dieser Dreiklang Dur oder Moll?",
        display: c.notes.join(" · "),
        choices: ["Dur", "Moll"],
        answer: c.quality,
        explanation: `${chordName(c)}: ${c.notes.join("–")}. Vom Grundton zur Terz sind es ${
          c.quality === "Dur" ? "vier" : "drei"
        } Halbtöne.`,
      })),
    ],
  },
  {
    id: "akkordtoene",
    title: "Akkorde zusammensetzen",
    summary: "Fehlende Töne finden – auch mit H und B.",
    teaching: [
      "Bestimme zuerst den Grundton und die Akkordart. Suche dann die Terz: bei Dur vier, bei Moll drei Halbtöne über dem Grundton.",
      "Die Quinte liegt bei beiden sieben Halbtöne über dem Grundton. a-Moll besteht deshalb aus A–C–E.",
      "Ein Kreuz erhöht: F wird zu Fis, C zu Cis. Ein ♭ erniedrigt: E wird zu Es, A zu As, H zu B. G-Dur enthält H; g-Moll enthält B.",
    ],
    questions: chords.filter((c) => c.root !== "C").map((c) => ({
      prompt: `Welche Terz fehlt in ${chordName(c)}?`,
      display: `${c.notes[0]} · ? · ${c.notes[2]}`,
      choices: ["C", "D", "Es", "E", "F", "Fis", "G", "A", "B", "H"],
      answer: c.notes[1],
      explanation: `${chordName(c)} besteht aus ${c.notes.join("–")}. Die Terz ${
        c.notes[1]
      } liegt ${c.quality === "Dur" ? "vier" : "drei"} Halbtöne über ${c.root}.`,
    })),
  },
];
