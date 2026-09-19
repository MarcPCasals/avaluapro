# Iteració 13 — Panell de classe, assistència i temporitzador

Data de tancament: 19 de setembre de 2026

## Resultat

Agenda ja pot convertir una sessió calendaritzada en una pantalla de classe completa. Cinc minuts abans de començar, la vista Avui proposa obrir **Mode aula** i resumeix el grup, les activitats i els materials preparats. El canvi de pantalla sempre requereix una acció del docent.

Mode aula ocupa tota la finestra, conserva el color del grup i concentra la informació necessària durant la sessió. La cronologia mostra l'activitat actual en gran, amb les anteriors i les següents en un segon pla i un punt de continuïtat entre elements. Les indicacions sense temporització també hi apareixen, però no consumeixen minuts.

## Temporitzador i recorregut de la sessió

- el temporitzador és opcional i mai emet so;
- comença com un compte enrere i, en superar el temps previst, continua en positiu i en vermell;
- en aturar-lo es pot confirmar **Ara**, **Fa 1**, **Fa 2**, **Fa 5**, **Fa 10** o indicar uns altres minuts;
- la correcció retrospectiva desa la durada real de l'activitat;
- **Fet i següent** registra l'activitat i avança;
- **Continuarà** reutilitza la previsualització d'Agenda, reparteix els minuts pendents i registra l'element original com a continuat;
- en tancar la classe, els elements sense excepció es consideren fets, tal com s'havia acordat;
- sortir sense tancar no marca la sessió com a realitzada.

Els resultats es desen sobre les mateixes activitats i sessions de Planificació. No s'ha creat cap registre paral·lel.

## Assistència connectada amb AvaluaPro

En entrar s'obren alhora la cronologia i la llista d'alumnes. El docent marca només les absències completes i confirma la llista; després, el panell d'alumnat passa a segon pla i es pot reobrir des del peu de pantalla.

Les sessions de mig grup filtren exactament l'alumnat que té aquell mig grup assignat. Cada absència conserva l'identificador de la sessió i la durada real de 60, 90 o 120 minuts, de manera que les estadístiques d'AvaluaPro reben les hores correctes. Els registres horaris antics continuen sent reconeguts.

## Tancament i funcionament sense connexió

Abans de tancar, Mode aula mostra un resum amb l'alumnat absent, els elements revisats i un avís si encara no s'ha confirmat la llista. L'obertura, la confirmació de l'assistència, els temps reals, les continuacions i el tancament entren a la mateixa cua local-first que la resta d'Agenda. Una pèrdua de connexió no elimina el treball i la sincronització es reprèn quan torna la xarxa.

Firestore només admet els tres nous moments de la sessió: obertura del Mode aula, confirmació de la llista i tancament. La prova de permisos confirma que un col·laborador d'Agenda autoritzat pot desar-los per als grups concedits i que un camp intern de temporitzador no reconegut és rebutjat.

## Verificació visual i funcional

- pantalla completa validada a 1440 × 1000, sense desbordament horitzontal;
- vista compacta d'iPad validada a 1024 × 768;
- llista d'assistència de 389 píxels i cronologia adaptable comprovades;
- confirmació de llista, compte enrere, aturada, correcció retrospectiva, pas a l'activitat següent i resum de tancament comprovats;
- les dades representatives temporals es van retirar després de la prova;
- cap compte ni dada real es van modificar durant la verificació.

## Validació tècnica

- 34 proves del domini de Planificació;
- 18 proves de sincronització local de Planificació;
- 4 proves específiques d'assistència;
- 81 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció de producció correcta;
- `git diff --check` correcte.

Commit funcional: `60e3583`.

## Publicació verificada

La versió s'ha publicat a `https://avaluapro.web.app` el 19 de setembre de 2026.

- les regles desplegades i les regles locals tenen exactament la mateixa petjada;
- la portada publicada respon correctament amb `no-cache, no-store, must-revalidate`;
- `?preview=agenda` mostra Agenda i, sense autenticació, protegeix l'horari demanant iniciar sessió;
- la navegació normal continua ocultant Agenda i Programació durant el pilot;
- el paquet publicat conté **Obrir Mode aula**, **Temporitzador opcional**, **Confirmar la llista**, **Tancar la classe**, la correcció de final i **Continuarà**;
- l'auditoria posterior al desplegament no detecta bloquejos ni respostes sense sincronitzar;
- la verificació publicada no ha creat ni modificat cap dada real.

## Pas següent

La iteració 14 connectarà aquesta mateixa pantalla amb les tasques i la constància existents d'AvaluaPro, els botons de comportament, la selecció múltiple d'alumnes, la reflexió pedagògica, la nota privada i la revisió posterior del temps real.
