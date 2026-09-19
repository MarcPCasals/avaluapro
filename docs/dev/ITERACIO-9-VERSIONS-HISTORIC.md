# Iteració 9 — Versions, històric i millora anual

Data de tancament: 19 de setembre de 2026

## Resultat

Programació ja pot crear una versió anual completa d'una UP sense modificar l'original. El docent tria el curs i la UT de destinació; la còpia rep identificadors nous per a la UP, les fases, les subfases i les activitats, i remapa totes les relacions internes. Els permisos de compartició no s'hereten entre cursos.

També es poden consultar les UP de cursos anteriors només quan s'obre l'històric. El docent pot cercar una activitat pel número visible `A1`, `A2`…, pel títol o per la descripció, triar la fase de destinació i copiar-la. La nova activitat conserva descripció, temporització, materials, agrupament, indicadors i mesures, i mostra discretament que ha estat recuperada.

## Millora anual

El domini ja admet els resultats que més endavant arribarà a registrar Agenda:

- temps real;
- estat final, continuació o activitat no feta;
- comentari d'aplicació i reflexió pedagògica;
- materials que han faltat;
- adaptacions útils;
- recomanació de conservar, modificar o retirar.

A partir d'aquestes dades es pot comparar el temps previst i el temps real mitjà per grup. Un excés queda identificat com a sobretemps i es mostra en vermell. Les reflexions generen propostes explícites per al curs següent, que es poden seleccionar i acceptar individualment o conjuntament. Cap resultat canvia la UP automàticament.

## Càrrega i sincronització

La pantalla inicial continua carregant només el curs actiu. Obrir l'històric activa consultes separades per curs i carregar una UP antiga activa només la seva estructura. Les còpies i les acceptacions utilitzen el repositori local-first existent: primer es conserven a IndexedDB i després entren a la mateixa cua de sincronització i conflictes que la resta de Programació.

## Seguretat

- la versió nova comença sense convidats;
- només el propietari pot crear una nova UP;
- direcció pot llegir les propostes i les dades pedagògiques reals de les UP compartides;
- les notes privades continuen fora de la UP;
- les regles només admeten els camps de procedència i revisió previstos;
- una prova integrada desa la còpia completa a l'emulador i comprova que els documents originals mantenen curs, temps i identitat.

## Validació

- 23 proves del domini de Planificació;
- 15 proves de sincronització local de Planificació;
- 81 proves de regles de Firestore;
- prova completa de duplicació amb fases, subfases, materials, indicadors, mesures i procedència;
- prova de comparació prevista-real per dos grups;
- prova d'acceptació selectiva de propostes;
- lint correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- comprovació visual a 1440 × 1000 i 1024 × 768;
- diàlegs de duplicació i històric sencers, sense desbordament horitzontal;
- cerca i selecció d'una activitat antiga comprovades amb dades representatives fora del compte real.

No s'ha creat cap UP, còpia ni activitat fictícia al compte real.

## Pas següent

La iteració 10 construirà l'horari versionat i el calendari manual, amb franges de 60, 90 i 120 minuts, mig grup, aula opcional, vigència per dates i excepcions lectives.
