# Iteració 7 — Activitats, temps i cronologia

Data de tancament: 19 de setembre de 2026

## Resultat

L'editor de Programació ja permet construir i ordenar la seqüència completa d'una UP sense dependre d'Agenda. Cada fase o subfase pot contenir activitats, indicacions i pauses o transicions, i tots els elements es conserven amb identificadors estables a la còpia local i a Firebase.

Les activitats mostren directament el títol, la durada, l'agrupament, l'espai i el nombre de materials. La descripció i la resta de camps es poden editar sense carregar visualment la cronologia. Les indicacions sense temps, com ara un recordatori de material, ocupen el seu lloc a la seqüència però no sumen minuts.

## Capacitats tancades

- creació, edició i eliminació d'activitats, indicacions i transicions;
- reordenació dins d'una fase o entre fases mitjançant la nansa de tres línies;
- compatibilitat de la reordenació amb ratolí i interacció tàctil d'iPad;
- durada prevista opcional;
- agrupament, espai i tipus d'evidència;
- materials separats per al docent i l'alumnat;
- materials físics o enllaços externs;
- recompte de minuts per fase i per UP;
- estimació del nombre de sessions;
- franges de 60, 90 i 120 minuts amb marges programables de 55, 85 i 115 minuts;
- avisos verd, taronja i vermell segons la càrrega prevista;
- avís específic quan una activitat supera tota la franja i s'haurà de repartir o continuar a Agenda.

## Decisions d'interfície

La cronologia utilitza files lleugeres i evita convertir cada activitat en una targeta gran. Només la nansa inicia el moviment, de manera que clicar el contingut continua obrint l'edició i no provoca arrossegaments accidentals.

Els tres tipus d'element tenen una icona pròpia i una aparença discreta. El temps i els materials necessaris queden visibles; la informació secundària roman dins del formulari. La composició s'ha comprovat tant en ordinador com en una amplada equivalent a iPad.

## Seguretat i persistència

Les regles de Firestore només accepten els tipus `activity`, `indication` i `transition`. La reordenació actualitza totes les posicions afectades i conserva els materials i la resta de dades de cada element.

Els elements antics que encara no tinguin el camp de tipus es poden llegir com a activitats. Quan s'editen, el model normalitza i desa el tipus explícit.

## Validació

- 17 proves del domini de Planificació;
- 15 proves de sincronització local de Planificació;
- 79 proves de regles de Firestore;
- prova integrada de creació, reordenació entre fases i eliminació conservant els materials;
- suite completa de seguretat correcta;
- lint correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- regles i Hosting publicats a `https://avaluapro.web.app`;
- comprovació autenticada de la pantalla publicada;
- comprovació visual en ordinador i mida iPad amb dades representatives fora del compte real.

L'auditoria prèvia al desplegament va renovar l'autenticació de Firebase CLI, però la consulta següent va rebre temporalment un límit de quota `429`. El desplegament de regles i Hosting va acabar correctament, i les regles es van validar de manera independent amb l'emulador. No s'ha creat cap activitat fictícia al compte real.

## Pas següent

La iteració 8 completarà els camps oficials de la UP: competències, aprenentatges esperats, criteris, indicadors, recursos i mesures d'atenció a la diversitat. Les mesures podran aprofitar la biblioteca d'AvaluaPro sense copiar diagnòstics ni notes personals a Programació.
