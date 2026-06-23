# Mesures tècniques i organitzatives preliminars d'Avaluapro

Data: 21 de juny de 2026
Versió: 0.1
Estat: annex tècnic preliminar; pendent d'arquitectura institucional, aprovació del responsable i verificació externa

> Aquest document descriu controls existents i controls objectiu. No és una certificació de seguretat. Una mesura marcada com a preparada localment, parcial o pendent no s'ha de presentar com a desplegada en producció.

## 1. Objectiu

Definir les mesures tècniques i organitzatives, també anomenades MTO, que han de protegir les dades personals tractades per Avaluapro.

Les mesures s'han de seleccionar segons:

- naturalesa, abast, context i finalitats del tractament;
- probabilitat i gravetat dels riscos;
- tractament habitual de dades de menors;
- qualificacions, conducta, orientació, diagnòstics i sociometria;
- arquitectura local i al núvol;
- compartició entre docents;
- estat de la tecnologia i cost proporcionat d'implantació.

Els objectius són garantir:

- confidencialitat;
- integritat;
- disponibilitat;
- resiliència;
- restauració ràpida;
- verificació periòdica de l'eficàcia.

## 2. Abast

Inclou:

- aplicació web Avaluapro;
- codi font i procés de desplegament;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Hosting i GitHub Pages mentre convisquin;
- IndexedDB i emmagatzematge local;
- backups al núvol i fitxers JSON;
- paquets de notes;
- cotutories;
- qüestionaris sociomètrics;
- dispositius docents;
- comptes administratius;
- suport, manteniment i proveïdors.

No cobreix com a mesura implantada:

- IA, perquè no està activada;
- Firebase Storage, perquè només té rules preparatòries;
- infraestructura pròpia o d'Andorra Telecom, perquè no s'ha decidit;
- controls corporatius d'una societat que encara no existeix.

## 3. Escala d'estat

| Estat | Significat |
| --- | --- |
| Implantada | Existeix al codi o a l'operativa i hi ha una evidència suficient. |
| Preparada localment | Existeix al repositori i s'ha provat localment, però falta desplegament o prova real. |
| Parcial | Existeix una part, però no cobreix tot el risc o no té verificació suficient. |
| Documentada | Hi ha política o procediment, però encara no està implantat operativament. |
| Pendent | No existeix o depèn d'una decisió institucional. |
| No aplicable ara | No forma part del servei actual. |

## 4. Responsabilitats

| Actor | Responsabilitat |
| --- | --- |
| Responsable del tractament `[PENDENT]` | Aprovar risc, requisits, rols i mesures addicionals. |
| DPD `[PENDENT]` | Assessorar i supervisar les mesures relatives a protecció de dades. |
| Responsable de seguretat o sistemes `[PENDENT]` | Govern d'accessos, dispositius, monitoratge, continuïtat i incidents. |
| Empresa Avaluapro | Desenvolupar, mantenir, provar, documentar i operar els controls contractats. |
| Docents | Utilitzar comptes i dispositius autoritzats, minimitzar dades i comunicar incidents. |
| Proveïdors | Aplicar les garanties contractuals i tècniques dels seus serveis. |

Cal separar, sempre que sigui viable:

- desenvolupament;
- aprovació de canvis;
- desplegament;
- administració de producció;
- revisió d'incidents i logs.

En una empresa unipersonal aquesta separació pot no ser completa. S'ha de compensar amb revisió externa, doble comprovació i evidències.

## 5. Resum executiu de l'estat actual

### Fortaleses

- autenticació de Google;
- HTTPS dels serveis d'allotjament;
- separació privada per UID;
- Firestore Rules específiques;
- proves automatitzades de rules i sincronització compartida;
- tokens sociomètrics aleatoris, temporals i d'un sol ús;
- accions destructives amb confirmació;
- backups i restauració disponibles;
- polítiques de minimització, drets, incidents i conservació preparades;
- dades fictícies com a criteri de prova.

### Mancances principals

- un sol projecte Firebase per a usos reals i proves;
- rules reforçades desplegades, però encara pendents de proves operatives completes;
- manca d'identitat institucional centralitzada, rols per centre i procés complet d'alta/baixa;
- MFA administratiu no acreditat;
- logs d'auditoria insuficients;
- retenció general pendent; purga sociomètrica implementada però encara no desplegada ni activada;
- App Check no activat;
- backups manuals sense xifratge controlat per l'app;
- dispositius i còpies locals fora d'una gestió institucional;
- revisió de vulnerabilitats i dependències no formalitzada;
- continuïtat i recuperació encara sense proves periòdiques;
- absència d'auditoria externa.

