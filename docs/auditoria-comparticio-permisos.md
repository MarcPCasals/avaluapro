# Auditoria de comparticio i matriu de permisos

Data: 19 de juny de 2026
Estat: primera auditoria interna completada; primer paquet de correccions verificat localment

## 1. Objectiu

Aquest document compara:

- que permet actualment Avaluapro;
- quins riscos genera;
- quin model de permisos es recomana;
- quines correccions s'han de fer abans d'un pilot institucional.

L'auditoria cobreix:

- paquets de notes;
- cotutories compartides;
- invitacions;
- qüestionaris sociometrics publics.

No substitueix una auditoria externa ni una revisio juridica.

## 2. Model de rols recomanat

### Propietari de la tutoria

Es el docent que crea l'espai compartit.

Pot:

- consultar i editar les dades tutorials;
- convidar cotutors;
- retirar cotutors;
- veure la llista de membres;
- tancar o eliminar l'espai;
- gestionar la configuracio general;
- resoldre el final de curs i l'eliminacio.

### Cotutor

Es un docent que ha rebut i acceptat una invitacio.

Pot:

- consultar les dades tutorials necessaries;
- crear i editar registres tutorials;
- treballar amb notes, relacions, grups i disposicions;
- sincronitzar els seus canvis;
- abandonar l'espai, quan aquest flux existeixi.

No pot:

- convidar altres persones;
- canviar rols;
- retirar altres membres;
- transferir la propietat;
- eliminar l'espai complet;
- modificar la configuracio reservada al propietari.

### Participant d'un qüestionari sociometric

Es l'alumne que respon el formulari.

Pot:

- consultar exclusivament la informacio necessaria per respondre;
- enviar una resposta dins del periode actiu.

No hauria de poder:

- consultar respostes;
- modificar respostes d'altres alumnes;
- respondre repetidament sense control;
- utilitzar indefinidament un enllac caducat.

## 3. Matriu actual

| Espai | Actor | Llegir | Crear | Modificar | Eliminar | Valoracio |
| --- | --- | --- | --- | --- | --- | --- |
| `users/{uid}` | Propietari del `uid` | Si | Si | Si | Si | Correcte per al model personal. |
| `users/{uid}` | Altre docent | No | No | No | No | Correcte. |
| `teacherGradePackages` | Emissor | Si | Si | No | Si | Coherent amb l'enviament puntual. |
| `teacherGradePackages` | Destinatari | Si | No | Nomes confirmacio d'importacio | No | Coherent, pendent de proves. |
| `teacherGradePackages` | Tercer | No | No | No | No | Correcte segons les rules. |
| Document `tutoringSpaces/{spaceId}` | Propietari | Si | Si | Si | Si | Correcte en termes generals. |
| Document `tutoringSpaces/{spaceId}` | Cotutor | Si | No | Si, inclosa la llista de membres | No | Risc alt. |
| Subcol.leccions de `tutoringSpaces` | Qualsevol membre | Si | Si | Si | Si | Massa ampli per a dades molt sensibles. |
| Invitacio d'entrada | Emissor | Si | Si | Pot marcar-la com a vista | Si | Pendent de proves de coherencia. |
| Invitacio d'entrada | Destinatari | Si | No | Acceptar o rebutjar | Si | Coherent en principi. |
| Invitacio de sortida | Emissor | Si | Si | Marcar resposta com a vista | Si | Coherent en principi. |
| Invitacio de sortida | Destinatari | No per lectura directa | No | Pot registrar la resposta | No | Flux tecnic peculiar; cal provar-lo. |
| Qüestionari actiu | Qualsevol persona amb identificador | Si | No | No | No | Exposa la llista necessaria per al formulari, inclosos noms. |
| Respostes sociometriques | Persona amb identificador actiu | No | Si | Si | No | Risc molt alt de duplicacio o substitucio. |
| Respostes sociometriques | Docent membre | Si | No | No | Si | Els membres poden eliminar respostes. |

## 4. Matriu objectiu

