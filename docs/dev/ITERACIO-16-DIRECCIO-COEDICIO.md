# Iteració 16 — Direcció i coedició

Data de tancament: 19 de setembre de 2026

## Resultat

Cada UP es pot compartir amb un correu exacte i un dels tres permisos acordats. La persona convidada troba la programació dins del seu AvaluaPro quan entra amb aquell compte; l'aplicació no envia cap correu ni crea comptes.

Els permisos es concedeixen i es retiren de manera atòmica a Firestore. El document de l'accés i la llista autoritzada de la UP es modifiquen junts, de manera que no poden quedar desalineats després d'una interrupció.

## Perfils d'accés

### Direcció · lectura

- consulta la UP concreta, encara que estigui en esborrany;
- veu la seqüència, el currículum, les mesures d'atenció i l'alumnat que consta a la programació oficial;
- pot obrir **Aplicació real** i consultar sessions, temps previstos i reals, reflexions pedagògiques, comentaris d'aplicació i materials que han faltat;
- no pot editar cap document;
- no rep notes personals, incidències individuals ni diagnòstics.

### Coedició de la UP

- edita la identificació, el contingut pedagògic, les fases i les activitats de la UP;
- els canvis passen per la mateixa cua local-first i continuen pertanyent al docent propietari;
- no pot consultar ni modificar les aplicacions dels grups;
- no pot compartir, revocar, arxivar, duplicar ni recuperar contingut històric de la UP.

### Agenda per grups

- el propietari selecciona expressament els grups autoritzats;
- el col·laborador veu aquests grups a Avui, Setmana i Cronologia encara que no tingui un curs propi configurat;
- pot obrir Mode aula i desar sessions, elements i resultats només dels grups concedits;
- no pot editar la UP base ni obrir un altre grup;
- les notes personals que escriu pertanyen al seu compte i no es comparteixen amb el propietari ni amb direcció.

## Interfície

El propietari disposa dels botons **Vista direcció** i **Compartir** a l'editor de la UP. La finestra de compartició permet:

- escriure o modificar el correu exacte;
- escollir lectura, coedició o Agenda;
- seleccionar un o diversos grups quan el permís és d'Agenda;
- revisar els accessos actuals;
- editar-ne el rol o els grups;
- retirar l'accés.

La vista compartida té dues pestanyes. **Programació** mostra el document base de manera visual i desplegable. **Aplicació real** es carrega només quan s'obre i consulta exclusivament les sessions que el perfil pot llegir.

## Sincronització i privacitat

- la còpia local queda separada per compte autenticat;
- una edició compartida conserva l'identificador del propietari original;
- la cua valida les col·leccions que han de pertànyer sempre al compte actual, com calendari privat, concessions i notes personals;
- Firestore continua decidint l'autorització final de cada lectura i escriptura;
- les consultes de l'Agenda compartida inclouen sempre el grup autoritzat;
- la revocació retira el correu de la UP i talla l'accés immediatament.

## Verificació visual i funcional

- finestra de compartició comprovada a 1440 × 1000;
- vista de direcció i aplicació real comprovades a 1024 × 768;
- seqüència, currículum, mesures, temps reals i reflexions visibles;
- notes personals i incidències individuals absents de la vista compartida;
- els fitxers temporals de la prova s'han retirat;
- cap accés real ni dada real s'ha modificat durant la verificació.

## Validació tècnica

- 36 proves del domini de Planificació;
- 18 proves de sincronització local de Planificació;
- 11 proves de Mode aula, assistència i recuperació;
- 84 proves de regles de Firestore;
- proves específiques de coedició local-first i Agenda compartida correctes;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció de producció correcta;
- auditoria Firebase preparada per desplegar, sense bloquejos ni respostes pendents de sincronitzar;
- `git diff --check` correcte.

Commit funcional: `6a29571`.

## Publicació

Pendent de desplegar les regles de Firestore i Firebase Hosting.

## Pas següent

La iteració 17 construirà la vista documental i el Word editable, afegirà la importació de taules d'Excel o Numbers, prepararà el JSON versionat i reservarà els espais per a les imatges pedagògiques originals.
