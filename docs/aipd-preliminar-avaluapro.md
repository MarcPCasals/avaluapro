# Avaluació d'Impacte preliminar d'Avaluapro

Data: 20 de juny de 2026
Versió: 0.1
Estat: document tècnic preliminar; pendent de responsable, DPD, validació jurídica i aprovació institucional

## 1. Resum executiu

Avaluapro tracta dades educatives de menors per donar suport a l'avaluació, el seguiment, la tutoria, la coordinació docent i l'anàlisi pedagògica.

La combinació de menors, observació continuada, qualificacions, conducta, possibles dades de salut, sociometria, compartició entre docents i una possible implantació a diversos centres justifica elaborar una Avaluació d'Impacte abans d'un pilot institucional amb dades reals.

L'anàlisi preliminar identifica riscos alts relacionats principalment amb:

- excés de dades o text lliure;
- accés indegut entre docents o centres;
- estigmatització per diagnòstics, conducta o sociometria;
- conservació excessiva;
- exportacions i backups;
- errors de sincronització o destinatari;
- falta de governança institucional;
- ús futur d'IA.

Avaluapro ja incorpora mesures de protecció des del disseny, però el risc residual no es pot considerar acceptable per a un pilot institucional fins que s'hagin resolt les mesures obligatòries d'aquest document.

## 2. Titularitat i aprovació

| Element | Estat |
| --- | --- |
| Responsable del tractament | Pendent de designació pel Ministeri. |
| Corresponsables | Pendent de determinar el rol dels centres. |
| Encarregat | Futura empresa Avaluapro, si presta el servei per compte del responsable. |
| DPD consultat | Pendent. |
| Responsable tècnic | Marc Pérez Casals durant la fase de desenvolupament. |
| Data prevista d'aprovació | Pendent. |
| Risc residual acceptat per | Pendent; no correspon al desenvolupador acceptar-lo unilateralment. |

## 3. Objecte i abast

### 3.1 Tractaments inclosos

1. identitat i organització acadèmica;
2. avaluació competencial;
3. seguiment de tasques i hàbits;
4. conducta, agenda i incidències;
5. tutoria, orientació, DOIPs i antecedents;
6. diagnòstics o necessitats educatives;
7. sociometria i relacions de grup;
8. grups cooperatius i disposició d'aula;
9. compartició de notes i cotutories;
10. autenticació, permisos i administració;
11. backups, exportacions i restauració;
12. estadístiques, alertes i perfils pedagògics derivats.

### 3.2 Fora de l'abast actual

- IA educativa, encara no activada;
- integració amb Clickedu o altres fonts oficials;
- aplicació nativa;
- comunicació directa amb famílies;
- infraestructura institucional definitiva;
- tractaments comercials o publicitaris;
- ús de dades per entrenar models generals.

Qualsevol activació d'aquests elements requereix revisar i actualitzar l'AIPD.

## 4. Context del tractament

### 4.1 Persones afectades

- alumnes, principalment menors d'edat;
- docents;
- tutors i cotutors;
- orientació i direcció, si s'autoritza;
- famílies, només quan alguna observació les menciona;
- administradors i personal de suport.

### 4.2 Categories de dades

| Categoria | Exemples | Sensibilitat |
| --- | --- | --- |
| Identificatives | Nom, grup, fotografia i identificador intern | Alta |
| Acadèmiques | Competències, rúbriques, notes i adaptacions | Alta |
| Seguiment | Tasques, constància, exempcions i alertes | Alta |
| Conducta | Incidències, agenda i observacions | Molt alta |
| Tutorials | DOIPs, acords, antecedents i text lliure | Molt alta |
| Categories especials | Diagnòstics o dades que revelen salut | Crítica |
| Socials | Afinitats, rebuigs, rols i sociograma | Molt alta |
| Imatges | Fotografies d'alumnes i disposicions | Alta |
| Tècniques | UID, correu docent, dates i metadades de sincronització | Mitjana |

### 4.3 Volum i escala

L'ús actual és reduït i vinculat a docents concrets. L'escenari institucional podria incloure diversos centres, centenars de docents i milers d'alumnes.

L'augment d'escala canvia materialment:

- la probabilitat d'errors;
- l'impacte d'una configuració incorrecta;
- la necessitat d'administració central;
- l'obligació de registre i auditoria;
- els requisits de disponibilitat i suport;
- la consideració de tractament a gran escala.

