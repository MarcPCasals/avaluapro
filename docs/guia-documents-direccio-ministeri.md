# Guia de documents per a Direcció i Ministeri

Aquest document recull quins fitxers cal consultar per entendre Avaluapro des del punt de vista funcional, tècnic i de protecció de dades.

Les rutes indicades són les carpetes i fitxers dins del repositori GitHub:

`avaluapro / docs / nom-del-document.md`

## Lectura recomanada principal

### 0. Qüestionari de decisions institucionals

Ruta: `docs/questionari-ministeri-decisions-institucionals.md`

Document operatiu per obtenir resposta escrita sobre contractació, societat, propietat, responsable del tractament, bases jurídiques, infraestructura, ciberseguretat i pilot.

Inclou una part curta amb les decisions imprescindibles, annexos per a protecció de dades i sistemes, un correu d'acompanyament i una taula interna per traslladar les respostes als altres documents.

### 1. Full de ruta institucional, empresarial i de protecció de dades

Ruta: `docs/full-de-ruta-institucional-i-empresa.md`

Document mestre de projecte. Ordena cronològicament els passos per passar del quadern docent personal a un producte institucional, i diferencia les tasques fetes, parcials, pendents i ajornades.

També recull els dubtes que s'han de resoldre amb el Ministeri, l'OMPA, l'assessor de protecció de dades, la gestoria i els possibles proveïdors d'infraestructura.

### 2. Fitxa tècnica per a Direcció i Ministeri

Ruta: `docs/fitxa-tecnica-direccio-ministeri.md`

Document principal de presentació. Resumeix què és Avaluapro, com està construït, quin tipus de dades tracta, com es protegeixen i quines mesures hi ha previstes.

És el primer document que cal llegir si es vol una visió general seriosa i presentable.

### 3. Protecció de dades Avaluapro

Ruta: `docs/proteccio-dades-avaluapro.md`

Explica com Avaluapro tracta les dades personals i educatives: autenticació, separació per usuari, exportació, eliminació, compartició i riscos principals.

És el document més adequat per parlar amb direcció, responsables de centre o persones encarregades de revisar privacitat.

### 4. Mapa de dades

Ruta: `docs/mapa-dades.md`

Enumera les dades que pot guardar Avaluapro: alumnes, notes, seguiment, diagnòstics, comentaris, DOIPs, fotos, sociograma, grups cooperatius, còpies de seguretat i enviaments entre docents.

També classifica el risc de cada tipus de dada i justifica si cal guardar-la.

### 5. Firebase i accés

Ruta: `docs/firebase-acces.md`

Detalla com funciona l'autenticació amb Google, la separació de dades per usuari, les rutes de Firestore i les tutories compartides.

És útil si una persona tècnica vol entendre com s'impedeix que un usuari vegi dades d'un altre.

### 6. Compartició entre docents

Ruta: `docs/comparticio-docents.md`

Explica el sistema de paquets de notes, l'enviament voluntari de dades entre docents i la cotutoria compartida.

És important si es vol presentar Avaluapro com una eina col·laborativa i no només com un quadern personal del docent.

### 7. Auditoria de compartició i permisos

Ruta: `docs/auditoria-comparticio-permisos.md`

Compara els permisos actuals amb el model recomanat i identifica els riscos crítics de cotutories, membres, eliminacions i qüestionaris sociomètrics.

Aquest document és intern i no s'ha de presentar com una certificació de seguretat. Serveix per dirigir les correccions pendents.

### 8. Checklist final de seguretat

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

### Exercici de drets

Ruta: `docs/procediment-exercici-drets-preliminar.md`

Defineix com rebre, verificar, decidir i executar peticions d'accés, rectificació, supressió, limitació, oposició i portabilitat. Inclou el paper auxiliar d'Avaluapro, terminis, dades compartides i plantilles de treball.

### Incidents i violacions de seguretat

Ruta: `docs/protocol-incidents-violacions-seguretat-preliminar.md`

