# Healthy Hearing — Community & Workshop Master Deck

## Contents
- `Healthy_Hearing_Community_Workshop_Master_Deck.pptx` — editable 24-slide presentation with speaker notes.
- `Healthy_Hearing_Community_Workshop_Preview.png` — slide montage for quick review.
- `create_integrated_deck.js` — PptxGenJS source used to generate the deck.
- `assets/` — owl mascot and two explanatory schematics used by the deck.

## Deck logic
- Slide 3 is the North Star anchor, synthesizing the story deck, evidence/demo deck, and master playbook into one decision-tree + roadmap slide.
- Slides 4–15 cover problem, evidence, science, product, technical boundaries, validation, and live demo.
- Slides 16–18 are workshop exercises.
- Slides 19–22 cover sustainability, roadmap, distribution, and pitch/readiness.
- Slide 23 is the source appendix; slide 24 closes with the partnership ask.

## Key evidence/claim discipline
The presentation distinguishes general hearing-loss statistics from disabling hearing loss. It avoids unsupported “70%/80% of consonants” claims and does not present the app as a diagnostic tool. Historical engineering test results are described as reported in prior logs and requiring re-verification on the release commit.

## Regeneration
Requires Node.js and `pptxgenjs`. The source script refers to the relative `assets/` directory; run it from this bundle after adjusting `A` and `out` paths at the bottom/top of the script to the local path.