## 5. Descripció de les operacions

```text
Alta o importació
  -> identitat, classe i configuració
  -> registre docent local
  -> sincronització privada al núvol
  -> compartició autoritzada, si s'activa
  -> càlcul d'estadístiques i suport a decisions
  -> exportació o backup
  -> tancament de curs, bloqueig o eliminació
```

### 5.1 Recollida

- entrada manual del docent;
- importació de llistes o còpies;
- qualificacions i registres creats durant el curs;
- qüestionaris sociomètrics;
- informació rebuda d'altres docents;
- fotografies opcionals.

### 5.2 Emmagatzematge

- IndexedDB al dispositiu;
- Firestore dins `users/{uid}`;
- espais compartits específics;
- backups al núvol;
- fitxers manuals descarregats;
- formularis sociomètrics temporals.

### 5.3 Consulta i ús

- taules d'avaluació;
- perfils individuals;
- reunions tutorials;
- estadístiques de grup;
- sociogrames;
- propostes de grups i disposicions;
- alertes o indicadors pedagògics.

### 5.4 Comunicació

- paquets puntuals de notes;
- cotutories compartides;
- exportacions manuals;
- accés eventual de suport, pendent de model;
- proveïdors tecnològics.

### 5.5 Eliminació

- eliminació local o de curs;
- tombstones en dades compartides;
- purga de qüestionaris sociomètrics;
- eliminació de backups;
- retorn o destrucció al final del contracte, amb procediment preliminar a `docs/procediment-retorn-migracio-supressio-preliminar.md` i prova real pendent.

## 6. Finalitats

| Finalitat | Valoració preliminar |
| --- | --- |
| Avaluar l'aprenentatge | Finalitat educativa principal i necessària. |
| Fer seguiment de tasques | Justificable si es limita a intervenció pedagògica. |
| Preparar tutories | Justificable amb minimització i rols estrictes. |
| Registrar conducta | Requereix fets observables, proporcionalitat i conservació curta. |
| Coordinar docents | Justificable només entre professionals autoritzats. |
| Analitzar relacions socials | Risc elevat; cal acreditar necessitat metodològica. |
| Generar agrupaments | Suport docent, mai decisió automàtica vinculant. |
| Recuperar informació | Justifica backups limitats i protegits. |
| Millorar el producte | Només amb dades tècniques mínimes o informació anonimitzada. |

No es consideren compatibles sense una nova anàlisi:

- publicitat;
- comercialització de dades;
- entrenament general de models;
- rànquings públics;
- sancions automàtiques;
- reutilització per finalitats no educatives.

## 7. Base jurídica

La base definitiva correspon al responsable del tractament.

Les candidates preliminars són:

- obligació legal;
- missió realitzada en interès públic;
- bases específiques per a activitats opcionals;
- una excepció de l'article 9.2 per a dades que revelin salut.

El consentiment no es considera una base general adequada per al nucli educatiu. La falta de definició formal de les bases jurídiques és un bloqueig per al pilot institucional.

## 8. Necessitat i proporcionalitat

### 8.1 Mesures favorables

- les dades es vinculen a funcions docents concretes;
- moltes estadístiques es calculen i no es dupliquen;
- les fotografies són opcionals;
- els qüestionaris temporals s'exclouen dels backups;
- hi ha avisos per limitar text lliure;
- les dades compartides tenen fluxos específics;
- la IA no està activada;
- Avaluapro no substitueix l'expedient acadèmic oficial.

### 8.2 Aspectes no demostrats encara

- necessitat de conservar diagnòstics en lloc d'adaptacions;
- proporcionalitat del sociograma per a tots els grups;
- necessitat de conservar incidències durant períodes llargs;
- necessitat que cada cotutor accedeixi a totes les categories;
- necessitat de fotografies al núvol;
- terminis de cada categoria;
- necessitat de còpies completes diàries;
- compatibilitat de tots els indicadors derivats amb la finalitat original.

### 8.3 Alternatives menys intrusives

| Tractament | Alternativa |
| --- | --- |
| Diagnòstics | Registrar només la necessitat o adaptació educativa. |
| Fotografia | No utilitzar-la o mantenir-la només localment. |
| Text lliure | Etiquetes controlades i resums breus. |
| Sociometria | Observació docent o activació només quan hi hagi necessitat. |
| Històrics complets | Resums de final de curs i eliminació del detall. |
| Compartició total | Permisos granulars per categoria i grup. |
| IA amb historial | Enviar només dades mínimes i pseudonimitzades per consulta. |

