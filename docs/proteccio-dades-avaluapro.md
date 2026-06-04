# Com protegeix les dades Avaluapro

Data: 4 de juny de 2026  
Estat: document tecnic breu per a direccio, centre o Ministeri

Aquest document resumeix com Avaluapro tracta i protegeix les dades educatives. No substitueix una revisio juridica ni el contracte d'encarrec de tractament que correspongui en un us institucional, pero explica les mesures tecniques i pedagogiques previstes en l'aplicacio.

## 1. Que es Avaluapro

Avaluapro es una eina docent per registrar avaluacio competencial, seguiment de tasques, comportament, tutoria i estadistiques pedagogiques. Esta pensada com un quadern docent digital: ajuda el professorat a prendre decisions educatives mes informades i a preparar millor les reunions d'equip educatiu o tutoria.

L'aplicacio no substitueix la plataforma oficial del centre. El seu objectiu es ajudar el docent en la gestio pedagogica diaria.

## 2. Quines dades pot guardar

Avaluapro pot guardar dades com:

- dades identificatives d'alumnes: nom, classe, mig grup i, si el docent ho decideix, fotografia;
- notes competencials i dades d'avaluacio;
- tasques, constancia, incompletes, no fetes i exempcions;
- registres de comportament, notes a l'agenda i entrades de diari docent;
- diagnostics o etiquetes educatives controlades, com TDAH, TEA, dislexia/discalculia, alumne de progres o altes capacitats;
- comentaris pedagogics d'equip educatiu i tutoria;
- DOIPs o resums de demandes/respostes d'equip educatiu;
- antecedents academics del curs anterior;
- sociograma, grups cooperatius i disposicio d'aula;
- copies de seguretat locals o al nuvol;
- paquets de notes enviats entre docents.

Aquestes dades poden ser sensibles, especialment quan identifiquen menors, descriuen necessitats educatives, comportament, relacions socials o situacions tutorials.

## 3. On es guarden les dades

Avaluapro utilitza dos espais principals:

| Espai | Funcio | Observacio |
| --- | --- | --- |
| Navegador del dispositiu | Guarda una copia local de treball amb IndexedDB | Permet treballar encara que la xarxa falli. |
| Firebase / Google Cloud | Guarda dades sincronitzades quan el docent inicia sessio | Les dades queden vinculades al compte autenticat del docent. |

Tambe es poden generar copies manuals en format JSON. Quan un docent descarrega una copia manual, el fitxer queda fora d'Avaluapro i la seva custodia passa al dispositiu o espai on el docent el guardi.

## 4. Acces i separacio per usuari

L'acces al nuvol es fa amb autenticacio de Google. Cada docent autenticat te un identificador propi i les dades principals es guarden separades per usuari a Firestore:

`users/{uid}/...`

Les regles de Firestore fan que un usuari nomes pugui llegir i escriure les dades del seu propi espai. Aixo reforca el model actual d'Avaluapro com a quadern docent personal.

Els paquets de notes entre docents son una excepcio controlada:

- l'emissor crea el paquet;
- nomes l'emissor i el correu destinatari poden llegir-lo;
- el destinatari nomes pot marcar-lo com a importat;
- el destinatari no pot modificar el contingut del paquet.

## 5. Mesures tecniques aplicades

Avaluapro incorpora aquestes mesures:

- autenticacio amb Google;
- separacio de dades per usuari a Firestore;
- rules de Firestore per impedir accessos entre usuaris;
- espai separat per a copies al nuvol;
- rules especifiques per als paquets de notes entre docents;
- copies locals amb IndexedDB per evitar perdua de dades per problemes de connexio;
- copies manuals exportables en JSON;
- registre de l'ultima sincronitzacio i de les darreres copies al nuvol;
- missatges d'error quan falla una copia, restauracio, importacio o enviament;
- avisos dins l'aplicacio en camps de text potencialment sensibles;
- distincio entre dades reals, dades de demo i dades importades.

Les dades que es poden calcular, com percentatges, perfils d'intervencio o estadistiques, no s'haurien de duplicar innecessariament. Avaluapro prioritza guardar registres base i calcular les estadistiques a partir d'aquests registres.

## 6. Avisos d'us responsable

