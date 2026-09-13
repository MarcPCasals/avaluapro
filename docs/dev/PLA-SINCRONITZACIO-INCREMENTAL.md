# Pla de sincronització incremental d’Avaluapro

Data de planificació: 9 de setembre de 2026
Estat: fases 1 i 2 implementades i publicades; pendent de validació real i observació de mètriques

Actualització de l'11 de setembre: la quota es va reiniciar correctament, però les respostes tutorials continuaven sent rebutjades. S'han corregit dos punts independents: el netejador de dades ja no transforma `serverTimestamp()` en un objecte ordinari en la compilació de producció, i les regles de Firestore s'han republicat amb l'esquema complet actual del formulari, incloses les amistats de classe i del centre. Les 39 proves de regles passen; només resta confirmar un enviament real des del formulari públic.

Actualització del 12 de setembre: s'ha implementat i publicat la fase 2. La cua de sincronització ara és persistent a IndexedDB, queda separada per `uid` i conserva una única operació final per document. Firebase rep directament els documents pendents, sense rellegir la col·lecció completa; una confirmació antiga no pot eliminar una edició posterior. Els errors de xarxa es reintenten amb espera progressiva, els errors de quota queden aturats durant una hora i la interfície mostra el nombre real de canvis pendents. La migració de la base local, la persistència, les eliminacions, la separació de comptes i la regressió de seguretat han passat les proves automatitzades. Encara cal validar el comportament amb un compte real i observar les mètriques durant un o dos dies.

## 1. Motiu del canvi

El 9 de setembre de 2026, Firestore va rebutjar noves escriptures amb l’error `RESOURCE_EXHAUSTED: Quota exceeded`. El projecte és al pla gratuït de Firebase i comparteix la quota entre tots els docents que fan servir Avaluapro.

Les mètriques observades aquell dia van mostrar dos pics:

- 5.656 escriptures;
- 14.390 escriptures;
- total dels dos pics: 20.046 escriptures.

Els intents d’enviar el formulari tutorial no van causar aquest consum: una resposta correcta només necessita una escriptura. El consum principal prové de la sincronització general i de les còpies completes al núvol.

## 2. Diagnòstic de la implementació actual

### 2.1. Sincronització ordinària

`persistCollections()` desa localment les col·leccions afectades i, si hi ha una sessió de Firebase, les posa a la cua de sincronització.

Després de 2,5 segons, `flushQueuedCloudSync()` crida `saveCloudCollections()`. Aquesta funció envia cada col·lecció a `replaceCloudCollection()`.

Actualment, `replaceCloudCollection()`:

1. llegeix tots els documents remots de la col·lecció;
2. detecta els documents remots que ja no existeixen localment;
3. prepara correctament les eliminacions;
4. torna a preparar una escriptura per a totes les files locals, encara que siguin idèntiques a les remotes;
5. executa totes les operacions en lots.

Per tant, modificar un sol alumne pot tornar a escriure tota la col·lecció d’alumnes. El mateix passa amb notes, tasques, registres tutorials i altres dades.

### 2.2. Còpies automàtiques

En iniciar Avaluapro amb una sessió activa, `maybeCreateDailyCloudBackup()` pot crear una còpia completa diària. `saveCloudBackup()` duplica al núvol totes les files de les 23 col·leccions.

També hi ha dos camins d’inicialització que poden demanar la còpia diària gairebé simultàniament. Encara que les preferències intenten limitar-la a una còpia per dia, existeix risc de solapament mentre la primera còpia encara no ha acabat.

### 2.3. Pujada completa

`pushAllToCloud()` recorre totes les col·leccions i les torna a enviar completament. Aquesta operació és útil per a una restauració excepcional, però és massa costosa per presentar-la com una operació habitual.

### 2.4. Tutoria compartida

La tutoria compartida utilitza un sistema propi de versions, autoria, conflictes i tombstones. Aquest circuit no s’ha de substituir ni simplificar amb la primera correcció. La sincronització personal i la sincronització de l’espai compartit s’han de continuar tractant separadament.

## 3. Objectius

La nova sincronització ha de complir aquests objectius:

1. Escriure només els documents nous o realment modificats.
2. Eliminar només els documents que realment s’han suprimit.
3. Fer zero escriptures quan les dades locals i remotes són idèntiques.
4. Agrupar diverses modificacions consecutives del mateix document en una sola escriptura final.
5. Conservar localment qualsevol canvi que Firebase encara no hagi acceptat.
6. No mostrar l’estat `Sincronitzat` mentre hi hagi operacions pendents.
7. Evitar reintents continus quan s’hagi esgotat la quota o no hi hagi connexió.
8. Reservar la substitució completa del núvol per a restauracions explícites.
9. Mantenir la compatibilitat amb les dades actuals i amb les regles de Firestore.
10. No alterar el sistema de conflictes de la cotutoria compartida.

