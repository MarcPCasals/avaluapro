# Protocol preliminar d'incidents i violacions de seguretat

Data: 21 de juny de 2026
Versió: 0.1
Estat: protocol intern preliminar; pendent d'aprovació institucional, canals reals i simulacre

> Aquest protocol no substitueix el pla d'incidents del Ministeri o del centre. En un servei institucional, Avaluapro actuarà normalment com a encarregada: ha d'avisar i assistir sense dilació, mentre que el responsable decideix la notificació a l'APDA i la comunicació a les persones afectades.

## 1. Objectiu

Preparar una resposta ràpida, coordinada i documentada davant incidents que afectin dades personals tractades per Avaluapro.

El protocol cobreix:

- detecció i registre;
- contenció;
- preservació d'evidències;
- anàlisi de confidencialitat, integritat i disponibilitat;
- avaluació del risc per a les persones;
- coordinació amb el responsable i el DPD;
- notificació a l'APDA quan correspongui;
- comunicació a les persones afectades quan hi hagi alt risc;
- recuperació i millora posterior.

## 2. Definicions

### Incident de seguretat

Esdeveniment que pot afectar sistemes, comptes o informació. No tot incident és una violació de dades personals.

Exemples:

- caiguda temporal sense pèrdua de dades;
- intent d'accés bloquejat;
- error de desplegament;
- vulnerabilitat encara no explotada.

### Violació de la seguretat de dades personals

Incident que ocasiona de manera accidental o no autoritzada:

- pèrdua o destrucció;
- alteració;
- divulgació;
- comunicació o accés;
- indisponibilitat de dades personals.

Pot afectar:

- **confidencialitat:** algú veu dades que no li corresponen;
- **integritat:** dades modificades o corrompudes;
- **disponibilitat:** dades perdudes o inaccessibles.

## 3. Exemples específics d'Avaluapro

- un docent accedeix a una classe o cotutoria que no li correspon;
- una baixa no revoca l'accés;
- una invitació arriba a un correu equivocat;
- Firestore Rules permeten una lectura o escriptura indeguda;
- un qüestionari sociomètric exposa noms, tokens o respostes;
- es comparteix un backup sense protecció;
- es perd o roba un dispositiu amb dades locals;
- un compte de Google és compromès;
- un error de sincronització sobreescriu qualificacions;
- un desplegament elimina dades;
- GitHub, Firebase o un proveïdor comunica una incidència;
- suport tècnic accedeix a contingut sense autorització;
- s'envien dades personals a un servei d'IA no aprovat.

## 4. Principis

1. Protegir primer les persones i contenir el dany.
2. No esperar a tenir tota la informació per elevar una sospita fundada.
3. No destruir evidències durant la contenció.
4. Separar fets confirmats, hipòtesis i informació pendent.
5. Registrar totes les violacions, també les que no es notifiquin a l'APDA.
6. No ocultar, minimitzar ni retardar un incident per motius reputacionals.
7. No comunicar públicament noms o detalls que augmentin el dany.

## 5. Rols

| Actor | Responsabilitat |
| --- | --- |
| Qualsevol usuari o tècnic | Detectar, aturar accions insegures si és possible i avisar pel canal urgent. |
| Coordinador d'incident d'Avaluapro `[PENDENT]` | Obrir el cas, coordinar contenció tècnica i informar el responsable. |
| Responsable del tractament `[PENDENT]` | Avaluar i assumir les decisions legals de notificació i comunicació. |
| DPD `[PENDENT]` | Assessorar sobre risc, notificació, comunicació i documentació. |
| Responsable de sistemes `[PENDENT]` | Investigar, contenir, recuperar i preservar evidències. |
| Centre o responsable funcional `[PENDENT]` | Identificar alumnes, context, conseqüències i mesures educatives. |
| Comunicació institucional `[PENDENT]` | Preparar missatges aprovats, si són necessaris. |
| Proveïdors | Aportar informació i actuar segons contracte. |

Cal designar titulars, suplents i dades de contacte accessibles fora de l'aplicació.

## 6. Canals

Canal urgent institucional:

`[PENDENT: telèfon i correu monitorat]`

Canal urgent d'Avaluapro:

`[PENDENT]`

