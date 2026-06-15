# Checkpoint: Qüestionari Sociomètric Intern D'Avaluapro

Data del checkpoint: 15 de juny de 2026

## Objectiu

Crear un qüestionari sociomètric propi dins d'Avaluapro perquè el tutor pugui:

1. Crear un qüestionari per a una classe de tutoria.
2. Generar un enllaç únic per classe.
3. Enviar l'enllaç als alumnes.
4. Permetre que els alumnes responguin sense iniciar sessió.
5. Guardar les respostes directament a Firebase.
6. Convertir les respostes en relacions del sociograma d'Avaluapro.

El flux desitjat és:

```text
Tutor -> Crear qüestionari -> Copiar enllaç -> Alumnes responen -> Avaluapro rep respostes -> Tutor sincronitza -> Sociograma actualitzat
```

## Decisió Important

El flux principal NO ha de ser Google Forms ni Google Sheets.

Google Forms, Google Sheets, Excel o enganxar dades manualment poden quedar com a pla B, però la solució bona és un formulari propi d'Avaluapro.

## Per Què Fem Això

L'objectiu és que sigui usable per qualsevol docent sense feina tècnica:

- no crear formularis cada any;
- no copiar llistes d'alumnes a mà;
- no tocar Apps Script;
- no descarregar i pujar Excel si no cal;
- no fer que l'alumnat escrigui noms manualment;
- evitar errors de format en noms d'alumnes.

## Estat Actual Del Projecte

El projecte ja té:

- mode tutoria;
- mapa de relacions / sociograma;
- relacions positives, afinitats i relacions a evitar;
- importació manual de respostes sociomètriques enganxades des d'un full de càlcul;
- generador de grups cooperatius;
- disposició d'aula;
- Firebase i Firestore rules;
- compartició de tutoria entre cotutors;
- estructura de dades modular amb IndexedDB i Firebase.

El projecte encara NO té completament implementat:

- creació d'un qüestionari sociomètric propi;
- ruta pública perquè responguin alumnes sense login;
- guardat directe de respostes del qüestionari a Firebase;
- sincronització automàtica d'aquestes respostes cap al sociograma;
- rules específiques per respondre qüestionaris públics amb token/enllaç.

## Fases D'Implementació

### Fase 1: Model De Dades

Crear una col·lecció nova per als qüestionaris sociomètrics.

Proposta:

```text
sociometricSurveys
```

Cada qüestionari hauria de guardar:

- `id`
- `classId`
- `className`
- `ownerUid`
- `ownerEmailLower`
- `createdAt`
- `updatedAt`
- `status`: `active` o `closed`
- `positiveLimit`: normalment 4
- `avoidLimit`: normalment 3
- `studentOptions`: llista mínima d'alumnes per respondre
- `responseCount`
- `lastSyncedAt`

Cada resposta pot viure com a subcol·lecció:

```text
sociometricSurveys/{surveyId}/responses/{responseId}
```

Cada resposta hauria de guardar:

- `surveyId`
- `classId`
- `studentId`
- `studentName`
- `positiveStudentIds`
- `avoidStudentIds`
- `submittedAt`

Important: no cal guardar cap dada docent privada dins del formulari públic.

### Fase 2: Firebase I Rules

Cal afegir funcions a `src/lib/firebase.js` per:

- crear un qüestionari;
- llegir un qüestionari públic actiu;
- enviar una resposta;
- llistar respostes per al docent propietari o cotutor;
- actualitzar metadades de sincronització.

Cal ajustar `firestore.rules`.

Objectiu de seguretat:

- qualsevol alumne amb l'enllaç pot llegir només el qüestionari concret i actiu;
- els alumnes poden crear o actualitzar només una resposta d'aquell qüestionari;
- ningú pot llistar tots els qüestionaris;
- ningú pot veure altres dades d'Avaluapro;
- només el docent propietari o membres de la tutoria poden llegir les respostes.

Primera versió viable:

- accés públic per enllaç al qüestionari actiu;
- sense login d'alumne;
- sense tokens individuals per alumne.

Millora futura opcional:

- token individual per alumne;
- codi curt de resposta;
- evitar que un alumne pugui respondre com un altre si coneix l'enllaç.

### Fase 3: Pantalla Pública De Resposta

Crear una pantalla pública dins d'Avaluapro.

Ruta proposada:

```text
https://avaluapro.web.app/?sociometric=ID_DEL_QUESTIONARI
```

