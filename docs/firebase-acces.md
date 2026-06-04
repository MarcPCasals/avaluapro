# Bloc 2: Firebase i acces

Data: 4 de juny de 2026  
Estat: auditoria tecnica del Bloc 2

Aquest document revisa com Avaluapro usa Firebase, quines rutes utilitza, quines dades queden separades per usuari i quines mesures convindria preparar abans d'un us mes ampli.

## 1. Rules de Firestore

Les rules actuals de Firestore tenen tres zones:

| Ruta | Qui hi pot accedir | Valoracio |
| --- | --- | --- |
| `users/{uid}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `users/{uid}/{collection}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `users/{uid}/cloudBackups/{backupId}` | Nomes l'usuari autenticat amb aquell mateix `uid` | Correcte. |
| `teacherGradePackages/{packageId}` | Emissor i correu destinatari del paquet | Correcte, amb mes risc per ser una ruta compartida. |

El punt mes delicat es `teacherGradePackages`, perque es global i compartit. Les rules actuals ja limiten:

- creacio: nomes l'emissor autenticat pot crear un paquet propi;
- lectura: nomes emissor o destinatari;
- actualitzacio: nomes el destinatari pot marcar-lo com a importat;
- eliminacio: nomes l'emissor.

Conclusio: les rules de Firestore son adequades per al model actual d'Avaluapro.

## 2. Rutes d'usuari

El codi de Firebase fa servir aquestes rutes principals:

```text
users/{uid}
users/{uid}/meta/app
users/{uid}/{collectionName}
users/{uid}/cloudBackups/{backupId}
users/{uid}/cloudBackups/{backupId}/{collectionName}/{documentId}
teacherGradePackages/{packageId}
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

## 3. Rutes compartides entre docents

L'unica ruta compartida detectada es:

```text
teacherGradePackages/{packageId}
```

Serveix per enviar notes d'un professor a un tutor. Aquesta ruta no ha de contenir tot el quadern docent, nomes el paquet necessari:

- emissor;
- destinatari;
- classe origen;
- materia;
- alumnes;
- notes finals de competencies;
- estat d'importacio;
- data i usuari de confirmacio quan el tutor importa el paquet.

No hauria d'incloure:

- comentaris;
- diagnostics;
- DOIPs;
- comportament;
- fotos;
- sociograma;
- dades familiars o mediques;
- observacions obertes.

Conclusio: la ruta compartida te sentit, pero s'ha de mantenir molt limitada.

La politica completa queda definida a `docs/comparticio-docents.md`.

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

El model Firebase actual es coherent:

- les dades personals viuen a `users/{uid}`;
- les copies al nuvol tambe viuen dins `users/{uid}`;
- l'unica ruta compartida es `teacherGradePackages`;
- les rules actuals bloquegen l'acces entre usuaris;
- Storage encara no esta actiu, pero ja te proposta de rules futures;
- App Check esta documentat al Bloc 8, pero no s'activa encara per no bloquejar docents legitims.
