# Procediment preliminar d'exercici de drets

Data: 21 de juny de 2026
Versió: 0.1
Estat: procediment intern preliminar; pendent d'aprovació institucional i revisió jurídica

> Aquest document no s'ha de presentar com un procediment vigent fins que s'hagin completat el responsable, el DPD, els canals, els rols i les eines reals. Avaluapro assistirà el responsable del tractament, però no decidirà per si sola si un dret s'ha d'estimar o denegar.

## 1. Objectiu

Establir un circuit traçable per rebre, verificar, analitzar i executar sol·licituds relatives a dades personals tractades mitjançant Avaluapro.

El procediment ha de garantir:

- resposta dins de termini;
- verificació proporcionada de la identitat;
- protecció de dades de tercers;
- coordinació entre responsable, DPD, centre i Avaluapro;
- actuació sobre dades locals, Firestore, espais compartits, backups i exportacions quan correspongui;
- registre de les decisions i les operacions efectuades.

## 2. Abast

S'aplica a dades de:

- alumnes;
- docents;
- famílies o representants legals, quan n'hi hagi;
- altres persones incloses excepcionalment en observacions o registres.

Pot afectar:

- identitat i grup;
- qualificacions i rúbriques;
- tasques i seguiment;
- tutoria, orientació i observacions;
- sociometria i grups cooperatius;
- cotutories i paquets entre docents;
- comptes, rols i autoria;
- còpies locals, Firestore, backups i exportacions controlades.

## 3. Drets contemplats

Segons la LQPD i l'aplicabilitat a cada tractament:

- accés;
- rectificació;
- supressió;
- limitació;
- oposició;
- portabilitat;
- drets vinculats a decisions únicament automatitzades;
- reclamació davant l'APDA.

No tots els drets operen igual en un tractament educatiu basat en una obligació legal o una missió d'interès públic. Una denegació o limitació ha de ser decidida i motivada pel responsable, no pel proveïdor tècnic.

## 4. Rols

| Actor | Responsabilitat |
| --- | --- |
| Persona interessada o representant | Presentar la sol·licitud i aportar les dades necessàries per identificar el tractament. |
| Canal institucional `[PENDENT]` | Rebre la petició i deixar constància de la data. |
| Responsable del tractament `[PENDENT]` | Decidir sobre la sol·licitud i signar la resposta. |
| DPD `[PENDENT]` | Assessorar, supervisar terminis i intervenir en casos complexos. |
| Centre o responsable funcional `[PENDENT]` | Localitzar context educatiu i validar dades acadèmiques o tutorials. |
| Empresa Avaluapro | Localitzar i executar operacions tècniques seguint instruccions documentades. |
| Proveïdors | Assistir segons el contracte quan la dada no es pugui gestionar directament. |

## 5. Canals

Canal principal:

`[PENDENT: correu o formulari del responsable o DPD]`

Canals alternatius:

- registre presencial o electrònic institucional;
- centre educatiu;
- suport d'Avaluapro, només per remetre la petició al responsable.

Una petició rebuda per un canal no previst no s'ha d'ignorar. S'ha de registrar i traslladar al canal competent.

### Termini intern d'Avaluapro

Si Avaluapro rep directament una sol·licitud:

1. n'acusarà la recepció sense entrar en el fons;
2. la remetrà al responsable sense dilació indeguda;
3. objectiu intern: dins de 24 hores laborables;
4. no confirmarà si existeixen dades fins que s'hagi verificat la identitat i l'autorització.

## 6. Terminis

- El responsable ha de respondre sense dilació indeguda i, com a màxim, en un mes des de la recepció.
- El termini es pot prorrogar fins a dos mesos addicionals per complexitat o nombre de sol·licituds.
- La pròrroga i els seus motius s'han de comunicar dins del primer mes.
- Si no s'actua, la resposta ha d'explicar els motius i informar de la possibilitat de reclamar davant l'APDA.

Per evitar esgotar el termini legal, s'estableixen aquests objectius interns:

| Fita | Objectiu |
| --- | --- |
| Registre i acusament de recepció | 2 dies laborables |
| Verificació inicial i concreció | 5 dies laborables |
| Localització tècnica preliminar | 10 dies laborables |
| Decisió del responsable | 20 dies naturals |
| Execució i resposta | Abans d'un mes |

Els objectius interns no modifiquen el termini legal.

## 7. Verificació d'identitat i representació

La verificació ha de ser proporcional al risc. No s'ha de demanar automàticament una còpia completa d'un document d'identitat si la identitat es pot comprovar per un canal institucional autenticat.

Possibles mecanismes:

- sessió institucional autenticada;
- correu institucional ja verificat;
- comprovació presencial;
- identificació mitjançant el sistema oficial del responsable;
- documentació de representació quan una persona actua per un menor o un tercer.

Cal comprovar:

- identitat de qui sol·licita;
- relació amb l'alumne, si escau;
- abast de la representació;
- possibles conflictes de representació;
- que la resposta no reveli dades d'altres alumnes o docents.

Si hi ha dubtes raonables, es pot demanar informació addicional limitada a confirmar la identitat.

## 8. Registre de la sol·licitud

Cada cas tindrà un identificador, per exemple `DR-2026-001`.

| Camp mínim | Contingut |
| --- | --- |
| Identificador | Codi intern sense nom al títol del cas |
| Data i canal de recepció | Data que inicia el termini |
| Sol·licitant | Identitat i representació verificades |
| Dret invocat | Accés, rectificació, supressió, etc. |
| Abast | Alumne, curs, classe, funcionalitat i període |
| Responsable del cas | Persona assignada |
| Sistemes afectats | IndexedDB, Firestore, espais compartits, backups, exportacions |
| Destinataris | Persones o entitats a qui s'hagin comunicat les dades |
| Decisions | Estimació, parcial, denegació o petició de concreció |
| Accions | Operacions efectuades i evidències |
| Dates | Fites, pròrroga i resposta final |

El registre de drets també és dada personal i ha de tenir accés restringit.

## 9. Circuit operatiu

### Pas 1. Rebre i registrar

- conservar la petició original;
- assignar identificador i responsable;
- calcular la data límit;
- acusar recepció;
- avisar el DPD quan sigui sensible o complexa.

### Pas 2. Verificar identitat i abast

- comprovar identitat o representació;
- identificar l'alumne, curs i període;
- concretar una petició manifestament ambigua;
- no exigir justificació per exercir un dret, excepte documents necessaris per acreditar una rectificació o representació.

### Pas 3. Identificar tractaments i ubicacions

Consultar el mapa de dades i determinar si hi ha informació a:

- dispositiu del docent;
- Firestore privat;
- cotutories;
- paquets de notes;
- qüestionaris o resultats sociomètrics;
- backups;
- fitxers exportats sota control institucional;
- registres de seguretat;
- proveïdors.

### Pas 4. Protegir provisionalment

Quan hi hagi una disputa d'exactitud o licitud:

- evitar canvis destructius precipitats;
- valorar una limitació temporal;
- preservar la dada necessària per resoldre la petició;
- impedir que continuï una comunicació inadequada.

### Pas 5. Analitzar el dret

El responsable, amb assessorament del DPD, determina:

- si el dret és aplicable;
- si existeixen obligacions de conservació;
- si hi ha dades de tercers;
- si la petició afecta documents oficials o notes de suport;
- si cal estimar-la totalment, parcialment o denegar-la motivadament.

### Pas 6. Executar

Avaluapro només actuarà amb una instrucció identificable que indiqui:

- cas;
- dades;
- entorn;
- operació;
- responsable autoritzant;
- data límit;
- tractament de còpies i destinataris.

### Pas 7. Verificar

- comprovar el resultat a cada ubicació;
- evitar que una sincronització restauri la dada antiga;
- comprovar espais compartits;
- documentar excepcions de backups o bloqueig;
- registrar qui va executar i revisar l'operació.

### Pas 8. Respondre i tancar

La resposta del responsable ha d'indicar:

- actuació realitzada;
- dades o categories afectades;
- limitacions o denegacions motivades;
- destinataris informats, quan correspongui;
- possibilitat de contactar amb el DPD i reclamar davant l'APDA.

## 10. Regles específiques per dret

### 10.1. Accés

La resposta ha de permetre entendre:

- si es tracten dades;
- quines dades i amb quines finalitats;
- categories i origen;
- destinataris;
- conservació;
- drets;
- transferències i garanties;
- perfils o decisions automatitzades, si n'hi hagués.

La còpia s'ha de preparar de manera que no exposi dades d'altres alumnes. No s'ha de lliurar una exportació tècnica bruta si és inintel·ligible o conté secrets, tokens, dades de tercers o informació de seguretat.

### 10.2. Rectificació

Cal distingir:

1. **Dada factual inexacta:** nom, grup, data, atribució o qualificació transcrita incorrectament. Es corregeix quan s'acredita l'error.
2. **Dada incompleta:** es pot completar amb informació o una declaració addicional.
3. **Valoració professional:** una observació docent legítima no es converteix automàticament en inexacta perquè la persona hi discrepi.