## 4. Fora d’abast

En aquest bloc no es preveu:

- canviar de Firebase a un altre proveïdor;
- activar un pla de pagament;
- eliminar còpies antigues del núvol;
- modificar el contingut pedagògic de les col·leccions;
- fusionar automàticament dues edicions simultànies del mateix camp fetes des de dispositius diferents;
- canviar les regles d’accés de tutors, cotutors o formularis públics.

Qualsevol eliminació de còpies o dades existents requerirà una actuació separada, amb inventari i confirmació prèvia.

## 5. Principis de seguretat

### 5.1. Primer local, després núvol

IndexedDB continuarà sent el primer lloc on es desa una modificació. Una fallada de Firebase no ha d’eliminar el canvi local.

### 5.2. Cap eliminació deduïda de manera ambigua

Només s’enviarà una eliminació quan la comparació confirmi que un identificador abans existent ha desaparegut de la col·lecció local. No s’interpretarà una col·lecció parcial, una càrrega incompleta o un error de lectura com una ordre d’eliminació.

### 5.3. Operacions vinculades a l’usuari

Les cues pendents han d’estar associades al `uid` del docent. Un canvi pendent d’un compte no es pot enviar des d’un altre compte iniciat al mateix dispositiu.

### 5.4. Estat honest

La interfície ha de distingir:

- `Desat al dispositiu`;
- `Pendent de sincronitzar`;
- `Sincronitzant`;
- `Sincronitzat`;
- `Sense connexió`;
- `Quota de Firebase esgotada`;
- `Error que requereix revisió`.

### 5.5. Restauració explícita

Una restauració completa haurà de mostrar un resum previ de classes, alumnes, notes, tasques i altres registres. No s’executarà com a conseqüència d’una edició ordinària.

## 6. Fase 1 — Reducció immediata d’escriptures

Objectiu: protegir la càrrega de dades dels pròxims dies amb una modificació petita, verificable i reversible.

### 6.1. Comparació remota abans d’escriure

Es modificarà `replaceCloudCollection()` perquè construeixi dos mapes per identificador:

- documents locals normalitzats;
- documents remots normalitzats.

Per a cada identificador:

- només local → `set`;
- local i remot diferents → `set`;
- local i remot idèntics → cap operació;
- només remot → `delete`.

La comparació haurà de ser estructural i estable. No s’utilitzarà una comparació dependent de l’ordre casual de les propietats. També s’hauran de normalitzar correctament dates i valors retornats per Firestore.

### 6.2. Resultat auditable

Cada sincronització retornarà, per col·lecció:

- documents llegits;
- documents creats o actualitzats;
- documents eliminats;
- documents ignorats perquè eren idèntics.

Aquest resum servirà per a les proves i per diagnosticar futurs consums sense mostrar dades personals.

### 6.3. Metadades

Els documents generals `users/{uid}` i `users/{uid}/meta/app` no s’han de reescriure després de cada canvi si la informació és idèntica. L’hora de sincronització visible es pot mantenir localment i actualitzar al núvol només quan hi hagi una operació real o un canvi de perfil.

### 6.4. Agrupació temporal

Es conservarà inicialment l’espera de 2,5 segons, però la cua haurà d’agrupar col·leccions repetides. Si el mateix document canvia diverses vegades abans d’enviar-se, només s’ha d’enviar l’estat final.

### 6.5. Quota i reintents

Quan Firebase respongui amb `resource-exhausted`:

1. aturar els reintents automàtics ràpids;
2. conservar les col·leccions pendents;
3. mostrar que les dades són al dispositiu però no al núvol;
4. permetre un reintent manual;
5. reprendre automàticament només després d’un interval llarg o d’una nova sessió.

Els errors de xarxa utilitzaran una espera progressiva. No es farà un bucle continu d’escriptures.

### 6.6. Còpia automàtica diària

Durant aquesta fase:

- se suspendrà la creació automàtica de còpies completes diàries a Firestore;
- es mantindrà la còpia local descarregable;
- es mantindrà la còpia manual al núvol com a opció excepcional;
- s’evitarà qualsevol doble execució simultània de còpies.

Abans de crear una còpia manual al núvol, la interfície indicarà que duplica tots els registres i consumeix una escriptura per document.

### 6.7. Pujada completa al núvol

L’acció `Pujar-ho tot al núvol` es transformarà en una eina de recuperació:

- no apareixerà com una acció ordinària destacada;
- mostrarà una estimació del nombre d’escriptures;
- explicarà que substituirà la còpia personal remota;
- requerirà confirmació explícita;
- només s’utilitzarà després d’importar o restaurar una còpia completa.

### 6.8. Criteris de finalització de la fase 1

La fase 1 es considerarà completada quan:

- una edició d’un registre generi una sola escriptura del registre, més com a màxim una actualització de metadades;
- una sincronització sense canvis generi zero escriptures de files;
- una eliminació generi només les eliminacions relacionades amb l’acció;
- iniciar sessió no creï automàticament una còpia completa;
- un error de quota no provoqui reintents repetitius;
- totes les proves existents continuïn passant;
- la versió publicada s’hagi validat amb un compte de prova i les mètriques de Firebase.

## 7. Fase 2 — Cua incremental persistent

Objectiu: deixar de llegir col·leccions senceres en cada sincronització i fer que el sistema sigui eficient també en lectures.

### 7.1. Registre local d’operacions

S’afegirà a IndexedDB un magatzem intern de canvis pendents, separat de les col·leccions pedagògiques. Cada entrada inclourà:

- `uid`;
- col·lecció;
- identificador del document;
- operació `upsert` o `delete`;
- instant del canvi;
- nombre d’intents;
- últim error, sense dades personals dins del missatge.

Aquest magatzem no formarà part dels backups pedagògics ni de `COLLECTIONS`.

### 7.2. Detecció genèrica de diferències locals

Per evitar modificar manualment totes les accions de l’aplicació, `persistCollections()` podrà comparar:

1. les files que hi havia a IndexedDB abans de l’acció;
2. les files noves de l’estat;
3. els identificadors creats, modificats i eliminats.

Després desarà la col·lecció local completa, però només afegirà a la cua del núvol les diferències detectades. La substitució completa d’un object store local no consumeix quota de Firebase.

### 7.3. Fusió d’operacions pendents

La cua conservarà una única operació final per `uid + col·lecció + documentId`:

- diversos `upsert` → queda l’últim;
- `upsert` seguit de `delete` → queda `delete`;
- `delete` seguit de nova creació → queda `upsert`;
- una resposta correcta de Firebase → elimina només aquella entrada de la cua.

### 7.4. Enviament per lots

Les operacions pendents s’enviaran en lots prudents, per sota del màxim admès per Firestore. Si un lot falla, no s’eliminarà de la cua. Si només falla un document, el sistema haurà de poder identificar-lo sense reenviar indefinidament tots els altres.

### 7.5. Diversos dispositius

La sincronització incremental redueix el risc actual perquè un dispositiu antic torni a enviar tota una col·lecció. En aquesta fase s’aplicarà com a mínim una política d’última modificació per document.

Per més endavant es podrà afegir detecció específica de conflictes si dos dispositius modifiquen simultàniament el mateix document. No s’ha de presentar una fusió automàtica com a segura si els dos dispositius han canviat el mateix camp.

### 7.6. Cotutoria compartida

Les col·leccions de `tutoringSpaces` continuaran utilitzant:

- `sharedUpdatedAt`;
- autoria del canvi;
- detecció de versions remotes;
- tombstones per a les baixes;
- avisos de conflicte.

La nova cua personal podrà activar aquest circuit, però no substituir-ne les regles.

### 7.7. Criteris de finalització de la fase 2

- Tancar i reobrir l’aplicació conserva la cua.
- Canviar de compte no barreja operacions pendents.
- Recuperar la connexió envia només els documents pendents.
- Un document confirmat no es torna a enviar.
- Les lectures de Firestore deixen de créixer proporcionalment a la mida completa de cada col·lecció.
- Una edició des d’un dispositiu no torna a publicar documents no modificats d’un altre dispositiu.

## 8. Tractament de les eliminacions

Eliminar un alumne pot afectar diverses col·leccions relacionades: alumnes, notes, tasques, antecedents i dades tutorials. L’acció de l’aplicació continuarà decidint quines files s’han de retirar.

La capa de sincronització només farà això:

1. comparar els identificadors anteriors i posteriors de cada col·lecció declarada per l’acció;
2. crear una eliminació concreta per cada identificador desaparegut;
3. no tocar la resta de documents;
4. conservar els tombstones quan el flux compartit els necessiti.

Abans de publicar, es provarà separadament:

- eliminar un sol alumne;
- eliminar una classe completa;
- reiniciar un curs;
- eliminar dades importades;
- eliminar i tornar a crear un document amb el mateix identificador.

## 9. Backups i restauració

### Backups ordinaris

La protecció habitual serà:

- dades locals a IndexedDB;
- sincronització incremental dels documents actuals;
- còpia JSON descarregable quan el docent ho decideixi.

