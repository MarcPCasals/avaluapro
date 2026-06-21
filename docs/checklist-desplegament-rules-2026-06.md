# Checklist de desplegament segur de Firebase

Data de preparació: 20 de juny de 2026
Projecte: `avaluapro`
Estat: desplegament bloquejat fins a completar la sincronització de qüestionaris antics

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

Des de la nova versió de l'app:

1. revisar que les relacions i moments sociomètrics sincronitzats existeixen;
2. utilitzar `Eliminar dades brutes` per als 10 qüestionaris antics;
3. confirmar que desapareixen qüestionari, respostes i qualsevol token;
4. tornar a executar `npm run audit:firebase`;
5. crear un qüestionari nou només amb alumnes ficticis;
6. provar token correcte, reutilitzat i caducat;
7. eliminar les dades de prova.

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

- [ ] Les 47 respostes brutes existents han estat sincronitzades.
- [ ] `npm run audit:firebase` no detecta respostes pendents.
- [ ] `npm run test:security` passa.
- [ ] `npm run build:firebase` passa.
- [ ] S'ha publicat hosting i rules en una sola operació.
- [ ] S'ha provat amb dades fictícies.
- [ ] S'han eliminat els qüestionaris antics.
- [ ] S'ha registrat la data i el resultat del desplegament.
