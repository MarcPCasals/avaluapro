# Iteració 5 — Planificació local-first, offline i conflictes

Data de tancament: 18 de setembre de 2026

## Resultat

Els mòduls nous ja disposen d'una capa de dades local separada de l'espai global d'AvaluaPro. Encara no hi ha formularis que generin UP reals, però qualsevol pantalla nova podrà desar primer al navegador, treballar sense connexió i sincronitzar després.

## Capacitats tancades

- IndexedDB modular `avaluapro-planning-v1`.
- Còpia local, cua persistent i conflictes separats per usuari.
- Càrrega sota demanda per curs, UT, UP, grup, aplicació o sessió.
- Una única operació pendent per document, amb revisions que protegeixen les edicions posteriors.
- Sincronització ordenada per respectar la jerarquia entre documents pare i fills.
- Comparació transaccional amb Firestore abans d'escriure.
- Conflicte explícit entre ordinador i iPad sense substitució silenciosa.
- Resolució voluntària a favor de la versió local o remota.
- Sis estats públics: `Desat`, `Desant`, `Pendent`, `Sense connexió`, `Cal revisar` i `Error`.
- Neteja de la còpia local en tancar sessió.
- Bloqueig del tancament si hi ha canvis pendents que encara es perdrien.

## Proteccions específiques

Una consulta parcial no elimina dades locals que no apareguin al resultat. Només un carregador que declari que ha rebut un inventari complet pot reconciliar eliminacions.

El servei de Firestore utilitza `baseUpdatedAt` dins una transacció. Una escriptura només continua si el document remot conserva la versió que el dispositiu havia carregat, o si el mateix canvi ja consta al núvol.

## Validació

- 14 proves noves de rutes, persistència, desconnexió, cues, conflictes, resolució i neteja per usuari.
- 15 proves del domini de Planificació.
- 76 proves de regles de Firestore.
- suite completa de seguretat correcta;
- lint correcte;
- construcció Firebase correcta;
- `git diff --check` correcte.

No correspon una prova visual específica: aquesta iteració no afegeix cap control visible i els mòduls continuen desactivats per defecte. La iteració 6 connectarà el primer formulari real amb aquest repositori i comprovarà la persistència autenticada d'una UP buida.

## Pas següent

La iteració 6 construirà el curs acadèmic, les dates manuals de les UT i l'estructura inicial de la UP. Serà el primer recorregut vertical que escriurà dades reals mitjançant aquesta capa local-first.