### Còpia completa al núvol

Es mantindrà com a operació manual i excepcional. Abans d’executar-la s’haurà de mostrar:

- nombre total de documents;
- estimació d’escriptures;
- quota disponible, quan es pugui consultar;
- advertiment que no és necessària per a la sincronització quotidiana.

### Restauració

Una restauració completa haurà de seguir aquest ordre:

1. validar el backup;
2. mostrar un resum i els possibles conflictes;
3. desar-lo localment;
4. generar les diferències respecte del núvol;
5. demanar confirmació si implica una substitució massiva;
6. enviar els lots;
7. verificar recomptes finals.

## 10. Pla de proves

### Proves unitàries

- Comparació d’objectes independent de l’ordre de les propietats.
- Detecció d’un document nou.
- Detecció d’un document modificat.
- Detecció d’un document eliminat.
- Dades idèntiques → zero operacions.
- Fusió de diverses operacions del mateix document.
- Separació de cues per usuari.
- Conservació de la cua després de recarregar.

### Proves amb l’emulador de Firebase

- 500 documents remots, modificar-ne 1 → una escriptura de fila.
- Tornar a sincronitzar sense canvis → zero escriptures de fila.
- Eliminar-ne 1 → una eliminació.
- Importar 25 alumnes → aproximadament 25 creacions.
- Simular falta de permisos → cua conservada.
- Simular quota esgotada → sense bucle de reintents.
- Verificar que les regles actuals continuen protegint cada usuari.

### Regressió funcional

- notes i rúbriques;
- tasques i comportament;
- agenda;
- tutoria individual;
- sociometria;
- grups cooperatius;
- plànols de classe;
- antecedents;
- importació d’alumnes;
- eliminació d’alumnes i classes;
- cotutoria compartida;
- formularis públics.

### Prova publicada

Després del desplegament:

1. començar amb un compte de prova;
2. anotar el recompte inicial de Firebase;
3. crear, modificar i eliminar un registre controlat;
4. confirmar els documents afectats;
5. comprovar les mètriques d’escriptures;
6. provar des d’ordinador i iPad;
7. incorporar un segon compte només quan la primera prova sigui correcta.

Les proves no han d’utilitzar noms reals d’alumnes.

## 11. Desplegament recomanat

### Desplegament A — Fase 1

- comparació remota;
- escriptures només quan hi ha diferències;
- eliminacions concretes;
- metadades reduïdes;
- còpia automàtica completa suspesa;
- reintents controlats;
- protecció de la pujada completa.

Aquest desplegament s’hauria de fer abans de continuar una càrrega intensiva de dades.

### Observació

Durant un o dos dies de feina real:

- revisar escriptures i lectures;
- recollir errors de sincronització;
- comprovar que cap docent perd canvis locals;
- confirmar que els formularis tornen a poder escriure després del reinici de quota.

### Desplegament B — Fase 2

- cua persistent per document;
- enviament directe d’operacions;
- reducció de lectures completes;
- protecció entre dispositius;
- mètriques internes de cua.

## 12. Pla de reversió

La implementació conservarà la reconciliació completa com a funció separada. Si la fase incremental presenta un problema:

1. aturar l’enviament incremental;
2. conservar la cua i les dades locals;
3. no eliminar documents remots;
4. tornar temporalment a una versió estable de la interfície;
5. fer una reconciliació completa només després de comparar recomptes i disposar d’un backup.

No s’utilitzarà una pujada completa automàtica com a mecanisme de reversió.

## 13. Ordre de treball acordat

- [x] Implementar i provar un comparador estable de documents.
- [x] Fer que `replaceCloudCollection()` ometi files idèntiques.
- [x] Retornar estadístiques de cada sincronització.
- [x] Evitar escriptures innecessàries de metadades.
- [x] Suspendre la còpia completa automàtica diària.
- [x] Impedir còpies diàries simultànies.
- [x] Protegir la pujada completa amb resum i confirmació.
- [x] Tractar explícitament errors de quota i connexió.
- [x] Afegir proves unitàries i d’emulador de la fase 1.
- [ ] Validar una càrrega controlada de dades.
- [x] Publicar la fase 1.
- [ ] Observar les mètriques durant un o dos dies.
- [x] Dissenyar el magatzem persistent d’operacions de la fase 2.
- [x] Implementar, provar i publicar la fase 2.

## 14. Condició per començar la implementació

Abans d’editar el motor de sincronització cal validar aquest document. L’inici recomanat és la fase 1 completa. No s’ha de començar simultàniament la fase 2 mentre encara s’està comprovant que la comparació remota redueix el consum sense provocar pèrdues.
