# Pla preliminar de continuïtat, recuperació i reversibilitat

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta operativa; pendent d'arquitectura institucional, responsables, SLA i simulacres

> Aquest document defineix objectius i procediments candidats. No acredita que Avaluapro disposi actualment d'un pla de continuïtat implantat ni garanteix els temps indicats fins que existeixin infraestructura, personal, contractes i proves periòdiques.

L'SLA preliminar relacionat és `docs/acord-nivell-servei-preliminar.md`.

## 1. Objectiu

Preparar Avaluapro per:

- mantenir les funcions educatives essencials durant una incidència;
- recuperar dades i servei després d'una fallada;
- evitar que una restauració empitjori una violació o recuperi dades suprimides;
- reduir la dependència d'una sola persona, compte o proveïdor;
- retornar o migrar les dades si canvia el prestador;
- tancar ordenadament el servei o l'empresa.

El pla complementa:

- `docs/protocol-incidents-violacions-seguretat-preliminar.md`;
- `docs/backups-conservacio.md`;
- `docs/politica-conservacio-eliminacio-preliminar.md`;
- `docs/mesures-tecniques-organitzatives-preliminars.md`;
- `docs/esborrany-contracte-encarrec-tractament.md`.

## 2. Abast

Inclou:

- Firebase Authentication;
- Cloud Firestore;
- Firebase Hosting i GitHub Pages;
- repositori i desplegaments;
- IndexedDB;
- backups al núvol;
- exports manuals;
- paquets de notes;
- cotutories;
- sociometria;
- comptes i credencials administratives;
- dispositius;
- documentació i coneixement tècnic;
- proveïdors i finalització empresarial.

## 3. Definicions

### Continuïtat

Capacitat de mantenir un nivell mínim de servei mentre es resol la incidència.

### Recuperació

Restauració controlada de dades, configuració i funcionalitats després d'una interrupció o corrupció.

### RPO

Punt objectiu de recuperació: quantitat màxima de dades recents que l'organització accepta perdre, expressada en temps.

Exemple: un RPO de 24 hores implica que, en el pitjor cas previst, es podrien perdre canvis de l'últim dia.

### RTO

Temps objectiu de recuperació: temps màxim candidat per restablir una funció després de declarar la incidència.

### Reversibilitat

Capacitat de recuperar les dades i la informació necessària per canviar de proveïdor o operar el servei sense una dependència desproporcionada d'Avaluapro.

### Mode degradat

Funcionament temporal amb menys prestacions, per exemple treball local sense sincronització ni compartició.

## 4. Estat actual i limitacions

### Capacitats existents

- còpia local a IndexedDB;
- treball local quan falla temporalment la xarxa, segons l'estat ja carregat;
- sincronització amb Firestore;
- backup manual JSON;
- backup al núvol;
- intent de backup automàtic diari quan el docent obre l'app autenticada;
- llistat de les cinc còpies més recents;
- restauració local d'un backup;
- codi versionat a Git;
- desplegament web reproduïble amb Vite;
- documentació tècnica i procediments preliminars.

### Limitacions

- el backup automàtic depèn que el docent obri l'app;
- mostrar cinc backups no elimina els backups anteriors;
- no hi ha retenció automàtica acreditada;
- no hi ha backup institucional independent de tota la base de dades;
- els backups actuals viuen principalment dins el mateix projecte i compte;
- restaurar un backup substitueix l'estat local abans d'una possible sincronització;
- no hi ha prova periòdica de restauració;
- no hi ha RPO ni RTO aprovats;
- no hi ha entorn de recuperació separat;
- no hi ha inventari formal de credencials d'emergència;
- la continuïtat depèn molt de Marc i dels seus comptes;
- una còpia local no garanteix la recuperació de dades compartides o temporals;
- no hi ha procediment implantat per reaplicar supressions després d'una restauració.

