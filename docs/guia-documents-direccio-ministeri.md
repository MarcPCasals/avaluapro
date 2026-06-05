# Guia de documents per a Direccio i Ministeri

Aquest document recull quins fitxers cal consultar per entendre Avaluapro des del punt de vista funcional, tecnic i de proteccio de dades.

Les rutes indicades son les carpetes i fitxers dins del repositori GitHub:

`avaluapro / docs / nom-del-document.md`

## Lectura recomanada principal

### 1. Fitxa tecnica per a Direccio i Ministeri

Ruta: `docs/fitxa-tecnica-direccio-ministeri.md`

Document principal de presentacio. Resumeix que es Avaluapro, com esta construit, quin tipus de dades tracta, com es protegeixen i quines mesures hi ha previstes.

Es el primer document que cal llegir si es vol una visio general seriosa i presentable.

### 2. Proteccio de dades Avaluapro

Ruta: `docs/proteccio-dades-avaluapro.md`

Explica com Avaluapro tracta les dades personals i educatives: autenticacio, separacio per usuari, exportacio, eliminacio, comparticio i riscos principals.

Es el document mes adequat per parlar amb direccio, responsables de centre o persones encarregades de revisar privacitat.

### 3. Mapa de dades

Ruta: `docs/mapa-dades.md`

Enumera les dades que pot guardar Avaluapro: alumnes, notes, seguiment, diagnostics, comentaris, DOIPs, fotos, sociograma, grups cooperatius, backups i enviaments entre docents.

Tambe classifica el risc de cada tipus de dada i justifica si cal guardar-la.

### 4. Firebase i acces

Ruta: `docs/firebase-acces.md`

Detalla com funciona l'autenticacio amb Google, la separacio de dades per usuari, les rutes de Firestore i les tutories compartides.

Es util si una persona tecnica vol entendre com s'impedeix que un usuari vegi dades d'un altre.

### 5. Comparticio entre docents

Ruta: `docs/comparticio-docents.md`

Explica el sistema de paquets de notes, l'enviament voluntari de dades entre docents i la cotutoria compartida.

Es important si es vol presentar Avaluapro com una eina collaborativa i no nomes com un quadern personal del docent.

### 6. Checklist final de seguretat

Ruta: `docs/checklist-final-seguretat.md`

Resum practic de comprovacions fetes i aspectes pendents de validacio institucional.

Es un bon document per tancar reunions o preparar una revisio final.

## Documents complementaris

### Minimitzacio de dades

Ruta: `docs/minimitzacio-dades.md`

Explica el criteri de guardar nomes dades necessaries per a la funcio docent.

### Controls de minimitzacio dins l'app

Ruta: `docs/controls-minimitzacio-app.md`

Descriu mesures dins de l'aplicacio per reduir text lliure sensible, guiar l'usuari i limitar dades innecessaries.

### Seguretat dins l'app

Ruta: `docs/seguretat-dins-app.md`

Explica la pantalla d'estat de dades, exportacions, eliminacio, sincronitzacio i missatges interns.

### Backups i conservacio

Ruta: `docs/backups-conservacio.md`

Descriu copies manuals, copies al nuvol, restauracio, final de curs i antecedents.

### Fotos i fitxers

Ruta: `docs/fotos-fitxers.md`

Explica l'estat actual de les fotos i la possible migracio futura a Firebase Storage.

### App Check i entorn public

Ruta: `docs/app-check-entorn-public.md`

Document tecnic sobre App Check i mesures futures per reforcar l'us public de l'aplicacio.

## Fitxers tecnics clau

### Firestore rules

Ruta: `firestore.rules`

Rules reals de Firebase publicades. Controlen l'acces a:

- dades personals de cada usuari;
- paquets de notes entre docents;
- tutories compartides;
- subcolleccions de dades compartides.

### Storage rules

Ruta: `storage.rules`

Rules preparades per una futura migracio de fotos i fitxers a Firebase Storage. Encara no son la part principal del funcionament actual.

### Firebase config

Ruta: `firebase.json`

Configuracio de Firebase Hosting i deploy.

## Ordre recomanat per presentar-ho

1. Obrir l'aplicacio: `https://avaluapro.web.app`
2. Llegir o ensenyar: `docs/fitxa-tecnica-direccio-ministeri.md`
3. Si preocupa la proteccio de dades: `docs/proteccio-dades-avaluapro.md`
4. Si volen saber quines dades es guarden: `docs/mapa-dades.md`
5. Si ho revisa una persona tecnica: `docs/firebase-acces.md` i `firestore.rules`
6. Si interessa el treball entre docents: `docs/comparticio-docents.md`
7. Per tancar: `docs/checklist-final-seguretat.md`

## Nota important

Aquests documents no substitueixen una revisio juridica formal ni un contracte d'encarrec de tractament de dades. Serveixen com a documentacio tecnica i pedagogica del projecte, i com a base perque Direccio, l'escola o el Ministeri puguin valorar-ne l'us institucional.