## 6. Govern de seguretat

| Control | Requisit | Estat actual | Evidència | Acció pendent |
| --- | --- | --- | --- | --- |
| Política de seguretat | Aprovar abast, responsables i revisió anual | Documentada en diversos procediments | Dossier `docs/` | Consolidar i aprovar |
| AIPD | Avaluar riscos per a les persones | Documentada | `docs/aipd-preliminar-avaluapro.md` | Validació del DPD i responsable |
| RAT | Inventariar tractaments i mesures | Documentada | `docs/registre-activitats-tractament-preliminar.md` | Completar capçalera i aprovar |
| Propietat dels riscos | Assignar cada risc i mesura | Parcial | Pla de l'AIPD | Noms, dates i acceptació residual |
| Revisió periòdica | Revisar MTO anualment i després de canvis | Documentada | Aquest document | Crear calendari i actes |
| Excepcions | Aprovar i caducar desviacions | Pendent | Cap registre formal | Crear registre d'excepcions |

## 7. Inventari i classificació d'actius

S'ha de mantenir un inventari amb:

- aplicació i repositoris;
- projectes Firebase i Google Cloud;
- dominis i DNS;
- comptes administratius;
- claus, secrets i credencials;
- bases de dades i col·leccions;
- backups;
- dispositius;
- proveïdors;
- documentació;
- responsables i criticitat.

### Classificació candidata

| Nivell | Exemples | Protecció |
| --- | --- | --- |
| Pública | Web pública, documentació publicada | Integritat i control de publicació |
| Interna | Procediments, configuració no secreta | Accés de l'equip |
| Confidencial | Comptes, incidències, arquitectura detallada | Mínim privilegi i registre |
| Molt sensible | Dades educatives, salut, sociometria, backups | Accés reforçat, xifratge i control estricte |
| Secret | Credencials, tokens administratius, claus privades | Gestor de secrets, rotació i no inclusió al repositori |

Estat actual: **parcial**. Existeixen mapa de dades i inventari de proveïdors, però falta un inventari corporatiu d'actius i propietaris.

## 8. Identitat, autenticació i accessos

Documents de referència:

- `docs/procediment-identitats-rols-baixes-preliminar.md`
- `docs/govern-administradors-accessos-excepcionals-preliminar.md`

### Controls exigits

- compte individual, mai compartit;
- identitat institucional verificada;
- mínim privilegi;
- rols definits per centre, grup i funció;
- alta, canvi i baixa documentats;
- revocació immediata;
- revisió periòdica d'accessos;
- MFA per a comptes administratius;
- sessions i dispositius controlats;
- accés excepcional de suport autoritzat i registrat.

### Estat d'Avaluapro

| Control | Estat | Observació |
| --- | --- | --- |
| Login Google | Implantada | Firebase Authentication amb compte Google |
| Separació privada per UID | Implantada | `users/{uid}` |
| Validació de domini educatiu | Pendent | L'autenticació no equival a autorització institucional |
| Rols per centre i grup | Pendent | Model actual centrat en el docent |
| Propietari i cotutor | Preparada localment | Rules reforçades i proves locals; falta desplegament i prova real |
| Revocació de cotutor | Preparada localment | Les còpies locals ja sincronitzades poden persistir |
| Alta i baixa centralitzades | Pendent | Requereix administració institucional |
| MFA docent | Pendent de decisió | Pot dependre del proveïdor d'identitat |
| MFA administratiu | Pendent d'acreditar | Obligatori com a objectiu abans del pilot |
| Revisió trimestral d'accessos | Pendent | Cal informe i responsable |
| Accés de suport | Documentada | Model excepcional; eina i registre pendents |

Google Sign-In acredita un compte, però no demostra per si sol que la persona continuï sent docent autoritzat d'un centre concret.

## 9. Autorització i compartimentació

### Controls existents

- accés privat per UID;
- emissor i destinatari explícits en paquets;
- membres en cotutories;
- document general sociomètric no enumerable;
- token individual per participant;
- llistes explícites de subcol·leccions preparades a les rules;
- eliminació física compartida substituïda localment per tombstones.

