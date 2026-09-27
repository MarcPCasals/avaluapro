# Pla del mode d’assistència segura d’AvaluaPro

**Estat:** exportador segur publicat; entorn d’assistència implementat localment i separat
**Data:** 27 de setembre de 2026
**Objectiu:** permetre desenvolupar, provar i verificar AvaluaPro amb Codex o altres assistents tècnics sense exposar dades reals d’alumnes.

## 1. Decisió principal

Codex no tornarà a entrar a l’entorn real d’AvaluaPro quan aquest contingui dades identificables d’alumnes.

El treball tècnic es farà en un entorn d’assistència separat, amb dades completament fictícies o amb un paquet prèviament desidentificat i validat. La separació serà tècnica, no només visual.

No es considerarà una protecció suficient:

- difuminar noms amb CSS;
- amagar columnes després de carregar la pàgina;
- substituir noms només al DOM;
- afegir un paràmetre o una ruta dins del mateix domini real;
- confiar que l’assistent no obrirà determinades pantalles;
- utilitzar el mode demo actual si abans s’han carregat les dades reals del dispositiu.

## 2. Risc que s’ha de corregir

L’arrencada actual de l’aplicació:

1. obre la base IndexedDB `avaluapro-v2`;
2. carrega totes les col·leccions locals;
3. posa les dades a l’estat global de l’aplicació;
4. recupera la sessió persistent de Firebase Auth;
5. sincronitza l’espai de treball amb Firebase;
6. carrega còpies, paquets docents, cotutories, invitacions i altres recursos compartits.

Per això, un interruptor activat després d’entrar a l’aplicació arribaria massa tard: els noms, diagnòstics, observacions i altres dades ja podrien existir a la memòria del navegador, IndexedDB, la memòria cau de Firebase o les respostes de xarxa.

Les col·leccions afectades inclouen, entre altres:

- alumnes i classes;
- qualificacions i indicadors;
- tasques i seguiment;
- absències i conducta;
- anotacions i registres tutorials;
- diagnòstics, antecedents i adaptacions;
- relacions sociomètriques, sociogrames i agrupaments;
- plànols d’aula;
- missatgeria, cotutories i paquets compartits;
- còpies de seguretat i exports.

## 3. Arquitectura de destí

### 3.1. Dos entorns separats

| Entorn | Ús | Dades permeses | Accés de Codex |
| --- | --- | --- | --- |
| AvaluaPro real | Treball quotidià del docent | Dades reals | Prohibit |
| AvaluaPro Assistència | Desenvolupament i verificació | Dades fictícies o paquet segur | Permès |

L’entorn d’assistència haurà de tenir un origen web diferent. La proposta inicial és una adreça semblant a `avaluapro-assistencia.web.app`, subjecta a confirmar-ne el nom durant la implementació.

Una ruta com `avaluapro.web.app/assistencia` no és suficient perquè compartiria origen, IndexedDB, localStorage, service worker i part del context de seguretat amb l’aplicació real.

### 3.2. Separació d’infraestructura

L’entorn d’assistència haurà de complir aquestes condicions:

- projecte o configuració Firebase separats del projecte real;
- cap lectura ni escriptura al Firestore real;
- cap reutilització de la sessió Google del domini real;
- base IndexedDB diferent o, preferentment, dades només en memòria;
- localStorage, sessionStorage, memòria cau i service worker propis;
- compilació identificable com a entorn d’assistència;
- banner persistent que indiqui que totes les dades són fictícies;
- absència de secrets, identificadors o URLs que permetin connectar amb l’espai real.

### 3.3. Dos adaptadors de dades

S’ha de separar la interfície de l’aplicació de la forma concreta d’obtenir i desar les dades.

- **Adaptador real:** IndexedDB, Firebase, sincronització, còpies i funcions compartides.
- **Adaptador d’assistència:** dades sintètiques, sense connexió al núvol real i sense escriptures persistents sensibles.
- **Adaptador de paquet segur, opcional:** permet carregar un fitxer desidentificat que hagi superat un validador estricte.

Les pantalles haurien de consumir una interfície comuna, però l’entorn d’assistència no hauria d’importar ni inicialitzar el connector Firebase real.

## 4. Dades sintètiques d’assistència

Es crearà un conjunt estable de dades completament fictícies que permeti comprovar totes les parts importants d’AvaluaPro.

Haurà d’incloure:

- almenys una classe ordinària nombrosa;
- una classe de tutoria;
- diferents semestres, UT, competències i criteris;
- qualificacions A, B, C i D;
- tasques completes, incompletes i sense registre;
- absències i historial horari;
- incidències de conducta fictícies;
- perfils pedagògics inventats;
- necessitats educatives i diagnòstics estrictament ficticis;
- registres tutorials inventats;
- sociometria i agrupaments ficticis;
- plànols d’aula;
- situacions buides, parcials, completes, conflictives i amb errors controlats;
- prou alumnat fictici per validar les vistes denses de tauleta i ordinador.

Les dades hauran d’indicar explícitament que són fictícies. No es construiran a partir dels noms ni dels valors reals del compte de Marc.

## 5. Paquet segur d’assistència

El paquet segur serà opcional. Servirà únicament quan un problema no es pugui reproduir amb el conjunt sintètic general.

### 5.1. Generació

La generació es farà localment dins de l’AvaluaPro real, sota control directe de Marc i sense una sessió de Codex inspeccionant la pantalla.

El procés haurà de:

1. crear una còpia temporal en memòria;
2. eliminar tota dada que no sigui necessària per reproduir el problema;
3. regenerar tots els identificadors;
4. substituir qualsevol etiqueta identificable;
5. eliminar el text lliure;
6. validar automàticament el resultat;
7. permetre a Marc revisar un resum de contingut;
8. exportar només si el validador no detecta cap risc bloquejant.

### 5.2. Transformació mínima obligatòria

| Dada real | Transformació segura |
| --- | --- |
| Nom i cognoms | `Alumne 01`, `Alumne 02`, etc. |
| ID d’alumne o document | ID aleatori nou, sense hash de l’original |
| Nom de classe | `Grup A`, `Grup B`, etc. |
| Correu electrònic | Eliminat |
| Fotos | Eliminades |
| Diagnòstics | Eliminats o substituïts per casos ficticis no vinculats |
| Notes personals | Eliminades completament |
| Entrevistes i tutories | Eliminades completament |
| Informació familiar | Eliminada completament |
| DOIP i antecedents | Eliminats completament |
| Conducta amb text lliure | Text eliminat; cas fictici opcional |
| Sociometria real | Eliminada i regenerada amb relacions fictícies |
| Qualificacions | Regenerades o alterades perquè no preservin un perfil individual real |
| Dates exactes | Eliminades, generalitzades o desplaçades |
| IDs de Firebase i comparticions | Eliminats |
| Nom i correu del docent | Eliminats o substituïts |

No s’utilitzaran hashes de noms, pseudònims permanents ni correspondències reversibles. Una dada pseudonimitzada continua sent dada personal si es pot tornar a relacionar amb la persona.

### 5.3. Importació

El paquet segur:

- només es podrà importar a l’entorn d’assistència;
- no es podrà reimportar a l’AvaluaPro real;
- no podrà activar Firebase, còpies, comparticions o missatgeria;
- s’eliminarà quan es tanqui la sessió, llevat que Marc decideixi explícitament conservar-lo;
- inclourà versió d’esquema i resultat del validador;
- serà rebutjat si conté camps desconeguts o text potencialment identificable.

