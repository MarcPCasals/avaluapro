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

| Element | Estat a 21/06/2026 |
| --- | --- |
| Espai privat per UID | Implementat en produccio. |
| Regles compartides reforcades | Implementades i provades localment. |
| Proves de seguretat | 26 proves de regles i 5 de sincronitzacio superades. |
| Desplegament de les regles reforcades | Pendent per migracio de qüestionaris antics. |
| Proves amb dos comptes reals | Pendents. |
| Conflictes simultanis, iPad i restauracions | Pendents de prova real. |
| Purga sociometrica automatica | Pendent. |
| Entorns separats, MFA administratiu, logs i alertes | Pendents. |
| Revisio legal, AIPD i contractes definitius | Pendents de validacio externa i institucional. |

## 6. Incidencia bloquejant actual

Abans de publicar l'enduriment de seguretat cal sincronitzar i netejar deu qüestionaris antics. Dos contenen 47 respostes en total i presenten una resposta pendent de sincronitzar cadascun. Hosting i regles s'han de desplegar conjuntament.

No s'ha d'obrir un pilot institucional amb dades reals fins que aquest desplegament i les proves reals estiguin completats.

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

1. completar la migracio i el desplegament segur;
2. executar proves amb dades ficticies i dos comptes;
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