També es pot plantejar més endavant:

```text
https://avaluapro.web.app/sociograma/ID_DEL_QUESTIONARI
```

La primera opció és més senzilla amb l'estructura actual de Vite/Firebase Hosting.

La pantalla ha de permetre:

1. Carregar el qüestionari.
2. Mostrar el nom de la classe.
3. Fer que l'alumne triï el seu nom d'una llista.
4. Triar 4 companys/companyes amb qui li agrada estar o treballar.
5. Triar 3 companys/companyes amb qui li costa estar o treballar.
6. Evitar que es triï a si mateix.
7. Evitar duplicats entre triats.
8. Confirmar abans d'enviar.
9. Mostrar missatge final de resposta registrada.

Text orientatiu per a l'alumne:

```text
Aquest qüestionari ajuda el tutor/a a entendre millor les relacions del grup.
Respon amb sinceritat i respecte.
Les respostes serviran per millorar grups, disposicions i convivència.
```

### Fase 4: Interfície Del Tutor

Al mode tutoria, dins de Relacions / Sociograma:

- targeta "Qüestionari sociomètric";
- botó "Crear qüestionari";
- mostrar enllaç generat;
- botó "Copiar enllaç";
- botó "Obrir enllaç";
- botó "Sincronitzar respostes";
- mostrar nombre de respostes rebudes;
- conservar "Importar des d'Excel/Sheets" com a pla B.

El flux visual ha de deixar clar:

```text
Flux recomanat: crear enllaç i enviar-lo als alumnes.
Pla B: enganxar respostes des d'un full de càlcul.
```

### Fase 5: Sincronització Amb El Sociograma

Quan el tutor cliqui "Sincronitzar respostes":

1. Llegir respostes del qüestionari.
2. Convertir cada elecció positiva en relació `positive`.
3. Convertir cada rebuig en relació `avoid`.
4. Guardar-les a `tutorialRelations`.
5. Evitar duplicats si se sincronitza més d'una vegada.
6. Actualitzar `responseCount`, `importedRelationCount` i `lastSyncedAt`.

Important:

- no destruir relacions manuals del professor;
- no duplicar fletxes;
- conservar l'origen de la relació.

Proposta de camps per relació generada:

```js
{
  classId,
  sourceStudentId,
  targetStudentId,
  type: 'positive' | 'avoid',
  strength: 2,
  source: 'sociometric-public-form',
  sourceLabel: 'Qüestionari públic',
  importedAt
}
```

### Fase 6: Verificació

Comprovar:

- `npm run build`
- formulari públic obre sense login;
- no es carrega tota l'app docent en mode formulari;
- un alumne pot respondre;
- les respostes apareixen a Firebase;
- el tutor pot sincronitzar;
- el sociograma mostra les noves relacions;
- no es dupliquen relacions si se sincronitza dues vegades;
- Firebase rules no obren dades privades.

### Fase 7: Deploy I Git

Quan estigui verificat:

```bash
npm run build
firebase deploy --only firestore:rules,hosting
git status
git add ...
git commit -m "Afegeix qüestionari sociomètric intern"
git push origin HEAD:main
```

## Fitxers Probables A Tocar

```text
src/App.jsx
src/lib/firebase.js
src/store/useAvaluaproStore.js
src/features/tutoring/TutoringView.jsx
src/features/tutoring/SociometricPublicForm.jsx
src/data/seedData.js
src/db/indexedDb.js
src/App.css
firestore.rules
docs/dev/QUESTIONARI-SOCIOMETRIC-CHECKPOINT.md
```

## Regles De Treball Per Evitar Bucle

1. No tornar a reanalitzar tota la conversa antiga.
2. Llegir primer aquest document.
3. Mirar `git status`.
4. Treballar fase per fase.
5. Actualitzar aquest checkpoint després de cada fase important.
6. Fer commit quan una fase sigui estable.
7. Si hi ha compactació de context, reprendre des d'aquest document.

## Ordre Recomanat Per A La Propera Conversa

Missatge inicial recomanat:

```text
Llegeix docs/dev/QUESTIONARI-SOCIOMETRIC-CHECKPOINT.md i continua amb la Fase 1 del qüestionari sociomètric intern d'Avaluapro. No tornis a Google Forms ni Google Sheets com a flux principal.
```

## Punt Clau

No estem fent un formulari de Google.

Estem fent un formulari propi d'Avaluapro.

