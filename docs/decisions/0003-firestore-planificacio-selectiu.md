# Decisió 0003 — Firestore selectiu per a Programació i Agenda

Data: 18 de setembre de 2026
Estat: acceptada

## Context

AvaluaPro carrega actualment el seu espai principal per col·leccions completes de cada usuari. Programació i Agenda poden acumular diversos cursos, UP, grups i centenars de sessions. Afegir totes aquestes dades a la càrrega inicial faria més lenta l'aplicació i augmentaria lectures, escriptures i risc de conflictes.

La programació també es pot compartir amb direcció o altres docents, mentre que horaris personals, notes privades i incidències individuals necessiten límits diferents.

## Decisió

Les dades noves no s'afegeixen a `COLLECTIONS` ni a `loadCloudWorkspace`. Es consulten sota demanda amb un servei propi a `src/data/cloud/planningFirestore.js`.

La configuració privada del docent viu dins de `users/{uid}`:

- cursos acadèmics;
- UT;
- versions d'horari i franges;
- esdeveniments de calendari.

Les UP compartibles viuen a `planningUnits/{upId}`. Les fases, activitats, accessos i aplicacions són subcol·leccions. Cada aplicació de grup conté les seves excepcions i sessions; cada sessió conté els seus elements i resultats.

Les notes privades viuen a `planningPrivateNotes` i només es poden consultar amb `ownerUid == request.auth.uid`. No formen part dels resultats pedagògics visibles per direcció.

## Autorització

El document de la UP manté una projecció petita `accessByEmail` per poder autoritzar consultes de llistat sense llegir totes les concessions. La subcol·lecció `accessGrants` conserva el registre complet de la concessió.

Afegir o revocar un accés actualitza de manera atòmica:

1. el document de concessió;
2. `accessByEmail`;
3. `authorizedEmails`, que permet la consulta selectiva per correu.

Les regles comproven que aquestes peces coincideixen en la mateixa escriptura. Una invitació de Programació no amplia els permisos d'AvaluaPro sobre alumnat, incidències o diagnòstics.

## Consultes

- Llista de UP pròpies: `ownerUid`, curs, UT i actualització.
- Llista de UP compartides: `authorizedEmails array-contains`, curs, UT i actualització.
- Estructura d'una UP: només fases i activitats de la UP seleccionada.
- Aplicacions: només dins de la UP i, quan cal, per `classId`.
- Sessions: només dins de l'aplicació seleccionada i entre dues dates.
- Detall de sessió: només elements i resultats d'aquella sessió.
- Notes privades: només per propietari i UP o sessió.

No hi ha cap funció que descarregui tots els històrics de Programació durant l'arrencada.

## Conseqüències

- La càrrega inicial d'AvaluaPro no creix amb els cursos antics.
- Una UP es pot compartir sense compartir l'espai privat del docent.
- Revocar un accés elimina la capacitat de consulta en una sola operació.
- Cal mantenir índexs compostos per a les consultes de curs, UT, calendari i notes.
- La cua offline modular s'afegirà a la iteració 5 sobre aquestes mateixes rutes.
