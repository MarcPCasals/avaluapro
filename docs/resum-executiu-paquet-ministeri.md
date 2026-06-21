# Resum executiu del paquet Avaluapro

Data: 21 de juny de 2026
Destinataris: Ministeri d'Educacio, Direccio, proteccio de dades i sistemes

## Que es Avaluapro

Avaluapro es un quadern docent web per a avaluacio competencial, seguiment, tutoria, sociometria i suport a decisions pedagogiques. Actualment no substitueix el sistema oficial del centre.

## Per que s'envia aquest dossier

El projecte ha arribat a un punt en que necessita decisions institucionals abans de constituir una empresa, migrar infraestructura o obrir un pilot amb dades reals.

El dossier permet valorar:

- el model de contractacio;
- els rols de proteccio de dades;
- la infraestructura admissible;
- els requisits de seguretat;
- la viabilitat d'un pilot limitat.

## Arquitectura actual

- React, Vite i JavaScript;
- IndexedDB com a copia local;
- Google Authentication;
- Cloud Firestore per sincronitzacio i backups;
- Firebase Hosting;
- espais privats per docent i fluxos compartits explicits.

L'aplicacio tracta dades personals de menors. No pretén anonimitzar el quadern docent, sino aplicar necessitat, minimitzacio, permisos, traçabilitat, conservacio i responsabilitats.

## Que ja s'ha fet

- inventari i mapa de dades;
- criteris de minimitzacio;
- separacio privada per UID;
- auditoria interna dels fluxos compartits;
- regles reforcades per paquets, cotutories i sociometria;
- revocacio de cotutors i eliminacions amb tombstones;
- tokens sociometrics individuals, temporals i d'un sol us;
- 26 proves automatitzades de regles i 5 de sincronitzacio;
- esborranys de RAT, AIPD, contracte, drets, incidents, conservacio, identitats, administradors, continuitat i suport.

## Que encara no s'afirma

No s'afirma que:

- l'aplicacio tingui certificacio de seguretat;
- el dossier hagi estat validat juridicament;
- les regles reforcades estiguin desplegades;
- les proves locals substitueixin proves reals o una auditoria externa;
- Firebase hagi estat acceptat pel Ministeri;
- la futura empresa ja pugui actuar com a proveidor;
- el servei estigui preparat per a un desplegament massiu.

## Bloqueig tecnic actual

Hi ha deu qüestionaris sociometrics antics. Dos contenen 47 respostes en total i cadascun te una resposta pendent de sincronitzar. Aquestes dades s'han de preservar i migrar abans de publicar conjuntament la nova aplicacio i les regles reforcades.

Despres cal fer proves amb dades ficticies, dos comptes docents, conflictes, backups i iPad.

## Decisions sol.licitades al Ministeri

1. Quin model de compra, llicencia o servei es planteja?
2. Cal constituir una societat abans de continuar i en quin moment?
3. Qui sera responsable del tractament i qui actuara com a encarregat?
4. Firebase/Google Cloud es admissible? Qui ha de controlar el projecte?
5. Quines dades, funcionalitats i terminis s'autoritzen?
6. Quins requisits de ciberseguretat i auditoria s'exigeixen?
7. Es viable un pilot limitat i amb quines condicions?

## Proposta

No es proposa una compra immediata ni un desplegament general. Es proposa:

1. revisio conjunta del dossier;
2. resposta escrita al qüestionari institucional;
3. correccio dels bloquejos tecnics;
4. revisio juridica i tecnica externa;
5. pilot petit, reversible, sense IA i amb dades estrictament necessaries.

## Ordre del paquet

1. aquest resum executiu;
2. fitxa tecnica;
3. matriu d'estat i bloquejos;
4. mapa de dades i arquitectura Firebase;
5. rols, RAT i AIPD preliminars;
6. mesures de seguretat, continuitat i reversibilitat;
7. contracte i proveidors;
8. qüestionari de decisions institucionals.

El qüestionari s'ha preparat, pero es conserva per enviar-lo juntament amb aquest paquet complet.
