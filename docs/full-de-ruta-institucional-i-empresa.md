# Full de ruta institucional, empresarial i de proteccio de dades d'Avaluapro

Data de creacio: 18 de juny de 2026
Estat: guia viva de treball
Objectiu: ordenar cronologicament els passos per convertir Avaluapro, actualment un quadern docent personal, en un producte que pugui ser contractat i utilitzat institucionalment.

> Aquest document es una guia de projecte. No substitueix l'assessorament juridic, fiscal, mercantil o de proteccio de dades que caldra obtenir abans de formalitzar contractes o iniciar un desplegament institucional.

## Com interpretar l'estat de les tasques

| Estat | Significat |
| --- | --- |
| Fet | Hi ha una implementacio o un document verificable al repositori. |
| Parcial | Hi ha una base feta, pero s'ha d'actualitzar, provar o validar externament. |
| Pendent | Encara no s'ha fet o depen d'una decisio externa. |
| Ajornat | S'ha decidit conscientment no abordar-ho encara. |

Una tasca tecnica o documental marcada com a feta no equival a validacio juridica. Els documents interns serveixen com a evidencia de treball i transparencia, pero hauran de ser revisats per un professional i acceptats pel Ministeri per tenir valor institucional.

## 1. Punt de partida

Avaluapro:

- es una aplicacio web educativa desenvolupada amb React, Vite, JavaScript, IndexedDB i Firebase;
- utilitza autenticacio de Google;
- sincronitza dades amb Cloud Firestore;
- tracta dades personals i educatives d'alumnes, majoritariament menors;
- pot contenir noms, grups, qualificacions, competencies, tasques, comportament, observacions, tutoria, diagnostics o etiquetes educatives i sociogrames;
- s'ha presentat al Ministeri d'Educacio;
- podria arribar a ser adquirida o contractada pel Ministeri;
- encara no disposa d'una empresa propia ni del marc contractual necessari per actuar com a proveidor institucional.

La finalitat d'aquest full de ruta no es anonimitzar completament Avaluapro. Un quadern docent necessita identificar els alumnes. La finalitat es aconseguir un tractament de dades:

- legitim;
- necessari i proporcional;
- segur;
- documentat;
- auditable;
- contractualment clar;
- preparat per créixer.

## 2. Decisions de principi ja adoptades

Aquestes son les conclusions de treball actuals:

1. Utilitzar noms d'alumnes no implica automaticament incomplir la normativa.
2. Els noms i les dades educatives continuen sent dades personals encara que estiguin xifrades.
3. Un codi com `OriSP` no es anonimitzacio i constitueix, com a maxim, una pseudonimitzacio feble.
4. Un identificador aleatori redueix millor el risc, pero les dades continuen sent personals si es poden tornar a relacionar amb l'alumne.
5. L'anonimitzacio completa no es un objectiu realista per al funcionament ordinari d'un quadern docent.
6. La pseudonimitzacio es una mesura de reduccio del risc, no una manera de sortir automaticament de la normativa.
7. Firebase pot formar part d'una arquitectura conforme, pero Firebase, Google, el xifratge i l'autenticacio no garanteixen per si sols el compliment.
8. Crear una empresa es el vehicle juridic i contractual per oferir el servei, pero no resol per si sol la proteccio de dades.
9. Andorra Telecom podria ser un proveidor o partner d'infraestructura, pero no garanteix per si sol la seguretat integral ni el compliment legal.
10. La IA s'ha de deixar per a una fase posterior i no ha de prendre decisions academiques autonomes.

## 2.1. Dossier de transparencia ja existent

Abans de crear aquest full de ruta, el repositori ja disposava d'un dossier tecnic i pedagogic de proteccio de dades. No es un unic document, sino un conjunt coordinat:

| Document | Contingut | Estat a 18/06/2026 |
| --- | --- | --- |
| `docs/guia-documents-direccio-ministeri.md` | Index i ordre de lectura del dossier. | Fet i actualitzat per incloure aquest full de ruta. |
| `docs/fitxa-tecnica-direccio-ministeri.md` | Resum executiu per presentar l'arquitectura i les mesures. | Fet com a base; revisio pendent abans d'una nova presentacio. |
| `docs/proteccio-dades-avaluapro.md` | Explicacio general del tractament i les proteccions. | Fet com a base; no substitueix revisio juridica. |
| `docs/mapa-dades.md` | Inventari de dades, ubicacions, finalitats i sensibilitat. | Base molt avancada; cal actualitzar-la amb els canvis posteriors al 04/06/2026. |
| `docs/firebase-acces.md` | Rutes, rules, aillament per usuari, backups i comparticio. | Desactualitzat en la part compartida; cal una nova auditoria de cotutories i sociometria. |
| `docs/minimitzacio-dades.md` | Criteris sobre diagnostics, text lliure, fotos i sociograma. | Fet. |
| `docs/controls-minimitzacio-app.md` | Controls i avisos implementats dins l'aplicacio. | Fet segons la revisio del 04/06/2026; cal prova de regressio. |
| `docs/seguretat-dins-app.md` | Pantalla de dades, copies, restauracio i eliminacio. | Fet com a documentacio funcional. |
| `docs/backups-conservacio.md` | Copies, restauracio, final de curs i antecedents. | Parcial: hi ha politica operativa, pero falta una politica institucional de terminis. |
| `docs/fotos-fitxers.md` | Estat actual de les imatges i pla futur de Storage. | Fet com a decisio tecnica; migracio ajornada. |
| `docs/comparticio-docents.md` | Paquets de notes, cotutories, invitacions i sociometria compartida. | Actualitzat descriptivament; auditoria de seguretat pendent. |
| `docs/auditoria-comparticio-permisos.md` | Matriu actual/objectiu, riscos i ordre de correccio dels fluxos compartits. | Primera auditoria interna completada; correccions pendents. |
| `docs/app-check-entorn-public.md` | Dominis, API key, App Check i resposta tecnica a incidencies. | Parcial: documentat, App Check no activat i entorns no separats. |
| `docs/checklist-final-seguretat.md` | Resultats locals i proves manuals pendents. | Parcial: build i lint constaven correctes; diverses proves reals continuen pendents. |