Conclusió: les funcions actuals són una base útil de recuperació personal, però no constitueixen encara un sistema institucional de continuïtat.

## 5. Principis

1. La seguretat de les persones preval sobre la rapidesa de reobertura.
2. No s'ha de restaurar sobre producció sense validar abans la còpia.
3. No s'ha de sincronitzar massivament una còpia antiga sense analitzar conflictes i supressions.
4. Les dades oficials han de continuar disponibles al sistema acadèmic oficial.
5. Avaluapro ha de poder operar temporalment en mode degradat.
6. Cap compte o persona única ha de ser imprescindible.
7. Les còpies han d'estar separades, protegides, inventariades i provades.
8. Recuperar disponibilitat no justifica ampliar accessos ni desactivar controls sense registre.
9. Tota recuperació ha de deixar una cronologia i evidències.

## 6. Rols

| Rol | Responsabilitat |
| --- | --- |
| Responsable del tractament `[PENDENT]` | Aprovar prioritats, RPO, RTO, riscos i comunicacions. |
| Coordinador de continuïtat `[PENDENT]` | Declarar activació, coordinar equips i mantenir la cronologia. |
| Responsable tècnic d'Avaluapro `[PENDENT]` | Diagnosticar, recuperar aplicació, dades i configuració. |
| Responsable de seguretat `[PENDENT]` | Validar que la recuperació no reobre una vulnerabilitat. |
| DPD `[PENDENT]` | Assessorar si hi ha dades personals, violació o risc per a persones. |
| Responsable funcional `[PENDENT]` | Prioritzar processos educatius i validar dades recuperades. |
| Comunicació `[PENDENT]` | Informar usuaris i parts afectades amb missatges aprovats. |
| Proveïdors | Restaurar serveis i aportar evidències segons contracte. |

Cada rol ha de tenir titular, suplent i contacte fora d'Avaluapro.

## 7. Classificació de funcions

| Prioritat | Funció | Justificació |
| --- | --- | --- |
| F0 | Protecció, contenció i revocació d'accessos | Evitar dany o exposició mentre es recupera |
| F1 | Accés a dades actuals necessàries per avaluació i tutoria immediata | Continuïtat educativa essencial |
| F1 | Integritat de qualificacions i identitat | Evitar decisions basades en dades corruptes |
| F2 | Autenticació i espais privats | Recuperar treball ordinari |
| F2 | Sincronització i backups | Evitar pèrdua acumulada |
| F2 | Cotutories i paquets de notes | Coordinació docent |
| F3 | Sociometria i grups cooperatius | Es poden suspendre sense impedir l'avaluació bàsica |
| F3 | Analítica avançada i visualitzacions | Es poden recalcular o ajornar |
| F4 | Funcions futures d'IA | No són essencials |

La sociometria pública s'ha de tancar durant una incidència si no se'n pot garantir confidencialitat i integritat.

## 8. Objectius candidats de recuperació

Els valors següents són una base de negociació, no un SLA vigent.

| Servei o dada | RPO candidat | RTO candidat | Mode temporal |
| --- | ---: | ---: | --- |
| Dades privades de curs | 24 hores | 8 hores laborables | Treball local verificat |
| Qualificacions en període de tancament | 4 hores | 4 hores | Registre temporal institucional |
| Autenticació | No aplicable a pèrdua de dades | 4 hores | Accés suspès o sistema oficial |
| Hosting de l'app | 24 hores de codi/configuració | 4 hores | URL alternativa aprovada |
| Cotutories | 24 hores | 1 dia laborable | Coordinació per canal institucional sense copiar dades excessives |
| Paquets de notes | 24 hores | 1 dia laborable | Traspàs controlat pel sistema oficial |
| Backups i restauració | 24 hores | 1 dia laborable | Conservació sense restaurar fins a validar |
| Sociometria temporal | Es pot assumir la repetició | 2 dies laborables | Suspendre i recrear |
| Analítica derivada | Regenerable | 2 dies laborables | Treballar amb registres base |