## 9. Metodologia de risc

### 9.1 Probabilitat

| Valor | Criteri |
| --- | --- |
| 1 | Improbable: requereix circumstàncies excepcionals. |
| 2 | Possible: pot passar ocasionalment. |
| 3 | Probable: és esperable sense controls addicionals. |
| 4 | Molt probable: pot passar repetidament o a gran escala. |

### 9.2 Impacte sobre la persona

| Valor | Criteri |
| --- | --- |
| 1 | Menor: molèstia limitada i fàcilment reversible. |
| 2 | Moderat: afectació educativa o de privacitat corregible. |
| 3 | Greu: estigmatització, discriminació, exposició sensible o pèrdua de control. |
| 4 | Molt greu: dany extens, persistent o que afecta molts menors. |

### 9.3 Nivell

`Risc = probabilitat × impacte`

| Resultat | Nivell |
| --- | --- |
| 1-3 | Baix |
| 4-7 | Mitjà |
| 8-11 | Alt |
| 12-16 | Crític |

El risc inherent es valora abans dels controls. El risc residual és una estimació després d'aplicar les mesures existents i les mesures obligatòries.

## 10. Registre de riscos

| ID | Risc per a les persones | P | I | Inherent | Mesures actuals | Mesures obligatòries pendents | Residual objectiu |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| R01 | Un docent accedeix a alumnes o grups no assignats | 3 | 4 | Crític 12 | Separació per UID i rules | Multi-centre, rols institucionals, font oficial i auditories | Mitjà 4 |
| R02 | Un cotutor conserva accés després d'un canvi de funcions | 3 | 3 | Alt 9 | Revocació local i sortida | Baixa centralitzada, sessions revocades i prova real | Mitjà 4 |
| R03 | S'envien notes al destinatari incorrecte | 2 | 3 | Mitjà 6 | Correu explícit i rules | Confirmació reforçada, registre i expiració de paquets | Baix 3 |
| R04 | Text lliure incorpora informació familiar, clínica o subjectiva excessiva | 4 | 3 | Crític 12 | Avisos de minimització | Camps més estructurats, formació, revisió i terminis curts | Mitjà 6 |
| R05 | Diagnòstics o salut es tracten sense base suficient | 3 | 4 | Crític 12 | Etiquetes controlades | Base de l'article 9.2, necessitat, permisos especials o retirada | Mitjà 4 |
| R06 | Una fuita exposa qualificacions, conducta o relacions | 3 | 4 | Crític 12 | HTTPS, Firebase i rules | Entorns separats, MFA, logs, proves externes i resposta a incidents | Mitjà 6 |
| R07 | El sociograma causa estigmatització o dany reputacional | 3 | 4 | Crític 12 | Accés docent, tokens i informació prèvia | Aprovació metodològica, accés restringit, termini i rectificació | Mitjà 6 |
| R08 | Un alumne suplanta un altre al qüestionari | 3 | 3 | Alt 9 | Token individual i un sol ús | Desplegar rules, canal segur de repartiment i prova real | Baix 3 |
| R09 | Backups o JSON queden en dispositius o espais insegurs | 3 | 4 | Crític 12 | Avisos i separació per usuari | Xifratge, política de custòdia, MDM i eliminació | Mitjà 6 |
| R10 | Dades antigues es conserven sense necessitat | 4 | 3 | Crític 12 | Neteja parcial i purga manual | Calendari institucional, bloqueig, purga automàtica i evidència | Mitjà 4 |
| R11 | Una restauració o sincronització perd o ressuscita dades | 2 | 3 | Mitjà 6 | Backups, confirmacions i tombstones | Proves de restauració, versions i procediment de recuperació | Baix 3 |
| R12 | Estadístiques o perfils generen decisions injustes | 3 | 3 | Alt 9 | Suport visual i decisió docent | Explicabilitat, prohibició de decisió automàtica i revisió de biaixos | Mitjà 4 |
| R13 | Suport tècnic accedeix al contingut educatiu | 2 | 4 | Alt 8 | Sense accés administratiu definit | Suport sense contingut, accés excepcional auditat i confidencialitat | Baix 3 |
| R14 | La infraestructura o els subencarregats no compleixen requisits institucionals | 3 | 4 | Crític 12 | Regió europea de Firestore | Contractes, transferències, propietat del projecte i homologació | Mitjà 4 |
| R15 | Un incident no es detecta o comunica a temps | 3 | 4 | Crític 12 | Errors visibles i documentació parcial | Protocol, responsable, canal urgent, logs i simulacres | Mitjà 4 |
| R16 | Les dades de dos centres es barregen | 2 | 4 | Alt 8 | Separació actual per docent | `tenantId`, rules per centre, proves i administració institucional | Baix 3 |
| R17 | Els qüestionaris antics continuen públics o no es poden migrar | 3 | 3 | Alt 9 | Auditoria de Firebase | Recuperar, sincronitzar, tancar, purgar i desplegar conjuntament | Baix 2 |
| R18 | Un proveïdor d'IA reutilitza o conserva dades | 3 | 4 | Crític 12 | IA ajornada | Contracte, retenció nul·la, pseudonimització i nova AIPD | Mitjà 4 |