| Espai o accio | Propietari | Cotutor | Alumne/formulari | Tercer |
| --- | --- | --- | --- | --- |
| Llegir dades tutorials compartides | Si | Si | No | No |
| Crear i editar registres tutorials | Si | Si | No | No |
| Eliminar registres tutorials | Si | Si, amb criteri per definir | No | No |
| Convidar membres | Si | No | No | No |
| Retirar membres | Si | No | No | No |
| Modificar rols | Si | No | No | No |
| Canviar propietari | No directament; flux formal futur | No | No | No |
| Eliminar l'espai | Si | No | No | No |
| Abandonar l'espai | No aplicable o transferencia previa | Si | No | No |
| Consultar formulari sociometric | Si | Si | Nomes mentre sigui valid | No sense enllac valid |
| Enviar resposta sociometrica | No necessari | No necessari | Una resposta controlada | No |
| Llegir respostes sociometriques | Si | Si, si esta autoritzat | No | No |
| Eliminar respostes | Si | Pendent de decidir | No | No |
| Tancar el qüestionari | Si | Pendent de decidir | No | No |
| Eliminar el qüestionari | Si | No | No | No |

## 5. Troballes

### C1. Un cotutor pot modificar membres

Severitat: critica abans d'un us institucional.

Estat a 19/06/2026: corregit a les rules locals i cobert per proves automatitzades. Pendent de desplegament.

Les rules permeten que qualsevol membre actualitzi:

- `memberEmails`;
- `memberUids`;
- `members`.

La condicio principal es que l'usuari que escriu continuï apareixent com a membre despres del canvi. Aixo podria permetre que un cotutor afegeixi altres persones sense seguir el flux d'invitacio.

Correccio:

- reservar els canvis de membres al propietari;
- mantenir una excepcio estricta per al destinatari que accepta una invitacio valida;
- validar que l'acceptacio nomes afegeix el mateix destinatari i no altera altres membres.

### C2. Les subcol.leccions accepten qualsevol nom

Severitat: alta.

Estat a 19/06/2026: corregit a les rules locals i cobert per proves automatitzades. Pendent de desplegament.

La regla:

```text
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
```

permet qualsevol valor de `collectionName`. Un membre podria crear col.leccions no previstes.

Correccio:

- limitar les subcol.leccions a la llista exacta utilitzada per Avaluapro;
- denegar qualsevol altra subcol.leccio.

### C3. Qualsevol membre pot eliminar qualsevol document compartit

Severitat: alta.

Abans de la correccio, tots els membres tenien `delete` sobre totes les subcol.leccions tutorials. Aixo incloia registres, relacions, notes, perfils i antecedents.

Estat a 20/06/2026: corregit localment amb tombstones i proves automatitzades. Pendent de prova amb dos comptes reals i desplegament.

Correccio:

- les rules bloquegen qualsevol `delete` fisic directe en subcol.leccions compartides;
- una eliminacio explicita substitueix el document per un tombstone minim;
- el tombstone conserva identificador, data i autoria, pero elimina el contingut pedagogic sensible;
- els altres dispositius eliminen la seva copia activa quan reben un tombstone mes recent;
- un tombstone antic no elimina una edicio posterior;
- els tombstones es mantenen fins al tancament o eliminacio administrativa de l'espai compartit.

Fluxos coberts:

- registres tutorials;
- relacions;
- notes tutorials eliminades deixant-les en blanc;
- grups cooperatius guardats;
- layouts de sociograma reiniciats;
- rols tutorials desactivats;
- antecedents;
- eliminacio d'alumnes i dels seus registres tutorials directament associats.

Quan s'elimina un alumne:

- s'eliminen registres, notes, relacions, rols i antecedents associats;
- s'actualitzen grups, moments sociometrics, layouts i disposicions;
- es tanquen els qüestionaris sociometrics publics actius que encara inclouen l'alumne;
- el document public tancat deixa de ser accessible sense autenticacio.

### C4. No hi ha revocacio ni sortida implementades

Severitat: alta.

Estat a 20/06/2026: corregit localment i cobert per proves automatitzades. Pendent de prova amb dos comptes reals i desplegament.

No s'ha trobat cap flux per:

- retirar un cotutor;
- abandonar voluntariament una tutoria;
- tancar l'espai compartit.

Quan es retira un membre, tambe s'ha de considerar que pot conservar dades que ja s'hagin sincronitzat al seu IndexedDB o espai personal.

Correccio:

- el propietari pot retirar un cotutor;
- el cotutor pot abandonar l'espai retirant-se nomes a si mateix;
- la invitacio acceptada s'elimina abans de retirar l'acces per impedir la reentrada;
- la classe del cotutor queda desvinculada de la sincronitzacio compartida;
- les dades ja sincronitzades es conserven localment i l'app ho informa explicitament;
- una revocacio no pot esborrar exportacions o copies externes ja realitzades.

### C5. El formulari public exposa noms d'alumnes

Severitat: alta.

Un qüestionari actiu es pot carregar sense autenticacio i el document inclou `studentOptions` amb identificadors i noms.