### Controls objectiu

- `tenantId` o separació equivalent per centre;
- font institucional de rols;
- denegació per defecte;
- comprovació de permisos al servidor o rules;
- propietari únic per funcions administratives;
- caducitat d'invitacions i paquets;
- proves negatives per cada rol i operació;
- revisió després de qualsevol canvi d'esquema.

Estat: **parcial**. L'aïllament personal és funcional; el model multi-centre institucional encara no existeix.

## 10. Xifratge i pseudonimització

| Àmbit | Mesura | Estat |
| --- | --- | --- |
| Trànsit | HTTPS/TLS dels serveis web i Firebase | Implantada pel proveïdor |
| Firestore | Xifratge en repòs gestionat pel proveïdor | Implantada pel proveïdor |
| Dispositiu | Xifratge complet del disc | Pendent de política institucional |
| IndexedDB | Depèn de la protecció del dispositiu i perfil | Parcial |
| JSON manuals | Sense xifratge propi obligatori | Risc pendent |
| Backups al núvol | Protecció del compte i proveïdor | Parcial |
| Secrets | No guardar secrets al codi client o repositori | Parcial; cal inventari i escaneig |
| Pseudonimització | Identificadors interns i reducció abans d'IA | Parcial / IA no aplicable ara |

La configuració web de Firebase no és una contrasenya. Les credencials administratives, tokens CLI i claus de servei sí que són secrets i no s'han d'incloure al repositori, als logs ni als documents.

Abans d'un pilot cal:

- exigir xifratge del dispositiu;
- definir un mecanisme segur per a exports;
- evitar fitxers JSON permanents;
- rotar credencials després d'una sospita;
- revisar històric Git i entorns per secrets.

## 11. Seguretat dels dispositius i treball local

Controls objectiu per a dispositius amb dades reals:

- dispositiu institucional o autoritzat;
- xifratge complet;
- bloqueig automàtic;
- sistema i navegador actualitzats;
- compte d'usuari individual;
- protecció contra programari maliciós quan correspongui;
- còpia i esborrat remot mitjançant MDM, si és viable;
- prohibició de dispositius compartits sense perfils separats;
- eliminació segura en baixa o canvi;
- restricció de descàrregues i carpetes sincronitzades.

Estat actual: **pendent de govern institucional**. Avaluapro guarda dades a IndexedDB, però no pot imposar per si sola la configuració del Mac, iPad o ordinador del centre.

## 12. Desenvolupament segur

### Requisits

- repositori privat o accés justificat al codi sensible;
- branques i canvis revisables;
- dependències bloquejades amb `package-lock.json`;
- build reproduïble;
- lint i proves;
- revisió de seguretat en canvis de dades, permisos o compartició;
- dades fictícies en desenvolupament;
- secrets fora del repositori;
- versions i procediment de retorn enrere;
- protecció de la branca principal;
- escaneig de dependències i secrets;
- revisió del codi generat o assistit per IA.

### Estat actual

| Control | Estat | Evidència |
| --- | --- | --- |
| Build Vite | Implantada | `npm run build` |
| Lint | Implantada | `npm run lint` |
| Proves de seguretat | Implantada localment | `npm run test:security` |
| Proves de sincronització | Implantada | `npm run test:shared-sync` |
| Proves de rules | Implantada localment | `npm run test:rules` |
| Auditoria prèvia Firebase | Preparada | `npm run audit:firebase` |
| CI de build | Implantada | `.github/workflows/deploy.yml` |
| CI de lint i tests | Pendent | El workflow només construeix |
| Revisió obligatòria de PR | Pendent | Model de repositori per definir |
| Dependabot o equivalent | Pendent | Sense evidència |
| Escaneig de secrets | Pendent | Sense evidència |
| SAST | Pendent | Sense evidència |
| Entorns separats | Pendent | Un únic projecte Firebase |

Qualsevol canvi a `firestore.rules`, autenticació, backups, cotutories, sociometria o eliminació ha de tenir prova negativa i revisió específica.

## 13. Desplegament i configuració

Controls:

- desenvolupament, prova i producció separats;
- desplegament autenticat i traçable;
- artefacte generat des de codi versionat;
- configuració revisada;
- pla de retorn enrere;
- rules i aplicació compatibles;
- verificació posterior;
- limitació de qui pot desplegar;
- inventari de dominis i claus.

