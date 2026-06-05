# Guia de documents per a Direcció i Ministeri

Aquest document recull quins fitxers cal consultar per entendre Avaluapro des del punt de vista funcional, tècnic i de protecció de dades.

Les rutes indicades són les carpetes i fitxers dins del repositori GitHub:

`avaluapro / docs / nom-del-document.md`

## Lectura recomanada principal

### 1. Fitxa tècnica per a Direcció i Ministeri

Ruta: `docs/fitxa-tecnica-direccio-ministeri.md`

Document principal de presentació. Resumeix què és Avaluapro, com està construït, quin tipus de dades tracta, com es protegeixen i quines mesures hi ha previstes.

És el primer document que cal llegir si es vol una visió general seriosa i presentable.

### 2. Protecció de dades Avaluapro

Ruta: `docs/proteccio-dades-avaluapro.md`

Explica com Avaluapro tracta les dades personals i educatives: autenticació, separació per usuari, exportació, eliminació, compartició i riscos principals.

És el document més adequat per parlar amb direcció, responsables de centre o persones encarregades de revisar privacitat.

### 3. Mapa de dades

Ruta: `docs/mapa-dades.md`

Enumera les dades que pot guardar Avaluapro: alumnes, notes, seguiment, diagnòstics, comentaris, DOIPs, fotos, sociograma, grups cooperatius, còpies de seguretat i enviaments entre docents.

També classifica el risc de cada tipus de dada i justifica si cal guardar-la.

### 4. Firebase i accés

Ruta: `docs/firebase-acces.md`

Detalla com funciona l'autenticació amb Google, la separació de dades per usuari, les rutes de Firestore i les tutories compartides.

És útil si una persona tècnica vol entendre com s'impedeix que un usuari vegi dades d'un altre.

### 5. Compartició entre docents

Ruta: `docs/comparticio-docents.md`

Explica el sistema de paquets de notes, l'enviament voluntari de dades entre docents i la cotutoria compartida.

És important si es vol presentar Avaluapro com una eina col·laborativa i no només com un quadern personal del docent.

### 6. Checklist final de seguretat

Ruta: `docs/checklist-final-seguretat.md`

Resum pràctic de comprovacions fetes i aspectes pendents de validació institucional.

És un bon document per tancar reunions o preparar una revisió final.

## Documents complementaris

### Minimització de dades

Ruta: `docs/minimitzacio-dades.md`

Explica el criteri de guardar només dades necessàries per a la funció docent.

### Controls de minimització dins l'app

Ruta: `docs/controls-minimitzacio-app.md`

Descriu mesures dins de l'aplicació per reduir text lliure sensible, guiar l'usuari i limitar dades innecessàries.

### Seguretat dins l'app

Ruta: `docs/seguretat-dins-app.md`

Explica la pantalla d'estat de dades, exportacions, eliminació, sincronització i missatges interns.

### Còpies de seguretat i conservació

Ruta: `docs/backups-conservacio.md`

Descriu còpies manuals, còpies al núvol, restauració, final de curs i antecedents.

### Fotos i fitxers

Ruta: `docs/fotos-fitxers.md`

Explica l'estat actual de les fotos i la possible migració futura a Firebase Storage.

### App Check i entorn públic

Ruta: `docs/app-check-entorn-public.md`

Document tècnic sobre App Check i mesures futures per reforçar l'ús públic de l'aplicació.

## Fitxers tècnics clau

### Firestore rules

Ruta: `firestore.rules`

Rules reals de Firebase publicades. Controlen l'accés a:

- dades personals de cada usuari;
- paquets de notes entre docents;
- tutories compartides;
- subcol·leccions de dades compartides.

### Storage rules

Ruta: `storage.rules`

Rules preparades per a una futura migració de fotos i fitxers a Firebase Storage. Encara no són la part principal del funcionament actual.

### Firebase config

Ruta: `firebase.json`

Configuració de Firebase Hosting i deploy.

## Ordre recomanat per presentar-ho

1. Obrir l'aplicació: `https://avaluapro.web.app`
2. Llegir o ensenyar: `docs/fitxa-tecnica-direccio-ministeri.md`
3. Si preocupa la protecció de dades: `docs/proteccio-dades-avaluapro.md`
4. Si volen saber quines dades es guarden: `docs/mapa-dades.md`
5. Si ho revisa una persona tècnica: `docs/firebase-acces.md` i `firestore.rules`
6. Si interessa el treball entre docents: `docs/comparticio-docents.md`
7. Per tancar: `docs/checklist-final-seguretat.md`

## Nota important

Aquests documents no substitueixen una revisió jurídica formal ni un contracte d'encàrrec de tractament de dades. Serveixen com a documentació tècnica i pedagògica del projecte, i com a base perquè Direcció, l'escola o el Ministeri puguin valorar-ne l'ús institucional.