Abans d'aprovar-los cal:

- conèixer volum i costos;
- comprovar capacitats de Firebase;
- validar necessitats en èpoques d'avaluació;
- definir cobertura horària;
- fer simulacres;
- ajustar els contractes.

## 9. Arquitectura de còpia objectiu

### Capa 1. Còpia local de treball

IndexedDB permet continuïtat curta al dispositiu.

No substitueix:

- backup;
- sincronització;
- arxiu;
- control institucional;
- dades compartides no carregades.

### Capa 2. Dades de producció

Firestore conté l'estat sincronitzat i espais compartits.

No s'ha de considerar una còpia de si mateix.

### Capa 3. Backups funcionals d'Avaluapro

Backups per usuari, útils per errors personals i restauracions limitades.

Abans del pilot necessiten:

- retenció;
- eliminació;
- inventari;
- prova;
- xifratge d'exports;
- protecció davant restauracions incorrectes.

### Capa 4. Backup institucional de Firestore

Cal valorar backups programats de Firestore o exports gestionats a Cloud Storage amb:

- facturació i permisos adequats;
- retenció definida;
- accés IAM mínim;
- ubicació aprovada;
- monitoratge d'execució;
- prova de restauració en una base nova;
- separació administrativa quan sigui viable.

Els backups gestionats de Firestore són còpies consistents en un punt temporal i tenen retenció configurable. La restauració habitual crea una base de dades nova, fet que facilita validar abans d'un tall.

### Capa 5. Reversibilitat

Export periòdic en format documentat i transferible, separat del format intern de recuperació.

Ha d'incloure:

- esquema;
- diccionari de dades;
- identificadors i relacions;
- metadades imprescindibles;
- versió;
- checksum;
- instruccions de lectura;
- exclusions i limitacions.

## 10. Criteris d'activació

Activar el pla quan:

- una funció F0, F1 o F2 supera el temps de tolerància;
- hi ha pèrdua o corrupció de dades;
- un compte administrador queda inaccessible;
- les rules o un desplegament impedeixen l'accés legítim;
- Firebase o l'allotjament tenen una incidència prolongada;
- es compromet el repositori o la cadena de desplegament;
- una persona clau no pot actuar;
- el proveïdor anuncia discontinuïtat;
- el contracte finalitza;
- hi ha tancament o insolvència de l'empresa.

El protocol d'incidents s'activa també si l'esdeveniment afecta confidencialitat o integritat de dades personals.

## 11. Circuit general de recuperació

### Pas 1. Declarar i classificar

- assignar codi;
- registrar hora;
- identificar serveis;
- separar indisponibilitat, corrupció i violació;
- nomenar coordinador;
- avisar responsable i DPD quan correspongui.

### Pas 2. Contenir

- aturar sincronització destructiva;
- congelar desplegaments;
- revocar credencials compromeses;
- tancar qüestionaris;
- preservar logs;
- protegir l'últim estat fiable.

### Pas 3. Determinar el punt fiable

- identificar última còpia coneguda;
- revisar data, origen, volum i checksum;
- comprovar si conté dades ja suprimides;
- revisar canvis posteriors que caldrà reconstruir;
- validar permisos i esquema.

### Pas 4. Restaurar en entorn aïllat

- crear entorn o base de recuperació;
- aplicar configuració versionada;
- importar dades;
- executar proves d'integritat;
- comparar recomptes;
- validar casos funcionals;
- revisar accessos.

### Pas 5. Reconciliar

- reaplicar supressions i limitacions;
- incorporar canvis legítims posteriors;
- resoldre conflictes;
- revisar espais compartits;
- no restaurar tokens caducats;
- no reobrir qüestionaris;
- regenerar dades derivades quan sigui possible.

### Pas 6. Autoritzar retorn

Cal aprovació de:

- responsable tècnic;
- responsable funcional;
- responsable de seguretat;
- responsable institucional, si l'impacte és elevat.