### Conclusio de la revisio

No partim de zero. Ja existeixen:

- un inventari ampli de dades;
- una classificacio inicial de sensibilitat;
- criteris de necessitat i minimitzacio;
- documentacio de Firestore i dels accessos;
- una politica operativa de backups;
- documentacio de comparticio entre docents;
- controls visibles dins l'app;
- una fitxa tecnica per a Direccio i Ministeri;
- una checklist de seguretat;
- decisions documentades sobre Storage i App Check.

El principal risc documental actual es la desactualitzacio. La majoria d'aquests documents tenen data 4 de juny de 2026 i Avaluapro ha continuat canviant. Abans d'utilitzar el dossier com a evidencia institucional, cal comparar-lo de nou amb:

- el codi actual;
- les col.leccions actuals d'IndexedDB;
- les rules actuals de Firestore;
- la configuracio real publicada a Firebase;
- els fluxos nous de tutoria i sociometria;
- els mecanismes actuals de backup, comparticio i eliminacio.

## 2.2. Prioritat critica detectada: dades compartides

La revisio del 18 de juny de 2026 confirma que el model de comparticio ha crescut substancialment. Ja no existeix nomes l'enviament puntual de notes.

Actualment hi ha tres fluxos diferenciats:

1. **Paquets de notes:** enviament puntual de notes finals entre un professor i un tutor.
2. **Cotutories compartides:** espais persistents en els quals diversos docents poden sincronitzar i editar dades tutorials.
3. **Qüestionaris sociometrics publics:** formularis accessibles mitjancant un identificador o enllac per recollir respostes dels alumnes.

Les cotutories poden compartir:

- alumnes i dades del perfil;
- registres tutorials i DOIPs;
- notes tutorials;
- relacions i dades sociometriques;
- grups cooperatius;
- moments i disposicions del sociograma;
- rols tutorials;
- disposicions d'aula;
- antecedents academics.

Les rutes compartides actuals inclouen:

```text
teacherGradePackages/{packageId}
tutoringSpaces/{spaceId}
tutoringSpaces/{spaceId}/{collectionName}/{documentId}
tutoringInvitationInbox/{recipientEmail}/items/{spaceId}
tutoringInvitationOutbox/{senderUid}/items/{outboxId}
sociometricSurveys/{surveyId}
sociometricSurveys/{surveyId}/responses/{responseId}
```

Per tant, abans d'una nova presentacio institucional s'ha de considerar **bloquejant**:

- revisar qui pot llegir, crear, modificar i eliminar cada tipus de dada;
- comprovar si qualsevol membre pot afegir o retirar altres membres;
- definir el rol diferenciat de propietari, tutor, cotutor i lector;
- definir com es revoca l'acces d'un cotutor;
- impedir que un membre elimini dades que no hauria de poder eliminar;
- revisar els conflictes de sincronitzacio i la traçabilitat de l'autor dels canvis;
- provar que una invitacio no es pot acceptar des d'un compte diferent;
- revisar quines dades d'alumnes queden visibles en un qüestionari sociometric public;
- valorar codis temporals o altres mecanismes per evitar exposar noms en formularis publics;
- definir tancament, caducitat i eliminacio de qüestionaris i respostes;
- provar les rules amb comptes reals diferents i dades completament ficticies.

Fins que aquesta auditoria estigui completada:

- no s'ha de presentar el dossier antic com si `teacherGradePackages` fos l'unica ruta compartida;
- no s'ha de considerar tancada la revisio de Firestore;
- les proves de cotutoria i sociometria s'han de fer amb alumnes ficticis;
- no s'ha d'obrir un pilot institucional d'aquestes funcionalitats.

## 3. Model institucional de referencia

En un desplegament contractat pel Ministeri, el model que cal validar seria previsiblement:

| Actor | Funcio probable |
| --- | --- |
| Ministeri o centre educatiu | Responsable del tractament: decideix les finalitats, les dades necessaries i les condicions d'us. |
| Empresa d'Avaluapro | Encarregada del tractament: presta el servei i tracta les dades seguint instruccions documentades. |
| Google/Firebase o un altre proveidor | Subencarregat tecnologic, si allotja o processa dades del servei. |
| Proveidor d'IA futur | Subencarregat addicional, si rep dades personals encara que estiguin pseudonimitzades. |

Aquest repartiment no s'ha de donar per tancat fins que el Ministeri i un assessor especialitzat el confirmin.

---

# Fase 0. Auditar immediatament comparticio, cotutories i sociometria

## Objectiu

Fer coincidir la documentacio i les garanties de seguretat amb el funcionament actual abans de continuar preparant la proposta institucional.

## Accions bloquejants