## 6. Bloquejos funcionals de l’entorn d’assistència

Les funcions següents quedaran bloquejades per lògica interna, no només amagades visualment:

- inici de sessió amb Google;
- Firebase Auth;
- lectures o escriptures Firestore;
- sincronització local-núvol;
- còpies automàtiques i manuals;
- restauració o reconciliació;
- missatgeria interna;
- cotutories compartides;
- paquets de notes entre docents;
- formularis o enllaços públics reals;
- càrrega d’una còpia normal d’AvaluaPro;
- exportacions que es puguin confondre amb documentació real;
- accés a la base IndexedDB `avaluapro-v2`;
- accés a la memòria cau Firebase real;
- operacions destructives o que puguin afectar l’entorn de producció.

Si una funció bloquejada és invocada per error, haurà de fallar de manera explícita amb un missatge com: `Operació no disponible a l’entorn d’assistència`.

## 7. Interfície del mode segur

L’entorn d’assistència mostrarà permanentment:

- un color o patró visual diferenciat;
- una icona d’escut;
- el text `Entorn d’assistència`;
- el text `Dades fictícies · Sense connexió amb el compte real`;
- l’estat de xarxa segura;
- l’origen de les dades: `Conjunt sintètic` o `Paquet segur validat`.

No hi haurà cap botó que permeti “passar” directament de l’entorn d’assistència al compte real dins de la mateixa sessió controlada per Codex.

## 8. Fases d’implementació

### Fase 0. Contenció immediata

- deixar d’utilitzar verificacions autenticades amb dades reals;
- no obrir còpies, Excel ni captures amb alumnat real;
- substituir la validació autenticada anterior per una validació sintètica;
- documentar aquesta prohibició al flux de desplegament.

**Criteri de finalització:** el procés habitual ja no demana a Codex entrar a l’AvaluaPro real.

### Fase 1. Porta d’entrada segura

- separar el punt d’entrada normal i el d’assistència;
- decidir el mode abans d’importar l’estat, IndexedDB o Firebase;
- impedir que el paquet d’assistència importi el connector Firebase real;
- afegir una configuració de compilació específica.

**Criteri de finalització:** es pot carregar la carcassa d’assistència sense obrir IndexedDB ni iniciar Firebase.

### Fase 2. Adaptador de dades sintètiques

- definir el contracte comú de dades;
- encapsular l’adaptador real existent;
- crear l’adaptador en memòria;
- afegir operacions simulades i reversibles per provar la interfície;
- impedir qualsevol persistència real.

**Criteri de finalització:** les pantalles principals funcionen amb l’adaptador sintètic.

### Fase 3. Conjunt complet de proves

- ampliar les dades demo;
- cobrir avaluació, seguiment, assistència, analítica, tutoria, sociometria i aula;
- afegir casos buits, carregats i límit;
- comprovar escriptori i iPad.

**Criteri de finalització:** les verificacions visuals habituals ja no necessiten dades reals.

### Fase 4. Entorn i origen separats

- crear el projecte o lloc d’Hosting d’assistència;
- configurar un domini/origen diferent;
- usar memòria cau i service worker propis;
- restringir la política de xarxa;
- publicar el mateix commit verificat de l’aplicació.

**Criteri de finalització:** l’entorn d’assistència no comparteix emmagatzematge ni autenticació amb producció.

### Fase 5. Bloquejos interns

- centralitzar una política de capacitats;
- bloquejar autenticació, núvol, exportacions i comparticions;
- afegir errors explícits si algun component intenta utilitzar-les;
- desactivar qualsevol listener o temporitzador relacionat amb Firebase.

**Criteri de finalització:** cap acció de la interfície pot arribar al projecte real.

### Fase 6. Paquet segur i validador

- definir l’esquema mínim;
- implementar la desidentificació local;
- regenerar identificadors i relacions;
- eliminar text lliure i dades d’alt risc;
- crear el validador de sortida;
- crear l’importador exclusiu de l’entorn d’assistència.

**Criteri de finalització:** un paquet amb qualsevol dada prohibida és rebutjat automàticament.

### Fase 7. Proves de no-exposició

- vigilar peticions de xarxa;
- comprovar IndexedDB, localStorage i sessionStorage;
- escanejar DOM i arbre d’accessibilitat;
- comprovar consola, errors, captures i exports;
- afegir sentinelles de dades sensibles a les proves;
- fer fallar la compilació si l’entorn d’assistència importa Firebase real.

**Criteri de finalització:** totes les proves demostren l’absència d’accés real, no només l’absència visual de noms.

### Fase 8. Nou procés de publicació

- executar proves, lint i build;
- publicar el commit seleccionat;
- verificar la versió pública a l’entorn d’assistència;
- comprovar que assistència i producció corresponen al mateix commit;
- deixar la comprovació mínima amb dades reals en mans de Marc;
- documentar un checklist manual sense noms ni captures identificables.

**Criteri de finalització:** cap pas ordinari de desplegament requereix exposar alumnat real a Codex.

### Fase 9. Auditoria dels rastres històrics

- inventariar tasques antigues, logs, memòries locals, captures i exports;
- identificar quins elements poden contenir dades identificables;
- presentar el resultat sense reproduir noms ni diagnòstics;
- separar què es pot eliminar localment del que depèn dels controls del compte d’OpenAI;
- obtenir confirmació explícita abans de qualsevol eliminació;
- registrar les accions realitzades.

**Criteri de finalització:** Marc coneix l’abast dels rastres antics i ha decidit el tractament de cada categoria.

## 9. Nou flux de treball ordinari

### Desenvolupament

1. Revisar únicament codi, proves i documentació.
2. Treballar amb dades sintètiques.
3. Executar proves locals i emuladors.
4. No obrir fitxers reals de còpia o exportació.
5. No utilitzar captures amb dades identificables.

### Verificació després del desplegament

1. Verificar que Hosting serveix el commit correcte.
2. Obrir l’entorn d’assistència.
3. Executar el flux funcional amb dades fictícies.
4. Comprovar escriptori i iPad quan sigui rellevant.
5. Fer les proves de xarxa i emmagatzematge.
6. Marc comprova manualment el compte real només quan sigui imprescindible.
7. Marc comunica resultats funcionals sense compartir noms ni captures sensibles.

### Error no reproduïble

1. Intentar reproduir-lo amb el conjunt sintètic.
2. Demanar només informació estructural no identificable.
3. Si continua sent necessari, Marc genera un paquet segur.
4. El validador comprova el paquet.
5. Codex treballa només a l’entorn d’assistència.
6. Marc verifica manualment la correcció final al compte real.

### Recuperació o conflicte de dades

1. No obrir el contingut complet de la còpia amb Codex.
2. Utilitzar eines que només mostrin recomptes, versions, dates generals i empremtes.
3. Marc revisa qualsevol pantalla amb dades reals.
4. Mostrar un resum abans d’una acció destructiva.
5. Exigir confirmació explícita.
6. Verificar el resultat amb recomptes i estat de sincronització, sense llistar alumnes.

## 10. Proves i criteris d’acceptació

La protecció només es considerarà completa si es demostra que:

- l’entorn d’assistència té un origen diferent;
- no obre la base `avaluapro-v2`;
- no recupera cap sessió Firebase Auth;
- no fa peticions a Firestore, Firebase Storage ni serveis del projecte real;
- no crea listeners de cotutoria, missatgeria o còpies;
- no llegeix fitxers locals sense una acció explícita;
- cap nom real apareix al DOM;
- cap dada real apareix a l’arbre d’accessibilitat;
- cap dada real apareix a la consola o als missatges d’error;
- cap dada real queda en captures, informes o exports;
- els botons bloquejats no poden executar l’operació encara que s’invoquin programàticament;
- les dades temporals desapareixen en tancar la sessió;
- el paquet segur rebutja correus, noms, text lliure, IDs originals i camps desconeguts;
- el build d’assistència falla si importa el connector Firebase real;
- el commit verificat és el mateix que el publicat;
- el procés de desplegament ja no conté el pas “verificació autenticada per Codex”.

## 11. Fitxers i àrees que probablement s’hauran de modificar

La llista exacta es confirmarà durant la implementació, però previsiblement afectarà:

- `src/main.jsx`: selecció primerenca de l’entorn;
- `src/App.jsx`: carcassa i banner d’assistència;
- `src/store/useAvaluaproStore.js`: separació de l’arrencada i de les capacitats;
- `src/lib/firebase.js`: inicialització diferida o connector exclusiu de producció;
- `src/db/indexedDb.js`: evitar qualsevol obertura des d’assistència;
- `src/data/seedData.js`: base del conjunt sintètic;
- un nou mòdul d’adaptadors de dades;
- un nou mòdul de política de capacitats;
- un nou generador i validador de paquet segur;
- configuració Vite i Firebase Hosting;
- service worker i noms de memòria cau;
- proves de seguretat, xarxa, persistència i sanitització;
- documentació de desplegament i recuperació.

## 12. Prohibicions permanents del protocol

- Codex no entra al compte real amb alumnat carregat.
- Codex no inspecciona DOM, captures o xarxa del compte real.
- Codex no llegeix còpies de seguretat amb dades reals.
- Codex no rep Excel, JSON, captures o PDFs identificables.
- No es considera anonimitzada una dada només perquè no mostri el nom.
- No es comprova una funcionalitat sensible mitjançant “mirar ràpidament” producció.
- No es relaxen aquests controls per accelerar una publicació.
- Qualsevol excepció futura requeriria una nova decisió explícita, documentada i proporcional; no es pot inferir d’una petició general de corregir o desplegar.

## 13. Fora d’abast d’aquest pla

Aquest pla no certifica el compliment normatiu complet d’AvaluaPro ni substitueix una AIPD, les decisions del responsable del tractament o l’assessorament del DPD. Se centra en una finalitat concreta: impedir que el treball de desenvolupament i verificació amb assistents exposi dades reals d’alumnes.

## 14. Resultat final esperat

Quan el pla estigui complet:

- Marc continuarà treballant normalment a l’AvaluaPro real;
- Codex treballarà exclusivament en una rèplica funcional aïllada;
- les verificacions visuals i funcionals es faran amb dades fictícies;
- els casos difícils podran reproduir-se amb un paquet segur validat;
- l’entorn d’assistència no tindrà cap camí tècnic cap a les dades reals;
- el procés de desenvolupament, publicació i recuperació tindrà passos de privacitat explícits i verificables.

## 15. Seguiment de la implementació

### Iteració 1 · Entrada aïllada i conjunt sintètic

**Estat:** completada localment; no publicada.

S’ha creat:

- una compilació Vite independent per a AvaluaPro Assistència;
- una entrada que no importa `App.jsx`, la botiga real, IndexedDB ni Firebase;
- un conjunt integrat de 42 alumnes identificats només com `Alumne 01…Alumne 42`;
- dos grups ficticis, cerca local i una taula de comprovació;
- un banner permanent amb les proteccions actives;
- una prova del paquet compilat que bloqueja referències al projecte Firebase real, `avaluapro-v2`, autenticació Google, APIs Firebase i obertures d’IndexedDB;
- scripts separats de desenvolupament, compilació i verificació de la frontera;
- exclusió del paquet generat de Git i ESLint.

Validacions superades:

- compilació independent d’assistència;
- prova automàtica de frontera;
- ESLint;
- `git diff --check`;
- cerca i canvi entre grups amb dades fictícies;
- comprovació visual d’escriptori;
- comprovació visual a 768 × 1024;
- absència d’errors o avisos de consola durant la interacció comprovada.

Limitacions encara vigents:

- l’entorn només existeix localment;
- encara no hi ha domini ni Hosting separats;
- encara no reutilitza les pantalles funcionals completes d’AvaluaPro;
- encara no existeix l’adaptador comú de dades;
- encara no existeixen el paquet segur i el seu validador;
- no s’ha fet l’auditoria dels rastres històrics.

### Iteració 2 · Contracte de dades i canvis en memòria

**Estat:** completada localment; no publicada.

S’ha creat:

- un contracte explícit de capacitats per als adaptadors de dades;
- una política que denega autenticació, núvol, persistència, importació de còpies reals, exports, missatgeria i compartició;
- un adaptador sintètic exclusivament en memòria;
- una subscripció React independent de Zustand i de la botiga real;
- operacions temporals per canviar avaluació, tasques i absències fictícies;
- un botó que restableix el conjunt sintètic inicial;
- un indicador separat de revisions internes i canvis temporals pendents;
- quatre proves unitàries del contracte, les modificacions, el restabliment i els rebuigs de seguretat.

Validacions superades:

- totes les capacitats sensibles queden a `false`;
- tres modificacions consecutives actualitzen només la còpia en memòria;
- restablir recupera els valors inicials i deixa zero canvis pendents;
- els valors no vàlids i un adaptador amb accés al núvol són rebutjats;
- les interaccions reals del navegador canvien A → B, 6/10 → 7/10 i 0 h → 1 h;
- el restabliment recupera A, 6/10 i 0 h;
- no apareixen errors ni avisos de consola durant el flux comprovat;
- el build real d’AvaluaPro continua funcionant sense canvis funcionals.

Limitacions encara vigents:

- les pantalles completes d’avaluació, seguiment i tutoria encara depenen directament de Zustand;
- l’adaptador real encara no implementa el contracte comú;
- l’entorn continua sent local i sense Hosting separat;
- les dades sintètiques encara no cobreixen totes les col·leccions d’AvaluaPro.

### Iteració 3 · Nucli visual reutilitzable de la vista d’alumnes

**Estat:** completada localment; no publicada ni connectada encara a producció.

S’ha creat:

- un component visual pur per a la taula integrada d’alumnes;
- les mateixes sis columnes bàsiques de la vista real i les tres columnes tutorials condicionals;
- entrades explícites per a les files i per a totes les accions, sense accedir directament a Zustand;
- edició de la informació general connectada exclusivament a l’adaptador sintètic en memòria;
- accions ràpides per comprovar canvis ficticis d’avaluació, tasques i absències;
- respostes simulades per a perfil, fonts, registre tutorial i altres registres;
- una comprovació estàtica que rebutja la botiga real, Firebase, Firestore i IndexedDB dins del component pur.

Validacions superades:

- quatre proves unitàries de l’adaptador, inclosa l’edició de notes personals fictícies;
- compilació i inspecció automàtica del paquet d’assistència;
- ESLint;
- compilació completa de l’AvaluaPro real;
- `git diff --check`;
- comprovació al navegador de les sis columnes del grup ordinari;
- comprovació al navegador de les nou columnes del grup tutorial;
- edició i desament temporal d’una nota fictícia;
- quatre canvis temporals acumulats i eliminació total en restablir;
- recuperació dels valors inicials A, 60 % i 0 h després del restabliment;
- comprovació visual d’escriptori de la taula ampla i del desplaçament horitzontal.