### Pas 7. Reobrir gradualment

1. consulta interna;
2. usuaris pilot;
3. funcions privades;
4. sincronització;
5. compartició;
6. funcions temporals o públiques.

### Pas 8. Verificar i tancar

- monitorar errors;
- confirmar RPO i RTO reals;
- comunicar resultat;
- conservar evidències;
- actualitzar riscos, procediments i controls.

## 12. Validacions mínimes de dades

Abans de declarar recuperació:

- nombre de classes i alumnes;
- alumnes sense classe o duplicats;
- qualificacions vinculades a criteris existents;
- tasques i registres coherents;
- membres de cotutories autoritzats;
- autoria i dates;
- tombstones i supressions;
- absència de tokens caducats;
- backups exclosos de la càrrega ordinària;
- mostres funcionals revisades pel responsable;
- cap accés transversal no autoritzat.

No n'hi ha prou que l'aplicació “s'obri”.

## 13. Escenaris

### 13.1. Firestore indisponible

Accions:

- comprovar estat oficial del proveïdor;
- evitar intents massius;
- informar que la sincronització està suspesa;
- permetre només treball local si l'estat és fiable;
- impedir fluxos compartits que requereixin confirmació;
- no prometre que els canvis locals ja estan copiats;
- sincronitzar de manera controlada quan torni;
- revisar conflictes.

### 13.2. Pèrdua o corrupció de dades

- aturar escriptures;
- preservar estat i logs;
- determinar abast;
- seleccionar còpia anterior;
- restaurar en entorn separat;
- reconciliar canvis;
- verificar amb mostres i recomptes;
- valorar violació de seguretat.

### 13.3. Rules incorrectes

- bloquejar temporalment l'accés afectat;
- conservar la versió desplegada;
- identificar finestres d'exposició o denegació;
- provar la correcció amb emulador;
- desplegar aplicació i rules compatibles;
- verificar amb comptes i rols diferents;
- activar protocol de violació si hi ha hagut accés indegut.

### 13.4. Desplegament web defectuós

- aturar nous desplegaments;
- tornar a l'últim artefacte verificat;
- no modificar dades per compensar un error visual;
- provar login, lectura, escriptura i sincronització;
- mantenir una URL alternativa només si està aprovada i configurada.

### 13.5. Compromís o pèrdua del compte administrador

- utilitzar un segon administrador institucional;
- recuperar el compte pel procediment del proveïdor;
- revocar sessions i credencials;
- revisar IAM, deploys, rules, facturació i logs;
- rotar secrets;
- verificar que no s'han creat comptes o claus;
- no dependre d'un correu personal únic.

### 13.6. Dispositiu perdut o avariat

- bloquejar o esborrar remotament si és gestionat;
- revocar sessió;
- valorar dades locals i exports;
- restaurar en un dispositiu conforme;
- comunicar pèrdua si pot haver-hi violació;
- no restaurar des d'un fitxer no verificat.

### 13.7. Corrupció per sincronització o restauració

- desactivar sincronització;
- crear còpia de l'estat corrupte per investigar;
- identificar l'últim estat correcte;
- comparar canvis locals i remots;
- recuperar per col·leccions quan sigui possible;
- reaplicar tombstones;
- fer una sincronització pilot abans de reobrir.

### 13.8. Firebase o Google no acceptats institucionalment

- congelar noves dades d'alt risc;
- preparar export complet;
- documentar esquema i rules;
- crear entorn objectiu;
- migrar amb dades fictícies;
- validar recomptes i permisos;
- executar tall i període de verificació;
- eliminar l'entorn anterior segons contracte.

### 13.9. Repositori o cadena de subministrament compromesos

- bloquejar desplegaments;
- revocar tokens GitHub i credencials;
- revisar commits, workflows i dependències;
- reconstruir des d'una versió signada o verificada;
- rotar secrets;
- comprovar l'artefacte publicat;
- informar si hi ha risc de codi maliciós o accés a dades.