### Estat actual

- GitHub Actions desplega GitHub Pages després del build;
- Firebase Hosting té configuració pròpia;
- les rules no es despleguen amb el workflow de GitHub Pages;
- existeix una checklist de desplegament conjunt;
- els canvis reforçats de rules continuen locals;
- no hi ha entorn de preproducció separat.

Estat: **parcial i bloquejant abans del pilot institucional**.

## 14. Seguretat de xarxa i aplicació web

### Mesures actuals

- HTTPS;
- Firebase Rules com a control d'accés de dades;
- API web de Firebase dissenyada per ser pública;
- dominis autoritzats de Google configurables;
- límits de mida de documents;
- validacions de formularis;
- tokens aleatoris no enumerables.

### Mesures pendents

- revisar restriccions reals de l'API key;
- retirar dominis antics;
- activar App Check progressivament;
- definir capçaleres de seguretat, inclosa una CSP compatible;
- revisar dependències carregades;
- limitar intents o abús quan sigui necessari;
- efectuar proves de penetració proporcionades;
- verificar Safari i iPad abans d'enforcement.

App Check és defensa addicional. No corregeix rules incorrectes ni permisos excessius.

## 15. Integritat de dades i sincronització

Controls existents o preparats:

- identificadors estables;
- dates de modificació;
- autoria en diversos fluxos;
- tombstones per propagar eliminacions;
- protecció contra una eliminació física compartida directa;
- confirmacions abans de restaurar o esborrar;
- validacions de mida;
- còpies de recuperació.

Controls pendents:

- registre complet d'autoria en totes les operacions sensibles;
- control de versions i conflictes;
- proves simultànies amb dos docents;
- reconciliació després d'una restauració;
- comprovació que no ressusciten dades suprimides;
- checksums o validació d'exports;
- transaccions o backend en operacions multipas crítiques.

Estat: **parcial**.

## 16. Backups, disponibilitat i recuperació

### Mesures actuals

- còpia local de treball a IndexedDB;
- backups manuals JSON;
- backups al núvol per UID;
- còpia automàtica diària en determinades condicions;
- restauració amb resum i confirmació;
- exclusió de tokens i respostes sociomètriques brutes.

### Mesures objectiu

- política de retenció automàtica;
- xifratge i custòdia d'exports;
- còpies independents quan l'arquitectura institucional ho exigeixi;
- prova periòdica de restauració;
- RPO i RTO acordats;
- restauració en entorn aïllat;
- registre de cada prova;
- procediment contra corrupció o ransomware;
- reaplicació de supressions després de restaurar;
- continuïtat si Firebase o l'empresa no estan disponibles.

Estat: **parcial**. Hi ha funcionalitat de còpia, però no un pla de continuïtat institucional provat.

## 17. Registre, monitoratge i alertes

Cal registrar, de manera proporcionada:

- altes, baixes i canvis de rol;
- accessos administratius;
- invitacions i revocacions;
- enviaments i importacions;
- canvis de membres;
- exportacions;
- restauracions;
- eliminacions;
- incidents;
- canvis de rules i configuració;
- desplegaments.

Els logs:

- no han de contenir textos educatius complets ni secrets;
- han de tenir hora fiable;
- han d'estar protegits contra modificació;
- han de tenir retenció definida;
- han de generar alertes útils;
- han de ser revisats per una persona assignada.

Estat actual: **pendent o parcial**. Hi ha metadades en alguns fluxos i errors visibles, però no un sistema central d'auditoria i alertes.

## 18. Minimització i privacitat des del disseny

Mesures existents:

- mapa de dades;
- classificació de sensibilitat;
- avisos en camps oberts;
- etiquetes controlades;
- exclusió de secrets temporals dels backups;
- càlcul de diversos indicadors sense duplicar-los;
- formulari sociomètric temporal;
- document general no públic;
- IA ajornada.

Mesures pendents:

- eliminar camps no justificats;
- permisos reforçats per categories especials;
- configuració protectora per defecte;
- revisió sistemàtica de noves funcionalitats;
- pseudonimització abans de proveïdors externs;
- comprovació de reidentificació;
- mètriques sense noms quan no siguin necessaris.

## 19. Conservació, bloqueig i eliminació

La política de referència és:

`docs/politica-conservacio-eliminacio-preliminar.md`

