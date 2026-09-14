export const tones = ["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"] as const;
export type Tone = typeof tones[number];
export type Quality = "Dur" | "Moll";
export type Chord = { root: Tone; quality: Quality; notes: readonly [Tone, Tone, Tone] };
// Explicit spellings: enharmonic equivalents are not interchangeable answers.
export const chords: readonly Chord[] = [
  { root: "C", quality: "Dur", notes: ["C", "E", "G"] },
  { root: "C", quality: "Moll", notes: ["C", "Es", "G"] },
  { root: "D", quality: "Dur", notes: ["D", "Fis", "A"] },
  { root: "D", quality: "Moll", notes: ["D", "F", "A"] },
  { root: "E", quality: "Moll", notes: ["E", "G", "H"] },
  { root: "F", quality: "Dur", notes: ["F", "A", "C"] },
  { root: "G", quality: "Dur", notes: ["G", "H", "D"] },
  { root: "G", quality: "Moll", notes: ["G", "B", "D"] },
  { root: "A", quality: "Moll", notes: ["A", "C", "E"] },
  { root: "B", quality: "Dur", notes: ["B", "D", "F"] },
  { root: "H", quality: "Moll", notes: ["H", "D", "Fis"] },
];
export function chordName(chord: Chord): string {
  return `${chord.quality === "Moll" ? chord.root.toLowerCase() : chord.root}-${chord.quality}`;
}
export function semitones(from: Tone, to: Tone): number {
  return (tones.indexOf(to) - tones.indexOf(from) + 12) % 12;
}