### 13.10. Indisponibilitat de la persona desenvolupadora principal

- activar custodi tècnic substitut;
- accedir a documentació i inventari;
- utilitzar comptes corporatius, no personals;
- disposar d'instruccions de build, deploy, recuperació i contactes;
- limitar canvis al manteniment essencial;
- contractar suport extern si supera el període acordat.

### 13.11. Tancament de l'empresa

- avisar segons termini contractual;
- congelar funcionalitats no essencials;
- entregar dades i documentació;
- transferir dominis, repositoris i configuració acordada;
- facilitar migració;
- revocar accessos de l'empresa;
- eliminar còpies i obtenir confirmacions de proveïdors;
- certificar supressió;
- mantenir només dades bloquejades per obligació legal.

## 14. Dependència de persones i comptes

Abans del pilot institucional cal:

- titularitat corporativa o institucional del domini;
- almenys dos administradors autoritzats;
- MFA i claus de recuperació custodiades;
- gestor de contrasenyes empresarial;
- comptes separats per GitHub, Firebase, Google Cloud i domini;
- inventari de rols IAM;
- procediment de recuperació de facturació;
- documentació de compilació i desplegament;
- repositori accessible al substitut autoritzat;
- contactes de proveïdors;
- revisió semestral de l'accés d'emergència.

Les credencials d'emergència no s'han d'incloure al repositori ni en aquest document.

## 15. Mode degradat per a docents

Durant una indisponibilitat:

- es pot consultar o editar localment només si l'app confirma que les dades locals són coherents;
- s'ha de mostrar clarament que no hi ha sincronització ni backup remot;
- s'han de suspendre cotutories, paquets i qüestionaris si no es poden coordinar;
- no s'han de duplicar registres al correu o documents personals;
- les qualificacions oficials s'han de gestionar pel sistema institucional;
- en recuperar-se el servei, cal revisar conflictes abans de pujar.

El mode degradat no s'ha d'utilitzar si hi ha sospita que el dispositiu o les dades locals estan compromesos.

## 16. Reversibilitat i exportació

El procediment operatiu de sortida és:

`docs/procediment-retorn-migracio-supressio-preliminar.md`

El paquet de sortida ha de permetre a un altre proveïdor entendre:

- persones, classes i identificadors;
- dades i relacions;
- formats de dates i qualificacions;
- esquema de col·leccions;
- rols i membres;
- dades bloquejades o excloses;
- supressions pendents;
- procedència i versió.

### Contingut candidat

```text
manifest.json
schema/
data/
checksums/
deletions/
README.md
```

No s'han d'incloure:

- secrets;
- tokens actius;
- credencials;
- dades fora de l'abast;
- logs tècnics innecessaris;
- backups duplicats.

### Validació

- export completat sense errors;
- checksum;
- recompte per categoria;
- importació de prova;
- lectura per una persona no autora;
- acceptació del responsable;
- eliminació posterior de còpies temporals.

## 17. Finalització contractual

Calendari candidat alineat amb la política de conservació:

| Fita | Termini candidat |
| --- | --- |
| Pla de sortida acordat | 30 dies abans del final previsible |
| Export inicial | 15 dies des de la instrucció |
| Validació o importació de prova | 30 dies |
| Correcció de defectes de l'export | 15 dies |
| Tall i transferència final | Data acordada |
| Supressió de producció | 15 dies després de l'acceptació |
| Expiració màxima de backups | 90 dies després de la supressió activa |
| Certificat final | 15 dies després de completar la supressió |

Cal adaptar-ho a contractació pública, volum, reclamacions i obligacions d'arxiu.

## 18. Proves i simulacres

### Prova trimestral de restauració

- seleccionar backup;
- restaurar en entorn aïllat;
- mesurar temps;
- validar recomptes;
- provar una classe fictícia;
- verificar supressions;
- destruir l'entorn de prova.

