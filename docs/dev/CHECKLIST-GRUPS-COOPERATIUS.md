# Redisseny dels grups cooperatius

Data de planificació: 20 de juny de 2026

## Objectiu del bloc

Passar d'una proposta automàtica carregada d'informació a una eina que permeti al docent:

1. entendre com i per què s'han creat els grups;
2. identificar ràpidament quin tipus d'alumnes hi ha dins de cada grup;
3. detectar fortaleses, desequilibris i incompatibilitats;
4. modificar la proposta amb facilitat;
5. veure l'impacte pedagògic de cada canvi manual;
6. guardar una versió completa, explicable i recuperable.

La proposta automàtica ha de continuar sent només un suport a la decisió docent. El programa no ha de presentar-la com una decisió definitiva.

## Diagnosi de la versió actual

### Punts que ja funcionen

- Es poden generar grups de 2 a 6 alumnes.
- Hi ha tres criteris: equilibrat, suportiu i treball eficient.
- Es pot prioritzar la separació per mig grup.
- L'algoritme utilitza rendiment, seguiment, relacions, incompatibilitats i sociometria.
- Es mostren vincles positius, vincles de treball i alertes.
- Es pot moure un alumne a un altre grup.
- Es poden guardar, recuperar, eliminar i copiar propostes.

### Problemes principals

#### 1. No s'explica prou la lògica general

El docent veu el resultat, però no una explicació clara de:

- quin objectiu s'ha prioritzat;
- quines dades s'han utilitzat;
- quines regles són fortes i quines són preferències;
- quins criteris no s'han pogut complir;
- per què una proposta pot ser acceptable tot i tenir alertes.

#### 2. La composició de cada grup costa d'interpretar

La informació existeix, però està repartida entre:

- colors de les targetes;
- abreviacions;
- comptadors;
- relacions textuals;
- alertes llargues.

No hi ha una lectura resumida del tipus:

> Grup equilibrat acadèmicament, amb un alumne de suport, dos perfils mitjans i un alumne prioritari ben acompanyat.

#### 3. Hi ha massa soroll visual

- Tots els detalls apareixen oberts al mateix temps.
- Les evidències positives i les alertes competeixen per l'atenció.
- Els grups amb problemes queden tenyits completament de taronja o vermell.
- Amb set o més grups, les columnes es tornen massa estretes.
- La vista no diferencia prou entre resum, explicació i accions.

#### 4. Moure alumnes és possible, però poc pràctic

- Cada alumne té un selector petit amb tots els grups.
- No hi ha intercanvi directe entre dos alumnes.
- Un moviment pot deixar grups amb mides inadequades.
- No es veu l'impacte abans de confirmar el canvi.
- No hi ha historial de canvis manuals ni desfer/rehacer.
- No es poden bloquejar alumnes o grups que ja funcionen.

#### 5. Les versions guardades conserven poca informació

Actualment es guarden principalment:

- nom;
- mida;
- estratègia;
- preferència de mig grup;
- noms dels grups;
- identificadors dels alumnes.

Caldrà valorar si també es guarden:

- resum de qualitat;
- alertes del moment de guardar;
- origen automàtic o manual;
- nombre de canvis manuals;
- criteris i pesos utilitzats;
- observació docent.

## Principis de disseny

### 1. Primer resum, després detall

Cada grup ha de permetre tres nivells de lectura:

1. estat general;
2. composició pedagògica;
3. evidències i alertes detallades.

### 2. Explicar amb llenguatge docent

Cal evitar que el docent hagi d'interpretar puntuacions internes o abreviacions tècniques.

Exemples:

- `alt` → `Rendiment alt`;
- `baix` → `Necessita reforç`;
- `prioritat` → `Seguiment prioritari`;
- `star` → `Referent o alumne influent`;
- `supportLabel` → mostrar-ne una etiqueta clara i una explicació disponible.

### 3. El color no pot ser l'únic codi

