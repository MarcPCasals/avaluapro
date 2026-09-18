# Iteració 6 — Curs acadèmic, UT i estructura de la UP

Data de tancament: 18 de setembre de 2026

## Resultat

Programació ja té el primer recorregut complet i persistent. El docent pot crear el curs acadèmic, definir manualment les dates de les UT, crear una UP buida, editar-ne les dades bàsiques i organitzar-la en fases i subfases. La UP es pot arxivar i reactivar sense eliminar-ne l'històric.

La pantalla segueix la identitat d'AvaluaPro i distribueix l'editor en tres zones: navegació de curs i estructura, contingut principal de la UP i resum plegable. En una UP nova es creen tres fases inicials —Preparació, Resolució i Tancament— com a punt de partida editable, sense inventar activitats.

## Capacitats tancades

- creació i navegació de cursos acadèmics;
- dates inicial i final editables per a cada UT;
- creació, edició, arxiu i reactivació de UP;
- codi, nivell, títol, situació complexa, producte i llengua de la UP;
- fases i subfases flexibles;
- estat visible de sincronització;
- desament local primer i sincronització posterior amb Firebase;
- recuperació de la còpia local quan una lectura remota falla;
- protecció davant una edició antiga feta des d'un altre dispositiu.

## Decisions d'interfície

Programació conserva el violeta acordat per a les UP i l'accent taronja d'AvaluaPro. Els controls principals són visibles i els detalls queden dins l'editor, evitant carregar la pantalla inicial.

La interfície nova continua darrere de la previsualització `?preview=planning,agenda`. La versió normal publicada no mostra encara Agenda ni Programació.

## Seguretat i persistència

La primera creació de la UP es fa en una transacció que comprova que la ruta encara és buida. Les regles permeten aquesta comprovació sense donar accés a cap UP existent no autoritzada.

La prova integrada crea curs, UT, UP i tres fases, recarrega l'estructura, confirma que no conté activitats, l'arxiva i rebutja una edició antiga. El document remot no és substituït quan la versió esperada ja no coincideix.

## Validació

- 15 proves de sincronització local de Planificació;
- 77 proves de regles de Firestore, inclòs el recorregut complet de la UP;
- suite completa de seguretat correcta;
- lint correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- regles i Hosting publicats a `https://avaluapro.web.app`;
- comprovació autenticada de la versió publicada en ordinador i mida iPad;
- comprovació que la versió normal conserva els cinc grups reals i manté amagats els mòduls nous.

No s'ha creat cap curs ni cap UP fictícia al compte real. Les dades representatives s'han validat amb l'emulador de Firebase i la producció s'ha comprovat fins al formulari de creació, sense confirmar-lo.

## Pas següent

La iteració 7 afegirà activitats, indicacions i transicions; temps previst; materials; agrupaments; reordenació per nansa i el pressupost de sessió de 55, 85 o 115 minuts.