Estat:

- terminis candidats documentats;
- eliminació manual disponible en diversos fluxos;
- tombstones preparats localment;
- purga automàtica de qüestionaris implementada i provada amb emulador; desplegament i activació pendents;
- retenció de backups pendent;
- expiració de paquets i invitacions pendent;
- magatzem de bloqueig legal pendent;
- prova completa de final de curs pendent.

## 20. Personal, confidencialitat i formació

Document de referència:

`docs/compromis-confidencialitat-formacio-preliminar.md`

Abans d'accedir a dades, qualsevol persona haurà de:

- tenir una funció definida;
- signar compromís de confidencialitat;
- rebre formació inicial;
- conèixer el canal d'incidents;
- entendre minimització i text lliure;
- utilitzar només eines autoritzades;
- rebre recordatoris periòdics;
- perdre accés en acabar la funció.

Formació mínima:

- protecció de menors;
- phishing i comptes;
- dispositius i exports;
- compartició entre docents;
- sociometria;
- drets;
- incidents;
- ús d'IA prohibit o autoritzat.

Estat actual: **documentat parcialment, no implantat com a programa formal**.

## 21. Suport tècnic

Procediment de referència:

`docs/procediment-suport-manteniment-preliminar.md`

Model recomanat:

1. diagnòstic sense dades personals;
2. captures anonimitzades;
3. dades fictícies per reproduir;
4. accés temporal excepcional només si és imprescindible;
5. autorització del responsable;
6. registre d'inici, finalitat i final;
7. supervisió;
8. revocació immediata;
9. informe de l'actuació.

No s'han d'enviar backups reals per correu ordinari o canals personals per resoldre una incidència.

Estat actual: **documentat, sense sistema formal d'accés excepcional**.

## 22. Proveïdors i cadena de subministrament

Per cada proveïdor cal verificar:

- rol;
- contracte;
- mesures;
- ubicació i transferències;
- subencarregats;
- incidents;
- retenció i eliminació;
- continuïtat;
- certificacions;
- canvi o sortida.

Controls addicionals:

- dependències de programari actualitzades;
- revisió d'avisos de seguretat;
- bloqueig de versions;
- inventari SBOM quan sigui proporcionat;
- revisió abans d'afegir SDK o servei;
- prohibició d'enviar dades a eines no aprovades.

L'inventari preliminar és:

`docs/inventari-subencarregats-i-proveidors.md`

Estat: **documentat; contractació i homologació pendents**.

## 23. Incidents

El protocol de referència és:

`docs/protocol-incidents-violacions-seguretat-preliminar.md`

Controls pendents abans del pilot:

- responsables i suplents;
- canal urgent;
- cobertura horària;
- accés a logs;
- formulari i contacte APDA;
- simulacres;
- registre central;
- integració amb proveïdors;
- lliçons apreses.

## 24. Drets de les persones

El procediment de referència és:

`docs/procediment-exercici-drets-preliminar.md`

Controls tècnics pendents:

- cerca completa per persona;
- exportació intel·ligible;
- rectificació propagada;
- limitació visible i efectiva;
- supressió coordinada;
- gestió de destinataris;
- backups que no ressusciten dades;
- evidència de finalització.

## 25. Continuïtat de negoci

El pla preliminar de referència és:

`docs/pla-continuitat-recuperacio-preliminar.md`

Escenaris mínims:

- indisponibilitat de Firebase;
- pèrdua del compte administrador;
- corrupció de dades;
- error de rules;
- repositori o desplegament compromès;
- baixa de la persona desenvolupadora principal;
- tancament de l'empresa;
- canvi de proveïdor;
- pèrdua d'un dispositiu;
- incident massiu.

Cal definir:

- funcions essencials;
- RPO: pèrdua màxima de dades acceptable;
- RTO: temps màxim de recuperació;
- contactes;
- còpies i credencials d'emergència;
- procediment manual temporal;
- restauració;
- comunicació;
- retorn a la normalitat;
- prova anual.

Estat actual: **documentat, pendent d'implantació i proves**. Els backups són una base, però no equivalen a un pla de continuïtat.

## 26. Verificació periòdica

