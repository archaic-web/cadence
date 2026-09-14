# Cadence

Follow the archaic-pwa skill: strict TypeScript, Deno, browser standards, no frontend framework or
private framework. Source of truth: archaic-web/cadence.

- All learner-facing content is exclusively German. Use German musical terminology, H/B distinction,
  and German accidentals (Cis, Es, Fis, As). Spell chords correctly rather than accepting
  pitch-class equivalence.
- Initial iterations focus on chords and contain no audio, microphone, MIDI, or ear-training
  features.
- Keep domain functions independent of DOM and persistence. Compose dependencies explicitly.
- Use `deno task check`, `deno task test`, `deno task build`; verify offline and persistence claims
  in a real browser.
- Do not erase incompatible learner data. Preserve resumable sessions and export/import.
- Keep lessons hand-authored and exercise types explicit. No curriculum DSL or plugin framework.
