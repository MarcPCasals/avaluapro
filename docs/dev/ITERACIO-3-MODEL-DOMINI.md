# Iteració 3 — Model de domini i identificadors

Data de tancament: 18 de setembre de 2026

## Resultat

S'ha implementat el model pur de Programació, Agenda i Mode aula sense afegir persistència, col·leccions de Firebase ni formularis. Les regles principals es poden executar i provar fora de React.

## Lliurables tancats

- 14 tipus d'entitat amb `schemaVersion: 1`.
- Identificadors estables i llegibles amb prefix `plan-*`.
- Curs acadèmic i UT amb dates validades.
- UP anual versionada amb procedència de còpia.
- Fases, subfases i activitats reordenables sense canviar d'identitat.
- Aplicació de la UP per grup i excepcions separades de la base.
- Horaris amb períodes de vigència i franges de mig grup.
- Esdeveniments, sessions i elements de sessió temporitzats o sense temps.
- Resultats pedagògics sense notes privades ni incidències individuals.
- Rols diferenciats per a propietari, direcció, editor de la UP i col·laborador d'Agenda.
- Pressupost de temps amb marge de cinc minuts i estats verd, taronja i vermell.
- Document de decisió i model amb exemples sense dades personals.

## Verificació

La suite `npm run test:planning-domain` cobreix 15 regles:

- estabilitat dels identificadors;
- còpia anual i procedència;
- validació de dates i hores;
- separació entre canvis de grup i canvis de base;
- proposta de canvi per als altres grups;
- pressupost de 60, 90 i 120 minuts;
- indicacions sense temporització;
- totals de fase i de UP;
- activitat dividida entre sessions;
- selecció de l'horari vigent;
- lectura de direcció sense dades privades;
- coedició sense escalada implícita de permisos;
- validació del correu exacte de les invitacions;
- versió d'esquema a totes les entitats.

També s'han executat el lint, la construcció de Firebase i la comprovació de diferències. Aquesta iteració no necessita una prova visual perquè no modifica cap pantalla.

## Límits deliberats

- No s'ha creat cap col·lecció ni índex de Firestore.
- No s'han modificat les regles de Firebase.
- No s'ha connectat el model al magatzem global ni a IndexedDB.
- No s'ha migrat la UT actual d'AvaluaPro; la correspondència es decidirà amb la persistència i la migració.
- La distribució automàtica d'activitats al calendari arribarà amb les iteracions d'Agenda.

El següent pas és la iteració 4: traduir aquest contracte a col·leccions petites, consultes selectives i regles d'accés provades.