- [x] Identificar totes les rutes compartides actuals.
- [x] Identificar les col.leccions sincronitzades en una cotutoria.
- [x] Crear una matriu de permisos per ruta i operacio: llegir, crear, modificar, eliminar i convidar.
- [x] Definir provisionalment les operacions exclusives del propietari.
- [x] Definir provisionalment que els cotutors poden editar dades tutorials, pero no gestionar membres ni l'espai.
- [ ] Implementar i provar la revocacio de membres. **Parcial:** implementada i provada amb emulador; falta prova amb dos comptes reals.
- [x] Definir que passa amb les copies locals quan es revoca un membre: es mantenen al dispositiu, deixen de sincronitzar-se i l'app n'informa.
- [x] Impedir a les rules locals que els cotutors modifiquin la llista de membres o els seus rols.
- [x] Restringir les subcol.leccions de `tutoringSpaces` a una llista explicita en les rules locals.
- [ ] Validar amb dos comptes reals l'eliminacio compartida. **Parcial:** tombstones implementats, eliminacio fisica bloquejada i 31 proves automatitzades superades.
- [ ] Provar invitacions acceptades, rebutjades, duplicades i enviades al correu equivocat. **Parcial:** acceptacio, revocacio i sortida cobertes per proves de rules.
- [ ] Provar conflictes d'edicio simultania entre dos cotutors.
- [ ] Verificar que cada canvi sensible deixa autoria i data suficients.
- [ ] Revisar el formulari sociometric public i la visibilitat dels noms. **Parcial:** el document general ja no es public ni revela la llista; cada token valid continua mostrant els noms necessaris per respondre.
- [x] Definir caducitat, tancament i eliminació manual dels qüestionaris. **Fet localment:** caducitat de 24 hores i eliminació completa de qüestionari, tokens i respostes només pel propietari.
- [ ] Implementar purga automàtica de respostes sociomètriques. **Política provisional:** eliminar després de sincronitzar i, com a màxim, set dies després de caducar. Requereix backend programat abans del pilot institucional.
- [x] Evitar respostes duplicades o suplantacions quan sigui necessari. **Fet localment:** enllaç individual amb token aleatori, identitat fixada i resposta d'un sol ús. No elimina el risc que un alumne comparteixi voluntàriament el seu enllaç.
- [x] Mostrar informació essencial abans de respondre. **Fet localment:** finalitat, destinataris, no anonimat, conservació, ús de l'enllaç i canal de consulta.
- [ ] Validar jurídicament la informació als participants i completar responsable, base jurídica, DPD, drets i canal institucional.
- [ ] Ampliar les proves automatitzades amb Firebase Emulator a totes les rules compartides. **Parcial:** 26 proves de rules i 5 proves de fusio superades.
- [ ] Actualitzar `docs/firebase-acces.md`, `docs/mapa-dades.md` i la fitxa tecnica amb el resultat final.

La matriu, les troballes i les decisions provisionals es troben a `docs/auditoria-comparticio-permisos.md`.

## Criteri per donar la fase per superada

Cal disposar de:

1. matriu de permisos aprovada;
2. rules provades automaticament;
3. proves manuals amb almenys dos comptes docents;
4. flux de revocacio verificat;
5. politica definida per als qüestionaris publics;
6. documentacio de transparencia actualitzada;
7. absencia de dades reals durant les proves.

---

# Fase 1. Confirmar l'interes i els requisits del Ministeri

## Objectiu

Evitar crear l'empresa, migrar la infraestructura o assumir costos abans de saber que exigeix realment el possible comprador.

## Accions

- [ ] Demanar al Ministeri un resum escrit dels proxims passos.
- [ ] Confirmar si la creacio d'una societat es un requisit imprescindible per contractar.
- [ ] Preguntar quin tipus de procediment preveuen: compra, llicencia, servei, manteniment, pilot o licitacio.
- [ ] Identificar la persona responsable de la part funcional.
- [ ] Identificar la persona responsable de sistemes o ciberseguretat.
- [ ] Identificar el delegat o responsable de proteccio de dades que revisara el projecte.
- [ ] Preguntar si el Ministeri vol adquirir el programari, una llicencia d'us o un servei allotjat.
- [ ] Preguntar qui hauria de ser propietari del projecte de nuvol i de les dades.
- [ ] Preguntar si exigeixen allotjament de dades a Andorra, a Europa o en una infraestructura concreta.
- [ ] Preguntar si accepten Firebase/Google Cloud amb garanties contractuals adequades.
- [ ] Preguntar si exigeixen certificacions, auditories, asseguranca o nivells de servei.
- [ ] Preguntar si volen iniciar un pilot limitat abans d'una contractacio completa.

## Resultat necessari per avancar

Un document, correu o acta de reunio que separi:

- requisits obligatoris;
- preferencies;
- aspectes encara no decidits;
- interlocutors responsables;
- possible calendari de decisio.

## Dubtes oberts

- El Ministeri vol comprar la propietat del codi o contractar-ne l'us?
- La futura empresa haura d'allotjar el servei o el Ministeri preferira controlar la infraestructura?
- La constitucio d'una SL es un requisit legal del procediment o una recomanacio per facilitar la contractacio?
- Hi ha pressupost, calendari o compromis per a una prova pilot?

---

# Fase 2. Protegir el nom i ordenar la propietat del projecte

## Objectiu

Assegurar que es pot demostrar qui ha creat Avaluapro i qui sera titular dels actius que s'ofereixin al Ministeri.

## Accions prioritaries

