# Fitxa tecnica per a direccio i Ministeri

Data: 4 de juny de 2026  
Projecte: Avaluapro  
Estat: document breu de presentacio tecnica i proteccio de dades

Aquest document resumeix com esta dissenyat Avaluapro, quines dades tracta i quines mesures aplica per protegir-les. No substitueix una revisio juridica, una avaluacio d'impacte ni el contracte d'encarrec de tractament que pugui correspondre en un us institucional.

## 1. Resum executiu

Avaluapro es una eina docent per avaluar competencialment, fer seguiment de tasques i comportament, preparar tutories, gestionar antecedents academics i obtenir estadistiques pedagogiques.

L'aplicacio esta dissenyada com un quadern docent digital. Les dades principals queden separades per docent autenticat, amb copies locals al dispositiu i sincronitzacio al nuvol quan el docent inicia sessio amb Google.

Les mesures principals son:

- autenticacio amb Google;
- dades separades per usuari a Firebase/Firestore;
- rules de Firestore per impedir l'acces entre usuaris;
- copies de seguretat separades per docent;
- enviament de notes entre docents limitat i controlat;
- avisos d'us responsable en camps sensibles;
- minimitzacio de dades i preferencia per etiquetes controlades;
- documentacio tecnica de riscos i mesures previstes.

## 2. Arquitectura general

Avaluapro funciona com una aplicacio web moderna.

| Capa | Tecnologia | Funcio |
| --- | --- | --- |
| Aplicacio web | React + Vite | Interficie del docent: avaluacio, seguiment, tutoria i estadistiques. |
| Persistencia local | IndexedDB | Guarda dades al navegador per evitar perdues si falla la connexio. |
| Preferencies lleugeres | localStorage | Nomes estat visual petit, com ultima pantalla o preferencies UI. |
| Autenticacio | Firebase Authentication amb Google | Permet identificar el docent i vincular les dades al seu compte. |
| Base de dades al nuvol | Cloud Firestore | Guarda dades sincronitzades del docent i copies al nuvol. |
| Comparticio controlada | Firestore `teacherGradePackages` | Permet enviar notes d'un professor a un tutor destinatari concret. |
| Fotos i imatges | Ara comprimides dins les dades; futur Firebase Storage | Es recomana migrar imatges grans a Storage quan l'us creixi. |

## 3. Firebase i Google Cloud

Avaluapro utilitza Firebase/Google Cloud com a infraestructura de nuvol.

Components utilitzats:

- Firebase Authentication, per iniciar sessio amb Google;
- Cloud Firestore, per desar dades sincronitzades;
- Firebase Hosting o GitHub Pages, segons l'entorn de publicacio;
- Firebase Storage, preparat com a millora futura per fotos i imatges grans.

La configuracio web de Firebase no es una contrasenya. Es visible al navegador perque l'aplicacio pugui funcionar. La proteccio real es basa en:

- domini autoritzat;
- restriccions de la API Key;
- rules de Firestore;
- autenticacio d'usuari;
- separacio de dades per `uid`.

## 4. Xifratge i acces

L'acces a l'aplicacio i a Firebase es fa mitjancant connexions HTTPS. Firebase/Google Cloud gestiona la seguretat de transport i la infraestructura de dades del servei.

Avaluapro afegeix aquestes proteccions propies:

- nomes un usuari autenticat pot accedir a dades al nuvol;
- cada usuari treballa dins la seva ruta privada `users/{uid}`;
- un docent no pot llegir ni modificar l'espai d'un altre docent;
- els paquets de notes nomes son visibles per l'emissor i el correu destinatari;
- les copies al nuvol queden dins l'espai privat del docent.

Per a un us institucional, caldria validar formalment amb la documentacio contractual de Google/Firebase i amb els responsables de proteccio de dades del centre o Ministeri.

## 5. Separacio per usuari

La ruta principal de dades es:

```text
users/{uid}/...
```

On `uid` es l'identificador intern del docent autenticat.

Dins aquesta ruta hi viuen:

- classes;
- alumnes;
- notes;
- tasques;
- seguiment;
- tutoria;
- sociograma;
- grups cooperatius;
- disposicions d'aula;
- antecedents academics;
- configuracio;
- copies de seguretat al nuvol.

Les rules de Firestore fan que nomes el docent propietari del `uid` pugui llegir, crear, editar o eliminar aquestes dades.

## 6. Dades tractades

Avaluapro pot guardar dades educatives i tutorials com:

- nom de l'alumne, classe i mig grup;
- notes competencials;
- tasques i constancia;
- incidencies de comportament i notes a l'agenda;
- diagnostics o etiquetes educatives controlades;
- comentaris pedagogics d'equip educatiu i tutoria;
- DOIPs;
- antecedents academics;
- relacions de grup, sociograma i grups cooperatius;
- disposicio d'aula;
- fotos si el docent les afegeix;
- copies de seguretat;
- paquets de notes enviats entre docents.

Aquestes dades poden ser sensibles perque identifiquen menors i poden descriure necessitats educatives, conducta, evolucio academica o relacions socials.

## 7. Exportacio, copies i eliminacio

Avaluapro incorpora mecanismes per controlar les dades:

- exportacio manual en JSON;
- copies al nuvol dins l'espai privat del docent;
- visualitzacio de l'ultima copia i darreres copies;
- restauracio de copies;
- eliminacio de dades per reiniciar el curs;
- exportacio d'antecedents academics per al curs vinent.

Important: quan un docent descarrega una copia manual, aquest fitxer queda fora d'Avaluapro. La custodia del fitxer passa a dependre del dispositiu o espai on el docent el guardi.

## 8. Comparticio entre docents

Avaluapro permet compartir notes amb tutors mitjancant paquets controlats.

Caracteristiques:

- el professor emissor indica el correu destinatari;
- el paquet queda associat a emissor i destinatari;
- nomes emissor i destinatari poden llegir-lo;
- el destinatari pot importar-lo;
- el sistema registra estat d'importacio;
- el paquet ha de contenir nomes notes necessaries, no comentaris, diagnostics ni dades tutorials.

Politica recomanada:

> Avaluapro nomes comparteix dades enviades voluntariament i de manera explicita pel docent emissor.

## 9. Riscos identificats

| Risc | Mesura aplicada o prevista |
| --- | --- |
| Acces d'un docent a dades d'un altre | Separacio `users/{uid}` i rules de Firestore. |
| Text lliure amb dades massa sensibles | Avisos pedagogics i recomanacio d'escriure nomes informacio necessaria. |
| Backups manuals mal custodiats | Avisos dins l'app i explicacio que el fitxer descarregat queda sota responsabilitat del docent. |
| Fotos massa grans o duplicades | Compressio local i pla futur de Firebase Storage. |
| Enviament de notes a destinatari equivocat | Paquets vinculats a correu destinatari i registre d'enviament/importacio. |
| Demo o proves barrejades amb dades reals | Flux per comencar amb dades propies i documentacio d'us de demo. |
| Us abusiu de Firebase des de clients externs | API Key restringida i App Check documentat com a mesura futura. |

## 10. Mesures futures recomanades

Abans d'un desplegament institucional ampli, es recomana:

- revisar legalment el tractament de dades;
- formalitzar el responsable i encarregat de tractament;
- valorar si cal avaluacio d'impacte;
- migrar fotos i imatges grans a Firebase Storage;
- activar App Check quan l'entorn public sigui estable;
- valorar entorn separat de proves i produccio;
- revisar les rules amb suport tecnic extern;
- definir politica de conservacio de copies;
- crear protocols interns d'us docent.

## 11. Documents relacionats

Avaluapro mante documentacio tecnica mes detallada:

- `docs/mapa-dades.md`: mapa de dades i sensibilitat.
- `docs/firebase-acces.md`: auditoria de Firebase i rules.
- `docs/minimitzacio-dades.md`: criteris de minimitzacio.
- `docs/seguretat-dins-app.md`: mesures visibles dins l'aplicacio.
- `docs/backups-conservacio.md`: copies i conservacio.
- `docs/fotos-fitxers.md`: fotos, imatges i Storage.
- `docs/comparticio-docents.md`: paquets de notes entre docents.
- `docs/app-check-entorn-public.md`: App Check i entorn public.
- `docs/proteccio-dades-avaluapro.md`: document ampli sobre proteccio de dades.

## 12. Conclusio

Avaluapro aplica una arquitectura coherent amb un quadern docent personal: autenticacio Google, dades separades per usuari, rules de Firestore, copies controlades i criteris de minimitzacio.

El projecte ja incorpora mesures tecniques i pedagogiques per reduir riscos, pero un us institucional hauria d'anar acompanyat de validacio legal, contracte d'encarrec de tractament i revisio formal de la configuracio de Firebase/Google Cloud.
