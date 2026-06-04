# Mapa de dades d'Avaluapro

Data: 4 de juny de 2026  
Estat: document viu del Bloc 1 de proteccio de dades

Aquest document recull quines dades guarda Avaluapro, on es desen i quin nivell de cura requereixen. No substitueix una revisio legal ni un contracte d'encarrec de tractament, pero serveix com a base tecnica i pedagogica per parlar amb direccio, centre o Ministeri.

## Principi general

Avaluapro ha de funcionar com a quadern docent personal: guarda dades necessaries per avaluar, fer seguiment pedagogic i preparar reunions educatives. Les dades s'han de mantenir separades per usuari, exportables, esborrables i comprensibles per al docent.

Cal evitar escriure informacio medica, familiar o personal que no sigui estrictament necessaria per a la feina docent. Quan sigui possible, s'han de preferir etiquetes controlades, dades resumides i observacions pedagogiques accionables.

## On es desen les dades

| Espai | Que guarda | Observacions |
| --- | --- | --- |
| IndexedDB del navegador | Copia local de les col.leccions principals | Es la base local de treball. Permet continuar treballant encara que la xarxa falli. |
| Firestore `users/{uid}/...` | Dades personals del docent sincronitzades al nuvol | Les rules actuals fan que cada usuari nomes pugui llegir i escriure el seu propi espai. |
| Firestore `users/{uid}/cloudBackups/...` | Copies de seguretat al nuvol | Guardades per usuari. Cada copia separa les col.leccions en subcol.leccions. |
| Firestore `teacherGradePackages` | Enviament de notes entre docents | Espai compartit controlat per emissor i correu destinatari. Requereix especial cura. |
| Fitxers JSON descarregats | Copies manuals al dispositiu | El fitxer queda fora d'Avaluapro i passa a dependre de la custodia del docent. |
| Firebase Storage | Encara no s'utilitza | Recomanat per a fotos i imatges grans en una fase posterior. |

## Mapa principal de dades

