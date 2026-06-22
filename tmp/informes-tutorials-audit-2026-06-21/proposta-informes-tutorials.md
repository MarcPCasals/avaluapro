# Proposta de simplificació dels Informes tutorials

Data: 21 de juny de 2026

## Abast

Pantalles revisades:

1. Entrada de «Perfil i PDF».
2. Part superior del perfil tutorial.
3. Seccions acadèmiques, seguiment i sociometria.
4. Final del perfil i estats sense dades.

Objectiu: facilitar que el docent revisi un alumne, escrigui la síntesi tutorial i generi el PDF amb el mínim soroll visual.

## Diagnòstic principal

La pantalla actual barreja alhora:

- configuració del PDF;
- lectura ràpida per a una reunió;
- edició del comentari del tutor;
- anàlisi acadèmica;
- seguiment tutorial;
- sociometria;
- detall exhaustiu;
- evidències i estats buits.

El contingut és valuós, però gairebé tots els blocs tenen el mateix pes visual. El docent no sap amb claredat quin és el pas següent i ha de recórrer un modal de més de 3.000 píxels, fins i tot quan hi ha poques dades.

## Decisió de nomenclatura

Canviar «Perfil i PDF» i «Perfils tutorials» per «Informes tutorials».

Quan s’obre un alumne:

- títol del modal: «Informe tutorial · Duran Pi, Jana»;
- evitar «perfil», que queda reservat al perfil personal accessible des del nom de l’alumne a Avaluació.

També caldrà actualitzar la guia, els textos d’ajuda i els resums de cotutoria on encara aparegui «Perfils tutorials».

## Proposta d’estructura

### 1. Entrada: una sola pantalla de selecció

Eliminar la targeta lateral «PDF de tutoria», perquè repeteix l’acció principal.

La pantalla quedaria formada per:

- títol «Informes tutorials»;
- frase breu: «Revisa la síntesi de cada alumne i prepara el PDF tutorial»;
- cercador per nom;
- filtres compactes: «Tots», «Prioritaris», «Amb seguiment» i «Pendents de revisar»;
- llista d’alumnes.

Cada fila mostraria només:

- nom de l’alumne;
- estat breu: «Ordinari», «Revisar» o «Prioritari»;
- una síntesi útil: «2 no assolides · 3 registres»;
- botó «Obrir informe».

Àrea i assignatura passarien a «Més filtres», perquè són filtres especialitzats i no cal veure’ls sempre.

### 2. Informe: separar preparació i document final

La capçalera del modal seria fixa:

- nom de l’alumne i classe;
- estat de l’informe: «Sense revisar», «En preparació» o «Preparat»;
- botó principal «Previsualitzar PDF»;
- menú secundari amb «Configurar seccions».

El cos tindria dues pestanyes:

1. «Preparar informe»
2. «Previsualització PDF»

Això evita que els controls de configuració competeixin visualment amb el contingut que acabarà al document.

### 3. Primera vista de «Preparar informe»

Només tres blocs oberts:

1. **Síntesi tutorial**
   - resum executiu automàtic, en 3 o 4 línies;
   - tres indicadors màxim: focus acadèmic, seguiment i situació social;
   - sense repetir el mateix missatge en una targeta i en un bloc verd.

2. **Comentari del tutor**
   - camp d’edició protagonista;
   - ajuda breu: «Què preocupa? Què ha millorat? Quin acord o seguiment proposem?»;
   - indicador de desament.

3. **Seccions incloses**
   - resum compacte: «5 de 7 seccions incloses»;
   - botó «Configurar» que obre un panell lateral o desplegable.

### 4. Informació secundària plegada

Sota els tres blocs principals:

- «Rendiment acadèmic»;
- «Seguiment tutorial»;
- «Lectura sociomètrica».

Cada apartat apareix com una fila-resum i es desplega només quan el docent el necessita.

Exemple:

> Rendiment acadèmic · 2 no assolides · Matemàtiques és el focus principal

El radar, les llistes d’àrees i les matèries fortes o delicades quedarien dins d’aquest desplegable, no tots oberts d’entrada.

### 5. Annexos fora de la lectura principal

