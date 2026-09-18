# Línia de base abans d'integrar Programació i Agenda

Data de comprovació: 18 de setembre de 2026  
Iteració: 1 de 20 — Verificació i xarxa de seguretat  
Estat: COMPLETA

## Objectiu

Fixar l'estat verificable d'AvaluaPro abans d'afegir Programació, Agenda i Mode aula. Aquesta iteració no incorpora funcionalitat nova. Ha de permetre distingir un problema preexistent d'una regressió introduïda durant la integració i deixar les dades reals en un estat coherent i recuperable.

## Referència de codi

- Branca: `main`.
- Punt de partida funcional verificat: `25a3eebbaf9ee279b8daf913d8aad3aabf458b77`.
- Primera versió de la línia de base: `72b14bf`.
- El repositori només tenia captures antigues sense versionar a `tmp/`; s'han preservat i no formen part d'aquesta iteració.
- Projecte Firebase actiu: `avaluapro`.
- Hosting de producció: `https://avaluapro.web.app/`.

## Resultats verificats

| Àmbit | Resultat | Evidència |
|---|---|---|
| Sincronització i cua local | Correcte en proves | 27 proves de càrrega inicial, diferències, cua persistent i còpia diària |
| Compartició de cotutoria | Correcte en proves | 6 proves de fusió, versions i tombstones |
| Coordinació | Correcte en proves | 10 proves de cua, autoria, lectura i recordatoris |
| Conservació i purga | Correcte en proves | 3 proves de retenció i 3 de purga amb emulador |
| Privacitat del briefing | Correcte en proves | 3 proves de pseudonimització i exclusió d'identificadors |
| Regles de Firestore | Correcte en proves | 62 proves d'accés permès i denegat |
| Qualitat estàtica | Correcte | `npm run lint` sense errors |
| Compilació Firebase | Correcte | `npm run build:firebase` completat |
| Regles locals/publicades | Idèntiques | SHA-256 local i publicat coincidents |
| Repositori remot | Correcte | `main` local coincideix amb `origin/main` |
| Vista iPad de referència | Correcte | 1024 × 1366 sense desbordament horitzontal a la vista publicada de demostració |
| Recuperació autenticada | Correcte | Recuperació des de Firebase després de validar una còpia local i els recomptes de 24 col·leccions |
| Càrrega en pestanya nova | Correcte | Estat `Sincronitzat` i qüestionari de 1r C amb 8 respostes i data de sincronització |
| Pestanyes antigues | Correcte | Les dues pestanyes que conservaven l'avís han quedat `Sincronitzat` després de recarregar |
| Auditoria final Firebase | Correcte | `readyToDeploy: true`, cap bloqueig i cap resposta sociomètrica pendent |

## Inventari de persistència actual

### IndexedDB

- Base de dades: `avaluapro-v2`.
- Versió: 15.
- 24 col·leccions de dades pedagògiques.
- Cua persistent `cloudSyncQueue` separada per usuari.
- Memòria i bústia de coordinació de cotutoria en magatzems específics.
- Índexs principals per classe, UT, alumne, tasca, data i estat.

### Firestore privat

- Dades ordinàries sota `users/{uid}/{collectionName}`.
- Metadades sota `users/{uid}/meta/app`.
- Còpies sota `users/{uid}/cloudBackups/{backupId}` amb les files en subcol·leccions.
- Les 24 col·leccions actuals continuen sent la unitat de sincronització admesa.

### Firestore compartit o temporal

- Paquets de notes entre docents.
- Espais, invitacions, senyals de canvi i coordinació de cotutoria.
- Qüestionaris sociomètrics i formularis tutorials amb zona pública limitada.
- Missatgeria interna, anuncis i suggeriments separats de l'espai pedagògic privat.

## Recuperació segura i còpia recuperable

Abans de substituir l'estat local es va descarregar i validar una còpia manual. Els recomptes locals coincidien exactament amb Firebase en les 23 col·leccions existents; Firebase només contenia, a més, la còpia privada d'un qüestionari sociomètric. Amb confirmació explícita es va executar `Recuperar estat` des de la interfície d'AvaluaPro.

Després de la recuperació es van refrescar i sincronitzar les 8 respostes reals de 1r C. El resultat va ser:

- 8 respostes declarades de 8 existents, tant al document públic com a la còpia privada;
- 9 relacions importades al sociograma;
- 1 moment sociomètric nou;
- cap resposta pendent segons l'auditoria;
- qüestionari conservat en estat actiu.

