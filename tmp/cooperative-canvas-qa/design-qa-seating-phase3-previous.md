# Design QA - Fase 3 Disposicio d'aula

Source visual truth path: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-phase2-desktop.png`

Design brief: Fase 3 del checkpoint, amb restriccions pedagogiques visibles, editables i aplicades pel motor de seating. La graella mostra noms curts, per exemple `Jana PD`, i conserva el nom complet al panell lateral.

Implementation screenshot path: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-phase3-desktop.png`

Responsive screenshot path: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-phase3-ipad.png`

Full-view comparison evidence: `/Users/marc/Documents/projectes/avaluapro/tmp/seating-phase3-comparison.png`

Viewport: 1280 x 720 desktop and 1024 x 768 iPad.

State: Mode tutoria > Relacions i grups > Disposicio d'aula, amb Duran Pi, Jana seleccionada, restriccions configurades i un seient bloquejat.

## Findings

No actionable P0, P1 or P2 findings remain.

- Fonts and typography: els noms curts milloren l'escaneig de la graella sense perdre el nom complet del panell.
- Spacing and layout rhythm: els controls de restriccions s'integren en el panell existent i la barra superior sense afegir targetes imbricades.
- Colors and visual tokens: les relacions, zones i seients bloquejats reutilitzen els colors semantics existents.
- Icons and assets: el seient bloquejat utilitza la icona `Ban` de Lucide; no s'han introduit actius aproximats.
- Copy and content: les restriccions mostren noms humans i estats actius clars.
- Responsive behavior: la graella, el panell i els controls de restriccions conviuen correctament a iPad horitzontal.
- Interaction behavior: s'han verificat `mai a prop`, `millor a prop`, zona preferent, zona a evitar, alumne fix i seient bloquejat.
- Motor behavior: les restriccions modifiquen la proposta i generen avisos quan una preferencia no es pot satisfer.
- Accessibility: els controls mantenen etiquetes accessibles, estat actiu i seleccio per teclat on correspon.

## Patches Made

- Afegit el format visual curt `Nom Inicials` a les targetes de la graella.
- Afegides restriccions de proximitat entre dos alumnes, mutuament excloents.
- Afegides zona preferent i zona a evitar per alumne.
- Afegit el mode de bloqueig de seients.
- Integrades les restriccions en el calcul, els avisos i les dades de guardat de la disposicio.
- Evitada una recomanacio contradictoria quan el docent prefereix explicitament la zona posterior.

## Follow-up Polish

- P3: validar la densitat amb una classe representativa de 25-30 alumnes i noms reals de longitud diversa.

final result: passed
