# Firebase, accessos i estat de les regles

Data d'actualitzacio: 21 de juny de 2026
Estat: arquitectura contrastada amb el codi; regles reforcades provades localment i pendents de desplegament

Aquest document descriu l'arquitectura real de Firebase d'Avaluapro. No acredita per si sol el compliment normatiu ni que la configuracio local coincideixi amb la publicada.

## 1. Serveis utilitzats

| Servei | Us actual |
| --- | --- |
| Firebase Authentication | Inici de sessio amb Google i persistencia local de la sessio. |
| Cloud Firestore | Sincronitzacio privada, backups, paquets de notes, cotutories i sociometria. |
| Firebase Hosting | Entorn public principal. |
| Firebase Storage | No s'utilitza encara; hi ha unes regles preparatories. |

La configuracio web de Firebase es publica al navegador per disseny. La seguretat depen de les regles, la identitat autenticada, la configuracio del projecte i els procediments operatius, no d'ocultar l'API key.

## 2. Rutes principals

```text
users/{uid}
users/{uid}/meta/app
users/{uid}/{collectionName}/{documentId}
users/{uid}/cloudBackups/{backupId}
users/{uid}/cloudBackups/{backupId}/{collectionName}/{documentId}
teacherGradePackages/{packageId}
tutoringSpaces/{spaceId}
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
tutoringInvitationInbox/{recipientEmail}/items/{spaceId}
tutoringInvitationOutbox/{senderUid}/items/{outboxId}
sociometricSurveys/{surveyId}
sociometricSurveys/{surveyId}/accessTokens/{tokenId}
sociometricSurveys/{surveyId}/responses/{responseId}
```

## 3. Model privat

Les dades ordinàries de cada docent viuen sota `users/{uid}`. Les regles exigeixen que el `uid` autenticat coincideixi amb el de la ruta.

Aixo proporciona aillament tecnic entre docents per a:

- classes, alumnes i configuracio;
- avaluacio, tasques i comportament;
- tutoria, sociograma, grups i disposicions;
- antecedents;
- copies al nuvol.

Limit: un compte compromes, un dispositiu desbloquejat o una exportacio mal custodiada continuen permetent accedir a les dades legitimes d'aquell docent.

## 4. Fluxos compartits

| Flux | Control previst per les regles locals | Estat |
| --- | --- | --- |
| Paquets de notes | Emissor i destinatari concret; el destinatari nomes pot registrar la importacio. | Implementat; prova real amb dos comptes pendent. |
| Cotutoria | Acces per membres; nomes el propietari gestiona membres i espai. | Implementat i provat amb emulador; desplegament i prova real pendents. |
| Subcol.leccions tutorials | Llista tancada de deu col.leccions; tercers exclosos. | Implementat i provat localment. |
| Eliminacio compartida | Es bloqueja el `delete` fisic i s'utilitzen tombstones minims. | Implementat i provat localment; prova real pendent. |
| Revocacio o sortida | Propietari retira cotutor; cotutor nomes es pot retirar a si mateix. | Implementat i provat localment; prova real pendent. |
| Qüestionari sociometric | Document general no public; token individual aleatori, no enumerable, d'un sol us i amb 24 hores de vigencia. | Implementat i provat localment; desplegament bloquejat. |

Les deu col.leccions permeses dins una cotutoria son:

```text
students
studentAntecedents
tutorialGroupSets
tutorialMarks
tutorialRecords
tutorialRelations
tutorialSeatingPlans
tutorialSociogramLayouts
tutorialSociometricMoments
tutorialStudentRoles
```

## 5. Proves automatitzades

La versio local reforcada disposa de:

- 26 proves de regles de Firestore;
- 5 proves de fusio i tombstones de cotutoria;
- total: 31 proves de seguretat dels fluxos compartits actuals.

Les proves cobreixen membres, invitacions, revocacio, subcol.leccions, eliminacions, tokens sociometrics, caducitat, avís informatiu, resposta d'un sol us i eliminacio reservada al propietari.

No cobreixen encara tota la realitat operativa: cal provar comptes reals, dispositius, conflictes simultanis, restauracions i la configuracio efectivament desplegada.

## 6. Bloqueig de desplegament actual

Les regles reforcades no s'han publicat encara. L'auditoria del 20 de juny va detectar:

- 10 qüestionaris antics sense token ni caducitat;
- 4 marcats com a actius;
- 47 respostes repartides en dos qüestionaris;
- una resposta pendent de sincronitzar en cadascun d'aquests dos qüestionaris.

Abans del desplegament cal sincronitzar aquestes respostes, executar `npm run audit:firebase` i publicar hosting i regles conjuntament. El procediment complet es troba a `docs/checklist-desplegament-rules-2026-06.md`.

## 7. Controls pendents

- prova manual amb almenys dos comptes docents;
- prova de conflictes d'edicio simultania;
- verificacio completa d'autoria i data dels canvis sensibles;
- purga automatica de dades sociometriques brutes;
- separacio tecnica de desenvolupament, proves i produccio;
- MFA i govern real dels comptes administratius;
- logs i alertes adequats;
- revisio de dominis, claus i configuracio real;
- App Check, despres de validar Safari i iPad;
- auditoria tecnica externa proporcional al risc.

## 8. Conclusio

Firebase pot sostenir una arquitectura institucional defensable, pero no la converteix automaticament en conforme. Avaluapro te un bon aillament privat i ha reforcat els fluxos compartits. L'estat correcte a 21 de juny de 2026 es:

**implementat i provat localment, pero encara no desplegat ni validat en condicions reals.**
