# Auditoria de consum de Firestore d’AvaluaPro

Data: 24 de setembre de 2026
Abast: lectures, escriptures, listeners, arrencada, Agenda, Programació, tutoria compartida, còpies i regles
Estat: auditoria aprovada; blocs de mesura, reduccions ràpides, manifest incremental i primera capa d’Agenda aplicats

## 1. Conclusió executiva

AvaluaPro pot continuar el pilot actual sense activar facturació si es redueix de manera prioritària el consum de lectures. El límit que s’ha superat és diari, compartit per tot el projecte de Firebase i no individual per docent. La quota gratuïta de Firestore Standard és de 50.000 lectures, 20.000 escriptures i 20.000 eliminacions al dia, i es reinicia aproximadament a mitjanit del Pacífic.

El consum observat no prové principalment de les accions normals de desar. La cua incremental ja envia només els documents modificats. El problema actual és que l’aplicació:

1. torna a llegir totes les dades personals en cada pestanya;
2. obre diversos listeners globals per cada pestanya;
3. quan s’obre l’Agenda, fa un ventall de consultes sobre UP, aplicacions, sessions, detalls, resultats i estructures;
4. una edició de tutoria compartida pot rellegir les dotze col·leccions compartides;
5. diverses consultes carreguen l’històric complet i després el filtren o limiten al navegador.

La dada més clara és que el 24 de setembre 55.822 de 57.826 lectures registrades van ser de tipus `QUERY`. Només 1.922 van ser lectures puntuals (`LOOKUP`). Per tant, optimitzar els petits desaments no atacaria la causa principal.

No es recomana simplificar les regles de seguretat ni eliminar proteccions de conflicte per estalviar quota. L’optimització s’ha de fer reduint l’abast i la freqüència de les consultes i mantenint IndexedDB com a primera còpia de treball.

## 2. Mesures reals del projecte

Les dades següents provenen de Cloud Monitoring del projecte `avaluapro`. Són estimacions operatives útils per identificar pics; poden diferir lleugerament de la facturació final.

| Dia | Lectures | % de la quota gratuïta | Escriptures | Eliminacions | Màxim connexions | Màxim listeners |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 21/09/2026 | 41.924 | 83,8% | 6.716 | 934 | 11 | 112 |
| 22/09/2026 | 25.510 | 51,0% | 2.746 | 220 | 7 | 58 |
| 23/09/2026 | 71.877 | 143,8% | 3.151 | 177 | 12 | 129 |
| 24/09/2026 | 57.826 | 115,7% | 2.585 | 47 | 20 | 85 |

Distribució de lectures:

| Dia | Consultes (`QUERY`) | Puntuals (`LOOKUP`) | No trobades |
| --- | ---: | ---: | ---: |
| 23/09/2026 | 69.854 | 1.935 | 88 |
| 24/09/2026 | 55.822 | 1.922 | 82 |

Pics principals, hora d’Andorra:

- 23/09 a les 12.00: 17.818 lectures;
- 24/09 a les 19.00: 14.233 lectures;
- 23/09 a les 11.00: 12.528 lectures;
- 24/09 a les 18.00: 12.006 lectures;
- 21/09 a les 10.00: 10.899 lectures.

Hi ha set comptes actius creats a Authentication. Les mètriques de Firestore disponibles no inclouen el `uid`, de manera que no permeten repartir aquestes lectures amb exactitud entre docents. Una connexió tampoc equival a una persona: una mateixa persona amb diverses pestanyes o dispositius genera diverses connexions. Per saber el consum aproximat per compte caldria afegir telemetria agregada pròpia, sense dades d’alumnat.

## 3. Inventari dels focus de consum

### 3.1. P0 — Arrencada completa repetida per pestanya

`loadCloudWorkspace()` llegeix el document de metadades i les 24 col·leccions personals completes amb `getDocFromServer()` i `getDocsFromServer()` (`src/lib/firebase.js`, línies 1245–1271). Les crides `FromServer` ignoren la memòria cau de Firestore.

La funció `synchronizeAfterSignIn()` executa aquesta càrrega en iniciar sessió (`src/store/useAvaluaproStore.js`, línies 1066–1135). La protecció existent evita duplicar-la dins de la mateixa instància JavaScript, però no entre pestanyes. Cada pestanya torna a descarregar el conjunt complet.

L’inici també carrega, de manera independent:

- les còpies al núvol;
- els paquets de notes rebuts;
- els paquets de notes enviats;
- els espais de tutoria compartida;
- les invitacions i respostes de cotutoria.