Quan hi hagi discrepància sobre una valoració professional:

- revisar autoria, data, context i base;
- corregir fets objectivament erronis;
- valorar afegir la posició de la persona interessada;
- conservar només observacions necessàries, proporcionades i formulades professionalment;
- utilitzar els procediments acadèmics de revisió quan la petició sigui realment una impugnació d'una qualificació.

### 10.3. Supressió

Abans de suprimir:

- comprovar si la dada encara és necessària;
- revisar obligacions legals o acadèmiques;
- distingir expedient oficial, quadern docent i còpia de suport;
- decidir el tractament de còpies, destinataris i backups;
- evitar suprimir evidències necessàries per una reclamació oberta.

Quan la supressió immediata d'un backup no sigui viable, la dada s'ha de mantenir fora d'ús ordinari, protegida i subjecta al cicle de sobreescriptura establert.

### 10.4. Limitació

La dada es conserva però se'n restringeix l'ús mentre:

- se'n verifica l'exactitud;
- es resol una disputa de licitud;
- la persona la necessita per formular o defensar reclamacions;
- s'avalua una oposició.

El sistema institucional haurà de definir com es marca i propaga la limitació.

### 10.5. Oposició

El responsable ha de valorar els motius relacionats amb la situació particular i si existeixen motius legítims imperiosos o una missió d'interès públic que justifiquin continuar el tractament.

### 10.6. Portabilitat

S'ha de comprovar si el tractament es basa en consentiment o contracte i es fa per mitjans automatitzats. Pot no ser aplicable al nucli educatiu basat en missió pública.

La portabilitat no substitueix el dret d'accés ni obliga a lliurar dades internes que no hagi facilitat la persona quan no entrin en l'abast legal.

### 10.7. Decisions automatitzades

Actualment Avaluapro ofereix estadístiques i suport a la decisió docent, però no ha de prendre decisions acadèmiques vinculants de manera exclusivament automatitzada.

Qualsevol futura IA exigirà:

- informació clara;
- intervenció humana real;
- possibilitat d'impugnar;
- revisió de l'AIPD i d'aquest procediment.

## 11. Dades compartides i destinataris

Una rectificació, supressió o limitació pot requerir actuacions a:

- docent propietari;
- cotutors;
- tutor receptor d'un paquet;
- centre;
- proveïdors;
- còpies institucionals.

El responsable ha de comunicar l'actuació als destinataris quan correspongui, tret que sigui impossible o exigeixi un esforç desproporcionat, i informar-ne la persona si ho demana.

## 12. Seguretat de la resposta

- no enviar dades educatives sensibles a una adreça no verificada;
- xifrar o protegir el fitxer quan el risc ho requereixi;
- enviar la clau per un canal diferent;
- aplicar caducitat als enllaços de descàrrega;
- registrar la tramesa;
- evitar noms complets en assumptes de correu;
- no incloure dades de tercers no necessàries.

## 13. Plantilla d'instrucció tècnica a Avaluapro

```text
Cas:
Responsable que autoritza:
Persona o alumne afectat:
Entorn i centre:
Període:
Dret i decisió:
Dades i ubicacions:
Operació sol·licitada:
Tractament de dades compartides:
Tractament de backups:
Data límit:
Precaucions:
Evidència de finalització requerida:
```

## 14. Plantilla de resposta tècnica d'Avaluapro

```text
Cas:
Data de recepció de la instrucció:
Operacions executades:
Sistemes revisats:
Resultat:
Excepcions o dades no localitzades:
Backups o còpies pendents de cicle:
Destinataris que requereixen actuació:
Persona executora:
Persona revisora:
Data de finalització:
Evidències:
```

## 15. Controls abans d'activar el procediment

- [ ] Identificar responsable i DPD.
- [ ] Publicar un canal acreditable.
- [ ] Assignar responsables i suplents.
- [ ] Aprovar un model de registre.
- [ ] Definir el mecanisme de verificació d'identitat.
- [ ] Crear eines d'exportació, rectificació, limitació i supressió auditables.
- [ ] Definir el tractament de dades locals i backups.
- [ ] Provar casos en espais compartits.
- [ ] Formar suport i docents.
- [ ] Fer un simulacre amb dades fictícies.
- [ ] Revisar el procediment almenys anualment i després d'un incident o canvi rellevant.

## 16. Fonts oficials

- [Llei 29/2021, qualificada de protecció de dades personals](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: drets i obligacions](https://www.apda.ad/obligacions)
- [APDA: models per exercir drets](https://www.apda.ad/models)
- [APDA: protecció de dades en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