La còpia final posterior a la sincronització és un JSON v2 vàlid de 451.012 bytes, amb SHA-256 `236fadcdc7a365942612adbe322227b6b92b43bd4f94d5c9255eff757954de4d`. No es versiona perquè conté dades reals. Inclou:

- 5 classes;
- 83 alumnes;
- 20 UT;
- 72 competències;
- 168 criteris;
- 7 tasques;
- 12 registres de tasca;
- 8 registres tutorials;
- 130 relacions tutorials;
- 4 moments sociomètrics;
- 5 rols tutorials;
- 12 antecedents.

Per disseny, l'exportació manual posa `sociometricSurveys` a zero: els enllaços i les metadades del qüestionari públic es conserven a Firebase i no al JSON. Les relacions i el moment creats a partir de les respostes sí que entren a la còpia. Abans de modificar aquest àmbit cal mantenir conjuntament el JSON local i la còpia privada del qüestionari a Firebase.

## Mides inicials de compilació

| Recurs | Mida minificada | Mida gzip |
|---|---:|---:|
| JavaScript principal | 1.616,94 kB | 443,61 kB |
| CSS principal | 479,55 kB | 72,79 kB |
| JavaScript auxiliar del navegador | 70,75 kB | 19,70 kB |
| Carpeta `dist` completa | 2,2 MB | — |

El paquet principal supera el llindar de 500 kB de Vite. Programació, Agenda i Mode aula hauran d'utilitzar càrrega diferida i no podran augmentar el paquet inicial de manera indiscriminada.

## Riscos detectats i resolució

### R1 — Pestanyes autenticades amb estats diferents — RESOLT

En dues pestanyes de producció obertes al mateix navegador s'han observat aquests estats simultanis:

- una pestanya: `Sincronitzat`;
- una pestanya: `Revisió necessària — dades locals preservades`.

La diferència corresponia a pestanyes obertes abans de recuperar la còpia privada del qüestionari. La protecció va conservar l'estat local i va impedir una substitució silenciosa. Després de comparar recomptes, recuperar Firebase des de la interfície i recarregar les pestanyes antigues, totes han quedat `Sincronitzat`.

### R2 — Qüestionari amb respostes pendents — RESOLT

L'auditoria inicial informava:

- 1 qüestionari sociomètric actiu de format anterior;
- 8 respostes encara no sincronitzades;
- `readyToDeploy: false`.

S'ha recuperat la còpia privada, s'han refrescat les 8 respostes i s'han sincronitzat des del flux de l'aplicació. L'auditoria final informa `readyToDeploy: true`, `unsyncedResponses: []` i 8 respostes a les dues còpies.

### R3 — Paquet inicial gran — TRASLLADAT A LA ITERACIÓ 2

La compilació és correcta, però el JavaScript principal és monolític. La iteració 2 haurà d'introduir fronteres i càrrega diferida abans d'afegir pantalles grans.

### R4 — Qüestionari actiu de format anterior — AVÍS CONTROLAT

L'auditoria conserva un avís perquè el qüestionari actiu no té tokens individuals del format reforçat. Les seves 8 respostes estan sincronitzades i no hi ha pèrdua de dades. Abans de desplegar unes regles que deixin d'admetre aquest format, caldrà tancar-lo o recrear-lo; l'avís no bloqueja l'inici de la modularització.

## Condicions de tancament de la iteració 1

- [x] Divergència entre pestanyes explicada i resolta sense perdre canvis locals.
- [x] 8 respostes pendents sincronitzades de manera segura.
- [x] Auditoria repetida amb `readyToDeploy: true`.
- [x] Canvi autenticat, confirmació Firebase i càrrega correcta en una pestanya nova.
- [x] Tres pestanyes autenticades recarregades amb el mateix estat final.
- [x] Vista de referència d'iPad comprovada a 1024 × 1366.
- [x] Recomptes finals i còpia recuperable registrats abans de qualsevol canvi estructural.

## Regla de continuació

La iteració 2 pot començar. No s'afegiran col·leccions de Programació o Agenda fins que la carcassa, les fronteres de mòdul i la càrrega diferida quedin demostrades sense alterar els fluxos actuals. Qualsevol reconciliació que pugui substituir dades reals continuarà requerint resum previ de recomptes i decisió explícita del docent.