Límit deliberat d’aquesta iteració:

- la vista de producció encara conserva el seu codi i les seves connexions actuals;
- el component pur només s’utilitza des de l’entorn sintètic;
- la substitució de la taula duplicada de producció es farà en una iteració separada, després d’afegir proves de paritat;
- no s’ha iniciat cap sessió real, no s’ha llegit cap dada d’alumnat i no s’ha desplegat res.

### Iteració 4 · Connexió del component compartit a la vista real

**Estat:** completada localment; no publicada.

S’ha fet:

- la vista real continua preparant les mateixes files, perfils, absències, anotacions i registres tutorials;
- el bloc visual duplicat s’ha substituït pel component compartit;
- s’han conservat les accions que obren perfil, anotacions, registre tutorial i altres registres;
- l’edició d’informació general continua cridant `updateStudent()` sobre la font original;
- la cerca, el filtre tutorial, l’exportació Excel i els modals continuen sota el control de la vista real;
- s’han afegit quatre proves de frontera i paritat estructural per impedir que reaparegui una taula paral·lela o que el component pur incorpori persistència.

Validacions superades:

- 8 proves específiques de l’entorn d’assistència i de la vista compartida;
- bateria completa de seguretat: 238 proves superades, incloses regles de Firestore amb emuladors;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- comprovació al navegador sintètic de 6 columnes ordinàries i 9 de tutoria;
- desament temporal d’una nota fictícia i eliminació completa en restablir.

Garanties i límits:

- el component compartit no importa Zustand, Firebase, Firestore ni IndexedDB;
- la vista real manté la seva connexió existent a les fonts originals: no s’ha creat una base de dades paral·lela;
- la verificació visual s’ha fet només a l’entorn sintètic;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat i no s’ha desplegat res;
- la resta de pantalles funcionals encara no utilitzen adaptadors comuns.

### Iteració 5 · Graella compartida d’avaluació

**Estat:** completada localment; no publicada.

S’ha fet:

- extracció de la graella d’avaluació a un component visual compartit;
- conservació del model real que prepara alumnes, competències, criteris, notes i anotacions;
- manteniment dels controls reals d’absència mitjançant una entrada explícita del component;
- manteniment de les accions de perfil, anotacions, recordatoris, rúbriques, notes i competències modificades;
- incorporació de la mateixa graella a l’entorn d’assistència;
- creació de dues competències, tres criteris i notes completament sintètiques;
- ampliació de l’adaptador en memòria per crear, modificar i retirar notes fictícies;
- una selecció separada entre «Vista integrada» i «Avaluació» dins l’entorn segur;
- quatre proves noves de frontera i connexió de la graella d’avaluació.

Validacions superades:

- 13 proves específiques de l’adaptador i dels dos components compartits;
- compilació i inspecció del paquet d’assistència;
- comprovació que els dos components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- comprovació al navegador sintètic de 24 files, dues competències i tres criteris;
- canvi del primer criteri d’A a D i recàlcul visible de la competència d’A a C;
- restabliment de la nota inicial A i eliminació dels canvis temporals;
- comprovació visual d’escriptori de la graella ampla.

Garanties i límits:

- la vista real conserva la seva lògica d’Excel, filtres, estructura, rúbriques, modals i persistència originals;
- el component compartit només rep dades i funcions, i no sap si treballa amb dades reals o sintètiques;
- l’entorn d’assistència només li proporciona l’adaptador en memòria;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat i no s’ha desplegat res;
- «Seguiment» encara continua acoblat directament a la botiga real i serà la pantalla següent a dividir en fragments controlables.

### Iteració 6 · Graella compartida de seguiment

**Estat:** completada localment; no publicada.

S’ha fet:

- extracció de la graella principal de Seguiment a un component visual compartit;
- conservació a la vista real del càlcul de tasques no fetes, punts, incidències, notes d’agenda i orientacions d’intervenció;
- conservació fora del component compartit dels modals, els recordatoris, les anotacions, el perfil i les operacions reals;
- manteniment del control real d’absència mitjançant una entrada explícita del component;
- incorporació de la mateixa graella a l’entorn d’assistència amb sis tasques i registres completament sintètics;
- ampliació de l’adaptador en memòria per modificar estats `Fet`, `Tard`, `No fet` i `Exempt` sense persistència;
- incorporació de la pantalla «Seguiment» a la navegació segura;
- quatre proves noves de frontera, connexió i absència de dependències persistents.

Validacions superades:

- 18 proves específiques de l’adaptador i dels tres components compartits;
- compilació i inspecció del paquet d’assistència;
- comprovació que els tres components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 248 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador sintètic de 24 files, tres tasques i els quatre estats de seguiment;
- canvi de la primera tasca de `Fet` a `No fet` i recàlcul visible de la constància del 50 % al 17 %;
- confirmació d’un únic canvi temporal desat només en memòria;
- restabliment de l’estat inicial `Fet`, de la constància del 50 % i de zero canvis temporals;
- comprovació visual d’escriptori de la graella compartida.

Garanties i límits:

- el component compartit només rep dades, funcions i el control d’absència que li proporciona cada entorn;
- l’entorn d’assistència només hi connecta dades fictícies i l’adaptador temporal en memòria;
- la vista real conserva les seves fonts i regles actuals, sense crear cap base de dades paral·lela;
- els diàlegs i fluxos sensibles de Seguiment continuen exclusivament a la vista real i no s’han activat a assistència;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 7 · Entrada inequívoca i empaquetatge reforçat

**Estat:** completada localment; no publicada.

S’ha fet:

- reserva d’una adreça local exclusiva per al desenvolupament d’assistència: `127.0.0.1:4174`;
- reserva d’una adreça local exclusiva per previsualitzar-ne el paquet: `127.0.0.1:4175`;
- ús de ports estrictes: si el port segur està ocupat, el servidor falla en lloc d’obrir-ne silenciosament un altre;
- marcadors estructurals `assistance`, `synthetic-only` i `runtime-boundary=verified` abans d’arrencar la interfície;
- política de seguretat del contingut que limita scripts, recursos i connexions al mateix origen, amb l’única excepció del WebSocket local de desenvolupament;
- barrera d’execució que rebutja xarxa externa, IndexedDB, localStorage, sessionStorage, Cache Storage, registre de service workers i `sendBeacon`;
- autocomprovació d’arrencada: el marcador `verified` només s’activa després que xarxa externa, IndexedDB i localStorage hagin estat rebutjats realment;
- inspecció del gràfic de mòduls durant el build per prohibir Firebase, l’entrada real, la botiga real, la base IndexedDB real i el connector Firebase real;
- generació de `assistance-build.json` amb l’entorn, la política de dades, la persistència, el commit base i l’estat net o modificat del directori;
- quatre proves específiques noves per a l’entrada, els comandaments, les proteccions i la configuració de compilació.

Validacions superades:

- 22 proves específiques de l’entorn d’assistència i dels tres components compartits;
- compilació del paquet d’assistència amb inspecció del gràfic de mòduls;
- verificació de l’empremta `assistance`, `synthetic-only` i `memory-only`;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 252 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador del marcador intern `runtime-boundary=verified`;
- comprovació visual del distintiu permanent «Xarxa externa bloquejada»;
- comprovació que Seguiment continua funcionant després d’activar les barreres: 50 % → 17 % i restabliment a 50 %;
- confirmació que el canvi temporal desapareix en restablir.