| Ambit | Dades guardades | Col.leccions o camps principals | On es desa | Finalitat docent | Sensibilitat inicial | Observacions de minimitzacio |
| --- | --- | --- | --- | --- | --- | --- |
| Dades d'alumnes | Nom, classe, mig grup, foto, informacio general, enllac personal, diagnostics marcats, intel.ligencies multiples | `students`, camps com `name`, `classId`, `halfGroup`, `photoData`, `diagnoses`, `personalNotes`, `multipleIntelligences` | IndexedDB, Firestore `users/{uid}/students`, backups | Identificar alumnes, organitzar grups i adaptar la mirada docent | Alta | El nom i la foto identifiquen directament menors. Les notes personals han de ser pedagogiques i breus. |
| Notes i avaluacio | Notes A/B/C/D/NA o `-`, notes per criteri o competencia, competencies modificades, competencies actives per UT | `marks`, `competencies`, `criteria`, `indicators`, `uts`, `semesters`, camps de configuracio de classe | IndexedDB, Firestore, backups, possible enviament entre docents | Registrar assoliment competencial i calcular estadistiques | Alta | Evitar duplicar notes. Si una competencia s'inactiva visualment no s'haurien d'esborrar dades historiques. |
| Seguiment de tasques | Tasques, dates, estat fet/incomplet/no fet/exempt, recordatoris, informacio de tasca | `tasks`, `taskRecords` | IndexedDB, Firestore, backups | Fer seguiment de constancia i habits de treball | Mitjana-alta | Les dades de tasques poden generar perfils d'habits. Cal distingir "sense dades" de "0%". |
| Comportament i agenda | Punts vermells, punts negres, entrades de diari, notes a l'agenda, motius i dates | `behaviorEvents`, `agendaNotes`, camps derivats de `taskRecords` | IndexedDB, Firestore, backups | Registrar incidencies pedagogiques i alertes d'intervencio | Molt alta | Camps oberts amb risc de contenir informacio sensible. Recomanat usar llenguatge descriptiu, no clinic ni familiar. |
| Diagnostics i necessitats educatives | Etiquetes com dislexia/discalculia, TDAH, TEA, QI limit o TDL, alumne de progres, altes capacitats, competencies modificades | `students.diagnoses`, camps de competencies modificades a avaluacio i tutoria | IndexedDB, Firestore, backups | Fer visible informacio pedagogica rellevant per adaptar l'avaluacio i el seguiment | Molt alta | Es una de les dades mes sensibles. Prioritzar etiquetes controlades i evitar detalls medics en text lliure. |
| DOIPs | Registres de demandes/respostes d'equip educatiu, resum d'informes curts sobre alumnes | `tutorialRecords` amb tipus `doip` o equivalent | IndexedDB, Firestore, backups | Preparar equips educatius i fer seguiment tutorial | Molt alta | Han de contenir informacio pedagogica necessaria, no historials personals extensos. |
| Comentaris de tutoria i equip educatiu | Entrades datades, ultima entrada destacada, historial d'equips educatius i tutoria | `tutorialRecords`, camps d'anotacions vinculades a alumne | IndexedDB, Firestore, backups | Preparar reunions, recordar acords i fer seguiment d'alumnes | Molt alta | Camps oberts. Cal avisar dins l'app que s'evitin dades mediques/familiars no necessaries. |
| Fotos i llocs fixos | Fotos d'alumne, imatges de disposicio d'aula o llocs fixos | `students.photoData`, `seatingCharts`, `tutorialSeatingPlans` | Ara: IndexedDB/Firestore/backups. Futur: Firebase Storage | Identificacio visual, disposicio d'aula i gestio tutorial | Alta | Les imatges pesen molt i identifiquen menors. Migrar a Storage amb rules propies quan creixi l'us. |
| Sociograma | Relacions positives, afinitats, incompatibilitats, posicions del mapa, alumne al centre, rols estrella/conflictiu | `tutorialRelations`, `tutorialSociogramLayouts`, `tutorialStudentRoles` | IndexedDB, Firestore, backups | Entendre relacions socials i prendre decisions de grup o aula | Molt alta | Pot revelar dinamiques socials delicades. Mostrar només a tutors/docents legitimats. |
| Grups cooperatius | Propostes de grup, rols, criteris de composicio, versions generades | `tutorialGroupSets`, `tutorialStudentRoles`, dades derivades de notes/relacions | IndexedDB, Firestore, backups | Crear grups equilibrats segons criteris academics i socials | Alta | Les propostes deriven de notes i relacions. Cal explicar que son suport docent, no decisio automatica final. |
| Disposicio d'aula | Matriu de taules, alumnes assignats, taules lliures, alumnes bloquejats, alumnes a revisar, versions guardades | `tutorialSeatingPlans` | IndexedDB, Firestore, backups | Proposar i conservar disposicions d'aula | Alta | Combina foto, mig grup, rol, notes i relacions. Convindria no exportar-ho sense necessitat. |
| Copies de seguretat | Export complet o parcial de dades del docent, metadades de copia, data, usuari, col.leccions | Fitxers JSON, `cloudBackups` | Dispositiu local i Firestore | Recuperar dades, canviar dispositiu, conservar final de curs | Molt alta | Un backup pot contenir gairebe totes les dades. Cal explicar custodia, descarrega i eliminacio. |
| Enviament de notes entre docents | Paquets de notes per classe/materia, emissor, destinatari, estat d'importacio, errors d'alumnes no trobats | `teacherGradePackages` | Firestore global amb rules especifiques | Enviar notes d'assignatura al tutor sense copiar manualment | Alta | Requereix registre clar, destinatari correcte i missatges d'error quan no coincideixen alumnes o classes. |
| Antecedents academics | Ultima mirada del curs anterior per competencia, perfil anterior, diagnostics opcionals, observacions inicials | `studentAntecedents` | IndexedDB, Firestore, backups | Comencar curs amb context pedagogic i comparar evolucio | Molt alta | Ha de ser portable pero minim. Evitar incloure classe antiga o dades no necessaries. |
| Perfil docent i configuracio | Materia principal, classes, colors, ordre, tutor, preferencies UI, ultima pantalla oberta | `classes`, `ui` local, `teacherProfile` o camps similars | IndexedDB, Firestore, localStorage per preferencies petites | Personalitzar Avaluapro i recuperar l'estat de treball | Baixa-mitjana | No es tan sensible, pero identifica docent i organitzacio del curs. |

## Col.leccions detectades al codi

A data d'aquest document, Avaluapro treballa amb aquestes col.leccions locals principals:

- `classes`
- `students`
- `semesters`
- `uts`
- `competencies`
- `criteria`
- `indicators`
- `marks`
- `tasks`
- `taskRecords`
- `behaviorEvents`
- `agendaNotes`
- `tutorialRecords`
- `tutorialMarks`
- `tutorialRelations`
- `tutorialGroupSets`
- `tutorialSociogramLayouts`
- `tutorialStudentRoles`
- `tutorialSeatingPlans`
- `seatingCharts`
- `studentAntecedents`

I amb aquests espais de Firestore especialment rellevants:

