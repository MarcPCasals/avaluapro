# Iteració 10 — Horari versionat i calendari manual

Data de tancament: 19 de setembre de 2026

## Resultat

Agenda ja té una pantalla pròpia integrada amb l'estil d'AvaluaPro. La vista predeterminada continua sent **Avui** i dona accés directe a l'horari aplicable i a les properes excepcions. La vista Setmana queda reservada per a la calendarització de la iteració 11.

El docent pot crear l'horari inicial d'un curs i versions posteriors amb dates de vigència. Una versió nova pot copiar totes les franges de l'anterior i tancar-ne la vigència el dia abans. Cada còpia rep identificadors nous; la versió anterior i les sessions ja celebrades no es modifiquen.

## Graella horària

- cinc dies lectius amb franges de quinze minuts per col·locar l'hora exacta;
- sessions de 60, 90 i 120 minuts, amb la referència visible de 55, 85 i 115 minuts programables;
- grup, assignatura, mig grup i aula opcional;
- color suau heretat del grup d'AvaluaPro;
- moviment amb la nansa de tres línies en ordinador i amb punter tàctil;
- alta ràpida amb doble clic en un espai buit;
- edició i eliminació explícites;
- prevenció de solapaments, permetent franges consecutives.

## Calendari manual

El calendari admet festius, dies no lectius, jornades especials, classes anul·lades i classes extraordinàries o substitucions. Una excepció pot afectar tots els grups o una selecció concreta. Les classes extraordinàries queden marcades com a sessions que faran avançar la seqüència; la resta no consumeixen cap sessió prevista.

## Persistència i privacitat

Horaris, franges i excepcions utilitzen el repositori local-first de Planificació. Cada canvi es desa primer a IndexedDB, entra a la cua persistent i després se sincronitza amb Firestore. Les consultes carreguen només el curs o la versió oberts.

Les dades es guarden dins l'espai privat `users/{uid}`. Les proves de regles confirmen que el propietari pot crear i llegir el curs, l'horari, les franges i les excepcions, i que un altre compte no hi pot accedir ni escriure.

## Validació

- 27 proves del domini de Planificació;
- 16 proves de sincronització local de Planificació;
- 81 proves de regles de Firestore;
- còpia de versions amb identitats noves;
- selecció de la versió vigent per data;
- moviment d'una franja sense modificar una sessió històrica;
- detecció de solapaments;
- recuperació offline d'horari, franges i excepcions després de reobrir IndexedDB;
- lint complet correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- comprovació visual a 1440 × 1000 i 1024 × 768;
- graella amb cinc franges representatives i sense desbordament horitzontal;
- formularis de franja, versió i excepció complets dins la pantalla.
- Hosting publicat a `avaluapro.web.app`;
- el pilot publicat mostra Agenda només amb `?preview=agenda` i exigeix autenticació abans de carregar dades;
- la navegació publicada normal manté Agenda i Programació ocultes;
- el paquet publicat conté l'horari versionat, la nova versió i les classes extraordinàries amb avanç de sessió.

Les dades representatives s'han creat només al navegador local de prova. No s'ha creat cap horari, franja ni excepció al compte real.

## Pas següent

La iteració 11 connectarà una UP amb un grup i convertirà la seva seqüència ideal en sessions datades. Oferirà incorporació progressiva o proposta automàtica completa, dividirà activitats llargues i saltarà les excepcions abans de demanar confirmació.
