**Source visual truth**

- `/Users/marc/.codex/generated_images/019eea25-4f58-7802-ad18-7d2c28dd3f4b/ig_02b31d9fdc89a987016a3962e9ec608191805b8102a210701d.png`

**Implementation evidence**

- Desktop with photos and half-group positions: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-final-desktop-evidence.png`
- iPad with photos and half-group positions: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-final-ipad-evidence.png`
- Full comparison: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-final-comparison-full.png`
- Focused comparison: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-final-comparison-focused.png`

**Viewport and state**

- Desktop: 1600 × 900.
- iPad: 1024 × 768.
- Mode tutoria → Relacions i grups → Disposició d’aula.
- Structure `2 · 3 · 2`, photos enabled and half-group positions assigned.
- Student inspector, photos off/on, automatic A/B assignment and manual seat reassignment verified.
- Final iPad measurement after the last spacing patch: desk width 142.85 px; horizontal classroom width preserved instead of compressing names.

**Findings**

- No actionable P0, P1 or P2 findings remain.
- Fonts and typography: desk names are now a strong 14 px without photos and 12 px beside a 40 px avatar. The fixed `Nom C1C2` format remains legible; explanatory and configuration names use the same formatter.
- Spacing and layout rhythm: the classroom remains the dominant surface. Individual desks, visible chairs, row markers, block aisles, board, teacher desk and contextual panels reproduce the approved hierarchy.
- Colors and visual tokens: purple and green left rails provide immediate Grup A/B scanning. Assignment mode reinforces the same colors without relying on color alone because the group name stays visible.
- Image and asset fidelity: the classroom plant is a dedicated optimized raster asset. Student photos use saved profile images and initials are used when no photo exists.
- Copy and content: opaque `P6/P10` codes are removed. Priority is shown as Ordinària/Baixa/Mitjana/Alta with a plain-language evidence summary. The second structure preset is `2 · 3 · 2`.
- Icons and affordances: star, conflict and support indicators are 25 px containers with 16–17 px icons, separated from lock/review actions.
- Responsiveness: iPad keeps readable desk widths and uses horizontal overflow when the complete classroom needs more space.
- Intentional deviation: desks are slightly larger than the concept image to preserve touch targets, photos, names and pedagogical actions on an iPad.

**Patches made**

- Added a functional Mostrar/Amagar fotos control.
- Added photo and initials variants without shrinking essential information.
- Applied `Nom C1C2` throughout seating explanations, conflicts, restrictions, nearby students and selectors.
- Replaced numeric priority codes with labels and evidence.
- Enlarged pedagogical status icons.
- Added Grup A/B side rails.
- Replaced half-group prioritization with explicit A/B position assignment, automatic distribution, manual correction and reset.
- Persisted half-group positions inside saved seating layouts while keeping old layouts compatible.
- Changed the default and second preset to `2 · 3 · 2`.
- Added visible chairs, block aisles, row markers and a top-view classroom plant.

**Implementation checklist**

- Photos off/on: passed.
- Automatic A/B position assignment: passed.
- Manual A/B seat reassignment: passed.
- Student inspector and readable priority: passed.
- Legacy saved-layout normalization: passed.
- Desktop and iPad checks: passed.
- Lint, build and functional tests: passed.

**Follow-up polish**

- P3: a future pass could offer two decorative classroom themes without changing the functional floor plan.

final result: passed