Els colors han d'anar acompanyats de text o icones. Això millora:

- accessibilitat;
- lectura ràpida;
- comprensió en pantalles amb poca qualitat;
- ús per persones amb dificultats de percepció del color.

### 4. L'edició manual ha de ser segura i reversible

Qualsevol canvi ha de:

- mostrar què s'està modificant;
- recalcular la qualitat;
- avisar si crea un problema;
- poder-se desfer;
- distingir la proposta automàtica de la versió editada.

### 5. La vista ha de continuar sent densa

No es busca convertir-la en una interfície amb targetes grans. El docent ha de poder comparar tots els grups, especialment a l'iPad i a l'ordinador.

## Flux d'ús objectiu

### Pas 1. Configurar la proposta

El docent defineix:

- mida orientativa dels grups;
- criteri principal;
- ús o barreja dels mig grups;
- restriccions docents, si aquesta fase s'incorpora;
- nom de la versió, només quan la vulgui guardar.

Canvi recomanat:

- separar `Generar proposta` de `Guardar versió`;
- no regenerar de manera silenciosa cada vegada que canvia un selector;
- mostrar un petit resum del criteri abans de generar.

### Pas 2. Entendre la proposta global

Abans de les targetes, mostrar una franja de resum:

- nombre de grups;
- distribució de mides;
- qualitat global;
- grups sòlids;
- grups a revisar;
- incompatibilitats;
- alumnes sense suport clar;
- nombre de canvis manuals.

També ha d'incloure:

- `Com s'ha creat aquesta proposta`;
- dades utilitzades;
- criteri prioritzat;
- limitacions detectades.

### Pas 3. Comparar els grups

Cada grup ha de mostrar, sense desplegar res:

- nom i nombre d'alumnes;
- estat: `Sòlid`, `Correcte`, `A revisar` o `Crític`;
- composició acadèmica;
- perfils de suport i seguiment;
- fortalesa principal;
- alerta principal;
- acció `Editar grup`.

### Pas 4. Consultar el detall

En clicar un grup, s'obre un panell lateral o un detall ampliat amb:

- explicació narrativa de la composició;
- llista completa d'alumnes i perfils;
- relacions positives;
- relacions de treball;
- incompatibilitats;
- alumnes sense vincle clar;
- criteris que compleix;
- criteris que no compleix;
- suggeriments de millora.

### Pas 5. Editar

El mode d'edició ha de permetre:

- seleccionar un alumne;
- moure'l a un altre grup;
- intercanviar-lo amb un alumne d'un altre grup;
- crear un grup nou;
- eliminar un grup buit;
- canviar el nom d'un grup;
- bloquejar un grup o un alumne;
- desfer i refer canvis;
- tornar a la proposta automàtica.

Després de cada canvi s'ha de mostrar:

- si la qualitat millora, es manté o empitjora;
- quina alerta desapareix;
- quina alerta nova apareix;
- si la mida dels grups queda desequilibrada.

### Pas 6. Revisar i guardar

Abans de guardar:

- mostrar resum final;
- indicar que hi ha canvis manuals;
- permetre afegir nom i observació;
- guardar els criteris de generació i la composició final;
- oferir copiar o imprimir la proposta.

## Arquitectura visual proposada

### A. Barra superior de configuració

Agrupar els controls en aquest ordre:

1. `Mida`;
2. `Objectiu`;
3. `Mig grup`;
4. botó principal `Generar proposta`;
5. menú secundari de versions.

El nom de la versió i `Guardar` poden aparèixer al final del procés, no competir amb els controls de generació.

### B. Resum global

Crear un component de resum amb:

- indicador de qualitat;
- mètriques clau;
- explicació de l'algoritme;
- llegenda dels perfils;
- accions `Revisar alertes` i `Veure metodologia`.

### C. Graella de grups

Recomanació per a ordinador:

- amplada mínima de targeta més gran;
- màxim de 4 grups visibles per fila;
- desplaçament vertical en lloc de set columnes molt estretes.

Recomanació per a iPad:

- 2 o 3 columnes segons amplada;
- targetes amb resum tancat;
- detall en panell lateral o modal ample.

### D. Targeta resum de grup

Ordre visual recomanat:

1. capçalera i estat;
2. frase-resum de la composició;
3. alumnes en files compactes;
4. fortalesa i alerta principal;
5. botons `Veure detall` i `Editar`.

Les evidències completes no han d'estar totes obertes per defecte.

### E. Fila d'alumne

Mostrar:

- nom;
- etiqueta principal de perfil;
- màxim de dues etiquetes secundàries;
- icona d'informació;
- control de selecció només quan el mode d'edició està actiu.

El selector `Moure a` no ha d'aparèixer permanentment a totes les files.

### F. Panell d'edició

Opció recomanada per a la primera versió:

- clicar `Editar grup`;
- seleccionar un alumne;
- mostrar destinacions possibles;
- oferir `Moure` o `Intercanviar`;
- previsualitzar l'impacte;
- confirmar el canvi.

El drag-and-drop pot arribar més endavant. En iPad pot ser menys fiable i menys accessible que una selecció guiada.

## Canvis funcionals necessaris

### 1. Model de perfils

Revisar `buildStudentCooperativeProfile` per exposar etiquetes pedagògiques consistents:

- nivell de rendiment;
- necessitat de reforç;
- prioritat de seguiment;
- vulnerabilitat sociomètrica;
- capacitat de suport;
- influència o lideratge;
- intensitat d'incidències;
- mig grup.

Cal diferenciar:

- dades observades;
- classificacions derivades;
- motius pels quals l'algoritme les ha utilitzat.

### 2. Anàlisi de cada grup

Ampliar `enrichCooperativeGroups` perquè retorni:

- puntuació o qualitat normalitzada;
- etiqueta de qualitat;
- resum narratiu;
- fortaleses;
- riscos;
- composició per perfils;
- compliment de la mida objectiu;
- criteris satisfets;
- criteris pendents;
- recomanacions de canvi.

### 3. Anàlisi global

Crear una funció específica, per exemple:

`analyzeCooperativeGroupSet(groups, options)`

Hauria de calcular:

- qualitat global;
- grups per estat;
- diferència màxima de mida;
- distribució acadèmica;
- distribució de perfils prioritaris;
- alumnes vulnerables amb o sense suport;
- incompatibilitats;
- cobertura de vincles de treball;
- compliment de mig grup;
- limitacions de la proposta.

### 4. Explicació de l'algoritme

Crear un objecte de metodologia llegible que indiqui:

- estratègia seleccionada;
- regles aplicades;
- pesos o prioritats expressats en llenguatge humà;
- dades absents;
- casos en què no hi havia una solució perfecta.

No cal mostrar els valors matemàtics exactes a la vista principal. Poden quedar en un desplegable avançat per facilitar auditoria i desenvolupament.

### 5. Edició manual

Substituir l'única operació actual per un model d'accions:

- `move`;
- `swap`;
- `create-group`;
- `rename-group`;
- `delete-empty-group`;
- `lock-member`;
- `lock-group`;
- `undo`;
- `redo`;
- `reset`.

Cada acció ha de generar una nova composició i tornar a executar l'anàlisi.

### 6. Mides dels grups

Definir explícitament el comportament:

- la mida seleccionada és objectiu o límit estricte?
- es permeten grups amb una diferència d'un alumne?
- quan es mou un alumne, s'ha de suggerir un intercanvi?
- es pot guardar una proposta amb un grup massa gran o massa petit?

Proposta:

- tractar la mida com a objectiu;
- permetre diferència d'un alumne;
- avisar quan la diferència sigui superior;
- no bloquejar el docent, però exigir confirmació abans de guardar una versió desequilibrada.

