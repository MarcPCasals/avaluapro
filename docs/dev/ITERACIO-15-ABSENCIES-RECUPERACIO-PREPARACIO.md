# Iteració 15 — Absències, recuperació i preparació

Data de tancament: 19 de setembre de 2026

## Resultat

Mode aula ja cobreix els dos casos d'assistència acordats: absència completa i sortida a mitja sessió. El docent associa les activitats perdudes a l'alumne, conserva una recuperació pendent justificada i obté un text de correu editable sense sortir d'AvaluaPro.

La implementació reutilitza `agendaNotes`, `tasks`, `taskRecords` i `absenceRecords`. No crea una base paral·lela ni amplia l'accés a les dades. Les noves funcions entren en la sincronització, la còpia de seguretat i les regles que ja protegeixen el quadern del docent.

## Absència i sortida

- una absència completa presenta seleccionades totes les activitats recuperables;
- el docent pot desmarcar les que no cal recuperar;
- una sortida a mitja sessió comença sense cap activitat seleccionada;
- els elements de tipus indicació o transició no es tracten com a activitats perdudes;
- la pròxima sessió es busca entre totes les UP del mateix grup, perquè un canvi d'UP no perdi el recordatori;
- si no hi ha cap sessió posterior, el pendent continua visible des del dia actual;
- corregir una absència i tornar a marcar l'alumne com a present cancel·la la recuperació associada.

## Tasques i constància

Quan una activitat perduda genera evidència, el registre de l'alumne queda en estat **Exempt** amb l'etiqueta **Recuperació pendent justificada**. Això manté la tasca visible sense afegir un negatiu de constància.

La relació funciona tant si la tasca ja existia com si s'activa després de registrar l'absència. En marcar la recuperació com a feta des de Recordatoris:

- la tasca passa a **Fet**;
- desapareix el recordatori actiu;
- es conserva la data de recuperació;
- no es dupliquen ni la tasca ni el registre de l'alumne.

Editar una recuperació retira els vincles de les activitats desmarcades. En una sortida, aquestes activitats tornen a **Fet**; en una absència completa continuen **Exemptes**.

## Text de correu

Hi ha una plantilla per a cada cas. El text:

- usa només el nom de pila, també amb registres en format `COGNOMS, Nom`;
- incorpora data, assignatura, activitats, tasques per entregar, pròxima sessió i enllaços externs;
- es pot editar abans de copiar;
- només es copia al porta-retalls: AvaluaPro no envia el missatge ni gestiona destinataris.

## Materials i adaptacions

Cada material de Programació pot ser una simple consulta o requerir una acció: portar per l'alumnat, preparar, imprimir, comprar o reservar. Les accions preparables creen un recordatori el dia anterior per defecte, amb una antelació configurable.

- els pendents vençuts continuen a la pantalla Avui fins que es completen;
- el material es pot marcar com a preparat des de Mode aula o des de Recordatoris;
- canviar o eliminar el material cancel·la el recordatori antic sense esborrar-ne l'historial;
- si el material torna a ser preparable, el recordatori es reactiva;
- les mesures d'atenció a la diversitat i l'alumnat associat apareixen dins de l'activitat actual.

## Verificació visual i funcional

- Mode aula i formulari d'absència comprovats a 1440 × 1000;
- Mode aula i formulari d'absència comprovats a 1024 × 768;
- absència completa validada amb totes les activitats seleccionades;
- sortida a mitja sessió validada sense selecció inicial;
- correu validat amb `PUJOL FONT, Marta`, enllaç extern, evidència i pròxima sessió;
- registre de sortida i canvi de material a **Preparat** comprovats;
- els fitxers i les dades temporals de la prova visual s'han retirat;
- cap compte ni dada real s'han modificat durant la verificació.

## Validació tècnica

- 35 proves del domini de Planificació;
- 18 proves de sincronització local de Planificació;
- 11 proves específiques de Mode aula, assistència, recuperació, recordatoris i materials;
- 81 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció de producció correcta;
- auditoria Firebase preparada per desplegar, sense bloquejos ni respostes pendents de sincronitzar;
- regles locals i publicades idèntiques;
- `git diff --check` correcte.

Commit funcional: `9c15b4d`.

## Publicació

La versió s'ha publicat a `https://avaluapro.web.app` el 19 de setembre de 2026.

- `?preview=agenda` mostra el botó Agenda i continua exigint iniciar sessió abans de carregar l'horari;
- la navegació normal manté Agenda i Programació ocultes durant el pilot;
- el paquet publicat conté **Absència completa**, **Sortida a mitja sessió**, **Recuperació pendent justificada**, **Text de correu per copiar**, **Marcar preparat** i **Mesures previstes per a aquesta activitat**;
- l'auditoria posterior continua preparada per desplegar i no detecta respostes pendents de sincronitzar;
- les regles locals i desplegades continuen sent idèntiques;
- la comprovació publicada només ha utilitzat les dades demo i no ha escrit cap dada real.

## Pas següent

La iteració 16 completarà la compartició amb direcció i la coedició, comprovant que cada permís mostra només la programació o els grups expressament autoritzats i que les notes privades i les incidències individuals continuen fora de la vista compartida.
