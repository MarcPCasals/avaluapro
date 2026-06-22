# Fitxa tecnica d'Avaluapro per a Direccio i Ministeri

Data d'actualitzacio: 21 de juny de 2026
Estat: resum tecnic actual; no constitueix certificacio ni autoritzacio d'us institucional

## 1. Producte

Avaluapro es una aplicacio web per avaluacio competencial, seguiment d'habits i conducta, tutoria, sociometria, agrupaments i analisi pedagogica. Actualment funciona com a quadern docent i no substitueix el sistema oficial del centre.

## 2. Arquitectura

| Capa | Tecnologia | Funcio |
| --- | --- | --- |
| Client web | React, Vite i JavaScript | Interficie i logica docent. |
| Persistencia local | IndexedDB | Treball local i tolerancia a problemes de xarxa. |
| Autenticacio | Firebase Authentication amb Google | Identificacio del docent. |
| Nuvol | Cloud Firestore | Sincronitzacio, backups i fluxos compartits. |
| Publicacio | Firebase Hosting | Servei web public. |

## 3. Dades tractades

Pot tractar dades identificatives, qualificacions, competencies, tasques, conducta, observacions, necessitats educatives, DOIPs, antecedents, relacions socials, sociogrames, fotos, agrupaments i copies de seguretat.

Son dades personals de menors i algunes poden tenir sensibilitat molt elevada. L'arquitectura no pretén anonimitzar el quadern docent, sino limitar, protegir i governar el tractament.

## 4. Mesures existents

- separacio privada per `users/{uid}`;
- autenticacio Google;
- HTTPS i xifratge gestionat per la infraestructura;
- backups privats per docent;
- regles especifiques per a paquets, cotutories i sociometria;
- propietari de cotutoria com a unic gestor de membres;
- llista tancada de subcol.leccions compartides;
- eliminacio compartida mitjancant tombstones;
- revocacio i sortida de cotutories;
- token sociometric individual, aleatori, no enumerable, d'un sol us i amb caducitat de 24 hores;
- avis informatiu abans de respondre;
- avisos de minimitzacio en camps sensibles;
- proves automatitzades de fluxos compartits.

## 5. Estat verificable

| Element | Estat a 22/06/2026 |
| --- | --- |
| Espai privat per UID | Implementat en produccio. |
| Regles compartides reforcades | Implementades, provades i desplegades el 22/06/2026. |
| Proves de seguretat | 26 proves de regles i 5 de sincronitzacio superades. |
| Desplegament de les regles reforcades | Completat; hash desplegat i local coincidents. |
| Prova sociometrica ficticia en produccio | Superada; dades de prova eliminades en acabar. |
| Proves amb dos comptes reals | Pendents. |
| Conflictes simultanis, iPad i restauracions | Pendents de prova real. |
| Purga sociometrica automatica | Pendent. |
| Entorns separats, MFA administratiu, logs i alertes | Pendents. |
| Revisio legal, AIPD i contractes definitius | Pendents de validacio externa i institucional. |

## 6. Darrer desplegament de seguretat

El 22 de juny de 2026 es van publicar conjuntament hosting i regles reforcades. Abans del desplegament es va sincronitzar el qüestionari de `2n B` i es va suprimir administrativament un qüestionari orfe de `4t E`, despres d'una comprovacio en sec i confirmacio explicita. Es van eliminar 24 respostes brutes i es van conservar 141 relacions ja importades. Despres es van eliminar els tres qüestionaris antics restants, preservant les relacions que ja s'havien importat.

No queda cap resposta pendent ni cap qüestionari antic actiu. Una prova en produccio amb dades ficticies va validar els controls principals del nou flux public i va netejar totes les dades de prova en acabar. Continuen pendents les proves reals completes amb dos comptes i dispositius, i la validacio institucional abans d'un pilot.

## 7. Model institucional proposat

Model pendent de confirmacio:

| Actor | Paper candidat |
| --- | --- |
| Ministeri o centre | Responsable del tractament. |
| Empresa Avaluapro | Encarregada del tractament i prestadora del servei. |
| Google/Firebase | Subencarregat tecnologic, si s'accepta aquesta infraestructura. |
| Docents | Usuaris autoritzats segons funcio i instruccions institucionals. |

Cal confirmar bases juridiques, rols, infraestructura, conservacio, exercici de drets, incidents, subencarregats, transferencies i condicions contractuals.

## 8. Proposta de seguent pas

1. executar proves amb dos comptes docents i almenys un iPad;
2. verificar conflictes, revocacio, backups i restauracio;
3. sotmetre el dossier a revisio tecnica i juridica;
4. obtenir respostes escrites del Ministeri;
5. definir un pilot limitat, reversible i sense funcions d'IA.

## 9. Documents de suport

- `docs/resum-executiu-paquet-ministeri.md`
- `docs/matriu-estat-dossier-institucional.md`
- `docs/mapa-dades.md`
- `docs/firebase-acces.md`
- `docs/aipd-preliminar-avaluapro.md`
- `docs/mesures-tecniques-organitzatives-preliminars.md`
- `docs/questionari-ministeri-decisions-institucionals.md`