Canal del DPD:

`[PENDENT]`

Els canals han de:

- estar monitorats;
- generar constància horària;
- tenir suplència;
- evitar que la notificació depengui d'una sola persona;
- estar disponibles també si Avaluapro no funciona.

## 7. Terminis

### Obligació del responsable

Quan una violació pugui comportar risc per als drets i llibertats, el responsable l'ha de notificar a l'APDA sense dilació indeguda i, com a màxim, en 72 hores després de tenir-ne constància.

Si se supera el termini, s'han de justificar els motius del retard.

La informació es pot aportar gradualment si no està disponible de manera simultània. La falta d'informació completa no justifica deixar passar les 72 hores.

### Obligació d'Avaluapro com a encarregada

Avaluapro ha d'informar el responsable sense dilació indeguda.

Objectius contractuals preliminars:

| Fita | Objectiu intern |
| --- | --- |
| Acusar recepció d'una alerta crítica | 1 hora en horari cobert |
| Elevar sospita fundada al responsable | Màxim 24 hores des del coneixement |
| Primera fitxa tècnica | Dins de les primeres 24 hores |
| Actualitzacions | Cada 12-24 hores mentre sigui activa |

El contracte haurà de definir cobertura horària, disponibilitat i canal. El límit intern de 24 hores és un màxim operatiu proposat, no un permís per esperar.

La cobertura i els temps de suport s'han d'alinear amb:

- `docs/procediment-suport-manteniment-preliminar.md`
- `docs/acord-nivell-servei-preliminar.md`

## 8. Quan es considera que hi ha constància

El moment de constància no és necessàriament el moment inicial de l'atac. Comença quan existeix un grau raonable de certesa que s'ha produït una violació de dades personals.

Cal registrar separadament:

- data i hora de l'esdeveniment, si es coneixen;
- data i hora de detecció;
- data i hora de sospita fundada;
- data i hora en què el responsable en té constància;
- data i hora de cada comunicació.

La determinació final del moment que inicia el termini correspon al responsable amb assessorament del DPD.

## 9. Classificació inicial

### Prioritat operativa

| Nivell | Exemple | Actuació |
| --- | --- | --- |
| P1 crítica | Accés actiu a dades de múltiples classes, sociometria exposada o compte administrador compromès | Activació immediata de l'equip |
| P2 alta | Accés indegut limitat, backup enviat incorrectament o pèrdua d'un dispositiu | Activació urgent |
| P3 mitjana | Alteració recuperable o indisponibilitat limitada | Anàlisi el mateix dia |
| P4 baixa | Intent bloquejat o vulnerabilitat sense evidència d'accés | Registrar i investigar |

La prioritat tècnica no substitueix l'avaluació jurídica del risc.

### Factors de risc per a les persones

- menors afectats;
- qualificacions, conducta, salut, orientació o sociometria;
- facilitat d'identificació;
- nombre de persones i registres;
- durada de l'exposició;
- destinatari conegut o públic indeterminat;
- possibilitat de còpia o reutilització;
- xifratge efectiu i disponibilitat de la clau;
- risc d'estigmatització, discriminació, conflicte, frau o dany reputacional;
- facilitat de corregir o contenir;
- efectes acumulats amb altres dades.

## 10. Circuit de resposta

### Fase 1. Detectar i avisar

Qui detecti l'incident ha de:

- deixar d'utilitzar el flux afectat quan sigui segur;
- no esborrar correus, logs, captures o fitxers;
- anotar hora, sistema i acció observada;
- avisar immediatament pel canal urgent;
- no investigar accedint a més dades de les necessàries.

### Fase 2. Obrir el registre

Assignar un codi, per exemple `INC-2026-001`, i registrar:

- alertador;
- cronologia;
- sistemes;
- dades potencialment afectades;
- accions inicials;
- coordinador;
- data límit provisional de 72 hores.

### Fase 3. Contenir

Segons el cas:

- revocar sessions, tokens o membres;
- desactivar enllaços o qüestionaris;
- bloquejar temporalment una funcionalitat;
- corregir Rules o configuracions;
- retirar un fitxer compartit;
- suspendre un compte compromès;
- canviar credencials administratives;
- aïllar un dispositiu;
- aturar una sincronització destructiva;
- preservar una còpia forense abans de modificar.