### 7. Versions guardades

Ampliar `tutorialGroupSets` amb camps opcionals:

- `observation`;
- `generationMeta`;
- `qualitySnapshot`;
- `manualChangeCount`;
- `sourceGroupSetId`;
- `updatedAt`;
- `groups[].name`;
- `groups[].memberIds`;
- `groups[].locked`;

La informació derivada es pot recalcular en carregar. El `qualitySnapshot` serveix per conservar la lectura del moment en què es va guardar.

### 8. Còpia i sortida

Millorar el text copiat perquè inclogui:

- nom de la versió;
- criteri;
- grups i alumnes;
- observació docent;
- alertes principals opcionals.

Valorar després:

- vista d'impressió;
- versió neta per projectar a classe, sense informació sensible;
- versió docent completa.

## Components recomanats

Per reduir la mida de `TutoringView.jsx`, separar progressivament:

- `CooperativeGroupToolbar.jsx`;
- `CooperativeGroupSetSummary.jsx`;
- `CooperativeGroupCard.jsx`;
- `CooperativeStudentRow.jsx`;
- `CooperativeGroupDetailPanel.jsx`;
- `CooperativeGroupEditor.jsx`;
- `CooperativeGroupHistory.jsx`;
- `CooperativeMethodologyPanel.jsx`.

Separar també la lògica en utilitats:

- perfil cooperatiu;
- generació;
- anàlisi;
- edició;
- historial d'accions;
- format de còpia.

No és necessari fer tota l'extracció de components a la primera iteració. S'ha de fer quan una fase funcional ho necessiti.

## Flux de treball d'implementació

### Fase 0. Tancar decisions de producte

- [ ] Confirmar els quatre estats de qualitat: `Sòlid`, `Correcte`, `A revisar`, `Crític`.
- [ ] Confirmar que la mida del grup és un objectiu flexible.
- [ ] Confirmar que la primera edició serà guiada i no basada en drag-and-drop.
- [ ] Confirmar si es podran crear i eliminar grups manualment en aquesta versió.
- [ ] Confirmar si es podran bloquejar alumnes i grups en aquesta versió.
- [ ] Confirmar si les alertes formaran part de la versió guardada o només es recalcularan.
- [ ] Confirmar quina informació pot aparèixer a la versió per projectar o copiar.

### Fase 1. Definir el contracte de dades

- [ ] Documentar els camps actuals del perfil cooperatiu.
- [x] Crear els noms pedagògics de cada perfil.
- [x] Definir l'estructura de `group.analysis`.
- [x] Definir l'estructura de l'anàlisi global.
- [ ] Definir `generationMeta`.
- [ ] Definir `qualitySnapshot`.
- [ ] Definir les accions manuals i les dades mínimes de cada acció.
- [ ] Garantir compatibilitat amb versions guardades antigues.

### Fase 2. Crear proves de la lògica actual

- [x] Afegir proves unitàries per `buildStudentCooperativeProfile`.
- [ ] Afegir proves unitàries per `getCooperativePlacementScore`.
- [ ] Afegir proves unitàries per `buildCooperativeGroups`.
- [ ] Afegir casos amb mig grup activat i desactivat.
- [x] Afegir casos amb incompatibilitats.
- [x] Afegir casos amb alumnes vulnerables sense suport.
- [ ] Afegir casos amb nombre d'alumnes no divisible per la mida objectiu.
- [ ] Afegir casos de dades acadèmiques o sociomètriques incompletes.

### Fase 3. Construir l'anàlisi explicable

- [x] Ampliar l'anàlisi de cada grup.
- [x] Crear l'anàlisi global de la proposta.
- [x] Generar frases-resum curtes i deterministes.
- [x] Generar fortaleses i riscos ordenats per importància.
- [x] Detectar grups amb mida inadequada.
- [x] Detectar concentració de perfils prioritaris.
- [x] Detectar alumnes sense suport clar.
- [x] Explicar les limitacions principals de la proposta.
- [x] Cobrir la nova anàlisi amb proves unitàries.