El tractament detallat de recuperació, RPO, RTO, reversibilitat i dependència de persones es troba a `docs/pla-continuitat-recuperacio-preliminar.md`.

## 11. Mesures tècniques existents

El catàleg complet i l'estat verificable de les mesures es troba a `docs/mesures-tecniques-organitzatives-preliminars.md`.

- Firebase Authentication amb Google;
- HTTPS;
- separació de dades per UID;
- rules específiques;
- proves automatitzades amb Firebase Emulator;
- tokens sociomètrics aleatoris;
- caducitat de 24 hores;
- respostes d'un sol ús;
- document general del qüestionari no públic;
- tombstones en eliminació compartida;
- revocació i sortida de cotutoria;
- exclusió de secrets temporals dels backups;
- IndexedDB per continuïtat local;
- comprovacions de mida de documents;
- confirmacions en accions destructives.

## 12. Mesures organitzatives existents

- mapa de dades;
- política de minimització;
- avisos d'escriptura responsable;
- política provisional de conservació sociomètrica;
- documentació de rols;
- RAT preliminar;
- qüestionari institucional;
- ús de dades fictícies en proves;
- registre de dubtes i decisions pendents.

## 13. Pla de tractament del risc

### Prioritat 1. Abans de qualsevol pilot real

- [ ] Designar responsable i DPD.
- [ ] Aprovar bases jurídiques i article 9.2.
- [ ] Aprovar aquesta AIPD i el risc residual.
- [x] Preparar el model procedimental de centres, rols, altes i baixes: `docs/procediment-identitats-rols-baixes-preliminar.md`. Les decisions institucionals i la implementació continuen pendents.
- [ ] Separar desenvolupament, proves i producció.
- [ ] Desplegar i provar les rules reforçades.
- [ ] Resoldre els qüestionaris antics.
- [x] Preparar una política preliminar de conservació, bloqueig i eliminació: `docs/politica-conservacio-eliminacio-preliminar.md`. Terminis finals, arquitectura de bloqueig i automatització pendents.
- [ ] Formalitzar encarregat i subencarregats.
- [x] Preparar protocols preliminars de drets i incidents: `docs/procediment-exercici-drets-preliminar.md` i `docs/protocol-incidents-violacions-seguretat-preliminar.md`. Pendent d'aprovació institucional, implantació i simulacres.

### Prioritat 2. Abans d'ampliar el pilot

- [ ] Registre d'accessos i canvis sensibles.
- [ ] Purga automàtica.
- [x] Preparar el govern d'administradors, MFA i accessos excepcionals: `docs/govern-administradors-accessos-excepcionals-preliminar.md`. Implantació i evidències pendents.
- [ ] Prova de restauració.
- [ ] Auditoria externa proporcional.
- [ ] Formació docent.
- [ ] Revisió de camps de text lliure.
- [ ] Política de dispositius i fitxers manuals.

### Prioritat 3. Abans d'IA o integracions

- [ ] Actualitzar l'AIPD.
- [ ] Revisar compatibilitat de finalitats.
- [ ] Contractar el proveïdor.
- [ ] Provar filtratge i pseudonimització.
- [ ] Documentar intervenció humana.
- [ ] Permetre desactivar la funcionalitat.

## 14. Drets de les persones

El model institucional ha de permetre:

- informació clara i adaptada a l'edat;
- accés;
- rectificació;
- supressió quan sigui aplicable;
- limitació;
- oposició quan correspongui;
- portabilitat, si escau;
- revisió humana de resultats o perfils;
- reclamació davant el responsable, el DPD i l'APDA.