- `users/{uid}/{collection}` per a les dades de cada docent.
- `users/{uid}/cloudBackups/{backupId}` i subcol.leccions per a copies de seguretat al nuvol.
- `teacherGradePackages/{packageId}` per a enviaments de notes entre docents.

## Punts d'atencio detectats

1. **Fotos i imatges**: ara poden quedar dins Firestore o backups com a dades grans. A mesura que creixi l'us, caldria passar-les a Firebase Storage amb rules propies.
2. **Camps de text lliure**: comentaris, DOIPs, motius d'incidencies, anotacions personals i tutoria poden contenir dades sensibles. Cal posar avisos d'us responsable dins l'app.
3. **Diagnostics**: son dades especialment sensibles. Han d'estar en etiquetes controlades i amb el minim text complementari possible.
4. **Sociograma i relacions**: poden revelar informacio social delicada. Cal tractar-ho com a dada tutorial sensible.
5. **Copies de seguretat**: una copia pot contenir tot el quadern docent. Cal que el docent entengui que, un cop descarregada, la custodia passa al dispositiu.
6. **Enviament de notes**: cal validar destinatari, classe i alumnes per evitar que dades vagin al docent equivocat o quedin mal importades.

## Revisio de necessitat docent

Pregunta clau: **aquesta dada es necessaria per a la funcio docent?**

La resposta no ha de ser nomes tecnica. Una dada pot ser facil de guardar, pero no ser convenient. Avaluapro hauria de guardar nomes dades que ajudin clarament a avaluar, fer seguiment, preparar reunions o prendre decisions pedagogiques.

| Dada o ambit | Cal guardar-la? | Motiu docent | Es pot reduir? | Accio recomanada |
| --- | --- | --- | --- | --- |
| Nom de l'alumne | Si | Necessari per identificar alumnes en taules, informes i seguiment | No gaire, pero es pot normalitzar visualment | Guardar. Evitar duplicats i mantenir format coherent. |
| Classe i mig grup | Si | Necessari per organitzar avaluacio, seguiment i agrupaments | Si, guardar nomes grup actual i configuracions necessaries | Guardar. Permetre editar/reordenar sense historials innecessaris. |
| Foto de l'alumne | Opcional | Ajuda en perfil, disposicio d'aula i reconeixement visual | Si, comprimir i guardar una sola foto reutilitzada | Guardar nomes si el docent la necessita. Migrar a Storage quan es consolidi. |
| Notes competencials | Si | Nucli de l'aplicacio: avaluacio, ultima mirada i estadistiques | Si, guardar notes finals/necessaries i evitar duplicar calculs derivats | Guardar. Els calculs es poden regenerar quan sigui possible. |
| Criteris i competencies modificades | Si | Necessari per entendre adaptacions i balanc estandard | Si, etiqueta simple millor que text lliure | Guardar com a marca controlada, no com a comentari llarg. |
| Tasques i estat de tasques | Si | Necessari per constancia, avisos i seguiment d'habits | Si, no guardar dades duplicades ni historials innecessaris | Guardar registres essencials: tasca, data, alumne i estat. |
| Punts vermells i notes a l'agenda | Si | Necessari per avisos, acumulacions i justificacio de notes a l'agenda | Si, guardar motiu resumit i tasques que l'han generat | Guardar amb registre datat. Reiniciar comptadors sense perdre historial. |
| Punts negres i incidencies | Si, amb molta cura | Necessari per seguiment conductual i reunions | Si, camps curts i pedagogics | Guardar nomes fets observables i accionables. Evitar judicis personals. |
| Entrades de diari sense negatiu | Opcional | Pot ajudar a documentar observacions positives o neutres | Si, resum breu i data | Guardar si aporta seguiment real. Evitar convertir-ho en diari extens. |
| Diagnostics | Si, pero minim | Ajuda a adaptar mirada docent i detectar necessitats | Si, etiquetes controlades i poc text | Guardar nomes categories pedagogicament utilitzades. Evitar detalls medics. |
| Altes capacitats, alumne de progres i altres etiquetes | Si, si tenen us pedagogic | Permeten visibilitzar necessitats d'acompanyament | Si, etiqueta simple | Guardar com a diagnosi/etiqueta controlada. |
| DOIPs | Si, per tutors | Necessari per preparar equips educatius i revisar respostes | Si, resum pedagogic de resposta | Guardar en mode tutoria. Evitar copiar documents llargs si no cal. |
| Comentaris d'equip educatiu | Si | Serveixen per recordar acords i intervencions | Si, entrades datades i resumides | Guardar. Mostrar avisos d'escriptura responsable. |
| Comentaris de tutoria | Si | Serveixen per reunions, seguiment i comunicacio interna | Si, entrades datades i resumides | Guardar. Separar de diagnostics i perfil general. |
| Informacio familiar o medica en text lliure | Normalment no | Pot semblar util, pero augmenta molt el risc | Si, evitar-la o substituir-la per indicacio pedagogica | No fomentar-la. Afegir avisos per no escriure-la si no es imprescindible. |
| Sociograma | Si, si s'activa mode tutoria | Ajuda a entendre relacions, grups i disposicio d'aula | Si, guardar relacions necessaries, no interpretacions llargues | Guardar amb cura i nomes per classes tutorialment justificades. |
| Rols estrella/conflictiu | Si, amb cura | Ajuda a crear grups i disposicions equilibrades | Si, etiqueta funcional sense exposar explicacions sensibles | Guardar com a rol intern. Evitar que impliqui judicis visibles innecessaris. |
| Grups cooperatius generats | Si | Permet conservar propostes i versions utilitzades | Si, guardar composicio i criteris basics | Guardar versions escollides. No cal guardar totes les propostes descartades. |
| Disposicio d'aula | Si | Molt util per tutoria, gestio d'aula i llocs fixos | Si, guardar versions rellevants | Guardar versions amb nom. Evitar exportar imatges si no cal. |
| Antecedents academics | Si, si venen d'un curs anterior | Donen context inicial i comparativa de progres | Si, nomes ultima mirada i perfil resumit | Guardar per alumne, sense classe antiga ni dades innecessaries. |
| Intel.ligencies multiples | Opcional | Pot ajudar a perfil de grup si el centre/docent ho usa | Si, desplegable controlat | Guardar nomes si es treballa pedagogicament. No fer-ho obligatori. |
| Exempcions de materies | Si, en tutoria | Evita comptar com a no assolit el que no s'avalua | Si, marca simple per materia/alumne | Guardar com a configuracio controlada. |
| Enviament de notes entre docents | Si | Redueix feina al tutor i evita errors manuals | Si, enviar nomes dades necessaries de classe/materia/alumne/competencia | Guardar registre minim d'enviament i importacio. Validar destinatari i coincidencies. |
| Copies de seguretat locals | Si, manuals | Necessaries per seguretat, canvi de dispositiu i final de curs | Si, permetre triar ambit si cal | Mantenir. Explicar que el fitxer descarregat queda sota responsabilitat del docent. |
| Copies de seguretat al nuvol | Si | Protegeixen contra perdua local i errors del dispositiu | Si, copies datades i no infinites | Guardar ultim historial limitat. Definir politica de conservacio. |
| Preferencies UI i ultima pantalla | Si | Milloren us diari sense impacte fort | Si, localStorage nomes per preferencies petites | Guardar localment quan sigui possible. No barrejar amb dades sensibles. |