Aquestes crides són visibles a `initialize()` (`src/store/useAvaluaproStore.js`, línies 1748–1810).

**Impacte:** crític. El cost d’obrir AvaluaPro creix amb totes les dades acumulades pel docent i es multiplica pel nombre de pestanyes.

**Canvi recomanat:** introduir un manifest de revisions. L’arrencada ha de llegir primer un únic document amb la revisió de cada col·lecció. Si coincideix amb la còpia d’IndexedDB, no s’ha de descarregar res més. Si una col·lecció ha canviat, s’ha de carregar només aquella col·lecció o, preferiblement, només els canvis posteriors a la revisió local.

### 3.2. P0 — Agenda amb ventall de consultes

La portada de l’Agenda carrega per defecte sis setmanes (`src/features/agenda/useAgendaWorkspace.js`, línies 578–608). `loadSessionRange()` fa els passos següents (`línies 452–576`):

1. consulta les aplicacions de cada UP visible;
2. consulta les sessions de cada aplicació;
3. per cada sessió, llegeix el document de sessió, tots els elements i tots els resultats;
4. carrega l’estructura de les UP utilitzades i també totes les UP pròpies, incloses les arxivades;
5. carrega els ajustos de cada aplicació.

Una sessió genera com a mínim tres operacions de lectura de detall, a més dels documents retornats. El cost real creix amb el nombre d’UP, aplicacions, sessions, activitats i resultats. La vista mensual o la cronologia poden tornar a demanar rangs més amplis.

**Impacte:** crític. És el principal candidat per explicar pics sobtats quan es treballa amb Agenda i Programació.

**Canvi recomanat:** separar encapçalament i detall. La setmana ha de llegir una col·lecció plana d’encapçalaments de sessió —data, hora, classe, color, estat i recompte— amb una sola consulta acotada. Activitats, descripcions, resultats i materials s’han de carregar quan s’obre la sessió o el Mode aula. La cronologia s’ha de paginar i la portada ha de carregar primer la setmana actual o següent, no sis setmanes amb tots els detalls.

### 3.3. P0 — Tutoria compartida rellegeix dotze col·leccions per una edició

`persistCollections()` activa `syncSharedTutoringClassesForCollections()` després d’un canvi local (`src/store/useAvaluaproStore.js`, línies 510–601). Aquesta funció crida `saveTutoringSpace()` per cada classe compartida.

Tot i que `saveTutoringSpace()` rep `changeCollections`, recorre sempre les dotze col·leccions de `SHARED_TUTORING_COLLECTIONS` (`src/lib/firebase.js`, línies 1823–1837). Per cada col·lecció, `mergeTutoringSpaceCollection()` llegeix tots els documents remots abans de comparar-los (`línies 314–382`). Després encara es torna a consultar la llista d’espais compartits.

**Impacte:** crític. Una sola nota, antecedent, marca tutorial o canvi d’alumne pot provocar una lectura completa de totes les dades compartides, multiplicada pel nombre d’espais compartits.

**Canvi recomanat:** la cua ha de transportar els identificadors exactes modificats. Per una edició ordinària s’ha de llegir, si cal per detectar conflictes, només el document afectat i escriure només aquell document. `changeCollections` ha de limitar de veritat les col·leccions processades. La sincronització completa de les dotze col·leccions ha de quedar reservada a la creació inicial o a una reparació explícita.

### 3.4. P0 — Listeners globals i duplicats entre pestanyes

La barra superior obre tres listeners en temps real sempre que hi ha sessió (`src/components/TopBar.jsx`, línies 227–248):

- tots els missatges interns de la persona;
- tots els anuncis interns;
- el document d’estat de lectura.

Els dos primers no tenen límit de resultats (`src/lib/firebase.js`, línies 2027–2059). A més, en carregar els espais de tutoria, `startTutoringCoordinationSubscriptions()` obre dos listeners per cada espai compartit, encara que el docent no hagi entrat al Mode tutoria (`src/store/useAvaluaproStore.js`, línies 693–737):

- fins a 300 elements de coordinació;
- tots els estats dels membres.

El projecte ha arribat a 129 listeners simultanis. Cada pestanya repeteix els listeners i la primera resposta torna a llegir els documents corresponents.

**Impacte:** molt alt.

**Canvi recomanat:** només una pestanya líder ha de mantenir xarxa i listeners, compartint els resultats amb les altres mitjançant `BroadcastChannel` o persistència multi-pestanya. La barra superior ha de llegir un document resum amb recomptes, i l’històric de missatges només s’ha d’obrir en entrar a la missatgeria. Els listeners de coordinació han d’estar actius només per l’espai de tutoria obert, o substituir-se per un resum compacte global.