Estableix el circuit de detecció, contenció, preservació d'evidències, avaluació de risc, notificació a l'APDA, comunicació a les persones i revisió posterior.

### Conservació, bloqueig i eliminació

Ruta: `docs/politica-conservacio-eliminacio-preliminar.md`

Separa el quadern docent de l'expedient oficial i proposa terminis per categoria, tancament de curs, baixa de docents, backups, bloqueig legal, eliminació segura i finalització del servei.

### Mesures tècniques i organitzatives

Ruta: `docs/mesures-tecniques-organitzatives-preliminars.md`

Descriu els controls de govern, accessos, xifratge, dispositius, desenvolupament, desplegament, backups, logs, proveïdors i continuïtat. Diferencia mesures implantades, preparades localment, parcials, documentades i pendents.

### Continuïtat, recuperació i reversibilitat

Ruta: `docs/pla-continuitat-recuperacio-preliminar.md`

Defineix funcions prioritàries, RPO i RTO candidats, capes de còpia, recuperació per escenaris, mode degradat, dependència de comptes i persones, migració i tancament de l'empresa.

### Registre de l'empresa Avaluapro

Ruta: `docs/registre-empresa-categories-tractament-preliminar.md`

Separa les categories que la futura empresa executaria com a encarregada de les activitats pròpies en què actuaria com a responsable, com clients, facturació, personal i proveïdors.

### Retorn, migració i supressió

Ruta: `docs/procediment-retorn-migracio-supressio-preliminar.md`

Defineix l'inventari de sortida, el format, el canal, la validació, el tall, l'eliminació, les confirmacions dels subencarregats i el certificat final.

### Confidencialitat i formació

Ruta: `docs/compromis-confidencialitat-formacio-preliminar.md`

Estableix obligacions del personal i col·laboradors, accés excepcional, formació, alta, canvi de rol, baixa i evidències.

### Suport i manteniment

Ruta: `docs/procediment-suport-manteniment-preliminar.md`

Defineix canals, prioritats, diagnòstic amb dades mínimes, escalat, accés excepcional i manteniment planificat o urgent.

### Acord de nivell de servei

Ruta: `docs/acord-nivell-servei-preliminar.md`

Proposa cobertura, temps de resposta, disponibilitat, manteniment, informes i conseqüències, sense presentar-los encara com a compromisos vigents.

### Vulnerabilitats i actualitzacions

Ruta: `docs/politica-vulnerabilitats-actualitzacions-preliminar.md`

Regula la recepció d'avisos, severitat, contenció, correcció, dependències, secrets, desplegaments urgents i divulgació coordinada.

## Fitxers tècnics clau

### Firestore rules

Ruta: `firestore.rules`

Rules de Firebase mantingudes al repositori. La versió reforçada està provada localment, però el desplegament continua pendent de resoldre i migrar els qüestionaris antics. Controlen l'accés previst a:

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
2. Situar l'estat i els passos futurs: `docs/full-de-ruta-institucional-i-empresa.md`
3. Utilitzar `docs/questionari-ministeri-decisions-institucionals.md` per obtenir les decisions pendents.
4. Llegir o ensenyar: `docs/fitxa-tecnica-direccio-ministeri.md`
5. Si preocupa la protecció de dades: `docs/proteccio-dades-avaluapro.md`
6. Si volen saber quines dades es guarden: `docs/mapa-dades.md`
7. Si ho revisa una persona tècnica: `docs/firebase-acces.md` i `firestore.rules`
8. Si interessa el treball entre docents: `docs/comparticio-docents.md`
9. Per revisar riscos pendents: `docs/auditoria-comparticio-permisos.md`
10. Per tancar: `docs/checklist-final-seguretat.md`

## Nota important

Aquests documents no substitueixen una revisió jurídica formal ni un contracte d'encàrrec de tractament de dades. Serveixen com a documentació tècnica i pedagògica del projecte, i com a base perquè Direcció, l'escola o el Ministeri puguin valorar-ne l'ús institucional.
