# Checklist de desplegament segur de Firebase

Data de preparació: 20 de juny de 2026
Projecte: `avaluapro`
Estat: desplegament, neteja de qüestionaris antics i prova sociomètrica fictícia completats el 22 de juny de 2026

## 1. Situació observada

- Projecte Firebase actiu: `avaluapro`.
- Regió de Firestore: `europe-southwest1`.
- Rules publicades per última vegada: 15 de juny de 2026.
- Ruleset publicat: `projects/avaluapro/rulesets/292827a3-9cd8-40d7-8c50-33e947fb6641`.
- Hosting publicat per última vegada: 16 de juny de 2026.
- Hi ha 3 espais de cotutoria i totes les seves subcol·leccions actuals formen part de la llista permesa per les rules noves.
- Hi ha 10 qüestionaris sociomètrics antics sense tokens ni caducitat.
- 4 qüestionaris antics continuen marcats com a actius.
- Dos qüestionaris contenen 23 i 24 respostes.
- En cadascun d'aquests dos qüestionaris hi ha una resposta posterior a l'última sincronització registrada.

No s'han mostrat ni guardat noms d'alumnes durant l'auditoria. Els identificadors del resum es representen mitjançant hashes curts.

## 2. Acció obligatòria abans del desplegament

Amb l'aplicació actual publicada:

1. entrar amb el compte propietari;
2. obrir els dos qüestionaris amb respostes;
3. clicar `Refrescar respostes`;
4. comprovar que mostren 23 i 24 respostes;
5. clicar `Sincronitzar sociograma` en tots dos;
6. verificar que el recompte sincronitzat també queda en 23 i 24;
7. no eliminar encara cap dada;
8. executar:

```bash
npm run audit:firebase
```

L'auditoria ha de deixar de mostrar qüestionaris amb `actualResponseCount` superior a `declaredResponseCount`.

Incidència confirmada el 21 de juny de 2026:

- el qüestionari de `2n B` s'ha actualitzat correctament de 22 a 23 respostes sincronitzades;
- queda una resposta pendent en un qüestionari de `4t E`;
- aquest qüestionari pertany a un altre compte docent i la còpia compartida de la classe ja no existeix al compte de Marc;
- la resposta correspon a alumnat real i s'ha de preservar;
- el docent propietari ha de refrescar i sincronitzar la resposta 24 abans del desplegament, o cal preparar una recuperació tècnica controlada.

Els qüestionaris antics encara actius es mostren com a avís, no com a bloqueig autònom: les regles reforçades els faran inaccessibles. El bloqueig real és conservar qualsevol resposta encara no sincronitzada.

## 3. Per què hosting i rules s'han de publicar junts

L'aplicació publicada actual crea qüestionaris sense tokens ni caducitat. Les rules noves ja no ho permeten.

La nova aplicació crea documents `accessTokens`, però les rules publicades actualment no permeten aquesta subcol·lecció.

Per tant, publicar només una de les dues parts deixaria temporalment la creació de qüestionaris trencada. El desplegament correcte és:

```bash
npm run test:security
npm run build:firebase
npx firebase deploy --only firestore:rules,hosting --project avaluapro
```

## 4. Efecte esperat del desplegament

Immediatament després de publicar les rules:

- els enllaços sociomètrics antics deixaran de ser accessibles públicament;
- no es podran sobreescriure respostes;
- els qüestionaris nous exigiran token individual, caducitat i lectura de l'avís informatiu;
- els cotutors no podran gestionar membres;
- les subcol·leccions compartides quedaran restringides;
- les eliminacions compartides directes quedaran bloquejades en favor dels tombstones.

## 5. Neteja posterior

La neteja posterior es va completar el 22 de juny de 2026:

1. es van revisar i conservar les relacions sociomètriques ja importades;
2. es van eliminar administrativament els quatre qüestionaris antics que continuaven actius;
3. es va confirmar la desaparició dels qüestionaris, les respostes brutes i els tokens associats;
4. `npm run audit:firebase` va confirmar que no quedava cap qüestionari antic actiu ni cap resposta pendent;
5. es va crear temporalment un qüestionari nou només amb dos alumnes ficticis;
6. es van provar l'aïllament del document general, la no-enumeració dels tokens, la vinculació del token a l'alumne, l'ús únic i la caducitat;
7. es van eliminar totes les dades de la prova fictícia.

La prova es pot repetir de forma controlada amb:

```bash
FIREBASE_WEB_API_KEY="..." \
CONFIRM_PRODUCTION_SMOKE="PROVA SOCIOMETRICA FICTICIA" \
npm run smoke:sociometric:production
```

La clau web de Firebase es passa temporalment a la prova per evitar duplicar-la al repositori. Sense la frase de confirmació, el comandament només mostra el pla i no modifica producció.

## 6. Retorn enrere

No es recomana restaurar automàticament les rules del 15 de juny perquè reobriria vulnerabilitats ja identificades.

En cas d'error:

1. tancar temporalment la creació de qüestionaris;
2. conservar les rules restrictives;
3. corregir l'app o les rules amb una versió nova;
4. repetir les proves d'emulador;
5. fer un desplegament correctiu.

El ruleset anterior queda identificat en aquest document només com a referència d'auditoria.

## 7. Comprovacions finals

- [x] El qüestionari de `2n B` ha quedat sincronitzat amb 23 respostes.
- [x] El qüestionari orfe `733e3088e6` s'ha suprimit administrativament amb confirmació explícita: 24 respostes brutes eliminades, cap token i 141 relacions ja importades conservades.
- [x] `npm run audit:firebase` no detecta respostes pendents.
- [x] `npm run test:security` passa: 26 proves de rules i 5 de sincronització.
- [x] `npm run build:firebase` passa.
- [x] S'ha publicat hosting i rules en una sola operació.
- [x] Ruleset publicat: `projects/avaluapro/rulesets/7eb98fe3-1d89-4e35-a4fd-fe41937ebc85`.
- [x] El hash de les rules publicades coincideix amb el fitxer local.
- [x] S'ha provat en producció amb dades exclusivament fictícies i s'han eliminat les dades de prova.
- [x] S'han eliminat els tres qüestionaris antics restants que encara constaven actius però ja no eren accessibles públicament.
- [x] S'ha registrat la data i el resultat del desplegament.
