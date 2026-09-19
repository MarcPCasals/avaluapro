# Iteració 11 — Assignació progressiva i distribució automàtica

Data de tancament: 19 de setembre de 2026

## Resultat

Agenda ja pot connectar una UP amb un grup i convertir la seqüència ideal en sessions datades. El docent tria entre incorporar només les pròximes activitats o preparar tota la UP pendent. En tots dos casos veu una previsualització completa abans que s'escrigui cap sessió.

La UP no es copia ni es modifica. Cada element de sessió conserva l'identificador de l'activitat original, de manera que les revisions futures podran comparar el temps previst amb el temps real sense barrejar la programació ideal amb l'aplicació d'un grup.

## Distribució temporal

- respecta l'ordre de fases, subfases i activitats;
- utilitza la versió d'horari que era vigent en cada data;
- reserva cinc minuts de cada franja: 55, 85 o 115 minuts programables;
- divideix una activitat llarga entre tantes sessions com calgui;
- manté cada fragment vinculat amb la mateixa activitat i mostra `part 1/3`, `part 2/3`, etc.;
- inclou les indicacions sense temps dins la cronologia sense restar minuts;
- salta festius, dies no lectius i anul·lacions que afecten el grup;
- no interpreta una jornada especial com una anul·lació automàtica;
- avisa i bloqueja la confirmació si el curs no ofereix prou sessions.

## Treball progressiu

En tornar a calendaritzar la mateixa UP i el mateix grup, Agenda carrega sota demanda les sessions i els elements ja creats. Les activitats completament assignades deixen d'aparèixer com a pendents. Si una sessió futura encara té minuts lliures, les activitats noves s'hi afegeixen abans de crear una data posterior. Això evita que una indicació sense temps o una activitat curta deixin una sessió artificialment buida.

## Confirmació i sincronització

La proposta es construeix en memòria. Només el botó **Confirmar i crear les sessions** desa l'aplicació de grup, les sessions noves i els seus elements. Les sessions existents no es recreen; només reben els nous elements confirmats.

Totes les escriptures passen pel repositori local-first de Planificació: primer queden a IndexedDB amb la seva ruta exacta, després entren a la cua persistent i finalment se sincronitzen amb Firestore. Les regles ja existents mantenen les sessions dins l'aplicació de la UP i limiten l'accés segons el propietari o el permís explícit del grup.

## Interfície

La vista **Avui** ofereix l'acció **Calendaritzar una UP**. La finestra conserva l'estil d'AvaluaPro amb taronja i violeta, separa la configuració de la previsualització i mostra:

- UP, grup i data d'inici;
- mode progressiu o proposta completa;
- activitats pendents i activitats ja assignades;
- sessions afectades amb data, hora i pressupost programable;
- fragments d'activitats llargues;
- dates saltades i motiu;
- avís de manca de sessions o confirmació que no s'ha perdut ni duplicat cap activitat.

## Validació

- 32 proves del domini de Planificació;
- 17 proves de sincronització local de Planificació;
- 81 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- comprovació visual amb una UP de quatre activitats, inclosa una indicació sense temps i una activitat de 120 minuts;
- previsualització correcta de 180 minuts en quatre sessions, amb un festiu saltat;
- finestra completa a 1440 × 1000, sense desbordament horitzontal;
- finestra compacta a 1024 × 768, amb desplaçament vertical intern i el panell dins la pantalla;
- les dades representatives s'han generat només per a la prova local i no s'ha modificat cap compte real.

Commit funcional: `d419ac7`.

## Publicació verificada

La versió s'ha publicat a `https://avaluapro.web.app` el 19 de setembre de 2026.

- `?preview=agenda` mostra el botó d'Agenda;
- obrir Agenda sense autenticació demana iniciar sessió abans de carregar dades;
- la navegació publicada normal continua ocultant Agenda i Programació durant el pilot;
- el paquet publicat d'Agenda conté **Calendaritzar una UP**, els dos modes, la confirmació i l'avís de manca de sessions;
- la verificació publicada no ha creat ni modificat cap dada real.

## Pas següent

La iteració 12 mostrarà les sessions ja calendaritzades a **Avui**, **Setmana** i la cronologia del grup. També incorporarà reajustaments, continuacions, cancel·lacions i classes extraordinàries que avancin la seqüència.
