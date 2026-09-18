# Línia de base abans d'integrar Programació i Agenda

Data de comprovació: 18 de setembre de 2026  
Iteració: 1 de 20 — Verificació i xarxa de seguretat  
Estat: EN CURS

## Objectiu

Fixar l'estat verificable d'AvaluaPro abans d'afegir Programació, Agenda i Mode aula. Aquesta iteració no incorpora funcionalitat nova ni modifica dades reals. Ha de permetre distingir un problema preexistent d'una regressió introduïda durant la integració.

## Referència de codi

- Branca: `main`.
- Commit local i remot verificat: `25a3eebbaf9ee279b8daf913d8aad3aabf458b77`.
- El repositori només tenia captures antigues sense versionar a `tmp/`; s'han preservat i no formen part d'aquesta iteració.
- Projecte Firebase actiu: `avaluapro`.
- Hosting de producció: `https://avaluapro.web.app/`.

## Resultats verificats

| Àmbit | Resultat | Evidència |
|---|---|---|
| Sincronització i cua local | Correcte en proves | 27 proves de càrrega inicial, diferències, cua persistent i còpia diària |
| Compartició de cotutoria | Correcte en proves | 6 proves de fusió, versions i tombstones |
| Coordinació | Correcte en proves | 10 proves de cua, autoria, lectura i recordatoris |
| Conservació i purga | Correcte en proves | 3 proves de retenció i 3 de purga amb emulador |
| Privacitat del briefing | Correcte en proves | 3 proves de pseudonimització i exclusió d'identificadors |
| Regles de Firestore | Correcte en proves | 62 proves d'accés permès i denegat |
| Qualitat estàtica | Correcte | `npm run lint` sense errors |
| Compilació Firebase | Correcte | `npm run build:firebase` completat |
| Regles locals/publicades | Idèntiques | SHA-256 local i publicat coincidents |
| Repositori remot | Correcte | `main` local coincideix amb `origin/main` |
| Vista iPad de referència | Correcte | 1024 × 1366 sense desbordament horitzontal a la vista publicada de demostració |

## Inventari de persistència actual

### IndexedDB

- Base de dades: `avaluapro-v2`.
- Versió: 15.
- 24 col·leccions de dades pedagògiques.
- Cua persistent `cloudSyncQueue` separada per usuari.
- Memòria i bústia de coordinació de cotutoria en magatzems específics.
- Índexs principals per classe, UT, alumne, tasca, data i estat.

### Firestore privat

- Dades ordinàries sota `users/{uid}/{collectionName}`.
- Metadades sota `users/{uid}/meta/app`.
- Còpies sota `users/{uid}/cloudBackups/{backupId}` amb les files en subcol·leccions.
- Les 24 col·leccions actuals continuen sent la unitat de sincronització admesa.

### Firestore compartit o temporal

- Paquets de notes entre docents.
- Espais, invitacions, senyals de canvi i coordinació de cotutoria.
- Qüestionaris sociomètrics i formularis tutorials amb zona pública limitada.
- Missatgeria interna, anuncis i suggeriments separats de l'espai pedagògic privat.

## Còpia recuperable

S'ha validat l'estructura d'una còpia v2 creada el mateix dia de la comprovació. La còpia de recuperació conté, entre altres col·leccions:

- 5 classes;
- 83 alumnes;
- 20 UT;
- 72 competències;
- 168 criteris;
- 6 tasques;
- 12 registres de tasca;
- 8 registres tutorials;
- 47 relacions tutorials;
- 12 antecedents.

Aquests recomptes són una fotografia de recuperació i no s'han de tractar com el recompte actual de Firebase. No s'ha restaurat ni substituït cap dada durant aquesta comprovació.

## Mides inicials de compilació

| Recurs | Mida minificada | Mida gzip |
|---|---:|---:|
| JavaScript principal | 1.616,94 kB | 443,61 kB |
| CSS principal | 479,55 kB | 72,79 kB |
| JavaScript auxiliar del navegador | 70,75 kB | 19,70 kB |
| Carpeta `dist` completa | 2,2 MB | — |

El paquet principal supera el llindar de 500 kB de Vite. Programació, Agenda i Mode aula hauran d'utilitzar càrrega diferida i no podran augmentar el paquet inicial de manera indiscriminada.

## Riscos oberts detectats

### R1 — Pestanyes autenticades amb estats diferents

En dues pestanyes de producció obertes al mateix navegador s'han observat aquests estats simultanis:

- una pestanya: `Sincronitzat`;
- una pestanya: `Revisió necessària — dades locals preservades`.

La protecció evita la substitució silenciosa, però abans de tancar la iteració cal determinar per què les dues pestanyes mantenen fotografies locals diferents. No s'ha recarregat ni reconciliat cap pestanya.

### R2 — Qüestionari amb respostes pendents

L'auditoria de Firebase informa:

- 1 qüestionari sociomètric actiu de format anterior;
- 8 respostes encara no sincronitzades;
- `readyToDeploy: false`.

No es desplegaran regles ni Hosting mentre aquest bloqueig continuï actiu. Les respostes s'han de sincronitzar o resoldre mitjançant el flux de l'aplicació, sense eliminar-les des de scripts o consola.

### R3 — Paquet inicial gran

La compilació és correcta, però el JavaScript principal és monolític. La iteració 2 haurà d'introduir fronteres i càrrega diferida abans d'afegir pantalles grans.

## Condicions pendents per tancar la iteració 1

- Resoldre o explicar la divergència entre les dues pestanyes sense perdre canvis locals.
- Sincronitzar de manera segura les 8 respostes pendents del qüestionari.
- Repetir `npm run audit:firebase` fins a obtenir `readyToDeploy: true`.
- Fer una prova autenticada i controlada de canvi, confirmació Firebase i càrrega en una pestanya nova.
- Comprovar el mateix resultat en ordinador i iPad o en dos contextos autenticats independents.
- Registrar els recomptes finals i una còpia recuperable immediatament anterior a qualsevol canvi estructural.

## Regla de continuació

No es començarà la iteració 2 ni s'afegiran col·leccions de Programació o Agenda fins que les condicions anteriors estiguin verificades. Qualsevol reconciliació que pugui substituir dades reals requerirà resum previ de recomptes i decisió explícita del docent.