| Prova | Freqüència candidata | Evidència |
| --- | --- | --- |
| Revisió d'accessos | Trimestral i en cada canvi | Informe signat |
| Rules i proves negatives | En cada canvi i trimestral | Resultat CI/emulador |
| Restauració de backup | Trimestral | Acta amb RPO/RTO |
| Purga i retenció | Mensual | Log de purga |
| Dependències | Setmanal automatitzada | Alertes resoltes |
| Secrets | En cada commit o PR | Escàner |
| Vulnerabilitats | Mensual i després de canvis crítics | Registre i SLA |
| Simulacre d'incident | Anual | Informe de simulacre |
| Continuïtat | Anual | Prova documentada |
| Dispositius | Trimestral | Inventari i conformitat |
| Proveïdors | Anual | Fitxa de revisió |
| Auditoria externa | Abans del pilot i després segons risc | Informe independent |

## 27. Gestió de vulnerabilitats

Política de referència:

`docs/politica-vulnerabilitats-actualitzacions-preliminar.md`

Cal establir:

- canal de notificació;
- classificació de severitat;
- responsable;
- terminis de correcció;
- actualitzacions d'emergència;
- proves i retorn enrere;
- comunicació quan afecti dades;
- registre de decisions.

SLA candidats:

| Severitat | Objectiu inicial |
| --- | --- |
| Crítica explotada o amb dades exposades | Contenció immediata |
| Crítica | Correcció o mitigació en 24-72 hores |
| Alta | 7 dies |
| Mitjana | 30 dies |
| Baixa | 90 dies o següent cicle |

Són objectius preliminars i s'han d'alinear amb el contracte i la capacitat operativa.

Estat actual: **pendent de política formal**.

## 28. Evidències mínimes del dossier de seguretat

- inventari d'actius;
- diagrama d'arquitectura i fluxos;
- versions de policies i procediments;
- configuració d'identitat i MFA;
- llista d'administradors;
- resultats de build, lint i tests;
- informe de rules;
- registre de desplegaments;
- informe de dependències i secrets;
- proves de restauració;
- logs de purga;
- revisions d'accessos;
- formacions;
- simulacres;
- incidents i correccions;
- contractes i proveïdors;
- auditoria externa.

Les captures manuals sense data, entorn i responsable no són evidència suficient per si soles.

## 29. Matriu de prioritats abans del pilot

### Bloquejants

- [ ] Responsable, DPD i responsable de seguretat identificats.
- [ ] Entorns de prova i producció separats.
- [ ] Rules reforçades desplegades i verificades.
- [ ] Qüestionaris antics resolts.
- [ ] Identitat, rols, alta i baixa aprovats.
- [ ] MFA administratiu acreditat.
- [ ] Dispositius reals protegits.
- [ ] Contracte i subencarregats aprovats.
- [ ] Logs mínims d'operacions sensibles.
- [ ] Retenció i purga de dades temporals.
- [ ] Restauració provada.
- [ ] Protocol d'incidents operatiu i simulat.
- [ ] AIPD aprovada.

### Abans d'ampliar

- [ ] App Check validat i, si escau, activat.
- [ ] CI amb lint, tests i escaneig.
- [ ] Auditoria externa proporcional.
- [ ] Pla de continuïtat provat.
- [ ] Formació recurrent.
- [ ] Revisió de vulnerabilitats amb SLA.
- [ ] Gestió completa de drets i bloqueig.

## 30. Annex contractual

Aquest document pot actuar com a base de l'annex 2 del contracte d'encàrrec.

Abans de signar-lo cal:

- eliminar estats provisionals;
- indicar arquitectura i proveïdors definitius;
- acordar freqüències i SLA;
- identificar responsables;
- definir evidències accessibles al Ministeri;
- establir procediment de canvi de mesures;
- evitar prometre certificacions no obtingudes.

## 31. Fonts oficials

- [Llei 29/2021, article 35: seguretat i confidencialitat](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions i protocols de la LQPD](https://www.apda.ad/storage/helps/6GgNFl4CzaBOQFVvrmwypgMtjf0baHlRkTcQVeCP.pdf)
- [APDA: guia d'avaluació d'impacte](https://www.apda.ad/storage/guides/fUCPtAfCs3M44wkQGA9ug4XEUWhRuvtCyMVXnkdJ.pdf)
- [APDA: tractament de dades en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
- [APDA: model de contracte d'encarregat](https://www.apda.ad/assets/pdf/models/Model-contracte_encarregat_de_tractament.pdf)