L'aplicacio inclou avisos en camps oberts per recordar al docent que ha d'escriure nomes informacio pedagogica necessaria. El criteri intern es:

> Escriu observacions pedagogiques, concretes i necessaries. Evita informacio medica, familiar o personal que no sigui imprescindible per a la funcio docent.

Aixo es especialment important en:

- comentaris d'equip educatiu;
- comentaris de tutoria;
- DOIPs;
- incidencies de comportament;
- diagnostics i anotacions personals;
- antecedents academics;
- observacions lliures sobre alumnes.

## 7. Minimitzacio de dades

Avaluapro ha de guardar nomes dades necessaries per a la funcio docent. La filosofia de disseny es:

- prioritzar etiquetes controlades abans que text lliure;
- evitar historials personals llargs si un resum pedagogic es suficient;
- no guardar dades familiars, mediques o personals si no son necessaries;
- no duplicar fotos ni imatges grans;
- separar dades reals, copies de seguretat i paquets compartits;
- permetre exportar i eliminar dades quan calgui;
- explicar al docent que les copies manuals descarregades queden sota la seva responsabilitat.

## 8. Copies de seguretat i recuperacio

Avaluapro permet:

- crear copies manuals al dispositiu;
- crear copies al nuvol dins l'espai del docent;
- veure l'ultima copia al nuvol;
- revisar les darreres copies disponibles;
- restaurar una copia quan calgui;
- esborrar dades per reiniciar el curs.

Les copies de seguretat son especialment sensibles perque poden contenir gairebe tot el quadern docent. Per aquest motiu, l'aplicacio les tracta com a dades d'alt risc i mostra informacio clara sobre el seu us.

## 9. Fotos, imatges i Storage

Actualment les fotos i imatges es poden guardar com a dades comprimides dins l'ecosistema d'Avaluapro. Aquesta solucio es suficient per a un us inicial, pero no es la millor opcio si l'eina creix amb molts docents i moltes imatges.

Mesura prevista:

- migrar fotos d'alumnes i imatges grans a Firebase Storage;
- mantenir a Firestore nomes la referencia de la imatge;
- aplicar rules de Storage per usuari;
- reduir mida i duplicacio d'imatges.

Aquesta millora reduiria risc tecnic, mida de dades i possibilitat d'arribar als limits de Firestore.

## 10. App Check i mesures futures

Quan Avaluapro es desplegui per a un us mes ampli, es recomana valorar:

- activar Firebase App Check;
- revisar les rules amb suport tecnic extern;
- definir politica de conservacio de copies;
- migrar fotos a Firebase Storage;
- seguir el protocol definit a `docs/app-check-entorn-public.md` abans de fer App Check obligatori;
- preparar documentacio formal per a direccio o Ministeri;
- revisar si cal avaluacio d'impacte de proteccio de dades;
- formalitzar el contracte d'encarrec de tractament si l'us passa a ser institucional.

App Check no substitueix les rules de Firestore, pero pot ajudar a reduir usos no autoritzats de Firebase des de clients aliens.

## 11. Limits i responsabilitats

Avaluapro pot aplicar mesures tecniques, avisos i disseny responsable, pero hi ha decisions que no depenen nomes del desenvolupament de l'aplicacio:

- autoritzar l'us institucional al centre;
- determinar el responsable i encarregat de tractament;
- signar el contracte d'encarrec de tractament;
- validar RGPD i normativa andorrana aplicable;
- decidir si cal revisio juridica o avaluacio d'impacte;
- definir protocols interns d'us i custodia de copies.

Per tant, Avaluapro esta preparat per treballar amb criteris de seguretat i minimitzacio, pero l'us oficial hauria d'anar acompanyat de validacio institucional.

## 12. Resum executiu

Avaluapro protegeix les dades mitjancant autenticacio Google, separacio per usuari, rules de Firestore, copies de seguretat controlades, avisos d'us responsable i criteris de minimitzacio. Les dades mes sensibles son diagnostics, comentaris tutorials, DOIPs, comportament, fotos, sociograma i copies de seguretat.

L'aplicacio esta dissenyada com a quadern docent personal amb dades separades per usuari. Per a un us institucional ampli, caldria completar la validacio legal, definir el contracte d'encarrec de tractament i valorar mesures futures com Firebase Storage i App Check.