Les mesures han de ser proporcionades i no han de destruir l'única còpia necessària per recuperar dades.

### Fase 4. Informar el responsable

La notificació inicial d'Avaluapro ha d'incloure, encara que sigui provisional:

- què ha passat;
- quan s'ha detectat;
- sistemes i funcionalitats;
- categories de dades i persones;
- abast estimat;
- si continua actiu;
- mesures adoptades;
- conseqüències possibles;
- informació pendent;
- punt de contacte.

### Fase 5. Investigar

- revisar logs i canvis de configuració;
- delimitar primera i última activitat;
- determinar qui podia accedir;
- identificar lectures, descàrregues, modificacions o pèrdues;
- confirmar si les dades eren intel·ligibles;
- revisar dispositius, backups, espais compartits i proveïdors;
- conservar hashes, captures, exports de logs i cronologia;
- limitar l'accés a les evidències.

### Fase 6. Avaluar risc

El responsable i el DPD han de documentar:

1. conseqüències probables;
2. gravetat potencial;
3. probabilitat que es materialitzin;
4. persones especialment vulnerables;
5. mesures que redueixen el risc;
6. decisió de notificació a l'APDA;
7. decisió de comunicació als afectats.

### Fase 7. Notificar a l'APDA

Quan correspongui, el responsable ha de notificar:

- naturalesa de la violació;
- categories i nombre aproximat de persones;
- categories i nombre aproximat de registres;
- contacte del DPD o punt de contacte;
- conseqüències possibles;
- mesures adoptades o proposades.

S'ha d'utilitzar el formulari vigent de l'APDA. Si la notificació és parcial, s'ha de completar posteriorment segons les indicacions aplicables.

### Fase 8. Comunicar a les persones

Quan la violació pugui comportar un alt risc, el responsable l'ha de comunicar sense dilació indeguda.

La comunicació ha de ser clara, especialment per a menors, i indicar:

- naturalesa de l'incident;
- dades afectades;
- conseqüències possibles;
- mesures adoptades;
- què pot fer la persona;
- contacte del DPD o punt d'ajuda.

No s'ha d'utilitzar llenguatge que culpabilitzi docents, alumnes o famílies.

La comunicació individual pot no ser necessària en els supòsits legals aplicables, per exemple quan mesures efectives facin les dades inintel·ligibles, s'hagi eliminat l'alt risc o exigeixi un esforç desproporcionat. Aquesta decisió correspon al responsable i s'ha de documentar.

### Fase 9. Recuperar

- restaurar dades verificades;
- confirmar integritat;
- comprovar permisos i sincronització;
- vigilar reaparició;
- reobrir el servei gradualment;
- informar els usuaris afectats per l'operativa.

### Fase 10. Tancar i millorar

El tancament ha d'incloure:

- causa arrel;
- cronologia final;
- impacte;
- decisions de notificació;
- còpies de comunicacions;
- mesures correctores;
- responsables i dates;
- proves de no regressió;
- actualització de l'AIPD, RAT, mapa de dades o contractes;
- lliçons apreses sense culpabilització.

## 11. Registre obligatori de violacions

S'han de documentar totes les violacions, incloses les no notificades.

| Camp mínim | Contingut |
| --- | --- |
| Identificador | Codi intern |
| Detecció i constància | Dates i hores |
| Naturalesa | Confidencialitat, integritat o disponibilitat |
| Sistemes | Entorns, serveis i proveïdors |
| Persones i dades | Categories i volum aproximat |
| Fets i causa | Confirmats i pendents |
| Conseqüències | Reals i possibles |
| Contenció | Mesures i responsables |
| Risc | Metodologia, resultat i DPD consultat |
| APDA | Decisió, justificació, data i registre |
| Afectats | Decisió, justificació i comunicació |
| Correcció | Pla, proves i tancament |

El registre ha de tenir accés molt restringit i una conservació definida.

## 12. Preservació d'evidències