Garanties i límits:

- el comandament d’assistència no obre automàticament cap navegador ni cap sessió;
- cap mòdul de Firebase o persistència real pot entrar al paquet sense fer fallar la compilació;
- el build local registra honestament `dirty: true` mentre hi ha canvis sense commit i no es pot presentar com una publicació exacta d’aquell commit;
- la política de xarxa del document és una segona barrera, a més del bloqueig aplicat en execució;
- encara no s’ha creat l’origen públic separat ni s’ha configurat Firebase Hosting per a assistència;
- encara no s’ha implementat el paquet desidentificat opcional;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 8 · Assistència integrada i Anàlisi creuada sintètica

**Estat:** completada localment; no publicada.

S’ha fet:

- extracció del botó visual d’absència a un component compartit sense botiga ni persistència;
- manteniment de la connexió real d’absències dins d’Avaluació i Seguiment;
- connexió del mateix control a registres d’absència exclusivament sintètics i temporals;
- generació de registres ficticis amb data, hora, franja i total d’hores coherents;
- operació en memòria per afegir o retirar una absència fictícia de la franja actual;
- actualització simultània del total visible i de l’historial sintètic;
- extracció de la taula d’Anàlisi creuada a un component visual compartit;
- conservació a la vista real de tots els càlculs, perfils, decisions, evidències i historials originals;
- incorporació d’una superfície «Analítica» segura amb rendiment, constància, absències, punts vermells, punts negres, perfil i acció;
- ordenació sintètica per intervenció o alfabètica;
- consulta de les dates exactes de les absències fictícies;
- sis proves noves de frontera per al control d’assistència i la taula d’analítica, i una prova nova de l’adaptador d’absències.

Validacions superades:

- 29 proves específiques de l’entorn d’assistència i dels cinc components compartits;
- compilació i inspecció del paquet d’assistència;
- comprovació que els cinc components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 259 proves superades, incloses regles de Firestore amb emuladors;
- registre d’una absència fictícia des de la graella d’Avaluació;
- confirmació visual de l’estat actiu, un únic canvi temporal i el missatge de desament només en memòria;
- propagació immediata de 0 h a 1 h dins l’Anàlisi creuada;
- consulta de la data i hora exactes del registre fictici;
- ordenació A–Z amb «Alumne 01» com a primera fila;
- restabliment a 0 h i eliminació total dels canvis temporals;
- comprovació visual d’escriptori de la taula ampla d’Anàlisi creuada.

Garanties i límits:

- no s’ha creat cap pestanya separada d’assistència: el control continua integrat on es treballa, dins d’Avaluació i Seguiment;
- el component visual d’absència no sap si la font és real o sintètica;
- la taula compartida d’Anàlisi creuada només rep files preparades i accions explícites;
- l’entorn segur no calcula perfils a partir de cap font real: utilitza únicament el conjunt fictici integrat;
- la resta de panells d’analítica, com gràfics globals, evolució per UT i antecedents, encara no formen part de l’entorn d’assistència;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 9 · Tutoria acadèmica sintètica i limitada

**Estat:** completada localment; no publicada.

S’ha fet:

- extracció de la llista visual de perfils tutorials a un component compartit sense botiga ni persistència;
- conservació a la vista real dels filtres, els càlculs acadèmics, els informes, els diàlegs i les fonts originals;
- incorporació d’una superfície «Tutoria» exclusiva de l’entorn d’assistència;
- selecció automàtica del grup `Tutoria fictícia B`, sense obrir cap grup ni compte real;
- generació de 18 perfils tutorials completament ficticis;
- filtres locals «Prioritaris» i «Tots»;
- vista prèvia limitada al nom fictici, un suport genèric simulat, el recompte de competències no assolides, el recompte de registres tutorials i l’estat de preparació;
- ús exclusiu de casos genèrics `Cap suport`, `Cas fictici 1`, `Cas fictici 2` i `Cas fictici 3`;
- advertiment permanent que la vista no conté diagnòstics, comentaris familiars ni informació personal real;
- tres proves noves de frontera per assegurar la delegació de la vista real, l’origen sintètic de la vista segura i l’absència de formularis, coordinació o persistència al component compartit.

Validacions superades:

- 32 proves específiques de l’entorn d’assistència i dels sis components compartits;
- compilació i inspecció del paquet d’assistència;
- comprovació que els sis components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 262 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador sintètic dels 18 perfils del filtre «Tots»;
- selecció d’un perfil prioritari amb tres competències no assolides i tres registres tutorials ficticis;
- selecció d’un perfil sense alertes amb `Cap suport`, zero competències no assolides, zero registres i estat `No iniciat`;
- comprovació visual de l’avís que exclou diagnòstics, comentaris familiars i informació personal real.

Garanties i límits:

- la vista real continua mostrant al docent les dades reals quan entra normalment a AvaluaPro;
- l’entorn d’assistència no rep ni transforma els noms reals: arrenca directament amb identitats fictícies;
- la pantalla sintètica no inclou diagnòstics reals, observacions lliures, comentaris familiars, formularis tutorials, sociometria, missatgeria ni coordinació de cotutoria;
- les quantitats i els casos de suport de la demostració són inventats i només viuen a la còpia temporal en memòria;
- el component compartit només presenta files ja preparades i una acció de selecció;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 10 · Sociometria completament fictícia

**Estat:** completada localment; no publicada.

S’ha fet:

- extracció del resum visual d’indicadors sociomètrics a un component compartit sense fonts de dades ni persistència;
- conservació a la vista real dels càlculs, les relacions, els qüestionaris, els informes i totes les operacions originals;
- incorporació d’una superfície «Sociometria» exclusiva de l’entorn d’assistència;
- selecció automàtica del grup `Tutoria fictícia B`;
- generació integrada de 42 relacions inventades entre els 18 alumnes ficticis;
- càlcul local de densitat, inclusió, positivitat, índex de Moreno i parelles recíproques a partir del conjunt sintètic;
- classificació simulada en lideratge, acceptació, aïllament i rebuig;
- llista seleccionable dels 18 perfils amb eleccions i rebuigs ficticis;
- vista de detall limitada a la categoria simulada i als recomptes inventats;
- advertiments explícits sobre l’origen inventat de totes les relacions;
- tres proves noves de frontera per separar el resum visual, les dades sintètiques i els fluxos públics reals.

Validacions superades:

- 35 proves específiques de l’entorn d’assistència i dels set components compartits;
- compilació i inspecció del paquet d’assistència;
- comprovació que els set components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 265 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador sintètic dels 18 perfils i les 42 relacions inventades;
- comprovació d’un cas fictici d’aïllament i d’un cas fictici de rebuig;
- confirmació que no apareixen els controls `Copiar enllaç` ni `Sincronitzar sociograma`;
- comprovació visual de la llista sociomètrica i del detall seleccionat.

Garanties i límits:

- l’entorn d’assistència no crea ni obre qüestionaris públics;
- no hi ha enllaços compartits, tokens d’alumnat, respostes reals, notes lliures ni sincronització;
- cap relació real no es copia, anonimitza ni transforma: les relacions fictícies neixen dins el paquet segur;
- el component compartit només presenta indicadors i categories que ja ha rebut preparats;
- la vista real continua calculant els seus indicadors des de les fonts originals sense cap canvi de persistència;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 11 · Disposició d’aula fictícia i temporal

