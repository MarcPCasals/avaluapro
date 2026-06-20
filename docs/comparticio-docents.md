# Comparticio de dades entre docents

Data d'actualitzacio: 18 de juny de 2026
Estat: descripcio del funcionament actual; auditoria de seguretat pendent

Aquest document descriu els fluxos compartits actuals d'Avaluapro. No certifica que les rules siguin suficients per a un desplegament institucional. La revisio anterior del 4 de juny nomes cobria els paquets de notes i ha quedat superada per la incorporacio de cotutories compartides i qüestionaris sociometrics.

## 1. Fluxos compartits actuals

Avaluapro te tres mecanismes diferents:

| Flux | Finalitat | Durada |
| --- | --- | --- |
| Paquet de notes | Enviar notes finals d'un professor al tutor. | Puntual. |
| Cotutoria compartida | Treballar conjuntament sobre dades tutorials d'un grup. | Persistent fins que es desvinculi o elimini. |
| Qüestionari sociometric | Recollir respostes dels alumnes mitjancant un formulari public. | Temporal, mentre estigui actiu. |

## 2. Paquets de notes

Ruta:

```text
teacherGradePackages/{packageId}
```

El paquet inclou:

- emissor;
- destinatari;
- classe i materia d'origen;
- alumnes;
- notes finals de competencia;
- estat d'enviament o importacio.

No hauria d'incloure:

- comentaris tutorials;
- diagnostics;
- DOIPs;
- comportament;
- fotos;
- sociograma;
- dades familiars o mediques.

Les rules preveuen:

- creacio per l'emissor autenticat;
- lectura per emissor i destinatari;
- confirmacio d'importacio pel destinatari;
- eliminacio per l'emissor.

Continua sent necessari provar aquest flux amb dos comptes i dades ficticies.

## 3. Cotutories compartides

Rutes:

```text
tutoringSpaces/{spaceId}
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
tutoringInvitationInbox/{recipientEmail}/items/{spaceId}
tutoringInvitationOutbox/{senderUid}/items/{outboxId}
```

Una invitacio s'envia a un correu concret. Quan el destinatari l'accepta, el seu correu i `uid` s'afegeixen a l'espai compartit.

### Dades sincronitzades

El codi actual comparteix aquestes col.leccions:

```text
students
tutorialRecords
tutorialMarks
tutorialRelations
tutorialGroupSets
tutorialSociometricMoments
tutorialSociogramLayouts
tutorialStudentRoles
tutorialSeatingPlans
studentAntecedents
```

Aixo pot incloure:

- noms i perfils d'alumnes;
- fotografies o referencies d'imatge;
- diagnostics i necessitats educatives;
- anotacions personals;
- DOIPs i registres tutorials;
- qualificacions tutorials;
- relacions positives, incompatibilitats i sociograma;
- rols socials;
- grups cooperatius;
- disposicions d'aula;
- antecedents academics.

Per tant, la cotutoria compartida no es un simple enviament: dona acces persistent a un conjunt ampli de dades d'alta sensibilitat.

### Funcionament de sincronitzacio

- els canvis locals de col.leccions tutorials poden provocar sincronitzacio amb l'espai compartit;
- en vincular una classe, les dades remotes es fusionen amb les locals;
- la versio mes recent segons les marques temporals te preferencia;
- el sistema registra `sharedUpdatedAt`, `sharedUpdatedByEmail` i `sharedUpdatedByUid` en les files sincronitzades;
- existeix un resum de conflictes quan es conserven canvis remots mes recents.

### Qüestions que encara s'han de validar

- permisos diferenciats entre propietari i cotutor;
- qui pot convidar o eliminar membres;
- revocacio d'acces;
- tractament de copies ja descarregades o sincronitzades;
- qui pot eliminar dades compartides;
- llista explicita de subcol.leccions permeses;
- resolucio segura de conflictes;
- registre d'auditoria suficient;
- final de curs i eliminacio de l'espai.

## 4. Qüestionaris sociometrics

Rutes:

```text
sociometricSurveys/{surveyId}
sociometricSurveys/{surveyId}/accessTokens/{tokenId}
sociometricSurveys/{surveyId}/responses/{responseId}
```