- [ ] Fer una cerca previa de marques similars abans de registrar `Avaluapro`.
- [ ] Consultar l'OMPA o un mandatari acreditat sobre les classes adequades.
- [ ] Decidir si la marca es registra inicialment a nom de Marc o de la futura societat.
- [ ] Registrar la marca verbal `Avaluapro` si no hi ha conflictes.
- [ ] Valorar el registre posterior del logotip com a marca figurativa.
- [ ] Conservar l'historial Git, les versions publicades, els dissenys i la documentacio com a proves d'autoria.
- [ ] Revisar les llicencies de llibreries, icones, tipografies, imatges i altres recursos externs.
- [ ] Documentar qualsevol contribucio de tercers.
- [ ] Preparar contractes de cessio o llicencia si en el futur hi col·laboren altres persones.

## Criteris actuals

- La marca pot ser titularitat d'una persona fisica o juridica.
- No es imprescindible crear una SL per registrar la marca.
- El codi font original esta protegit pels drets d'autor des de la seva creacio.
- El registre de marca no protegeix el funcionament intern de l'aplicacio.
- El nom comercial, el domini, la marca, el codi i una eventual patent son actius diferents.

## Deixar per mes endavant

- **Patent:** nomes estudiar-la si un agent de patents identifica una invencio tecnica concreta, nova i defensable. No es pressuposa que una aplicacio educativa convencional sigui patentable.
- **Secret empresarial:** definir-lo quan hi hagi empresa, col·laboradors o coneixement intern que realment es mantingui secret. No es un simple registre a l'OMPA.
- **Registre internacional de marca:** valorar-lo quan existeixi una estrategia real d'expansio fora d'Andorra.

## Fonts de referencia

