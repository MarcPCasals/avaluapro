# Iteració 4 — Firestore, regles i consultes selectives

Data de tancament: 18 de setembre de 2026

## Resultat

El model de la iteració 3 ja té rutes de Firestore, consultes limitades, índexs i regles d'accés. Encara no s'utilitza des de la interfície i no s'ha creat cap UP real.

## Persistència

- Curs, UT, horari, franges i calendari dins l'espai privat `users/{uid}`.
- UP compartibles a `planningUnits`.
- Fases, activitats i concessions sota una única UP.
- Aplicació, excepcions i sessions sota el grup corresponent.
- Elements i resultats sota una única sessió.
- Notes privades a `planningPrivateNotes`, fora de l'arbre compartible.
- Servei de dades separat; les col·leccions noves no entren a la càrrega global actual.

## Seguretat provada

S'han afegit 14 proves de regles de Planificació. Comproven:

- creació només pel propietari;
- llistats limitats per `ownerUid` o `authorizedEmails`;
- direcció amb lectura de la UP i l'aplicació real, sense escriptura;
- editor de la UP sense accés implícit al grup;
- col·laborador d'Agenda limitat als seus `classIds`;
- tercer sense cap accés;
- camps inesperats i canvis d'identitat rebutjats;
- concessió i revocació atòmiques;
- notes privades només pel propietari;
- reflexió pedagògica compartible sense nota privada;
- curs i calendari privat protegits dins de `users/{uid}`.

La suite completa de regles suma 76 proves: les 62 anteriors i les 14 noves.

## Consultes i índexs

S'han declarat 12 índexs compostos. Les funcions de lectura exigeixen un abast concret: curs, UT, UP, grup, aplicació, sessió o interval de dates. No existeix cap càrrega nova de tots els cursos o totes les sessions.

## Validació

- `npm run test:planning-domain`
- `npm run test:rules`
- `npm run test:security`
- `npm run lint`
- `npm run build:firebase`
- `git diff --check`
- auditoria de predesplegament de Firebase, que s'haurà de repetir quan es reiniciï la quota;
- desplegament de regles, índexs i Hosting al projecte `avaluapro`;
- comprovació autenticada de la versió publicada amb dades reals.

L'auditoria que consulta l'estat real ha retornat `429 RESOURCE_EXHAUSTED` abans de completar-se. No s'ha escrit cap dada de prova ni s'ha interpretat aquest resultat com una validació del núvol. Les regles s'han validat a l'emulador i el contrast real es repetirà després del reinici de quota.

El desplegament posterior ha compilat i publicat correctament les regles i els 12 índexs. A `https://avaluapro.web.app` s'ha comprovat que el compte autenticat continua carregant els cinc grups reals i mostra la sincronització activa. Amb la previsualització controlada també apareixen Agenda i Programació, mentre que la versió normal els manté amagats. No s'ha creat cap dada real de Planificació perquè la interfície encara no desa en aquestes col·leccions.

La prova visual cobreix la regressió de la carcassa i l'accés a les dades existents. El primer flux real de Planificació es provarà amb una sola UP i un sol grup quan l'editor comenci a desar dades.

## Pas següent

La iteració 5 afegirà IndexedDB modular, cua persistent, fusió de canvis i estats de sincronització sobre aquestes rutes, abans que els formularis de Programació generin dades reals.