### 3.5. P1 — Consultes sense límit remot

S’han localitzat consultes que recuperen tota la col·lecció i després filtren, ordenen o fan `slice()` al navegador:

- paquets de notes rebuts i enviats (`src/lib/firebase.js`, línies 1399–1412);
- espais de tutoria compartida (`línies 1450–1451`);
- invitacions rebudes i enviades (`línies 1496–1521`);
- missatges interns i anuncis (`línies 2027–2047`);
- estats dels membres de coordinació (`línies 1928–1937`);
- senyals de canvi d’un espai (`línies 1959–1971`).

**Impacte:** moderat ara, creixent amb el temps. Aquestes consultes són especialment perilloses per a una aplicació que pretén acumular cursos i anys.

**Canvi recomanat:** afegir `where`, `orderBy`, `limit` i paginació al servidor. Els estats pendents o no llegits s’han de consultar pel seu estat, no descarregar-se tots per filtrar-los localment.

### 3.6. P1 — Programació carrega connexions de totes les UP

Obrir Programació carrega els cursos, les UT, les UP pròpies, fins a 100 UP compartides i després les aplicacions de cada UP per saber quines corresponen a la classe activa (`src/features/planning/usePlanningWorkspace.js`, línies 194–324). Finalment carrega l’estructura de la UP activa.

La memòria local del repositori redueix el risc si Firebase falla, però no evita la consulta remota: cada `loadScope()` intenta validar el seu abast en línia. Agenda i Programació creen repositoris diferents, de manera que canviar de pantalla pot repetir validacions.

**Impacte:** alt quan augmenti el nombre d’UP i classes.

**Canvi recomanat:** crear un índex lleuger de connexions per classe o incloure les classes connectades al resum de la UP. Carregar només les aplicacions de la classe activa. Compartir un únic repositori i una memòria de revisions entre Agenda i Programació.

### 3.7. P1 — Còpies i metadades

La còpia diària no és l’origen principal de lectures, però cada comprovació torna a consultar l’historial de còpies, i pot fer-ho dues vegades abans de crear-ne una (`src/store/useAvaluaproStore.js`, línies 2047–2098). El bloqueig que evita duplicats és `localStorage`; dos dispositius diferents poden intentar crear una còpia diària el mateix dia.

Cada enviament incremental també llegeix el document d’usuari i el document de metadades per evitar reescriure’ls si no han canviat (`src/lib/firebase.js`, línies 1126–1242). Són aproximadament dues lectures puntuals per lot de sincronització. Aquest cost existeix, però és petit davant les consultes massives.

**Canvi recomanat:** guardar la data/fingerprint de la còpia en un document estable i adquirir el bloqueig amb una transacció remota. Actualitzar les metadades dins del mateix lot només quan hi hagi canvis, sense una lectura prèvia si el valor és determinista.

### 3.8. P2 — Lectures dependents de les regles

Les regles de Firestore consulten documents pare amb `get()`, `exists()` i `getAfter()` per protegir tutories, formularis i planificacions. Aquestes lectures dependents poden consumir lectures addicionals. Firestore només cobra una vegada cada document dependent dins d’una mateixa avaluació, però el torna a avaluar en noves peticions i actualitzacions de listeners.

**Impacte:** secundari però real, sobretot perquè el codi actual fragmenta moltes lectures en peticions petites.

**Canvi recomanat:** primer reduir el nombre de peticions. Després, estudiar projeccions de membres o permisos que evitin algunes lectures del pare, sempre amb proves de regles. No s’han de relaxar les regles ni copiar dades sensibles de manera insegura només per estalviar quota.

## 4. Què ja funciona bé

- Les modificacions ordinàries es desen primer a IndexedDB.
- La cua personal és persistent, separada per `uid` i consolida diverses edicions del mateix document.
- `saveCloudOperations()` escriu només els documents pendents; no rellegeix la col·lecció completa.
- Els errors de quota conserven els canvis locals i aturen els reintents durant una hora.
- Agenda, Programació i Tutoria es carreguen com a mòduls separats quan s’obren.
- Les eliminacions compartides utilitzen tombstones i els conflictes entre cotutors tenen metadades de versió i autoria.

Aquestes proteccions s’han de conservar. La nova optimització ha d’actuar sobre la lectura i no substituir la base local-first.

## 5. Arquitectura objectiu

### 5.1. Arrencada

