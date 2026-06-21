# Guia del dossier per a Direccio i Ministeri

Data d'actualitzacio: 21 de juny de 2026

El dossier explica l'estat funcional, tecnic, juridic i empresarial d'Avaluapro. No es una certificacio ni una autoritzacio d'us institucional.

## Paquet recomanat per enviar

| Ordre | Document | Funcio |
| --- | --- | --- |
| 1 | `docs/resum-executiu-paquet-ministeri.md` | Situa el projecte, els limits i les decisions sol.licitades. |
| 2 | `docs/fitxa-tecnica-direccio-ministeri.md` | Resumeix arquitectura, dades, mesures i estat verificable. |
| 3 | `docs/matriu-estat-dossier-institucional.md` | Separa implementacio, prova local, desplegament, prova real i validacio externa. |
| 4 | `docs/mapa-dades.md` | Identifica dades, ubicacions, finalitats i sensibilitat. |
| 5 | `docs/firebase-acces.md` | Explica rutes, permisos, proves i bloqueig de desplegament. |
| 6 | `docs/rols-i-bases-juridiques-preliminars.md` | Proposa responsable, encarregat, usuaris i bases candidates. |
| 7 | `docs/registre-activitats-tractament-preliminar.md` | Esborrany del RAT institucional. |
| 8 | `docs/aipd-preliminar-avaluapro.md` | Avaluacio d'impacte preliminar i riscos residuals. |
| 9 | `docs/mesures-tecniques-organitzatives-preliminars.md` | Controls tecnics i organitzatius. |
| 10 | `docs/pla-continuitat-recuperacio-preliminar.md` | Recuperacio, reversibilitat i dependencia del servei. |
| 11 | `docs/esborrany-contracte-encarrec-tractament.md` | Base contractual no definitiva. |
| 12 | `docs/inventari-subencarregats-i-proveidors.md` | Firebase, GitHub i proveidors futurs. |
| 13 | `docs/questionari-ministeri-decisions-institucionals.md` | Recull les respostes necessaries per continuar. |

El qüestionari no s'ha d'enviar separat. La decisio actual es remetre'l amb el paquet complet despres d'una revisio final.

## Annexos operatius

| Document | Us |
| --- | --- |
| `docs/proteccio-dades-avaluapro.md` | Explicacio general de privacitat i arquitectura. |
| `docs/comparticio-docents.md` | Fluxos de notes, cotutories i sociometria. |
| `docs/auditoria-comparticio-permisos.md` | Troballes internes i correccions. |
| `docs/checklist-desplegament-rules-2026-06.md` | Migracio dels qüestionaris antics i desplegament conjunt. |
| `docs/checklist-final-seguretat.md` | Proves manuals i dispositius pendents. |
| `docs/politica-conservacio-eliminacio-preliminar.md` | Terminis candidats i final de servei. |
| `docs/procediment-exercici-drets-preliminar.md` | Acces, rectificacio, supressio i altres drets. |
| `docs/protocol-incidents-violacions-seguretat-preliminar.md` | Resposta davant incidents. |
| `docs/procediment-identitats-rols-baixes-preliminar.md` | Alta, canvi de rol i baixa. |
| `docs/govern-administradors-accessos-excepcionals-preliminar.md` | Administradors, MFA, suport i emergencia. |
| `docs/procediment-retorn-migracio-supressio-preliminar.md` | Retorn, migracio i certificat de supressio. |
| `docs/procediment-suport-manteniment-preliminar.md` | Suport amb dades minimes. |
| `docs/acord-nivell-servei-preliminar.md` | Compromisos candidats de servei. |
| `docs/politica-vulnerabilitats-actualitzacions-preliminar.md` | Gestio de vulnerabilitats. |

## Documents interns de projecte

- `docs/full-de-ruta-institucional-i-empresa.md`: checklist cronologica completa.
- `docs/registre-empresa-categories-tractament-preliminar.md`: tractaments propis de la futura empresa.
- `docs/avis-legal-preliminar.md`: identificacio del prestador i condicions d'us.
- `docs/politica-privacitat-institucional-preliminar.md`: politica no publicable fins a completar decisions.
- `docs/clausules-informatives-preliminars.md`: textos candidats per col.lectius i funcions.
- `docs/compromis-confidencialitat-formacio-preliminar.md`: personal i col.laboradors.
- `docs/cribratge-aipd-preliminar.md`: justificacio de l'AIPD.

## Fitxers tecnics

| Fitxer | Estat |
| --- | --- |
| `firestore.rules` | Versio reforcada provada localment; no desplegada. |
| `storage.rules` | Preparacio futura; Storage no es la persistencia actual. |
| `firebase.json` | Configuracio de hosting i emuladors. |
| `tests/firestore-rules.test.js` | 26 proves de regles compartides. |
| `tests/shared-tutoring-sync.test.js` | 5 proves de fusio i tombstones. |

## Abans d'enviar

- [ ] Actualitzar el resultat del desplegament de regles.
- [ ] Incorporar els resultats de les proves amb dos comptes.
- [ ] Confirmar que no hi ha dades reals dins captures o annexos.
- [ ] Revisar dates, noms del prestador i dades de contacte.
- [ ] Marcar clarament tots els documents preliminars.
- [ ] Fer una revisio juridica i tecnica del paquet.
- [ ] Enviar conjuntament el dossier i el qüestionari.

## Missatge essencial

Avaluapro presenta una base tecnica i documental treballada, pero demana decisions institucionals abans de constituir l'empresa o obrir un pilot. Les proves locals no substitueixen el desplegament, les proves reals, l'AIPD aprovada ni els contractes.