- [OMPA: marques](https://www.govern.ad/ca/tematiques/empresa-i-emprenedoria/ompa/marques/sollicitud-de-registre-de-marca)
- [OMPA: patents](https://www.govern.ad/ca/tematiques/empresa-i-emprenedoria/ompa/patents/sollicitud-de-patent)
- [Llei andorrana sobre drets d'autor i drets veins](https://portaljuridicandorra.ad/L19990610E_2)

---

# Fase 3. Fer l'inventari real de dades i funcionalitats

## Objectiu

Descriure amb precisio que guarda Avaluapro, per que ho guarda, qui hi accedeix, on s'emmagatzema i quan s'elimina.

## Accions

- [ ] Actualitzar el mapa complet de dades amb els canvis posteriors al 04/06/2026. **Parcial:** ja existeix `docs/mapa-dades.md`.
- [x] Classificar inicialment cada dada com a necessaria, opcional, calculada o prescindible. **Fet:** `docs/mapa-dades.md`.
- [x] Identificar dades especialment delicades: salut, diagnostics, familia, conducta, sociograma i text lliure. **Fet:** `docs/mapa-dades.md` i `docs/minimitzacio-dades.md`.
- [x] Documentar les ubicacions conegudes: IndexedDB, Firestore, backups, exportacions i paquets compartits. **Fet com a base:** cal verificar que no hi hagi fluxos nous.
- [x] Identificar dades duplicades o que convindria no duplicar. **Fet com a criteri inicial:** `docs/mapa-dades.md`.
- [x] Identificar dades calculables que no cal guardar. **Fet:** mitjanes, percentatges, perfils i estadistiques derivades estan documentats.
- [ ] Validar els fluxos actuals de comparticio entre docents. **Parcial:** estan descrits a `docs/comparticio-docents.md`, pero falta l'auditoria de la fase 0.
- [ ] Documentar de manera completa els accessos tecnics i administratius possibles. **Parcial:** els accessos docents estan descrits; falten administradors, suport i model institucional.
- [x] Definir quines dades s'han d'evitar o limitar. **Fet com a politica interna:** informacio medica detallada, familiar, economica i judicis no necessaris.
- [x] Separar conceptualment les dades del sistema oficial de les dades de suport docent. **Fet:** Avaluapro es descriu com a quadern docent i no com a substitut de Clickedu.

## Documents existents que cal mantenir actualitzats

- `docs/mapa-dades.md`
- `docs/minimitzacio-dades.md`
- `docs/controls-minimitzacio-app.md`
- `docs/backups-conservacio.md`
- `docs/fotos-fitxers.md`
- `docs/comparticio-docents.md`
- `docs/auditoria-comparticio-permisos.md`
- `docs/proteccio-dades-avaluapro.md`

## Resultat necessari per avancar

Una taula validable amb:

| Camp | Contingut |
| --- | --- |
| Dada | Que es guarda. |
| Finalitat | Per que es necessita. |
| Base legitimadora | La determinara o validara el responsable del tractament. |
| Usuaris amb acces | Qui la pot veure o modificar. |
| Ubicacio | On s'emmagatzema. |
| Conservacio | Quant de temps es mantindra. |
| Eliminacio | Com i quan s'eliminara. |
| Comparticio | A qui es pot comunicar. |
| Risc | Consequencia d'un acces, error o perdua. |

---

# Fase 4. Dissenyar l'arquitectura institucional objectiu

## Objectiu

Passar del model actual de quadern personal per docent a una arquitectura preparada per centres, rols, canvis de professorat i control institucional.

## Arquitectura recomanada de referencia

Separar logicament:

```text
Identitat
studentId -> nom, grup i dades identificatives necessaries

Dades educatives
studentId -> competencies, notes, tasques, observacions i seguiment
```

Condicions:

- `studentId` aleatori i sense informacio deduible;
- separacio estricta entre centres;
- permisos basats en rols i grups assignats;
- acces a identitat mes restringit quan sigui possible;
- registre d'operacions sensibles;
- entorns separats de desenvolupament, proves i produccio;
- dades ficticies en desenvolupament;
- procediments de baixa i canvi de docent;
- exportacio, portabilitat i eliminacio controlades;
- backups amb politica de conservacio i recuperacio;
- cap acces habitual del desenvolupador al contingut educatiu.

## Decisions que cal prendre amb el Ministeri

- [ ] Model de propietat de les dades.
- [ ] Model de propietat del projecte de Firebase o del nuvol.
- [ ] Rols: docent, tutor, orientacio, direccio, administrador i suport.
- [ ] Regles institucionals de comparticio entre docents, inclosos propietari, cotutors, revocacio i eliminacio.
- [ ] Tractament del canvi de curs i dels historics.
- [ ] Integracio o no amb Clickedu o altres sistemes oficials.
- [ ] Necessitat d'una font oficial d'alumnes i grups.
- [ ] Requisits de registre d'accessos.
- [ ] Requisits de disponibilitat i recuperacio.

## No recomanat com a arquitectura principal

Guardar la correspondencia entre identificador i nom nomes al dispositiu del docent. Pot augmentar la privacitat davant del proveidor, pero dificulta:

- la sincronitzacio entre dispositius;
- les copies de seguretat;
- els canvis de docent;
- la comparticio autoritzada;
- la recuperacio davant perdues;
- el suport institucional.

## Opcio futura d'alta privacitat

Es pot estudiar el xifratge de camps identificatius amb claus sota control institucional. Abans cal resoldre:

- recuperacio de claus;
- canvi de dispositiu;
- acces de substituts;
- backups;
- comparticio;
- cerca i ordenacio;
- suport tecnic;
- resposta a requeriments d'acces o rectificacio.

---

# Fase 5. Fer l'avaluacio de riscos i l'avaluacio d'impacte

## Objectiu

Analitzar els riscos per als alumnes abans d'un desplegament institucional, no nomes els riscos per al negoci o per a la infraestructura.

## Accions

- [ ] Contractar o consultar un especialista en proteccio de dades d'Andorra.
- [ ] Preparar una avaluacio d'impacte preliminar d'Avaluapro.
- [ ] Validar amb el responsable de proteccio de dades del Ministeri qui aprova i signa l'avaluacio final.
- [ ] Analitzar especialment el tractament de menors.
- [ ] Analitzar avaluacio, puntuacio, perfils, comportament i prediccions.
- [ ] Analitzar diagnostics, necessitats educatives i possibles dades de salut.
- [ ] Analitzar sociogrames i relacions entre alumnes.
- [ ] Analitzar textos lliures i risc d'introduir dades excessives.
- [ ] Analitzar comparticio, backups, exportacions i dispositius.
- [ ] Analitzar els efectes d'una fuita, error, indisponibilitat o perdua.
- [ ] Definir mesures tecnologiques i organitzatives per reduir cada risc.
- [ ] Documentar el risc residual i qui l'accepta.

## Resultat necessari per avancar

Una avaluacio revisada per un professional i validable pel Ministeri abans d'introduir dades reals en un pilot institucional.

## Fonts de referencia

- [Llei 29/2021 qualificada de proteccio de dades personals](https://www.portaljuridicandorra.ad/L2021029)
- [Guia de l'APDA sobre avaluacio d'impacte](https://www.apda.ad/storage/guides/fUCPtAfCs3M44wkQGA9ug4XEUWhRuvtCyMVXnkdJ.pdf)
- [Guia de l'APDA per a centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)

---

# Fase 6. Decidir la infraestructura i els proveidors

## Objectiu

Escollir la infraestructura a partir dels requisits del Ministeri i de l'avaluacio de riscos, no nomes per percepcio de seguretat.

## Opcio A. Continuar amb Firebase/Google Cloud

Avantatges:

- arquitectura ja coneguda;
- autenticacio, base de dades i hosting gestionats;
- escalabilitat i alta disponibilitat;
- menys manteniment de servidors;
- condicions de tractament i mesures de seguretat publicades.

Aspectes que cal confirmar:

- [ ] Regio real del projecte Firestore.
- [ ] Regio de tots els serveis i backups.
- [ ] Serveis exactes utilitzats.
- [ ] Condicions contractuals aplicables.
- [ ] Subencarregats.
- [ ] Transferencies internacionals.
- [ ] Retencio de dades tecniques i registres.
- [ ] Possibilitat que el projecte sigui propietat del Ministeri.
- [ ] Acceptacio formal per part del Ministeri.

Referencies:

- [Privacitat i seguretat de Firebase](https://firebase.google.com/support/privacy)
- [Condicions de tractament de dades de Firebase](https://firebase.google.com/terms/data-processing-terms)
- [Ubicacions de Cloud Firestore](https://firebase.google.com/docs/firestore/locations)

## Opcio B. Infraestructura o serveis d'Andorra Telecom

Avantatges potencials:

- allotjament fisic a Andorra;
- proximitat institucional;
- sobirania i localitzacio de dades;
- infraestructura amb redundancia i certificacio ISO 27001 anunciada.

Preguntes que cal fer:

- [ ] Ofereixen una plataforma de nuvol gestionada o nomes espai de servidor?
- [ ] Poden substituir Firestore, Authentication, Hosting i backups?
- [ ] Qui administraria sistemes operatius, bases de dades i actualitzacions?
- [ ] Quin SLA, suport i temps de recuperacio ofereixen?
- [ ] Com es fan les copies i on s'emmagatzemen?
- [ ] Poden signar un contracte d'encarregat o subencarregat?
- [ ] Quins registres i auditories ofereixen?
- [ ] Quin seria el cost inicial i anual?
- [ ] Podrien actuar realment com a partner tecnologic i no nomes com a allotjador?

Referencia:

- [Data Center d'Andorra Telecom](https://www.andorratelecom.ad/empreses/data-center)

## Decisio ajornada

No migrar Firebase ni construir un backend propi fins a disposar de:

1. requisits escrits del Ministeri;
2. comparativa tecnica i economica;
3. revisio de proteccio de dades;
4. definicio de qui mantindra la infraestructura;
5. pla de migracio i recuperacio.

---

# Fase 7. Constituir l'empresa quan hi hagi una via contractual clara

## Objectiu

Crear l'entitat que podra contractar, facturar, assumir obligacions i ser titular o llicenciataria dels actius d'Avaluapro.

## Abans de constituir-la

- [ ] Obtenir confirmacio suficient de la via de contractacio.
- [ ] Consultar una gestoria o assessor mercantil i fiscal andorra.
- [ ] Preparar una previsio de costos per als primers 12-24 mesos.
- [ ] Decidir el nom social.
- [ ] Decidir si sera una societat limitada unipersonal.
- [ ] Definir l'objecte social: desenvolupament, llicencia, manteniment, allotjament, formacio i serveis tecnologics.
- [ ] Decidir quins actius aportara o cedira Marc a la societat.
- [ ] Definir la titularitat de la marca, el domini, el codi i els comptes de proveidors.
- [ ] Revisar possibles incompatibilitats o obligacions derivades de la condicio de docent o empleat public.
- [ ] Confirmar si cal autoritzacio per a una activitat economica paral·lela.

## Capital i costos

El capital social minim publicat per a una societat limitada andorrana es de 3.000 euros.

Aquest import:

- passa a formar part del patrimoni de la societat;
- es pot utilitzar per pagar despeses legitimes de l'empresa;
- no es pot retirar lliurement com si continues sent diner personal;
- no representa tot el cost de crear i mantenir la societat.

Cal pressupostar tambe:

- notaria;
- registre;
- autoritzacions;
- gestoria i comptabilitat;
- impostos;
- taxes anuals;
- asseguranca;
- serveis juridics;
- proteccio de dades;
- infraestructura;
- auditories i suport.

Referencia:

- [Cambra de Comerc d'Andorra: creacio d'empreses i societats](https://www.ccis.ad/https-www-ccis-ad-wp-content-uploads-2019-02-creacio-dempreses-i-constitucio-de-societats-pdf/)

## Resultat necessari per avancar

Una societat operativa, amb comptes i actius ordenats, preparada per signar contractes i assumir les obligacions d'un proveidor tecnologic.

---

# Fase 8. Preparar el paquet legal i contractual

## Objectiu

Permetre que el Ministeri contracti Avaluapro amb responsabilitats i garanties clares.

## Documents que cal preparar

- [ ] Contracte principal de llicencia o prestacio del servei.
- [ ] Contracte d'encarrec de tractament.
- [ ] Relacio de subencarregats.
- [ ] Descripcio de les mesures tecniques i organitzatives.
- [ ] Registre d'activitats o categories de tractament de l'empresa.
- [ ] Politica de conservacio i eliminacio.
- [ ] Procediment d'exercici de drets.
- [ ] Procediment de notificacio i gestio d'incidents.
- [ ] Pla de continuitat i recuperacio.
- [ ] Condicions de retorn o eliminacio de dades al final del contracte.
- [ ] Compromisos de confidencialitat.
- [ ] Condicions de suport i manteniment.
- [ ] Acord de nivell de servei, si escau.
- [ ] Politica de vulnerabilitats i actualitzacions.
- [ ] Inventari i condicions dels proveidors externs.

## Decisions contractuals importants

- Qui es propietari del codi?
- El Ministeri rep una llicencia o una cessio?
- Qui es propietari de les dades i configuracions?
- Que passa si l'empresa tanca?
- Com es recuperen les dades?
- Qui paga i controla la infraestructura?
- Qui autoritza nous subencarregats?
- Quin termini hi ha per comunicar incidents?
- Quines auditories pot exigir el Ministeri?

Referencia:

- [Models de l'APDA](https://www.apda.ad/models)

---

# Fase 9. Enduriment tecnic i verificacio externa

## Objectiu

Demostrar amb proves que les mesures descrites existeixen i funcionen.

## Accions

- [ ] Separar desenvolupament, proves i produccio.
- [x] Establir que la demo i el desenvolupament han d'utilitzar dades ficticies. **Fet com a politica documentada; falta un entorn tecnic separat.**
- [ ] Revisar i provar totes les regles de Firestore sobre la versio actual. **Parcial:** hi ha auditoria interna i rules publicades segons el dossier del 04/06/2026, pero `firestore.rules` ha canviat posteriorment i cal repetir la verificacio.
- [ ] Implantar proves automatitzades d'autoritzacio.
- [ ] Aplicar minim privilegi a usuaris i administradors.
- [ ] Activar MFA per als comptes administratius.
- [ ] Revisar dominis, claus i configuracio real de Firebase. **Parcial:** hi ha criteris i llista de dominis documentats, pero la configuracio es externa al repositori.
- [ ] Valorar i desplegar App Check quan l'entorn sigui estable. **Ajornat conscientment:** `docs/app-check-entorn-public.md`.
- [ ] Crear registres d'auditoria adequats.
- [ ] Definir alertes d'activitat anomala.
- [ ] Xifrar dispositius i copies locals.
- [ ] Revisar la seguretat d'IndexedDB i la gestio de sessio.
- [ ] Validar copies de seguretat, restauracio i eliminacio amb proves reals. **Parcial:** funcionalitat i politica operativa documentades; proves manuals encara pendents.
- [ ] Fer una auditoria tecnica externa o prova de penetracio proporcional al risc.
- [ ] Corregir i documentar les troballes.

## Resultat necessari per avancar

Un dossier de seguretat amb:

- arquitectura;
- permisos;
- proves;
- incidencies detectades;
- correccions;
- riscos residuals;
- data de revisio;
- responsables.

---

# Fase 10. Pilot institucional controlat

## Objectiu

Validar el producte amb un abast limitat abans d'un desplegament general.

## Condicions minimes

- [ ] Contractes i rols de proteccio de dades definits.
- [ ] Avaluacio d'impacte revisada.
- [ ] Infraestructura acceptada.
- [ ] Dades i centres pilot delimitats.
- [ ] Docents formats.
- [ ] Protocol de suport i incidents actiu.
- [ ] Criteris d'exit i aturada definits.
- [ ] Pla de sortida i eliminacio de dades.

## Recomanacio

Comencar, si el Ministeri ho accepta, amb:

- pocs docents;
- pocs grups;
- funcionalitats essencials;
- sense IA;
- sense integracions complexes;
- sense dades mediques o familiars innecessaries;
- seguiment tecnic i pedagogic proper.

## Que cal avaluar

- usabilitat real;
- errors d'autoritzacio;
- qualitat de sincronitzacio;
- incidencies de suport;
- adequacio de rols;
- dades que sobren o falten;
- comprensio dels avisos;
- valor pedagogic;
- carrega de manteniment;
- costos reals.

---

# Fase 11. Desplegament i operacio continuada

## Objectiu

Mantenir el compliment i la seguretat durant tota la vida del producte.

## Obligacions recurrents

- [ ] Revisar permisos i usuaris.
- [ ] Donar de baixa accessos.
- [ ] Revisar subencarregats.
- [ ] Actualitzar dependencies.
- [ ] Gestionar vulnerabilitats.
- [ ] Provar restauracions.
- [ ] Revisar registres i alertes.
- [ ] Formar nous usuaris.
- [ ] Revisar terminis de conservacio.
- [ ] Eliminar dades quan correspongui.
- [ ] Actualitzar l'avaluacio d'impacte davant canvis importants.
- [ ] Revisar anualment la documentacio i els contractes.
- [ ] Documentar incidents i millores.

---

# Fase 12. Integracio futura amb intel·ligencia artificial

## Estat

Ajornada fins que el nucli institucional, contractual i de seguretat estigui validat.

## Arquitectura de referencia

La IA no hauria de rebre identificadors directes:

```json
{
  "sessionStudentId": "A7",
  "competencies": {
    "competencia1": 7,
    "competencia2": 4
  },
  "observacions": []
}
```

La correspondencia entre `A7` i l'alumne ha de quedar dins d'Avaluapro. L'identificador enviat a la IA hauria de ser temporal i diferent de l'identificador intern permanent.

## Condicions minimes futures

- [ ] Cap nom, cognom, correu o informacio familiar.
- [ ] Cap diagnostic clinic, tret que existeixi una justificacio excepcional i expressa.
- [ ] Filtratge de text lliure abans de l'enviament.
- [ ] Minimitzacio de les dades enviades.
- [ ] Proveidor que no utilitzi les dades per entrenar models generals.
- [ ] Retencio nul·la o minima documentada.
- [ ] Contracte d'encarrec i relacio de subencarregats.
- [ ] Avaluacio especifica del risc i actualitzacio de l'avaluacio d'impacte.
- [ ] Registre de quan i per que s'utilitza la IA.
- [ ] Resultat revisat sempre per un docent.
- [ ] Cap qualificacio, sancio o decisio rellevant presa autonomament.
- [ ] Informacio clara sobre limitacions, errors i biaixos.

## Criteri legal de treball

Encara que la IA rebi dades pseudonimitzades, probablement continuara havent-hi tractament de dades personals si Avaluapro pot tornar a relacionar la resposta amb un alumne.

---

# Decisions aparcades

Aquestes decisions no s'han de prendre encara:

| Tema | Motiu per ajornar-lo | Quan reprendre'l |
| --- | --- | --- |
| Migrar de Firebase | No coneixem els requisits definitius del Ministeri. | Despres de les fases 1, 5 i 6. |
| Allotjar-ho tot a Andorra Telecom | Cal saber serveis, costos, SLA i responsabilitats. | Quan hi hagi proposta tecnica formal. |
| Backend propi | Augmentaria molt el manteniment i la responsabilitat. | Nomes si els requisits institucionals ho exigeixen. |
| Xifratge extrem a dispositiu | Complica sincronitzacio, recuperacio i comparticio. | Si l'avaluacio de riscos ho justifica. |
| Eliminar tots els noms del nuvol | Pot fer inviable el producte institucional. | Nomes si el Ministeri exigeix un model especific. |
| Patent | No s'ha identificat encara una invencio tecnica patentable. | Despres d'una consulta especialitzada. |
| Marca internacional | Encara no hi ha estrategia comercial exterior. | Quan hi hagi expansio real. |
| Integracio amb IA | Afegeix tractament, proveidors i riscos nous. | Despres del pilot institucional del nucli. |
| Integracio amb Clickedu | Requereix acord, APIs i governanca institucional. | Quan el Ministeri defineixi el model de sistema. |
| Aplicacio nativa | No es necessaria per validar el producte. | Quan les necessitats d'us ho justifiquin. |

---

# Registre de dubtes pendents

## Ministeri

- [ ] Que volen contractar exactament?
- [ ] Exigeixen una SL o acceptarien una altra forma de proveidor?
- [ ] Qui sera responsable del tractament?
- [ ] Qui controlara la infraestructura?
- [ ] Accepten Firebase/Google Cloud?
- [ ] Exigeixen residencia de dades a Andorra?
- [ ] Quines auditories o certificacions exigiran?
- [ ] Volen pilot, compra, llicencia o servei?
- [ ] Volen propietat del codi o dret d'us?

## OMPA i propietat

- [ ] La marca `Avaluapro` esta disponible?
- [ ] Quines classes s'han de registrar?
- [ ] Conve registrar-la ara a nom de Marc o esperar la societat?
- [ ] Com es faria una cessio posterior a la societat?
- [ ] Hi ha alguna part tecnicament patentable?

## Empresa

- [ ] Hi ha incompatibilitats amb la feina docent?
- [ ] Cal autoritzacio per exercir l'activitat?
- [ ] Quin cost inicial i anual real tindra?
- [ ] Quina estructura fiscal i mercantil es adequada?
- [ ] Com es transferiran o llicenciaran els actius a la societat?

## Proteccio de dades

- [ ] Quina base juridica aplicara el Ministeri?
- [ ] Quines dades son realment necessaries?
- [ ] Quines dades s'han de prohibir o restringir?
- [ ] Quin termini de conservacio s'aplicara?
- [ ] Com es gestionaran els historics?
- [ ] Cal un delegat de proteccio de dades propi a l'empresa?
- [ ] Quin abast final tindra l'avaluacio d'impacte?
- [ ] Quins registres d'auditoria seran obligatoris?

## Infraestructura

- [ ] On esta allotjada actualment la base de dades de Firestore?
- [ ] Es pot mantenir el projecte actual o cal crear-ne un de nou?
- [ ] El projecte de produccio ha de ser del Ministeri?
- [ ] Que ofereix exactament Andorra Telecom?
- [ ] Quin cost i esforc tindria abandonar Firebase?
- [ ] Com es fara la recuperacio davant una fallada greu?

---

# Proxima accio recomanada

La proxima accio no es crear immediatament l'empresa ni modificar l'arquitectura.

Cal preparar una reunio o comunicacio amb el Ministeri per obtenir resposta escrita, com a minim, sobre:

1. model de contractacio;
2. necessitat i moment de constituir la societat;
3. propietat del programari;
4. responsable i encarregat del tractament;
5. requisits d'allotjament;
6. acceptacio o no de Firebase/Google Cloud;
7. requisits de ciberseguretat;
8. possibilitat d'un pilot.

En paral·lel, es pot iniciar sense comprometre l'arquitectura:

1. la cerca i possible registre de la marca;
2. l'ordenacio de proves d'autoria i llicencies;
3. l'actualitzacio del mapa de dades;
4. la cerca d'un assessor andorra de proteccio de dades;
5. una estimacio realista del cost de crear i mantenir la societat.

---

# Documents relacionats del repositori

- `docs/guia-documents-direccio-ministeri.md`
- `docs/fitxa-tecnica-direccio-ministeri.md`
- `docs/proteccio-dades-avaluapro.md`
- `docs/mapa-dades.md`
- `docs/firebase-acces.md`
- `docs/minimitzacio-dades.md`
- `docs/controls-minimitzacio-app.md`
- `docs/seguretat-dins-app.md`
- `docs/backups-conservacio.md`
- `docs/fotos-fitxers.md`
- `docs/comparticio-docents.md`
- `docs/app-check-entorn-public.md`
- `docs/checklist-final-seguretat.md`

---

# Historial de decisions

Aquest apartat s'ha d'actualitzar quan es tanqui una decisio important.

| Data | Decisio | Motiu | Documents afectats |
| --- | --- | --- | --- |
| 18/06/2026 | No buscar anonimitzacio completa per a l'us ordinari. | El docent necessita identificar els alumnes; s'aplicaran minimitzacio i pseudonimitzacio quan aportin valor. | Arquitectura, proteccio de dades. |
| 18/06/2026 | Recomanar separacio logica entre identitat i dades educatives. | Redueix l'impacte d'errors, exportacions i futures integracions. | Arquitectura futura. |
| 18/06/2026 | No decidir encara una migracio de Firebase. | Falten requisits escrits del Ministeri i comparativa de proveidors. | Infraestructura. |
| 18/06/2026 | Estudiar Andorra Telecom sense considerar-lo garantia automatica. | Pot aportar infraestructura local, pero cal concretar serveis i responsabilitats. | Infraestructura. |
| 18/06/2026 | La marca es pot registrar abans de crear la societat. | L'OMPA admet titulars persones fisiques i juridiques. | Propietat industrial. |
| 18/06/2026 | Ajornar patent i IA. | No son necessaries per validar el producte institucional inicial. | Estrategia de producte. |
