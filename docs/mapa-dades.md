# Mapa de dades d'Avaluapro

Data d'actualitzacio: 21 de juny de 2026
Estat: inventari tecnic actualitzat; decisions juridiques i terminis finals pendents

Aquest document identifica que tracta Avaluapro, on es guarda, amb qui es comparteix i quin risc presenta. No substitueix el registre d'activitats, l'AIPD ni la validacio institucional.

## 1. Principi de tractament

Avaluapro es un quadern docent, no un sistema anonimitzat. Necessita relacionar dades educatives amb alumnes concrets. Els noms, codis, qualificacions i observacions continuen sent dades personals mentre es puguin vincular a una persona.

El criteri de disseny es:

- guardar nomes dades necessaries per a una finalitat docent;
- limitar text lliure, fotos i dades especialment delicades;
- separar espais privats i compartits;
- no duplicar calculs regenerables;
- fer exportables i eliminables les dades;
- documentar riscos i conservacio.

## 2. Ubicacions

| Ubicacio | Contingut | Risc principal |
| --- | --- | --- |
| IndexedDB | Copia local completa de treball. | Dispositiu compartit, perdut o sense xifratge. |
| Firestore `users/{uid}` | Dades privades sincronitzades del docent. | Compromis del compte o configuracio incorrecta. |
| `cloudBackups` | Copies completes o gairebe completes. | Acumulacio i restauracio o exportacio indeguda. |
| `teacherGradePackages` | Notes enviades a un docent concret. | Destinatari equivocat o conservacio excessiva. |
| `tutoringSpaces` | Dades tutorials persistents entre membres. | Acces excessiu, revocacio, conflictes i copies locals. |
| Safates d'invitacions | Correus, UID, classe, estat i dates. | Revelacio de relacions professionals i errors de destinatari. |
| `sociometricSurveys` | Qüestionari, tokens i respostes brutes temporals. | Relacions socials de menors i accés mitjançant enllac. |
| JSON descarregat | Backup o exportacio fora de l'app. | La custodia passa al dispositiu i al docent. |

## 3. Col.leccions locals i privades

```text
classes
students
semesters
uts
competencies
criteria
indicators
marks
tasks
taskRecords
behaviorEvents
agendaNotes
tutorialRecords
tutorialMarks
tutorialRelations
tutorialGroupSets
tutorialSociometricMoments
tutorialSociogramLayouts
tutorialStudentRoles
tutorialSeatingPlans
seatingCharts
studentAntecedents
sociometricSurveys
```

## 4. Categories de dades

| Ambit | Exemples | Finalitat | Sensibilitat | Criteri |
| --- | --- | --- | --- | --- |
| Identificacio | Nom, classe, mig grup, foto | Identificar i organitzar alumnat | Alta | Nom necessari; foto opcional. |
| Avaluacio | Notes, competencies, criteris, rubriques | Avaluar i preparar retorn | Alta | Evitar duplicar resultats calculables. |
| Habits | Tasques, lliuraments, constancia | Seguiment de treball | Mitjana-alta | Diferenciar absencia de dades de resultat negatiu. |
| Conducta | Incidencies, agenda, observacions | Intervencio educativa | Molt alta | Fets observables, breus i accionables. |
| Necessitats educatives | Diagnostics o etiquetes, adaptacions | Ajustar l'accio docent | Molt alta | Etiquetes controlades; evitar detalls clinics. |
| Tutoria | DOIPs, acords, registres, antecedents | Seguiment tutorial | Molt alta | No copiar historials extensos ni dades familiars innecessaries. |
| Sociometria | Afinitats, dificultats, rols, sociograma | Comprendre dinamiques de grup | Molt alta | Acces restringit, temporalitat i explicacio de la finalitat. |
| Agrupaments | Grups cooperatius i disposicions | Suport a decisions docents | Alta | Recomanacio, no decisio automatica. |
| Comparticio | Paquets de notes i cotutories | Coordinacio entre docents | Molt alta | Destinatari, rol, revocacio i minim privilegi. |
| Seguretat | Backups, metadades i dates | Recuperacio i continuitat | Molt alta | Conservacio limitada i prova de restauracio. |
| Compte docent | Correu, UID, nom i preferencies | Identitat i personalitzacio | Mitjana | No usar el correu com a unica autoritzacio futura. |

## 5. Dades compartides

### Paquets de notes

Han d'incloure nomes la informacio necessaria per importar notes finals: emissor, destinatari, classe, materia, alumnes i resultats. No han d'incorporar comentaris tutorials o diagnostics.

### Cotutories

Poden compartir:

- alumnes;
- registres i notes tutorials;
- relacions i moments sociometrics;
- grups cooperatius;
- layouts i disposicions;
- rols;
- antecedents.

Les eliminacions utilitzen tombstones per sincronitzar la baixa sense conservar el contingut pedagogic sensible. La revocacio talla la sincronitzacio futura, pero no pot retirar copies o exportacions ja obtingudes.

### Sociometria publica temporal

El document general no es public. Cada participant rep un token aleatori que:

- no es pot enumerar;
- fixa la identitat de resposta;
- caduca al cap de 24 hores;
- nomes permet crear una resposta;
- exigeix acreditar la lectura de l'avís.

Les dades brutes s'han d'eliminar despres de sincronitzar-les. La purga automatica esta implementada i provada amb emulador, pero encara no esta desplegada ni activada.

## 6. Dades que s'han d'evitar

- historial clinic o familiar detallat;
- situacio economica o personal sense necessitat docent;
- judicis subjectius o etiquetes estigmatitzants;
- text lliure extens quan una categoria o resum sigui suficient;
- fotos duplicades;
- backups indefinits;
- respostes sociometriques brutes conservades sense finalitat;
- dades oficials importades sense acord i font institucional.

## 7. Dades calculables

No cal guardar de manera duplicada:

- mitjanes i percentatges;
- perfils i alertes derivades;
- comparatives entre periodes;
- recomanacions de grups;
- estadistiques globals;
- indicadors de millora o regressio.

S'han de poder regenerar a partir dels registres base, sempre que sigui tecnicament raonable.

## 8. Conservacio

Els terminis definitius depenen del Ministeri. La proposta preliminar es troba a `docs/politica-conservacio-eliminacio-preliminar.md`.

Abans d'un pilot cal decidir, com a minim:

- final de curs i canvi de docent;
- vigencia de paquets i invitacions;
- retencio de backups;
- purga de respostes sociometriques;
- bloqueig per obligacio legal;
- retorn i eliminacio en acabar el servei.

## 9. Conclusio

La dada de major risc no es nomes el nom. El risc apareix en combinar identitat amb rendiment, conducta, necessitats educatives, tutoria i relacions socials. La separacio d'identitat pot reduir l'impacte d'una filtracio, pero no converteix aquestes dades en anonimes si Avaluapro o el docent poden reidentificar l'alumne.
