**Source visual truth**

- `/var/folders/74/q1q7tp35509f8hnk93wlr6pw0000gn/T/TemporaryItems/NSIRD_screencaptureui_BGVgJ3/Captura de pantalla 2026-06-23 a les 7.36.58.png`

**Implementation evidence**

- Desktop: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-compact-desktop.png`
- iPad: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-compact-ipad.png`

**Viewport and state**

- Desktop: 1600 × 900.
- iPad: 1024 × 768.
- Mode tutoria → Relacions i grups → Disposició d’aula.
- Structure `2 · 3 · 2`, five rows, teacher desk tested on both sides.
- Photos off/on verified with the compact card variant.

**Findings**

- No actionable P0, P1 or P2 findings remain.
- The teacher desk can be placed left or right; the plant automatically occupies the opposite side.
- All five desk rows and the complete legend fit vertically at 1024 × 768 without internal vertical scrolling.
- Desk names keep the `Nom C1C2` format and remain legible in the compact layout.
- Grup A/B is communicated by the colored left rail and the legend, so repeated group text has been removed from each desk.
- The legend explains Grup A, Grup B, star, proximity control, support, fixed seat and review markers.
- Photo mode keeps the full plan compact: 20 student media elements rendered in the demo, with 11 px names and no vertical overflow.
- Horizontal overflow remains available on narrower screens when the complete classroom width cannot fit without making names or touch targets too small.

**Implementation checklist**

- Teacher desk left/right persistence and legacy normalization: passed.
- Plant opposite teacher desk: passed.
- Five compact rows: passed.
- Legend and half-group colors: passed.
- Half-group text removed from desks: passed.
- Photos off/on: passed.
- Desktop and iPad visual checks: passed.
- Browser console: no errors.
- Lint, build and functional/security tests: passed.

final result: passed
