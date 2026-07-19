# Proteccio de dades a Avaluapro

Data d'actualitzacio: 21 de juny de 2026
Estat: explicacio general contrastada amb l'arquitectura actual

## 1. Idea central

La seguretat tecnica i el compliment normatiu no son equivalents.

Firebase, Google Authentication, HTTPS i el xifratge son controls rellevants, pero la conformitat tambe exigeix finalitat, base juridica, minimitzacio, rols, contractes, conservacio, drets, incidents, govern d'accessos i proves.

## 2. Xifratge, pseudonimitzacio i anonimitzacio

| Mesura | Que aporta | Que no resol |
| --- | --- | --- |
| Xifratge | Redueix exposicio durant transmissio i emmagatzematge. | Els usuaris i serveis autoritzats continuen tractant dades personals. |
| Pseudonimitzacio | Separa o substitueix identificadors i redueix l'impacte d'algunes filtracions. | Si es pot recuperar la identitat, continua sent dada personal. |
| Anonimitzacio | Impedeix reidentificar de manera raonablement probable. | Normalment es incompatible amb un quadern docent operatiu. |

`OriSP`, `alumne_001` o `A` no son anonims si el docent o Avaluapro saben a qui corresponen.

## 3. Arquitectura actual

Avaluapro combina:

- una copia local a IndexedDB;
- un espai privat de Firestore per UID;
- backups al nuvol;
- paquets puntuals de notes;
- cotutories persistents;
- qüestionaris sociometrics temporals.

L'espai privat esta ben compartimentat. Els riscos mes elevats es concentren en:

- text lliure i diagnostics;
- dispositius i exportacions;
- cotutories i revocacions;
- respostes sociometriques;
- conservacio i copies;
- administracio del projecte Firebase.

## 4. Mesures aplicades

- autenticacio amb Google;
- aillament per UID;
- minim privilegi en paquets i cotutories;
- propietari com a gestor de membres;
- subcol.leccions compartides limitades;
- eliminacions sincronitzades sense `delete` fisic directe;
- revocacio de membres;
- token sociometric individual, temporal i d'un sol us;
- document general del qüestionari no public;
- resposta existent no modificable;
- avis informatiu al participant;
- avisos de minimitzacio;
- backups i exportacio;
- 31 proves automatitzades dels fluxos compartits reforcats.

## 5. Limits actuals

Les regles reforcades encara no s'han desplegat. Cal preservar i sincronitzar les respostes de qüestionaris antics abans de publicar hosting i regles conjuntament.

Tambe resten pendents:

- proves amb dos comptes i dispositius reals;
- conflictes simultanis i autoria completa;
- purga automatica;
- entorns separats;
- MFA, logs i govern administratiu implantats;
- verificacio de backups i restauracions;
- revisio tecnica externa;
- aprovacio de l'AIPD i dels textos legals;
- contracte d'encarrec i inventari contractual de proveidors.

## 6. Separar identitat i dades

Separar la correspondencia `id -> nom` de les dades educatives pot reduir el dany d'una filtracio parcial i limitar el que rep un proveidor extern.

No obstant aixo:

- continua sent pseudonimitzacio si Avaluapro pot recompondre la identitat;
- complica sincronitzacio, backups, comparticio i recuperacio;
- una clau nomes local pot provocar perdua irreversible;
- compartir entre docents exigeix compartir o custodiar la clau;
- les observacions poden reidentificar per si soles.

Recomanacio: no redissenyar ara tot el producte per eliminar noms del nuvol. Prioritzar una separacio logica clara, minimitzacio, permisos, govern institucional i pseudonimitzacio selectiva en exportacions o serveis externs.

## 7. Integracio futura amb IA

Enviar `alumne A` en lloc del nom es una bona practica, pero normalment continua sent tractament de dades personals si Avaluapro conserva la correspondencia o si el text permet reidentificar.

Arquitectura recomanada:

1. no enviar noms, correus, fotos, dades familiars ni diagnostics;
2. si cal context de suport, transformar localment les etiquetes en mesures pedagogiques controlades, sense exportar
   l'etiqueta clinica ni el seu origen;
3. filtrar observacions i limitar text lliure;
4. enviar el minim context necessari amb un identificador temporal;
5. no permetre entrenament amb les dades;
6. establir contracte, ubicacio, retencio i subencarregats;
7. registrar la finalitat i l'operacio;
8. mantenir decisio i revisio humana;
9. activar IA nomes despres de l'AIPD i l'autoritzacio institucional.

Les mesures pedagogiques derivades continuen sent dades personals pseudonimitzades i poden suggerir indirectament una
necessitat educativa. Per tant, s'han de limitar als perfils rellevants, no s'han de descriure com a dades anonimes i han
de seguir les mateixes garanties de proveidor, finalitat i revisio humana que la resta del paquet.

## 8. Recomanacio d'arquitectura

Per a un producte educatiu real que vol creixer:

- mantenir Firebase provisionalment, sense migracio precipitada;
- completar el desplegament segur i les proves reals;
- separar entorns i reforcar administradors;
- mantenir dades privades per UID i espais compartits explicits;
- usar pseudonimitzacio selectiva per IA, analitica i exportacions;
- definir conservacio i purga automatica;
- formalitzar Ministeri com a responsable i empresa com a encarregada, si aquest es el model acceptat;
- fer revisio juridica i tecnica abans del pilot.

## 9. Conclusio

L'arquitectura actual es defensable com a base tecnica, pero encara no esta tancada per a un us institucional. El problema no es que Firestore contingui noms: el problema seria tractar dades de menors sense govern, proporcionalitat, contractes, controls verificats i una resposta clara davant errors o incidents.