Punts especialment delicats:

- corregir observacions subjectives;
- distingir rectificació d'una dada factual i discrepància professional;
- informar de destinataris;
- propagar rectificacions a espais compartits i backups;
- verificar la identitat de famílies o representants.

## 15. Transparència

Cal preparar informació per capes:

1. avís curt al moment de recollir dades;
2. política de privacitat completa;
3. informació específica per funcionalitats sensibles;
4. canal del DPD i drets;
5. informació sobre proveïdors i transferències;
6. explicació de perfils, estadístiques i absència de decisions automàtiques.

La informació del qüestionari sociomètric ja segueix parcialment aquest model.

## 16. Seguretat i resposta a incidents

El protocol institucional haurà de cobrir:

- detecció;
- contenció;
- preservació d'evidències;
- avaluació de persones i dades afectades;
- comunicació interna;
- notificació a l'APDA quan correspongui;
- comunicació a les persones afectades quan sigui exigible;
- correcció;
- revisió posterior;
- registre de la incidència.

## 17. Transferències i proveïdors

Cal inventariar, com a mínim:

- Google Cloud / Firebase;
- GitHub;
- proveïdor de domini;
- correu i identitat institucional;
- Andorra Telecom, si participa;
- serveis de suport;
- proveïdor d'IA futur.

Per a cada proveïdor:

- servei i dades;
- ubicació;
- rol;
- contracte;
- subencarregats;
- retenció;
- transferències;
- eliminació;
- auditories i certificacions;
- procediment de canvi o sortida.

## 18. Consulta de persones afectades

El responsable ha de valorar:

- consulta al DPD;
- consulta a docents pilot;
- prova de comprensió dels avisos amb alumnes o representants;
- participació de direcció i orientació;
- consulta a famílies quan sigui adequada.

Aquestes consultes no substitueixen la base jurídica, però poden revelar riscos d'ús, comprensió o estigmatització.

## 19. Risc residual preliminar

### Estat actual

**Alt.** Les mesures locals redueixen riscos tècnics concrets, però falten governança, desplegament, bases jurídiques, arquitectura institucional, conservació i procediments.

### Estat objectiu abans del pilot

**Mitjà controlat**, sempre que totes les mesures de prioritat 1 estiguin implementades, provades i aprovades.

### Riscos que poden continuar sent elevats

- categories especials sense justificació clara;
- sociometria sense necessitat acreditada;
- text lliure extens;
- desplegament a gran escala sense segregació per centre;
- IA sense garanties;
- infraestructura no acceptada pel Ministeri.

Si algun risc alt persisteix sense mitigació suficient, el responsable haurà de valorar la consulta prèvia a l'APDA.

## 20. Validació i revisió

| Revisió | Responsable | Data | Resultat |
| --- | --- | --- | --- |
| Tècnica interna | Marc Pérez Casals | 20/06/2026 | Versió preliminar creada |
| Protecció de dades | Pendent |  |  |
| DPD | Pendent |  |  |
| Sistemes | Pendent |  |  |
| Responsable del tractament | Pendent |  |  |

L'AIPD s'ha de revisar:

- abans del pilot;
- abans d'IA;
- quan canviï la infraestructura;
- quan s'ampliïn dades o finalitats;
- quan canviïn rols o destinataris;
- després d'un incident greu;
- periòdicament segons la política institucional.

## 21. Documents relacionats

- `docs/mapa-dades.md`
- `docs/registre-activitats-tractament-preliminar.md`
- `docs/rols-i-bases-juridiques-preliminars.md`
- `docs/cribratge-aipd-preliminar.md`
- `docs/auditoria-comparticio-permisos.md`
- `docs/backups-conservacio.md`
- `docs/comparticio-docents.md`
- `docs/informacio-participants-sociometria.md`
- `docs/questionari-ministeri-decisions-institucionals.md`

## 22. Fonts oficials

- [Llei 29/2021, especialment articles 28, 32, 33, 34 i 35](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: guia informativa d'avaluació d'impacte](https://www.apda.ad/storage/guides/fUCPtAfCs3M44wkQGA9ug4XEUWhRuvtCyMVXnkdJ.pdf)
- [APDA: obligacions](https://www.apda.ad/obligacions)
- [APDA: tractament de dades en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