### Dades que Avaluapro hauria d'evitar o limitar

- Informacio medica detallada si no es imprescindible per a una decisio docent.
- Informacio familiar, economica o personal no relacionada directament amb l'aprenentatge.
- Judicis subjectius sobre l'alumne que no siguin fets observables.
- Historials massa llargs copiats literalment d'altres documents si un resum pedagogic es suficient.
- Fotos duplicades o imatges grans guardades en diversos llocs.
- Backups indefinits sense cap criteri de conservacio.

### Dades que es poden calcular i no cal duplicar

Sempre que sigui possible, aquestes dades s'haurien de calcular a partir de registres base i no guardar-se duplicades:

- mitjanes i percentatges;
- perfils d'intervencio derivats;
- estadistiques globals;
- comparatives entre UTs;
- deteccio d'alumnes invisibles, risc, millora o regressio;
- recomanacions de grups o disposicions generades automaticament.

Guardar menys dades duplicades redueix risc, errors i mida de Firestore/backups.

## Seguent pas del Bloc 1

El Bloc 1 queda preparat amb mapa de dades, sensibilitat inicial i revisio de necessitat. El seguent pas natural es el Bloc 2: revisar Firebase i acces:

- comprovar rules de Firestore;
- comprovar espais compartits com `teacherGradePackages`;
- revisar backups al nuvol;
- preparar criteris per a Firebase Storage en fotos;
- valorar App Check mes endavant.

## Referencies utils

- Condicions de tractament de dades de Firebase: https://firebase.google.com/terms/data-processing-terms
- Xifratge per defecte a Google Cloud: https://docs.cloud.google.com/docs/security/encryption/default-encryption
- Llei 29/2021, qualificada de proteccio de dades personals d'Andorra: https://www.portaljuridicandorra.ad/L2021029_0
