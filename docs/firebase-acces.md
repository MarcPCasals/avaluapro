# Bloc 2: Firebase i acces

Data original: 4 de juny de 2026
Avís d'actualitzacio: 18 de juny de 2026
Estat: auditoria antiga de l'espai privat; la part de comparticio requereix una nova auditoria

Aquest document va revisar inicialment com Avaluapro usava Firebase. La separacio de `users/{uid}` continua sent la base privada, pero les seccions que afirmaven que `teacherGradePackages` era l'unica ruta compartida han quedat desactualitzades.

Actualment tambe existeixen:

```text
tutoringSpaces/{spaceId}
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
tutoringInvitationInbox/{recipientEmail}/items/{spaceId}
tutoringInvitationOutbox/{senderUid}/items/{outboxId}
sociometricSurveys/{surveyId}
sociometricSurveys/{surveyId}/accessTokens/{tokenId}
sociometricSurveys/{surveyId}/responses/{responseId}
```

La revisio prioritaria queda definida a `docs/comparticio-docents.md` i a la fase 0 de `docs/full-de-ruta-institucional-i-empresa.md`.

## 1. Rules de Firestore

Les rules actuals de Firestore tenen diverses zones privades i compartides:

| Ruta | Qui hi pot accedir | Valoracio |
| --- | --- | --- |
| `users/{uid}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `users/{uid}/{collection}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `users/{uid}/cloudBackups/{backupId}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `teacherGradePackages/{packageId}` | Emissor i correu destinatari del paquet | Correcte, amb mes risc per ser una ruta compartida. |
| `tutoringSpaces/{spaceId}` i subcol.leccions | Membres de la cotutoria | Critic: comparteix dades tutorials d'alta sensibilitat i requereix auditoria granular. |
| Safates d'invitacions | Emissor o destinatari segons el flux | Requereix proves de comptes, duplicats, revocacio i casos limits. |
| `sociometricSurveys`, tokens i respostes | Docents membres; consulta publica temporal amb token individual | Token aleatori d'un sol ús i caducitat de 24 hores implementats localment. Continuen pendents la minimització dels noms visibles i la política de conservació. |

El punt mes delicat es `teacherGradePackages`, perque es global i compartit. Les rules actuals ja limiten:

- creacio: nomes l'emissor autenticat pot crear un paquet propi;
- lectura: nomes emissor o destinatari;
- actualitzacio: nomes el destinatari pot marcar-lo com a importat;
- eliminacio: nomes l'emissor.

Conclusio actualitzada: no s'ha de considerar validat tot el model compartit fins que es completi la nova auditoria i les proves automatitzades.

## 2. Rutes d'usuari

El codi de Firebase fa servir aquestes rutes principals:

```text
users/{uid}
users/{uid}/meta/app
users/{uid}/{collectionName}
users/{uid}/cloudBackups/{backupId}
users/{uid}/cloudBackups/{backupId}/{collectionName}/{documentId}
teacherGradePackages/{packageId}
tutoringSpaces/{spaceId}
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
tutoringInvitationInbox/{recipientEmail}/items/{spaceId}
tutoringInvitationOutbox/{senderUid}/items/{outboxId}
sociometricSurveys/{surveyId}
sociometricSurveys/{surveyId}/responses/{responseId}
```

Les dades reals del docent viuen dins `users/{uid}`. Aixo inclou:

- classes;
- alumnes;
- notes;
- tasques;
- seguiment;
- tutoria;
- sociograma;
- grups cooperatius;
- disposicio d'aula;
- antecedents;
- configuracio.

Conclusio: la separacio per usuari esta ben aplicada.

## 3. Rutes compartides

La descripcio anterior d'una unica ruta compartida ja no es valida. Hi ha paquets puntuals, espais persistents de cotutoria, safates d'invitacions i formularis sociometrics.

El detall actualitzat es troba a:

```text
docs/comparticio-docents.md
```

## 4. Comprovacio d'aillament entre usuaris

Amb les rules actuals, un usuari no pot llegir:

- `users/{uid}` d'un altre usuari;
- backups al nuvol d'un altre usuari;
- col.leccions d'un altre usuari;
- paquets de notes si no n'es emissor ni destinatari.

Punt important: els canvis de `firestore.rules` al repositori no es publiquen automaticament a Firebase amb el workflow actual de GitHub Pages. Cal publicar-los manualment a Firebase Console o configurar un deploy amb Firebase CLI.

## 5. Backups al nuvol

Les copies al nuvol es desen a:

```text
users/{uid}/cloudBackups/{backupId}
users/{uid}/cloudBackups/{backupId}/{collectionName}/{documentId}
```

Avantatges:

- cada copia queda dins l'espai privat del docent;
- les col.leccions queden compartimentades;
- es redueix el risc d'un unic document gegant;
- es poden llistar les darreres copies;
- es pot restaurar una copia concreta.

Pendent recomanat:

- definir politica de conservacio;
- per exemple, mostrar darreres 5 copies i valorar eliminar copies molt antigues quan hi hagi moltes;
- separar clarament copia manual al dispositiu i copia al nuvol.

## 6. Rules futures per Firebase Storage

Avaluapro encara no fa servir Firebase Storage. De moment, les fotos poden quedar dins de dades comprimides. Per a un us amb mes docents, es recomana migrar fotos i imatges grans a Storage.

S'ha afegit el fitxer preparatori:

```text
storage.rules
```

Aquest fitxer proposa rutes futures:

```text
users/{uid}/studentPhotos/{fileName}
users/{uid}/seatingCharts/{fileName}
users/{uid}/tutorialImages/{fileName}
```

La proposta nomes permet:

- llegir/esborrar imatges del propi usuari;
- pujar imatges si l'usuari es propietari de la ruta;
- limitar el fitxer a menys de 2 MB;
- acceptar nomes `image/*`;
- bloquejar tota la resta.

Important: aquestes rules no estan activades encara. Per activar-les cal:

1. activar Firebase Storage al projecte;
2. revisar si les rutes proposades encaixen amb la implementacio final;
3. afegir Storage al `firebase.json`;
4. publicar les rules a Firebase.

## 7. App Check

App Check es una capa addicional per reduir accessos a Firebase des de clients no autoritzats. No substitueix les rules.

Valoracio per Avaluapro:

- no es imprescindible per al pilot inicial;
- es interessant si l'app es fa servir amb molts docents;
- es mes recomanable quan Avaluapro estigui desplegat en Firebase Hosting o domini estable;
- cal provar-ho be amb Safari/iPad abans de fer-ho obligatori.

Recomanacio actual:

- no activar-ho encara de manera obligatoria;
- mantenir-ho documentat com a mesura futura controlada;
- provar-ho amb Firebase Hosting, Safari, Chrome i iPad abans d'activar-ho;
- activar-ho quan l'entorn public sigui estable i hi hagi diversos docents.

La decisio completa queda definida a `docs/app-check-entorn-public.md`.

## Conclusio del Bloc 2

El model privat continua sent coherent, pero el model compartit esta pendent de revalidacio:

- les dades personals viuen a `users/{uid}`;
- les copies al nuvol tambe viuen dins `users/{uid}`;
- ja no hi ha una unica ruta compartida;
- les cotutories comparteixen un conjunt ampli de dades tutorials;
- els qüestionaris sociometrics introdueixen un flux public temporal;
- cal provar permisos, revocacio, eliminacio i autoria;
- Storage encara no esta actiu, pero ja te proposta de rules futures;
- App Check esta documentat al Bloc 8, pero no s'activa encara per no bloquejar docents legitims.