### Simulacre semestral tècnic

Alternar:

- rules defectuoses;
- compte administrador perdut;
- desplegament corrupte;
- Firestore indisponible;
- backup incomplet.

### Simulacre anual de continuïtat

Incloure:

- responsable institucional;
- DPD;
- sistemes;
- Avaluapro;
- comunicació;
- decisió de mode degradat;
- recuperació;
- informe i millores.

## 19. Registre de prova

```text
Prova:
Data:
Entorn:
Participants:
Escenari:
Backup o versió utilitzada:
RPO objectiu:
RPO real:
RTO objectiu:
RTO real:
Validacions:
Errors:
Dades de prova eliminades:
Accions correctores:
Responsable:
Data de revisió:
```

## 20. Criteris d'èxit

Una prova és satisfactòria quan:

- no utilitza dades reals o està formalment autoritzada;
- restaura en el temps objectiu;
- compleix el punt de recuperació;
- manté permisos;
- no recupera tokens caducats;
- no ressuscita dades suprimides;
- conserva integritat referencial;
- permet operar les funcions prioritàries;
- elimina l'entorn temporal;
- genera un informe revisable.

## 21. Comunicació

Cal preparar plantilles per:

- indisponibilitat;
- mode degradat;
- recuperació parcial;
- recuperació completa;
- pèrdua de dades;
- migració o finalització.

Els missatges han d'indicar:

- funcions afectades;
- hora d'inici;
- accions segures;
- què no s'ha de fer;
- pròxima actualització;
- canal de suport.

No s'ha d'afirmar que “no s'ha perdut cap dada” fins que s'hagi verificat.

## 22. Dependències externes

Per cada proveïdor s'ha de conèixer:

- estat i canal d'incidències;
- SLA;
- suport;
- backups;
- restauració;
- IAM;
- exportació;
- tancament;
- contacte urgent.

Firebase ofereix mecanismes gestionats de backup i exportació/importació, però poden requerir facturació, permisos IAM i Cloud Storage. La disponibilitat d'una funció del proveïdor no implica que estigui activada ni configurada a Avaluapro.

## 23. Accions abans del pilot

- [ ] Aprovar funcions prioritàries.
- [ ] Aprovar RPO i RTO.
- [ ] Nomenar titulars i suplents.
- [ ] Crear segon administrador.
- [ ] Activar MFA administratiu.
- [ ] Inventariar comptes i credencials.
- [ ] Separar proves i producció.
- [ ] Decidir backup institucional de Firestore.
- [ ] Configurar retenció i monitoratge.
- [ ] Preparar entorn de restauració.
- [ ] Crear registre de supressions reaplicables.
- [ ] Documentar export de reversibilitat.
- [ ] Fer una restauració completa amb dades fictícies.
- [ ] Simular pèrdua del compte administrador.
- [ ] Simular caiguda de Firebase.
- [ ] Validar el mode degradat en iPad i ordinador.
- [ ] Alinear contracte, SLA i proveïdors.

## 24. Evidències

- configuració de backups;
- llistat d'administradors;
- comprovació de MFA;
- inventari d'actius;
- exports i checksums;
- logs d'execució;
- informes de restauració;
- temps RPO/RTO reals;
- actes de simulacre;
- incidències i millores;
- certificat de destrucció de proves;
- revisió anual.

## 25. Fonts

- [Llei 29/2021, article 35: disponibilitat, resiliència, restauració i verificació](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions i protocols de la LQPD](https://www.apda.ad/storage/helps/6GgNFl4CzaBOQFVvrmwypgMtjf0baHlRkTcQVeCP.pdf)
- [Firebase: backups i restauració de Firestore](https://firebase.google.com/docs/firestore/backups)
- [Firebase: exportació i importació de Firestore](https://firebase.google.com/docs/firestore/manage-data/export-import)