El document general del qüestionari no es public. Cada alumne rep un token individual aleatori i no enumerable que caduca al cap de 24 hores. El token fixa la identitat de qui respon i permet una sola resposta. El formulari mostra les opcions d'alumnes necessaries per completar la dinamica i les respostes poden incloure:

- alumne que respon;
- nom de l'alumne;
- eleccions positives;
- alumnes que prefereix evitar;
- data d'enviament.

Aquest flux es especialment delicat perque tracta relacions entre menors i pot ser accessible a qui disposi de l'enllac o identificador actiu.

Abans d'un us institucional encara cal decidir i provar:

- si cal mostrar noms complets;
- si es poden utilitzar codis temporals;
- com es reparteixen els tokens sense confusions ni reenviaments;
- qui pot tancar o eliminar el qüestionari;
- la purga automatica de les respostes, amb un maxim provisional de set dies des de la caducitat;
- quina informacio es dona als alumnes;
- com s'evita la reutilitzacio de l'enllac fora del context previst.

Des del 20 de juny de 2026, el formulari informa abans de respondre sobre finalitat, docents autoritzats, no anonimat, caducitat, conservació i ús individual de l'enllaç. L'alumne ha de marcar que ho ha llegit i entès. Aquesta marca no es presenta com a consentiment. Resta pendent completar i validar la clàusula institucional amb el responsable del tractament.

## 5. Principis de proteccio necessaris

- Compartir nomes les dades necessaries per a la funcio de cada docent.
- No assumir que tots els cotutors necessiten editar-ho tot.
- Diferenciar propietat, lectura, edicio, invitacio i eliminacio.
- Permetre retirar accessos.
- Mantenir autoria i data dels canvis.
- Fer servir dades ficticies en totes les proves.
- Establir terminis de conservacio i eliminacio.
- Informar clarament abans d'activar formularis publics.
- Revisar les rules amb proves automatitzades.

## 6. Estat actual

| Element | Estat |
| --- | --- |
| Paquets de notes | Implementats; prova completa amb dos comptes pendent. |
| Invitacions de cotutoria | Implementades; proves de casos limits pendents. |
| Espais persistents de cotutoria | Implementats; auditoria de permisos pendent. |
| Metadades d'autoria de files | Implementades parcialment en la sincronitzacio. |
| Revocacio de membres | Implementada localment per al propietari; prova real i desplegament pendents. |
| Sortida voluntaria | Implementada localment per al cotutor; conserva la copia local sense sincronitzacio. |
| Eliminacio compartida | Implementada localment amb tombstones; l'eliminacio fisica directa queda bloquejada. |
| Rols diferenciats | El model guarda un rol, pero les rules no estan validades com a control granular. |
| Restriccio explicita de subcol.leccions | Implementada localment; qualsevol col.leccio no prevista queda bloquejada. |
| Qüestionari sociometric public | Token individual, identitat fixada, un sol us, caducitat de 24 hores i eliminacio manual completa implementats localment. |
| Proves automatitzades | 26 proves de rules i 5 proves de fusio superades; cobertura addicional pendent. |

## 7. Eliminacio i tombstones

En una cotutoria no es fa un `delete` fisic directe des del client. Quan un docent elimina una dada compartida:

1. el document es substitueix per un tombstone;
2. desapareix el contingut pedagogic sensible;
3. es conserven identificador, data i autoria de la baixa;
4. els altres dispositius retiren la seva copia activa en sincronitzar;
5. una copia antiga no pot ressuscitar la dada si es anterior a la baixa.

Els tombstones es conserven mentre l'espai compartit continuï actiu. La purga fisica s'haura de fer en el procediment de tancament de curs o eliminacio administrativa de l'espai.

## 8. Decisio temporal

Fins que es completi l'auditoria:

- no utilitzar aquestes funcionalitats amb dades reals en proves;
- no considerar la comparticio institucionalment validada;
- no presentar la documentacio anterior com si nomes es compartissin notes;
- limitar qualsevol demostracio a alumnes ficticis;
- mantenir aquesta revisio com a prioritat anterior al pilot institucional.