### Fase 4. Redissenyar la jerarquia visual

- [ ] Reordenar els controls de configuració.
- [ ] Afegir un botó explícit `Generar proposta`.
- [x] Crear el primer resum global.
- [ ] Afegir llegenda clara de perfils.
- [x] Augmentar l'amplada mínima de les targetes de la graella.
- [x] Redissenyar la capçalera de cada grup.
- [x] Afegir frase-resum de composició.
- [x] Substituir abreviacions internes per etiquetes pedagògiques.
- [x] Prioritzar la fortalesa i les alertes principals.
- [x] Traslladar els detalls complets a un panell desplegable.
- [x] Fer que l'estat tingui etiqueta textual i no depengui només del color.

### Fase 5. Crear el mode d'edició

- [x] Afegir un espai explícit de canvi manual pendent dins del detall.
- [x] Concentrar la selecció i el moviment d'alumnes dins del detall del grup.
- [x] Mostrar els grups de destinació dins del detall.
- [x] Mantenir funcional l'acció `Moure` sense selectors permanents a la graella.
- [x] Implementar `Intercanviar`.
- [x] Mostrar previsualització de l'impacte.
- [x] Avisar de grups massa grans o petits.
- [x] Recalcular l'anàlisi després de cada canvi.
- [x] Afegir `Desfer`.
- [x] Afegir `Refer`.
- [x] Mantenir `Tornar a automàtic`.
- [x] Diferenciar visualment els canvis manuals.

### Fase 6. Afegir bloquejos i canvis estructurals

- [x] Permetre bloquejar un alumne.
- [x] Permetre bloquejar un grup complet.
- [ ] Evitar que una regeneració mogui elements bloquejats.
- [x] Permetre crear un grup nou.
- [x] Permetre canviar el nom del grup.
- [x] Permetre eliminar només grups buits.
- [x] Definir que canviar mida, criteri o mig grup torna a la proposta automàtica i elimina els bloquejos manuals.
- [x] Afegir proves específiques d'aquestes regles.

### Fase 7. Millorar el guardat i l'historial

- [x] Afegir observació docent.
- [x] Guardar `generationMeta`.
- [x] Guardar `qualitySnapshot`.
- [x] Guardar el nombre de canvis manuals.
- [x] Guardar bloquejos si s'han incorporat.
- [x] Carregar versions antigues sense errors.
- [x] Permetre reutilitzar una versió com a nou punt de partida.
- [x] Indicar si les dades relacionals han canviat des del guardat.
- [x] Comparar la qualitat guardada amb la qualitat recalculada actual.

### Fase 8. Sortides i privacitat

- [x] Millorar `Copiar proposta`.
- [x] Separar còpia docent i còpia neta per a l'alumnat.
- [x] Evitar que la versió per projectar mostri perfils sensibles.
- [ ] Crear vista d'impressió si es considera necessària.
- [x] Revisar el text que explica què mostra i què oculta la vista per alumnat.

### Fase 9. Responsive i accessibilitat

- [x] Provar ordinador amb 1366 px o més.
- [x] Provar iPad en horitzontal.
- [x] Provar iPad en vertical.
- [ ] Provar mòbil amb funcionalitat reduïda.
- [ ] Verificar navegació per teclat.
- [ ] Verificar focus visible.
- [ ] Verificar etiquetes accessibles dels controls.
- [ ] Verificar contrast.
- [x] Verificar comprensió sense dependre dels colors.
- [x] Verificar àrees tàctils suficients a l'iPad.

### Fase 10. Validació docent