No es necessariament il.licit si esta justificat i controlat, pero l'enllac actua com a unica barrera d'acces.

Correccio:

- utilitzar identificadors d'enllac llargs, aleatoris i no predictibles;
- incorporar caducitat;
- valorar noms reduits o codis temporals si la dinamica ho permet;
- mostrar nomes les dades imprescindibles;
- informar els participants de la finalitat.

### C6. Una resposta sociometrica es pot sobreescriure

Severitat: critica abans d'utilitzar alumnes reals.

Estat a 19/06/2026: l'actualitzacio publica ha estat bloquejada a les rules locals i coberta per proves automatitzades. Pendent de desplegament.

Les rules permeten `create` i `update` publics mentre el qüestionari esta actiu. El client utilitza habitualment un identificador relacionat amb l'alumne per construir el document de resposta.

Una persona que conegui o dedueixi l'identificador podria modificar una resposta anterior.

Correccio:

- no permetre `update` public;
- generar un token de resposta aleatori o un mecanisme d'un sol us;
- separar identitat mostrada i identificador del document;
- definir com es corregeix legitimament una resposta;
- impedir respostes duplicades o registrar-les per a revisio.

### C7. No hi ha caducitat automatica del qüestionari

Severitat: alta.

L'estat pot canviar entre `active` i `closed`, pero no hi ha una data de caducitat aplicada per les rules.

Correccio:

- afegir `expiresAt`;
- validar la caducitat a les rules;
- tancar automaticament o manualment el formulari despres de la sessio;
- definir eliminacio de respostes.

### C8. Les proves automatitzades de rules no existeixen

Severitat: alta per al creixement del producte.

Estat a 19/06/2026: resolt per al primer conjunt de casos.

El projecte inclou:

- Firebase Emulator configurat per a proves;
- `@firebase/rules-unit-testing`;
- script `npm run test:rules`;
- dinou proves de rules sobre lectura, membres, invitacions, revocacio, sortida, tombstones, subcol.leccions i respostes sociometriques;
- cinc proves pures sobre fusio i versions de tombstones;
- execucio local correcta de les vint-i-quatre proves.

Encara cal ampliar la cobertura a paquets de notes, eliminacions, revocacio, caducitat i casos limits addicionals.

## 6. Decisions provisionals

Fins que el Ministeri o l'assessor indiquin una altra cosa:

1. El creador de la cotutoria sera el propietari.
2. Nomes el propietari gestionara membres, rols i eliminacio de l'espai.
3. Els cotutors podran llegir i editar dades tutorials.
4. La capacitat dels cotutors per eliminar registres es revisara per tipus de dada.
5. Les subcol.leccions permeses quedaran enumerades explicitament.
6. Les respostes sociometriques publiques no es podran sobreescriure.
7. Els qüestionaris tindran caducitat.
8. Cap correccio de rules es publicara sense proves automatitzades i proves amb dades ficticies.

## 7. Ordre de correccio

1. ~~Preparar Firebase Emulator i les proves de rules.~~ Fet localment.
2. ~~Escriure les primeres proves dels riscos actuals.~~ Fet: 24 proves.
3. ~~Restringir la gestio de membres al propietari i a l'acceptacio controlada.~~ Fet localment.
4. ~~Enumerar les subcol.leccions compartides permeses.~~ Fet localment.
5. ~~Definir i aplicar permisos d'eliminacio.~~ Fet localment amb tombstones; prova real pendent.
6. ~~Implementar revocacio i sortida.~~ Fet localment; prova real pendent.
7. ~~Bloquejar l'actualitzacio publica de respostes sociometriques.~~ Fet localment.
8. Afegir caducitat i tokens adequats al formulari.
9. Repetir proves manuals amb dos comptes docents i alumnes ficticis.
10. Actualitzar el dossier amb el resultat verificat.

## 8. Verificacio local actualitzada el 20 de juny de 2026

Comandes:

```bash
npm run test:rules
npm run lint
npm run build
```

Resultats:

- 19 proves de rules superades;
- 5 proves de fusio de dades compartides superades;
- lint correcte en tots els fitxers modificats;
- el lint global continua bloquejat per tres avisos no relacionats a `TutoringView.jsx`;
- build de produccio correcte;
- avis no bloquejant per la mida del chunk principal;
- cap vulnerabilitat alta pendent despres de `npm audit fix`;
- cinc avisos moderats transitius de Firebase CLI, sense correccio no trencadora disponible;
- rules encara no desplegades a Firebase.
