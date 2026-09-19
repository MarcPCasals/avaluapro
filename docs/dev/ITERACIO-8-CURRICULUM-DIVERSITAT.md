# Iteració 8 — Currículum, avaluació i diversitat

Data de tancament: 19 de setembre de 2026

## Resultat

La UP ja conté el bloc pedagògic que direcció necessita consultar: competències, aprenentatges esperats, criteris, indicadors, recursos específics i transversals, fets i conceptes, procediments i actituds i valors.

El docent pot escriure aquests elements o aprofitar com a suggeriments les competències, els criteris i els indicadors que ja té a AvaluaPro. La UP en conserva una fotografia textual i llegible, a més de l'identificador d'origen opcional. Una programació antiga continua tenint sentit encara que el currículum d'avaluació es modifiqui més endavant.

Cada activitat pot associar els indicadors de la UP i incorporar voluntàriament mesures d'atenció a la diversitat. La biblioteca d'AvaluaPro ajuda a trobar la mesura i preselecciona l'alumnat de la classe que té el perfil corresponent. El docent pot canviar aquesta selecció abans d'afegir-la.

## Capacitats tancades

- competències amb text visible i origen opcional d'AvaluaPro;
- aprenentatges esperats;
- criteris d'avaluació;
- indicadors d'avaluació;
- associació d'indicadors a cada activitat;
- recursos de competències específiques i transversals;
- fets i conceptes, procediments, actituds i valors;
- biblioteca d'orientacions connectada amb les dades locals d'AvaluaPro;
- selecció voluntària de mesures;
- preselecció d'alumnat coincident i correcció manual;
- resum de currículum i mesures a la columna lateral;
- recompte d'indicadors i mesures dins de la cronologia d'activitats.

## Privacitat

La biblioteca pot consultar els diagnòstics dins l'espai autoritzat d'AvaluaPro per proposar orientacions, però aquests diagnòstics no s'incorporen a Programació. L'activitat només desa:

- el text de la mesura pedagògica;
- la classe seleccionada;
- els identificadors i els noms de l'alumnat seleccionat explícitament.

La normalització del domini elimina qualsevol camp de diagnòstic o nota personal encara que arribi a l'entrada. Les regles rebutgen camps superiors inesperats als documents compartibles. Les notes personals continuen a la col·lecció privada definida per a Planificació.

## Interfície

El bloc curricular utilitza seccions desplegables per mantenir l'editor dens però llegible. Els quatre apartats principals es mostren en dues columnes a l'ordinador i en una columna a iPad. Els continguts ja incorporats apareixen com a etiquetes curtes i es poden retirar individualment.

L'atenció a la diversitat roman plegada fins que el docent prem **Aplicar una mesura**. El selector mostra classe, biblioteca, mesura i alumnat dins d'un únic flux i explica abans de desar que no copiarà diagnòstics ni notes personals.

## Validació

- 19 proves del domini de Planificació;
- 15 proves de sincronització local de Planificació;
- 80 proves de regles de Firestore;
- prova específica que confirma que diagnòstic i nota personal es descarten;
- prova de lectura de la mesura per direcció sense cap camp de diagnòstic;
- suite completa de seguretat correcta;
- lint correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- comprovació visual en ordinador i amplada d'iPad amb dades representatives fora del compte real;
- regles i Hosting publicats a `https://avaluapro.web.app`;
- comprovació autenticada de la previsualització publicada;
- comprovació que la versió normal continua amagant Agenda i Programació.

No s'ha creat cap UP, activitat, mesura ni dada d'alumnat fictícia al compte real.

## Pas següent

La iteració 9 crearà el flux de duplicació anual, conservarà les versions antigues i permetrà buscar i copiar activitats d'altres cursos sense alterar-ne l'origen.