- treballar sobre còpies quan sigui possible;
- no editar els fitxers originals;
- registrar origen, data i persona que els recull;
- calcular hash quan sigui adequat;
- exportar logs abans que caduquin;
- preservar configuracions i versions desplegades;
- no incloure més dades personals de les necessàries;
- no guardar secrets en documents generals;
- consultar especialistes abans d'analitzar un dispositiu compromès.

## 13. Accions ràpides per escenari

### Compte docent compromès

- suspendre o revocar sessions;
- coordinar canvi de credencials i MFA;
- revisar classes, cotutories, exports i canvis;
- informar el responsable.

### Permisos de Firestore incorrectes

- valorar bloqueig temporal del servei;
- preservar Rules i versió desplegada;
- desplegar una correcció revisada;
- determinar quines consultes van ser possibles i quines es van produir.

### Qüestionari sociomètric exposat

- tancar qüestionari i invalidar tokens;
- preservar metadades;
- identificar respostes i accessos;
- evitar difusió de relacions o rebuigs;
- prioritzar l'impacte emocional i social en l'avaluació.

### Backup enviat al destinatari equivocat

- demanar eliminació sense revelar més informació;
- revocar l'enllaç si és possible;
- no confiar només en una declaració d'esborrat;
- valorar xifratge, descàrrega i confiança del destinatari.

### Pèrdua o corrupció de dades

- aturar sincronitzacions;
- preservar estat actual;
- identificar una còpia fiable;
- restaurar en entorn controlat;
- verificar integritat abans de producció.

## 14. Comunicacions prohibides sense autorització

Avaluapro no ha de:

- notificar directament l'APDA en nom del responsable sense delegació documentada;
- contactar famílies o alumnes pel seu compte;
- publicar detalls a xarxes o GitHub;
- atribuir públicament responsabilitats;
- confirmar dades afectades a una persona no verificada;
- prometre que no hi ha risc abans de completar l'anàlisi.

Això no impedeix complir una obligació legal pròpia o adoptar contenció tècnica urgent.

## 15. Plantilla d'avís inicial al responsable

```text
Assumpte: [URGENT] Possible violació de dades - INC-AAAA-NNN

Data i hora de detecció:
Data i hora de sospita fundada:
Descripció:
Estat actual:
Sistemes afectats:
Categories de persones:
Categories de dades:
Abast estimat:
Mesures de contenció:
Conseqüències possibles:
Informació pendent:
Pròxima actualització:
Punt de contacte:
```

## 16. Checklist de les primeres 24 hores

- [ ] Obrir registre i cronologia.
- [ ] Activar coordinador i suplent.
- [ ] Contenir sense destruir evidències.
- [ ] Informar el responsable i el DPD.
- [ ] Identificar dades, persones i sistemes.
- [ ] Determinar si l'incident continua actiu.
- [ ] Preservar logs abans que caduquin.
- [ ] Fixar la data límit provisional de 72 hores.
- [ ] Preparar una primera avaluació de risc.
- [ ] Programar la següent actualització.

## 17. Preparació abans d'un pilot institucional

- [ ] Aprovar responsables, suplents i canals 24/7 o cobertura acordada.
- [ ] Incorporar terminis al contracte d'encàrrec.
- [ ] Configurar logs i retenció útil.
- [ ] Disposar d'accés urgent a Firebase i proveïdors.
- [ ] Definir autoritat per bloquejar el servei.
- [ ] Preparar contactes de l'APDA i formulari vigent.
- [ ] Preparar plantilles de comunicació a menors i famílies.
- [ ] Fer un simulacre de permisos incorrectes.
- [ ] Fer un simulacre de backup enviat erròniament.
- [ ] Mesurar temps de detecció, escalat i decisió.
- [ ] Corregir el protocol després dels simulacres.
- [ ] Revisar-lo anualment i després de cada incident rellevant.

## 18. Fonts oficials

- [Llei 29/2021, articles 35, 36 i 37](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: guia de notificacions de violacions de seguretat](https://www.apda.ad/storage/guides/FMdUZM56FAdbxyKVz6hSEeFSjJQSJIUw4Zncrrdb.pdf)
- [APDA: formulari de notificació](https://www.apda.ad/assets/pdf/violacions_de_seguretat/Formulari_de_notificacio_de_violacions_de_seguretat.pdf)
- [APDA: obligacions](https://www.apda.ad/obligacions)