1. Carregar IndexedDB immediatament.
2. Escollir una sola pestanya líder per a Firebase.
3. Enviar primer la cua local pendent.
4. Llegir un únic manifest remot amb revisions per col·lecció.
5. No fer cap altra lectura si les revisions coincideixen.
6. Baixar només els canvis dels àmbits que han canviat.
7. Comunicar el resultat a les altres pestanyes.

Objectiu mesurable: una arrencada sense canvis ha de necessitar entre 1 i 5 lectures remotes, i una segona pestanya no ha d’obrir una segona sincronització completa.

### 5.2. Agenda

Crear una projecció `agendaSessionSummaries` o equivalent, amb la informació mínima per dibuixar setmana i mes. No ha de contenir dades privades que no siguin necessàries per al calendari. El detall continuarà vivint en els documents actuals i es carregarà sota demanda.

Objectiu mesurable: obrir la setmana ha de requerir una consulta acotada i menys de 50 lectures en un cas normal; obrir una sessió només ha de carregar aquella sessió.

### 5.3. Tutoria compartida

La cua compartida ha d’incloure `spaceId`, col·lecció, document, operació i versió base. Cada operació s’ha d’aplicar amb una transacció o comprovació puntual del document afectat. Una sincronització completa continuarà existint com a reparació manual.

Objectiu mesurable: modificar una nota tutorial no ha de consultar cap altra col·lecció ni cap altre alumne.

### 5.4. Avisos i missatgeria

Mantenir documents resum per usuari i espai amb comptadors de pendents/no llegits. L’històric s’ha de paginar quan s’obre la pantalla corresponent. Només la pestanya líder ha de mantenir el listener dels resums.

Objectiu mesurable: el shell general ha de tenir com a màxim un o dos listeners petits, independentment del nombre d’espais de tutoria.

## 6. Ordre de treball segur

### Bloc 0 — Instrumentació i pressupostos de lectura

- afegir un adaptador de Firestore que compti consultes i lectures estimades en desenvolupament;
- crear proves que fallin si una acció supera el pressupost acordat;
- establir alertes al 50% i al 80% de la quota diària;
- registrar només comptadors agregats, sense noms ni dades d’alumnat.

Aquest bloc no canvia dades i permet demostrar cada millora.

### Bloc 1 — Reduccions ràpides i de risc baix

- posar límits i filtres remots a invitacions, paquets, missatges i anuncis;
- carregar historials només quan s’obre la pantalla;
- activar una sola pestanya líder;
- deixar els listeners de coordinació només per l’espai actiu;
- evitar recàrregues duplicades entre la inicialització i l’obertura de menús.

### Bloc 2 — Manifest incremental d’arrencada

- afegir revisions per col·lecció al document de metadades;
- actualitzar-les en el mateix lot que cada canvi;
- comparar manifest remot i revisions locals;
- mantenir un botó de recuperació que faci la càrrega completa només sota petició;
- provar dos dispositius, cua pendent, canvi de compte, dades antigues i quota esgotada.

Aquest és el bloc amb més reducció global i també el que exigeix més proves de conciliació.

### Bloc 3 — Agenda per capes

- crear encapçalaments de sessió;
- carregar només setmana o mes visible;
- carregar el detall en obrir la sessió;
- paginar cronologia i arxiu;
- compartir la memòria de dades entre Agenda i Programació.

### Bloc 4 — Tutoria compartida incremental

- sincronitzar només col·leccions i documents modificats;
- conservar versions, autoria, tombstones i conflictes;
- limitar listeners a l’espai actiu;
- validar amb dos comptes reals i Firestore Emulator.

### Bloc 5 — Regles, còpies i neteja final

- mesurar lectures dependents de regles abans de modificar-les;
- fer el bloqueig diari de còpia entre dispositius;
- mantenir les restauracions completes fora del flux ordinari;
- revisar índexs, paginació i retenció d’històrics.

## 7. Proves obligatòries abans de publicar cada bloc

- inici amb dades locals i núvol iguals;
- inici amb un canvi pendent local;
- inici amb un canvi fet des d’un altre dispositiu;
- dues i quatre pestanyes obertes;
- pèrdua de xarxa i recuperació;
- quota esgotada;
- Agenda d’una setmana, d’un mes i cronologia;
- edició d’una tutoria compartida amb dos comptes;
- eliminació amb tombstone;
- còpia i restauració;
- comprovació de regles i privacitat;
- recompte de consultes abans i després.

No s’ha de considerar complet un bloc només perquè la interfície funcioni: el pressupost de lectures ha de passar també.

## 8. Blocs aplicats

La primera intervenció conserva el model local-first i no canvia l'estructura de les dades. Inclou:

