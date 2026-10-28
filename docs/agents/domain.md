# Domain Docs

Engineering skills use a single-context layout: root `GLOSSARY.md` and `docs/adr/`.

## Before exploring

- Read `GLOSSARY.md` at the repo root.
- Read ADRs in `docs/adr/` that touch the area you're about to work in.

If these files don't exist, proceed silently. `/domain-modeling` creates them lazily when terms or decisions are resolved.

## Use the glossary's vocabulary

Use terms defined in `GLOSSARY.md` in issue titles, proposals, hypotheses, and test names. Avoid synonyms the glossary explicitly rejects.

If a concept isn't in the glossary, reconsider whether it belongs in the project's language or note the gap for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
