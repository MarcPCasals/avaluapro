# Bloc 6: fotos i fitxers

Aquest document defineix l'estat actual de fotos i imatges dins Avaluapro i el pla de migracio cap a Firebase Storage quan l'us amb mes docents ho faci necessari.

## 1. Com es guarden ara les fotos

Ara mateix Avaluapro guarda imatges comprimides com a `dataUrl` dins les dades de l'app:

- fotos d'alumnes: `students.photoUrl`;
- llocs fixos o imatges de disposicio d'aula: `seatingCharts.imageData`;
- disposicions tutorials: dades de `tutorialSeatingPlans`, amb fotos reutilitzades del perfil de l'alumne.

Aquest model te un avantatge inicial: es simple, funciona offline i entra als backups JSON complets.

El risc es que les imatges ocupen molt espai i poden fer que:

- un document de Firestore sigui massa gran;
- una copia JSON pesi massa;
- la sincronitzacio sigui mes lenta;
- la restauracio sigui mes fragil.

## 2. Proteccio actual dins l'app

Avaluapro ja comprimeix les imatges abans de guardar-les.

Limits actuals:

- fotos d'alumnes: maxim visual aproximat de 480 px i sortida objectiu inferior a 180 KB;
- llocs fixos: maxim visual aproximat de 1400 px i sortida objectiu inferior a 720 KB;
- fitxer original: si una imatge d'entrada supera el limit definit, l'app mostra un missatge i no la guarda.

Si una imatge continua sent massa gran despres de comprimir-la, Avaluapro demana retallar-la o fer servir una versio amb menys resolucio.

## 3. Per que no cal activar Storage encara

Per al pilot inicial, mantenir les imatges comprimides dins les dades pot ser acceptable si:

- cada docent carrega poques fotos;
- les fotos son petites;
- els llocs fixos no son imatges enormes;
- es revisa la mida aproximada des de la pantalla d'estat de dades.

No cal activar Firebase Storage fins que:

- hi hagi molts docents;
- es vulguin carregar moltes fotos;
- les copies JSON comencin a pesar massa;
- Firestore avisi que algun document es massa gran;
- es vulgui una arquitectura mes professional per fitxers.

## 4. Migracio recomanada a Firebase Storage

Quan es faci la migracio, el canvi recomanat es:

1. pujar la imatge comprimida a Firebase Storage;
2. guardar a Firestore nomes la ruta del fitxer o una URL controlada;
3. mantenir compatibilitat temporal amb imatges antigues en `dataUrl`;
4. oferir una migracio progressiva de fotos existents.

Rutes recomanades:

```text
users/{uid}/studentPhotos/{studentId}.jpg
users/{uid}/seatingCharts/{classId}-{halfGroup}.jpg
users/{uid}/tutorialImages/{imageId}.jpg
```

Firestore hauria de guardar nomes:

```json
{
  "photoStoragePath": "users/<uid>/studentPhotos/<studentId>.jpg",
  "photoUrl": ""
}
```

Durant la transicio, l'app pot llegir:

- `photoStoragePath` si existeix;
- `photoUrl` antic si encara no s'ha migrat.

## 5. Rules de Firebase Storage

El projecte ja inclou `storage.rules` com a proposta preparada.

Criteris:

- nomes usuaris autenticats;
- cada usuari nomes pot llegir i escriure dins `users/{uid}`;
- nomes fitxers `image/*`;
- mida maxima per fitxer: 2 MB.

Important: `storage.rules` encara no esta connectat a `firebase.json` ni desplegat automaticament, perque Avaluapro encara no fa servir Storage en el codi.

Quan s'activi Storage, caldra:

1. activar Firebase Storage a Firebase Console;
2. afegir la seccio `storage` a `firebase.json`;
3. desplegar rules de Storage;
4. canviar el codi de pujada de fotos;
5. provar amb un compte docent real i un compte diferent.

## 6. Backups amb fotos

Mentre les fotos siguin `dataUrl`, entren dins les copies manuals JSON i les copies al nuvol.

Quan es migri a Storage, les copies haurien de guardar:

- metadades de l'alumne;
- ruta Storage de la foto;
- no necessariament el binari complet de la imatge.

Per a una exportacio completa de final de curs, es podra valorar:

- backup JSON nomes amb dades;
- export separat de fotos;
- o eina de restauracio que recuperi les fotos des de Storage.

## 7. Llocs fixos i disposicions

Hi ha dos tipus d'imatges:

1. **Llocs fixos pujats com a imatge**: mapes o captures de disposicio d'aula.
2. **Disposicions tutorials generades dins Avaluapro**: matriu editable amb alumnes, fotos del perfil, bloquejos i versions guardades.

Recomanacio:

- mantenir la disposicio generada com a dades estructurades, no com a imatge;
- reutilitzar sempre la foto del perfil de l'alumne;
- guardar imatges externes de llocs fixos a Storage quan s'activi;
- no duplicar la mateixa foto d'alumne en diverses col.leccions.

## 8. Decisio actual

Decisio del Bloc 6:

- no activar encara Firebase Storage;
- mantenir compressio local i limits de mida;
- conservar `storage.rules` preparat;
- no guardar imatges grans sense control;
- revisar la migracio quan el pilot tingui mes docents o moltes fotos.

## 9. Riscos i mesures

| Risc | Mesura actual | Mesura futura |
| --- | --- | --- |
| Fotos massa pesades | Compressio i limit de sortida | Storage |
| Document Firestore massa gran | Avis tecnic abans de guardar | Guardar nomes ruta Storage |
| Backups JSON massa grans | Pantalla de mida aproximada | Separar dades i fitxers |
| Duplicar fotos | Una foto al perfil reutilitzada en tutoria/disposicio | Ruta unica a Storage |
| Acces indegut a fitxers | Encara no hi ha Storage actiu | Rules per `users/{uid}` |