- [ ] Preparar tres casos realistes de grup classe.
- [ ] Cas A: classe equilibrada amb dades completes.
- [ ] Cas B: classe amb incompatibilitats i perfils vulnerables.
- [ ] Cas C: classe amb poques dades registrades.
- [ ] Mesurar si el docent entén la proposta sense explicació externa.
- [ ] Mesurar el temps necessari per moure o intercanviar un alumne.
- [ ] Comprovar si les alertes ajuden o generen soroll.
- [ ] Recollir vocabulari docent que calgui simplificar.
- [ ] Ajustar llindars i textos abans de donar el bloc per tancat.

### Fase 11. Verificació tècnica final

- [x] Executar proves unitàries.
- [x] Executar `npm run lint`.
- [x] Executar `npm run build`.
- [ ] Verificar guardat local.
- [ ] Verificar sincronització amb Firebase.
- [ ] Verificar backup i restauració.
- [ ] Verificar compatibilitat amb dades antigues.
- [ ] Revisar que no s'hagin introduït dades derivades innecessàries a Firestore.
- [x] Actualitzar la guia d'ajuda de grups cooperatius.
- [x] Fer captures finals d'ordinador i iPad.

## Ordre recomanat de les primeres iteracions

### Iteració 1. Explicació i resum

Inclou:

- contracte de dades;
- proves bàsiques;
- anàlisi per grup;
- anàlisi global;
- frases-resum;
- cap canvi important d'edició.

Resultat esperat:

> El docent ja pot entendre per què la proposta és bona o problemàtica.

### Iteració 2. Redisseny visual

Inclou:

- resum global;
- targetes simplificades;
- detall desplegable o lateral;
- nova llegenda;
- graella responsive.

Resultat esperat:

> El docent pot comparar tots els grups sense llegir totes les evidències.

### Iteració 3. Edició guiada

Inclou:

- mode d'edició;
- moure;
- intercanviar;
- impacte del canvi;
- desfer i refer.

Resultat esperat:

> El docent pot corregir una proposta en pocs passos i entendre les conseqüències.

### Iteració 4. Persistència i opcions avançades

Inclou:

- metadades completes;
- observacions;
- duplicació;
- bloquejos;
- creació i eliminació de grups;
- sortides docent/alumnat.

Resultat esperat:

> La proposta es converteix en una eina de treball reutilitzable durant el curs.

## Fitxers que probablement caldrà modificar

- `src/features/tutoring/TutoringView.jsx`
- `src/features/tutoring/cooperativeGroupSociometricUtils.js`
- `src/store/useAvaluaproStore.js`
- `src/App.css`
- `src/features/help/GuidedTour.jsx`
- fitxers nous de components de grups cooperatius
- fitxers nous de proves unitàries

També caldrà revisar:

- normalització de `tutorialGroupSets`;
- persistència IndexedDB i Firestore;
- exportació i restauració de backups;
- sincronització de tutoria compartida.

## Criteris d'acceptació del bloc

El redisseny es considerarà funcionalment complet quan:

- [ ] El docent pot explicar per què s'ha format cada grup.
- [ ] Cada grup mostra una composició pedagògica entenedora.
- [ ] Les alertes principals es detecten sense obrir tots els detalls.
- [ ] La vista permet comparar els grups a l'iPad.
- [ ] Moure un alumne requereix pocs passos.
- [ ] Es pot intercanviar dos alumnes directament.
- [ ] Cada canvi mostra l'impacte pedagògic.
- [ ] Els canvis es poden desfer.
- [ ] Les versions guardades conserven el context necessari.
- [ ] Les versions antigues continuen funcionant.
- [ ] La còpia per a l'alumnat no exposa informació sensible.
- [ ] La lògica principal està coberta per proves.

## Decisió recomanada per començar

Començar per l'explicabilitat, no per l'animació o el drag-and-drop.

L'ordre més segur és:

```text
Anàlisi explicable → resum visual → detall → edició guiada → historial → opcions avançades
```

Això permet millorar primer el valor pedagògic de la funcionalitat i, després, construir una edició manual que utilitzi la mateixa anàlisi per explicar l'impacte de cada canvi.
