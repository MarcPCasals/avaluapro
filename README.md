# Avaluapro

Avaluapro és una aplicació educativa per avaluar competències, fer seguiment d'hàbits de treball i comportament, i generar estadístiques docents a partir de dades d'avaluació, constància i tutoria.

Aplicació en producció:

- https://avaluapro.web.app

## OpenAI Build Week 2026

AvaluaPro participa a OpenAI Build Week com a projecte educatiu existent que s'ha ampliat durant el període del repte.

Extensió Build Week:

- `Briefing IA`: prepara un paquet pseudonimitzat per a ús d'IA amb revisió docent.
- No envia dades automàticament a cap proveïdor d'IA.
- Exclou noms, cognoms, correus, fotos, diagnòstics, informació familiar, observacions textuals i el mapa local
  d'identitat.
- Inclou tests específics per verificar que el paquet copiat no conté identificadors directes.

Document per a jutges:

- `BUILD_WEEK_2026.md`

## Documentació per a Direcció i Ministeri

El repositori inclou una guia de documents per presentar Avaluapro a Direcció, responsables de centre o Ministeri:

- `docs/guia-documents-direccio-ministeri.md`

Aquest document indica quins fitxers llegir, per què serveix cadascun i quina ruta cal seguir dins del repositori.

Els documents principals són:

- `docs/resum-executiu-paquet-ministeri.md`: porta d'entrada curta al dossier i decisions sol·licitades.
- `docs/matriu-estat-dossier-institucional.md`: estat únic de controls, proves, bloquejos i responsables futurs.
- `docs/full-de-ruta-institucional-i-empresa.md`
- `docs/informacio-participants-sociometria.md`: text informatiu mostrat als alumnes abans de respondre i punts pendents de validació institucional.
- `docs/checklist-desplegament-rules-2026-06.md`: auditoria prèvia, migració dels qüestionaris antics i desplegament conjunt de hosting i rules.
- `docs/rols-i-bases-juridiques-preliminars.md`: separació entre responsable, encarregat, docents i proveïdors, amb bases jurídiques candidates.
- `docs/registre-activitats-tractament-preliminar.md`: esborrany de RAT per activitats educatives, compartició, sociometria i backups.
- `docs/cribratge-aipd-preliminar.md`: justificació i abast recomanat de l'avaluació d'impacte institucional.
- `docs/aipd-preliminar-avaluapro.md`: AIPD preliminar completa amb operacions, proporcionalitat, registre de riscos, mesures i risc residual.
- `docs/esborrany-contracte-encarrec-tractament.md`: esborrany adaptat de l'acord entre el responsable institucional i la futura empresa Avaluapro.
- `docs/inventari-subencarregats-i-proveidors.md`: classificació de Firebase, GitHub i proveïdors futurs, amb verificacions i decisions pendents.
- `docs/politica-privacitat-institucional-preliminar.md`: política completa provisional, marcada com a no publicable fins a completar les decisions institucionals.
- `docs/avis-legal-preliminar.md`: identificació del prestador, ús admès, propietat intel·lectual i responsabilitat contractual pendents.
- `docs/clausules-informatives-preliminars.md`: textos per a docents, alumnes, famílies, sociometria, fotografies, diagnòstics i compartició.
- `docs/procediment-exercici-drets-preliminar.md`: circuit d'accés, rectificació, supressió, limitació, oposició i portabilitat, amb terminis, rols i plantilles.
- `docs/protocol-incidents-violacions-seguretat-preliminar.md`: detecció, contenció, avaluació, notificació en 72 hores, comunicació i registre de violacions.
- `docs/politica-conservacio-eliminacio-preliminar.md`: cicle de vida, terminis candidats, tancament de curs, bloqueig, backups, baixa de docents i destrucció segura.
- `docs/mesures-tecniques-organitzatives-preliminars.md`: annex de seguretat amb controls, estat real, evidències, freqüències i prioritats abans d'un pilot.
- `docs/pla-continuitat-recuperacio-preliminar.md`: funcions prioritàries, RPO/RTO candidats, backups, recuperació, mode degradat, reversibilitat i tancament de l'empresa.
- `docs/registre-empresa-categories-tractament-preliminar.md`: registre de la futura empresa com a encarregada i com a responsable dels seus tractaments corporatius.
- `docs/procediment-retorn-migracio-supressio-preliminar.md`: inventari, paquet de sortida, validació, tall, supressió, subencarregats i certificat final.
- `docs/compromis-confidencialitat-formacio-preliminar.md`: obligacions del personal, accés excepcional, formació, alta, baixa i evidències.
- `docs/procediment-suport-manteniment-preliminar.md`: canals, prioritats, diagnòstic amb dades mínimes, escalat i manteniment.
- `docs/acord-nivell-servei-preliminar.md`: cobertura, resposta, disponibilitat, manteniment, RPO/RTO i informes candidats.
- `docs/politica-vulnerabilitats-actualitzacions-preliminar.md`: detecció, divulgació, severitat, correcció, dependències, secrets i actualitzacions.
- `docs/procediment-identitats-rols-baixes-preliminar.md`: font oficial, rols, altes, canvis, substitucions, baixes i còpies locals.
- `docs/govern-administradors-accessos-excepcionals-preliminar.md`: IAM, MFA, doble control, suport privilegiat, emergències, logs i secrets.
- `docs/questionari-ministeri-decisions-institucionals.md`: preguntes, correu i registre de decisions per desbloquejar contractació, protecció de dades i infraestructura.
- `docs/fitxa-tecnica-direccio-ministeri.md`
- `docs/proteccio-dades-avaluapro.md`
- `docs/mapa-dades.md`
- `docs/firebase-acces.md`
- `docs/comparticio-docents.md`
- `docs/auditoria-comparticio-permisos.md`
- `docs/checklist-final-seguretat.md`

## Eines auxiliars

- `docs/google-forms-sociograma.md`: guia per crear un Google Forms sociomètric i importar-ne les respostes a Avaluapro.
- `scripts/generar-formulari-sociometric-avaluapro.gs`: Apps Script per generar automàticament el formulari sociomètric i una plantilla compatible amb Avaluapro.

## Desenvolupament

Projecte creat amb Vite + React.

Comandes habituals:

```bash
npm install
npm run dev
npm run lint
npm run build
```