- memòria persistent de Firestore compartida entre pestanyes del mateix navegador;
- límits remots per a missatges, anuncis, invitacions, paquets de notes i espais de cotutoria;
- sincronització ordinària de cotutoria restringida a les col·leccions realment modificades;
- comptadors locals i agregats de lectures estimades, sense noms ni dades d'alumnat;
- proves automàtiques que fixen els límits i la selecció de col·leccions.

El manifest incremental d’arrencada afegeix també:

- una revisió global de l’espai de treball publicada en el mateix lot que cada canvi incremental;
- un estat `updating` que impedeix acceptar una revisió si una substitució completa queda interrompuda;
- una petjada local, separada per compte, que s’invalida automàticament quan canvia qualsevol dada;
- una arrencada d’una sola lectura remota quan revisió i petjada coincideixen;
- revisions i petjades separades per a les 24 col·leccions personals;
- descàrrega exclusiva de les col·leccions que han canviat en un altre dispositiu;
- invalidació local limitada a la col·lecció editada, conservant la verificació de les altres;
- adopció transaccional del manifest nou després d’una lectura completa estable;
- una segona comprovació de revisió quan cal baixar dades, per repetir la lectura si una altra pestanya escriu al mateix temps;
- compatibilitat conservadora amb pestanyes antigues: quan una versió anterior desa, baixa la versió de metadades i obliga a repetir la comprovació completa;
- un marge d’activació fins al 27 de setembre de 2026 perquè les pestanyes obertes durant el desplegament no puguin validar dades antigues;
- càrrega completa automàtica davant d’una cua pendent, canvi de compte, demo, petjada diferent o metadades incompletes.

Agenda ha rebut una primera reducció reversible: la portada «Avui» carrega dues setmanes, en lloc de sis, amb els detalls de les sessions. Les vistes de setmana, mes, cronologia i recordatoris amplien el rang quan el docent les obre. La pròxima classe sense UP es calcula localment des de l’horari fins a seixanta dies i salta festius i vacances, de manera que la reducció no deixa la portada buida.

La primera capa lleugera d’Agenda reutilitza els documents de sessió existents, sense crear una base paral·lela:

- setmana, mes, cronologia i selector de recordatoris consulten només els encapçalaments de sessió;
- els elements i resultats que ja existeixen a IndexedDB poden decorar la vista, però no provoquen cap lectura remota;
- activitats, resultats, descripcions, materials i ajustos es carreguen quan el docent obre una sessió;
- «Avui» manté el tram curt complet perquè Mode aula continuï preparat;
- cada detall reutilitza el document de sessió que ja havia retornat el calendari i elimina una lectura duplicada per sessió;
- els elements nous desen la UP d’origen, de manera que una recuperació només consulta la seva estructura exacta;
- les recuperacions antigues busquen l’estructura a la còpia local i no obliguen a rellegir totes les UP arxivades;
- els recordatoris de material només es reconcilien amb sessions que tenen el detall complet, evitant cancel·lacions falses.

Encara queden pendents la paginació de cronologia, la memòria compartida entre Agenda i Programació, el lideratge explícit d’una sola pestanya i l’activació sota demanda dels listeners de cotutoria.

## 9. Capacitat del pla gratuït

Amb els set comptes actuals, una arquitectura incremental i consultes acotades pot mantenir el pilot per sota de 50.000 lectures diàries la majoria de dies. No es pot garantir el pla gratuït per a un desplegament ministerial de centenars de docents: la quota és compartida per projecte i només permet, per exemple, 100 docents a 500 lectures diàries abans d’arribar al límit.

L’objectiu correcte és doble:

1. fer que el pilot actual sigui eficient i estable sense facturació;
2. arribar a una possible venda amb un consum previsible, pressupostable i aïllable per centre o tenant.

Activar facturació més endavant no hauria de substituir aquesta auditoria. Una aplicació ineficient només converteix els errors de quota en una factura imprevisible.

## 10. Decisió recomanada

Aplicar primer els blocs 0 i 1, perquè són reversibles i permeten reduir ràpidament pestanyes, listeners i consultes no acotades. Després implementar el manifest incremental d’arrencada abans de continuar ampliant funcionalitats. Tot seguit refactoritzar Agenda i, finalment, la tutoria compartida incremental.

La meta inicial és reduir com a mínim un 80% les lectures d’un dia d’ús equivalent. L’èxit no s’ha de valorar per sensació: s’ha de comparar Cloud Monitoring durant dos dies lectius semblants i verificar que cap flux de dades o compartició s’ha perdut.