«Detall de competències» i «Evidències de seguiment» són annexos. Haurien d’estar:

- plegats per defecte;
- desactivables des de «Configurar seccions»;
- preferiblement fora del PDF curt per defecte.

Proposta de configuració inicial:

- inclosos: síntesi, comentari del tutor, resum acadèmic, resum de seguiment i sociometria;
- opcionals: detall de competències i evidències completes.

### 6. Estats sense dades

No reservar grans espais buits. Si una secció no té dades:

- mostrar una sola línia compacta;
- oferir «No incloure al PDF»;
- no dibuixar gràfics, targetes ni contenidors grans sense contingut.

Exemple:

> Evidències de seguiment · Encara no hi ha registres · No s’inclourà al PDF

## Jerarquia visual recomanada

- Fons general blanc o gris molt suau.
- Una única tonalitat d’accent per a controls i acció principal.
- Colors verd, taronja i vermell només per comunicar estat o risc.
- Menys targetes independents: agrupar informació relacionada dins de seccions.
- Evitar majúscules i negretes simultànies en totes les etiquetes.
- Mantenir la capçalera i l’acció «Previsualitzar PDF» visibles mentre es fa scroll.

## Flux docent proposat

1. Entrar a «Informes tutorials».
2. Cercar o seleccionar un alumne.
3. Llegir la síntesi automàtica.
4. Escriure o revisar el comentari del tutor.
5. Obrir només els apartats que necessiti contrastar.
6. Previsualitzar el PDF.
7. Desar-lo.

## Prioritat d’implementació

1. Canvi de noms.
2. Separar «Preparar informe» de «Previsualització PDF».
3. Convertir configuració i seccions secundàries en contingut plegable.
4. Compactar els estats buits.
5. Simplificar la llista inicial i eliminar la targeta lateral redundant.

## Flux de treball complet proposat

### Estat 1. Llista d’informes

La pantalla «Informes tutorials» és el centre de treball del tutor.

Cada alumne hauria de tenir un estat visible:

- **No iniciat**: encara no s’ha revisat ni s’ha escrit cap síntesi.
- **En preparació**: té comentari o configuració modificada, però no s’ha marcat com a acabat.
- **Preparat**: revisat i llest per generar.
- **Cal revisar**: han entrat dades noves després de la darrera generació.

La fila de l’alumne mostraria:

- nom;
- estat;
- darrera actualització;
- resum molt curt de dades rellevants;
- acció «Preparar».

Filtres recomanats:

- Tots;
- Pendents;
- En preparació;
- Preparats;
- Cal revisar.

### Estat 2. Preparar l’informe

En obrir un alumne, el docent entra en una pantalla de preparació, no directament en el document llarg.

Capçalera fixa:

- «Informe tutorial · Nom de l’alumne»;
- estat actual;
- «Desar esborrany»;
- botó principal «Previsualitzar».

Cos:

1. Síntesi automàtica.
2. Comentari del tutor.
3. Apartats acadèmic, seguiment i sociometria plegables.
4. Resum de la configuració: «5 seccions incloses».

El comentari del tutor s’ha de desar com a dada persistent. Actualment viu només a l’estat temporal del modal i es pot perdre en tancar-lo.

### Estat 3. Configurar contingut

El botó «Configurar seccions» obre un panell lateral.

En lloc de set caselles amb el mateix pes, es proposen dos nivells:

**Informe breu — recomanat**

- síntesi tutorial;
- comentari del tutor;
- resum acadèmic;
- resum de seguiment;
- lectura sociomètrica quan hi hagi dades.

**Annexos opcionals**

- detall complet de competències;
- evidències completes de seguiment.

Regles útils:

- les seccions sense dades queden desactivades automàticament;
- el docent pot activar-les si vol mostrar explícitament «Sense dades»;
- la selecció queda guardada per alumne o com a preferència general del tutor;
- mostrar una estimació: «Informe aproximat: 2 pàgines».

### Estat 4. Previsualització real

La previsualització ha de ser la mateixa composició que s’enviarà al PDF:

- pàgines A4 visibles;
- salts de pàgina;
- capçalera amb alumne, classe i data;
- numeració de pàgines;
- avís si un bloc queda tallat;
- botó «Tornar a editar»;
- botó principal «Generar PDF».

No s’hauria de generar directament des de la pantalla d’edició. Primer cal veure exactament què sortirà.

### Estat 5. Generació i resultat

En clicar «Generar PDF»:

1. validar que hi ha almenys una secció;
2. construir una vista d’impressió independent;
3. esperar que gràfics, fotografies i tipografies estiguin carregats;
4. obrir el diàleg del sistema per desar com a PDF;
5. quan es tanca, mostrar «Informe generat» i registrar la data.

Nom d’arxiu suggerit:

`Informe_tutorial_Cognom_Nom_2026-06-21.pdf`

Després de generar:

- mantenir el document obert;
- oferir «Tornar a Informes tutorials»;
- marcar-lo com a «Preparat»;
- si després canvien dades o comentaris, passar-lo a «Cal revisar».

## Error actual del PDF en blanc

La causa més probable és aquesta regla d’impressió:

```css
body.tutorial-profile-printing .app-shell {
  display: none !important;
}
```

El modal de l’informe està renderitzat dins de `.app-shell`. Quan comença la impressió, el navegador amaga el contenidor pare i, per tant, també amaga tot el modal que havia d’imprimir.

Les regles següents intenten tornar a mostrar `.modal-backdrop` i `.modal-panel`, però no poden recuperar un element que té un avantpassat amb `display: none`.

### Solució immediata

No amagar `.app-shell`. Amagar només els seus fills que no formen part de l’informe:

- barra superior;
- navegació;
- pestanyes;
- contingut principal de fons;
- avisos i guies.

I mantenir visible el camí complet fins al modal.

### Solució robusta recomanada

Crear una vista específica `TutorialReportDocument` que contingui només el document imprimible.

Aquesta vista hauria de:

- rebre les dades i seccions seleccionades;
- ser reutilitzada tant a la previsualització com a la impressió;
- no dependre del modal ni del layout general de l’aplicació;
- tenir CSS A4 propi;
- evitar regles globals que amaguen l’arbre de l’aplicació.

Es pot renderitzar:

- en un contenidor d’impressió germà de `.app-shell`; o
- en un portal situat directament sota `body`.

La previsualització i el PDF han de compartir exactament el mateix component. Això evita que el docent aprovi una cosa i el navegador n’imprimeixi una altra.

## Pla d’implementació recomanat

### Fase 1. Reparació i noms

- corregir el PDF en blanc;
- canviar «Perfil i PDF» per «Informes tutorials»;
- canviar tots els textos relacionats;
- afegir una prova manual d’impressió amb contingut i sense dades.

### Fase 2. Document d’impressió independent

- crear `TutorialReportDocument`;
- reutilitzar-lo en previsualització i impressió;
- definir salts de pàgina i estils A4;
- comprovar Safari d’iPad i ordinador.

### Fase 3. Nou flux de preparació

- llista amb estats;
- comentari persistent;
- seccions plegables;
- configuració en panell lateral;
- previsualització abans de generar.

### Fase 4. Qualitat i seguiment

- nom d’arxiu coherent;
- data de darrera generació;
- estat «Cal revisar» quan entren dades noves;
- comprovacions amb informes curts, llargs, buits i amb sociometria.

## Accessibilitat: riscos visibles

- Els colors no haurien de ser l’única manera d’indicar prioritat; cal mantenir etiquetes textuals.
- Els desplegables han d’exposar estat obert/tancat i funcionar amb teclat.
- La capçalera fixa no ha d’ocultar el títol de la secció quan es navega amb focus.
- Cal comprovar contrast, ordre de focus i lectura amb tecnologia assistiva durant la implementació; les captures no permeten validar-ho completament.

## Captures

- `01-informe-tutorial-actual.png`: entrada i configuració actual.
- `02-informe-tutorial-contingut.png`: acumulació de blocs acadèmics, seguiment i sociometria.
- `03-informe-tutorial-final.png`: estat buit final amb una gran quantitat d’espai reservat.