**Estat:** completada localment; no publicada.

S’ha fet:

- creació d’un component visual pur per representar un plànol d’aula sense botiga, persistència ni exportació;
- incorporació d’una superfície «Aula» exclusiva de l’entorn d’assistència;
- selecció automàtica del grup `Tutoria fictícia B`;
- creació d’un plànol sintètic de 20 taules, amb 18 alumnes ficticis i 2 taules lliures;
- distribució inicial basada únicament en les categories sociomètriques inventades de la demostració;
- selecció d’una taula per consultar posició, mig grup, categoria fictícia i suport genèric simulat;
- generació d’alternatives mitjançant una rotació exclusivament temporal en memòria;
- eliminació deliberada de fotografies, observacions, restriccions reals, historial, exportació i versions desades;
- tres proves noves de frontera per mantenir separades la planificació real i la representació fictícia.

Validacions superades:

- 38 proves específiques de l’entorn d’assistència i dels vuit components visuals purs;
- compilació i inspecció del paquet d’assistència;
- comprovació que els vuit components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 268 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador sintètic de 20 taules, 18 ocupades i 2 lliures;
- selecció d’un alumne fictici i comprovació de la seva posició simulada;
- generació d’una alternativa i confirmació que la selecció anterior desapareix;
- confirmació que no apareixen opcions de desar versions ni exportar el plànol.

Garanties i límits:

- l’entorn d’assistència no carrega disposicions, restriccions, observacions ni versions guardades del compte real;
- cap fotografia real no forma part del paquet segur;
- les posicions es calculen directament a partir dels alumnes i relacions ficticis integrats;
- el canvi d’alternativa només modifica l’estat temporal de la sessió i no deixa rastre al navegador;
- la disposició real conserva fora de l’entorn segur tota la seva planificació avançada, persistència, historial i exportació;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 12 · Grups cooperatius ficticis

**Estat:** completada localment; no publicada.

S’ha fet:

- creació d’una graella visual pura de grups cooperatius sense botiga, persistència ni serveis externs;
- incorporació d’una superfície «Grups» exclusiva de l’entorn d’assistència;
- selecció automàtica del grup `Tutoria fictícia B`;
- formació de cinc grups amb els 18 alumnes ficticis, distribuïts en grups de quatre i de tres;
- ús exclusiu de les categories sociomètriques simulades per repartir els perfils prioritaris inventats;
- classificació local dels grups com `Equilibrat` o `A revisar`;
- detall limitat al nombre de membres, l’estat simulat, els perfils prioritaris ficticis i la presència d’una referència positiva inventada;
- generació de noves propostes mitjançant rotació exclusivament temporal en memòria;
- exclusió deliberada de rols, observacions, restriccions, historial, còpia, compartició i versions desades;
- tres proves noves de frontera per separar la graella segura de la lògica avançada real.

Validacions superades:

- 41 proves específiques de l’entorn d’assistència i dels nou components visuals purs;
- compilació i inspecció del paquet d’assistència;
- comprovació que els nou components purs no importen Zustand, Firebase, Firestore ni IndexedDB;
- ESLint;
- compilació completa de Firebase;
- `git diff --check`;
- bateria completa de seguretat: 271 proves superades, incloses regles de Firestore amb emuladors;
- comprovació al navegador sintètic de cinc grups i 18 alumnes ficticis;
- selecció d’un grup i comprovació del detall simulat;
- generació d’una nova proposta i confirmació que la selecció anterior desapareix;
- confirmació que no apareixen les accions `Guardar` ni `Compartir`.

Garanties i límits:

- els grups segurs no anonimitzen ni reordenen cap agrupament real: es generen de zero amb dades fictícies;
- l’entorn d’assistència no carrega rols, criteris manuals, restriccions, observacions ni versions guardades;
- no permet copiar, projectar, compartir ni persistir els grups;
- la lògica real de generació, edició, qualitat, historial i sortida continua exclusivament dins la vista real;
- les alternatives només modifiquen l’estat temporal de la sessió segura;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 13 · Porta operativa obligatòria per a assistents

**Estat:** completada localment; no publicada.

S’ha fet:

- creació d’un protocol persistent `AGENTS.md` que s’aplica als assistents tècnics quan treballen dins del repositori;
- prohibició explícita d’obrir l’aplicació real autenticada, dominis de producció, còpies, exports, captures o fitxers amb alumnat real;
- separació explícita entre compilacions estàtiques per comprovar el codi i verificacions funcionals autenticades, que continuen reservades a Marc;
- creació d’un únic llançador per als comandaments `dev:assistance`, `build:assistance` i `preview:assistance`;
- comprovació que el llançador s’executa des de l’arrel exacta del projecte i que existeixen els fitxers essencials de l’entorn segur;
- eliminació de variables de credencials de Firebase i Google abans de crear el procés Vite;
- desactivació de l’obertura automàtica del navegador;
- obligació d’un marcador intern `synthetic-only` que només estableix el llançador;
- rebuig de la configuració Vite si s’intenta obrir directament o si, fins i tot amb el marcador, encara hi ha una credencial exposada;
- ampliació de l’empremta compilada amb `operationalGuard: required` i `credentials: excluded`;
- cinc proves automàtiques noves per verificar el protocol, el llançador, el rebuig de l’arrencada directa, el rebuig de credencials residuals i la no-revelació dels seus valors.

Validacions superades:

- 46 proves específiques de l’entorn d’assistència i de la seva porta operativa;
- compilació del paquet d’assistència exclusivament mitjançant el llançador;
- comprovació de l’empremta de compilació i dels nou components visuals purs;
- prova negativa d’arrencada directa sense marcador;
- prova negativa d’arrencada amb marcador però amb una credencial present;
- prova pràctica del llançador amb una credencial sentinella, exclosa abans d’iniciar Vite;
- comprovació local dels marcadors `assistance`, `synthetic-only` i de la política de xarxa;
- ESLint;
- compilació estàtica completa de Firebase, sense autenticació ni lectura remota;
- `git diff --check`;
- bateria completa de seguretat: 276 proves superades, incloses regles de Firestore amb emuladors.

Garanties i límits:

- el flux ordinari de l’assistent queda documentat de manera persistent i passa per una sola porta segura;
- l’entorn d’assistència no hereta les variables de credencials de producció que el llançador coneix i bloqueja;
- una petició general de continuar, corregir o verificar no autoritza desplegaments ni accés autenticat;
- si Marc demana explícitament una publicació, l’assistent pot executar el procés tècnic autoritzat, però Marc conserva la comprovació funcional del compte real;
- aquesta barrera és una protecció del repositori i del procés Vite, no un aïllament absolut del sistema operatiu davant un procés deliberadament maliciós amb accés total al terminal;
- la protecció efectiva combina el protocol persistent, el llançador, el rebuig de compilació, la política de xarxa del document i els bloquejos d’execució del navegador;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 14 · Esquema tancat i validador de paquets segurs

**Estat:** validador completat localment; generador i importador encara pendents i desactivats.

S’ha fet:

- definició de la versió 1 del paquet `avaluapro-assistance-safe-package`;
- aplicació d’una llista tancada de camps: qualsevol camp desconegut rebutja el paquet complet;
- eliminació estructural de tot text lliure;
- restricció de les etiquetes als patrons `Grup NN`, `Àrea NN`, `Alumne NN`, `Competència NN`, `Criteri NN` i `Tasca NN`;
- obligatorietat d’identificadors UUID v4 regenerats amb prefix segur segons el tipus;
- comprovació de duplicats, inclosos els criteris, i de totes les referències internes;
- substitució de dates i hores per índexs abstractes de dia, període i franja;
- ús exclusiu de catàlegs tancats per nivells, estats, colors, suport fictici i relacions sociomètriques;
- límits màxims per a totes les col·leccions i recomptes;
- errors segurs que indiquen codi i posició estructural però no reprodueixen camps desconeguts ni valors rebutjats;
- retorn d’un resum acceptat format només per recomptes;
- nou document específic de l’esquema, el flux previst i els límits del validador;
- nou control de frontera que impedeix que el validador incorpori Firebase, la botiga real o IndexedDB;
- nou conjunt de nou proves amb dades exclusivament inventades.

Validacions superades:

- 55 proves específiques de l’entorn d’assistència, la porta operativa i el validador;
- acceptació d’un paquet fictici coherent;
- rebuig de camps desconeguts sense reproduir-ne el nom ni el contingut;
- rebuig de noms, correus, URLs, dates exactes, IDs originals, duplicats, valors fora de catàleg i referències trencades;
- comprovació que l’error llançat no conté el contingut privat sentinella;
- compilació i inspecció del paquet d’assistència;
- inspecció dels nou components visuals purs i del validador segur;
- ESLint;
- compilació estàtica completa de Firebase, sense autenticació ni lectura remota;
- `git diff --check`;
- bateria completa de seguretat: 285 proves superades, incloses regles de Firestore amb emuladors.

Garanties i límits:

- encara no existeix cap botó per carregar paquets ni cap connexió entre el validador i l’aplicació real;
- el validador no ha llegit, convertit ni inspeccionat cap dada real;
- no s’ha creat cap exemple a partir del compte, d’una còpia o d’un export de Marc;
- canviar només els noms no seria suficient i el format rebutja qualsevol JSON amb camps addicionals;
- el validador no pot demostrar, per si sol, que una seqüència numèrica no prové d’un perfil real;
- abans d’habilitar cap importació cal implementar un generador local que regeneri identificadors, valors, dates i relacions sota control directe de Marc;
- fins que aquest generador no existeixi, cap paquet manual s’ha de considerar segur ni lliurar a Codex;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 15 · Motor local de regeneració del paquet segur

**Estat:** motor pur completat localment; encara no connectat a la botiga real, a cap pantalla, a l’exportació ni a l’importador.

S’ha fet:

- creació d’un motor pur que rep una estructura de font en memòria i només retorna un paquet nou validat i un resum de recomptes;
- generació d’UUID v4 criptogràfics nous per a classes, alumnat, competències, criteris, tasques i registres;
- eliminació completa de noms, correus, textos curriculars, notes, diagnòstics, dates i identificadors d’origen;
- arrodoniment del nombre d’alumnes de cada grup a les franges segures 12, 18, 24, 30 o 36;
- limitació a sis classes, quatre competències, quatre criteris per competència i vuit tasques per classe;
- regeneració independent de qualificacions, recomptes, incidències, suport fictici, seguiment i absències;
- regeneració completa de la sociometria sense copiar cap relació original;
- transformació de dates i hores en índexs abstractes;
- absència deliberada de qualsevol mapa exportat entre identificadors originals i nous;
- validació obligatòria del resultat abans de retornar-lo;
- incorporació del generador al control que prohibeix Firebase, la botiga real i IndexedDB dins els mòduls de paquet segur;
- set proves noves construïdes exclusivament amb sentinelles inventades.

Validacions superades:

- 62 proves específiques de l’entorn d’assistència, la porta operativa, el validador i el generador;
- comprovació que cap nom, correu, diagnòstic, nota, ID, text curricular, títol o data sentinella arriba al paquet;
- comprovació que una classe fictícia de 17 perfils es transforma en 18 perfils nous;
- comprovació que canviar totes les qualificacions, absències, incidències, diagnòstics i relacions de la font no canvia el resultat amb la mateixa aleatorietat de prova;
- comprovació que la font no es modifica i que no es retorna cap correspondència;
- comprovació dels límits màxims de generació;
- comprovació que la sociometria nova no conté autorelacions;
- rebuig d’un generador d’identificadors que no produeixi UUID segurs;
- inspecció dels nou components visuals purs i dels dos mòduls de paquet segur;
- ESLint;
- compilació estàtica completa de Firebase, sense autenticació ni lectura remota;
- `git diff --check`;
- bateria completa de seguretat: 292 proves superades, incloses regles de Firestore amb emuladors.

Garanties i límits:

- el motor no importa la botiga real, Firebase, IndexedDB, còpies ni exports;
- en aquesta iteració només s’ha executat amb fonts completament inventades que contenien sentinelles de prova;
- cap perfil real individual es conserva: els valors pedagògics, històrics i relacionals es generen de zero;
- només es conserva una estructura mínima i limitada, com el nombre aproximat d’alumnes després d’arrodonir-lo i el nombre acotat d’elements funcionals;
- encara no hi ha cap botó que pugui llegir l’estat real ni cap fitxer de paquet que es pugui descarregar;
- la futura connexió haurà de ser una acció local iniciada per Marc, amb resum previ, confirmació explícita i sense que Codex inspeccioni la pantalla real;
- l’importador continuarà pendent fins que el recorregut d’exportació local sigui segur i verificable;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 16 · Preparació, revisió i exportació local controlada

**Estat:** completada localment; no publicada. L’importador exclusiu de l’entorn d’assistència continua pendent.

S’ha fet:

- incorporació de la pantalla `Paquet segur per a assistència tècnica` a `Dades i Compte → Còpies i estat`;
- construcció immediata d’una font mínima que només conserva els identificadors interns necessaris per comptar classes, alumnat, competències, criteris i tasques;
- exclusió, abans d’invocar el generador, de noms, diagnòstics, observacions, fotos, correus, compte, dates i resultats originals;
- preparació del paquet exclusivament en memòria i presentació d’un resum de vuit recomptes impersonals;
- absència deliberada de previsualització de perfils, llistes de noms o correspondències entre identificadors;
- obligació d’escriure exactament `EXPORTAR PAQUET SEGUR` abans d’habilitar la descàrrega;
- segona validació completa immediatament abans de crear el fitxer;
- nom de fitxer fix i no identificable `avaluapro-paquet-segur-v1.json`;
- eliminació de la còpia temporal en memòria després de descarregar, cancel·lar o detectar un error;
- integració de la mateixa pantalla a la demostració aïllada mitjançant la pestanya `Paquet`, connectada només al conjunt sintètic;
- correcció visual perquè aquesta pestanya indiqui inequívocament que inclou tots els grups sintètics i no el grup actiu;
- sis proves noves sobre l’exclusió de camps, la frase exacta, la revalidació, el descart i la frontera de l’entorn segur.

Validacions superades:

- 68 proves específiques de l’entorn d’assistència, la porta operativa, el paquet segur i els nou components visuals purs;
- comprovació amb sentinelles que cap nom, diagnòstic, nota, foto, correu, data, identificador de compte ni resultat real arriba al generador;
- compilació i inspecció del paquet d’assistència, inclosos els tres mòduls del paquet segur;
- prova visual exclusivament a `127.0.0.1` amb 42 perfils ficticis;
- comprovació de les vuit categories del resum, del botó bloquejat abans de la frase exacta i de la seva habilitació posterior;
- cancel·lació del procés i confirmació que el paquet temporal desapareix sense crear cap fitxer;
- comprovació que la consola local no registra errors;
- ESLint;
- compilació estàtica completa de Firebase, sense autenticació ni lectura remota;
- `git diff --check`;
- bateria completa de seguretat: 298 proves superades, incloses regles de Firestore amb emuladors.

Garanties i límits:

- la pantalla real només prepara el paquet quan Marc prem voluntàriament el botó; Codex no necessita ni pot inspeccionar la pantalla autenticada;
- la pantalla no és una còpia de seguretat, no permet restaurar el paquet a AvaluaPro i no modifica cap dada del compte;
- el paquet que queda en memòria només és el resultat regenerat; la font mínima es crea dins la mateixa operació i no es retorna ni es desa;
- la verificació visual s’ha fet únicament amb dades fictícies a l’entorn d’assistència;
- encara no s’ha implementat la càrrega del fitxer a l’entorn d’assistència; fins que existeixi, Marc no l’ha de lliurar a Codex;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 17 · Importació exclusiva a l’entorn aïllat

**Estat:** completada localment; no publicada. El recorregut tècnic del paquet segur ja existeix de punta a punta.

S’ha fet:

- creació d’un importador que només forma part del paquet compilat d’assistència i no apareix a l’AvaluaPro real;
- límit estricte de 2 MiB abans de llegir i analitzar el fitxer;
- lectura local del JSON sense xarxa, Firebase, IndexedDB, `localStorage` ni `sessionStorage`;
- primera validació completa abans de mostrar cap resum;
- ocultació deliberada del nom del fitxer, del contingut individual i dels detalls rebutjats;
- resum limitat als mateixos vuit recomptes impersonals de l’exportador;
- obligació d’escriure exactament `CARREGAR PAQUET SEGUR` abans d’habilitar la càrrega;
- segona validació completa dins l’adaptador de memòria abans de substituir la demostració;
- conversió d’índexs abstractes en dates i franges fixes completament fictícies només per compatibilitat visual;
- absència de diagnòstics i notes personals fins i tot dins el conjunt carregat;
- identificació visible de l’origen com `Paquet segur carregat`;
- consideració de la càrrega com un canvi temporal perquè sempre es pugui desfer amb `Restableix la demostració`;
- correcció del cas sense tasques perquè la constància mostri `—` i no un percentatge invàlid;
- set proves noves de parseig, mida, transformació, revalidació, memòria, interfície i separació respecte de l’aplicació real.

Validacions superades:

- 75 proves específiques de l’entorn d’assistència, la porta operativa, el paquet segur i els nou components visuals purs;
- acceptació d’un paquet temporal amb un únic perfil completament fictici;
- comprovació que el botó de càrrega està bloquejat abans de la frase exacta;
- comprovació que, un cop carregat, només hi ha un perfil sintètic i l’origen queda identificat;
- comprovació que un paquet sense tasques no genera `NaN` ni errors visuals;
- retorn correcte al conjunt sintètic integrat de 42 alumnes mitjançant el botó de restabliment;
- comprovació que la consola local no registra errors;
- rebuig segur de JSON invàlid, camps desconeguts i fitxers massa grans sense reproduir sentinelles;
- compilació i inspecció del paquet d’assistència, inclosos els quatre mòduls del paquet segur;
- ESLint;
- compilació estàtica completa de Firebase, sense autenticació ni lectura remota;
- `git diff --check`;
- bateria completa de seguretat: 305 proves superades, incloses regles de Firestore amb emuladors.

Garanties i límits:

- l’importador no existeix a l’aplicació real i, per tant, el paquet no es pot restaurar al compte de Marc;
- seleccionar un fitxer només prepara el resum; carregar-lo exigeix una segona acció explícita;
- el paquet carregat viu únicament a la memòria de la pestanya segura i desapareix en restablir, recarregar o tancar la sessió;
- la prova visual ha utilitzat un fitxer creat manualment amb un únic perfil fictici i cap dada del compte;
- aquesta protecció no converteix una còpia ordinària en segura: només s’ha d’utilitzar el fitxer creat per l’exportador específic;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 18 · Auditoria final i guia operativa

**Estat:** completada localment; preparada per valorar una publicació, però encara no publicada.

S’ha fet:

- auditoria conjunta del protocol persistent, el llançador, la configuració Vite, la política de contingut, la barrera d’execució, l’exportador i l’importador;
- confirmació que no existeix cap via directa de l’importador cap a l’aplicació real, Firebase o la persistència del navegador;
- inventari explícit de la informació exclosa i de l’estructura mínima que el paquet conserva deliberadament;
- documentació dels riscos residuals: error humà d’adjunt, permanència del fitxer a Descàrregues, límit de l’aïllament de procés i verificació autenticada pendent;
- definició dels criteris obligatoris abans d’una futura publicació;
- creació d’una guia breu cronològica per a Marc, des del cas normal sense paquet fins a la seva eliminació final;
- instrucció inequívoca que Marc continua veient les dades reals i que l’assistent només treballa amb perfils ficticis o regenerats;
- llista concreta dels fitxers que no s’han d’adjuntar mai;
- protocol d’aturada si es selecciona o transmet accidentalment un fitxer incorrecte;
- quatre proves noves que protegeixen les advertències i els límits essencials dels dos documents.

Validacions superades:

- 79 proves específiques de la frontera d’assistència;
- 309 proves totals de seguretat, incloses regles de Firestore amb emuladors;
- compilació del paquet d’assistència i inspecció dels quatre mòduls del paquet segur;
- compilació estàtica completa d’AvaluaPro;
- ESLint;
- `git diff --check`.

Conclusió:

- el recorregut local està tècnicament preparat per a una futura publicació;
- la publicació continua bloquejada fins que Marc la demani de manera explícita i separada;
- després de publicar, la comprovació dins el compte real l’haurà de fer Marc sense compartir pantalla ni dades;
- no s’ha obert el compte real, no s’han inspeccionat dades d’alumnat, no s’ha creat cap commit i no s’ha desplegat res.

### Iteració 19 · Publicació controlada de l’exportador segur

**Estat:** publicada i verificada estàticament; comprovació autenticada pendent de Marc.

S’ha fet:

- petició explícita i separada de Marc per publicar;
- repetició de les 79 proves d’assistència i les 309 proves totals de seguretat;
- lint, compilació d’assistència, compilació Firebase i comprovació de diferències superats;
- commit selectiu `71d0004`, amb les captures i els fitxers temporals exclosos;
- enviament del commit a `main`;
- desplegament exclusiu de Firebase Hosting, sense desplegar regles ni modificar dades;
- comparació criptogràfica de l’HTML i dels quatre recursos principals publicats amb la compilació local, tots idèntics.

Límits mantinguts:

- l’assistent no ha obert el domini de producció ni ha iniciat sessió;
- no s’ha inspeccionat el compte real ni cap dada d’alumnat;
- l’entorn d’assistència continua sent local i no forma part del Hosting real;
- l’auditoria administrativa remota no s’ha repetit: la sessió havia caducat i el protocol exclou la lectura de Firestore real;
- Marc ha de comprovar personalment `Dades i Compte → Còpies i estat` abans d’enviar cap paquet.
