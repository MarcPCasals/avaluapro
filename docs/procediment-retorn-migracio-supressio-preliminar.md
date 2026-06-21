# Procediment preliminar de retorn, migració i supressió al final del servei

Data: 21 de juny de 2026
Versió: 0.1
Estat: annex operatiu preliminar; pendent de contracte, formats definitius i prova de migració

> Aquest procediment converteix la reversibilitat en una seqüència verificable. No s'ha d'executar amb dades reals sense instrucció escrita del responsable, responsables assignats i canals segurs.

## 1. Objectiu

Garantir que, en acabar o canviar el servei:

- el responsable recupera les seves dades;
- un nou proveïdor les pot interpretar;
- no es perden supressions, limitacions o context;
- es retiren accessos;
- Avaluapro i els subencarregats eliminen les còpies que ja no poden conservar;
- les excepcions legals queden bloquejades;
- existeix una acta i certificat final.

## 2. Causes d'activació

- finalització ordinària del contracte;
- resolució anticipada;
- canvi d'encarregat;
- internalització del servei;
- migració d'infraestructura;
- canvi de titularitat del projecte;
- tancament o insolvència de l'empresa;
- instrucció del responsable;
- incompliment greu;
- impossibilitat tècnica prolongada.

## 3. Opcions que ha d'escollir el responsable

| Opció | Resultat |
| --- | --- |
| Retorn i supressió | Avaluapro entrega les dades i després elimina les còpies. |
| Transferència directa | Les dades es lliuren a un nou encarregat autoritzat. |
| Migració d'infraestructura | Es traslladen projecte, dades o configuració a l'entorn objectiu. |
| Supressió sense retorn | Només amb instrucció escrita i comprovació que no cal cap lliurament. |
| Bloqueig temporal | Només per obligació legal o responsabilitats, sense ús ordinari. |

La decisió ha d'indicar abast, dates, format, destinatari i excepcions.

## 4. Rols

| Rol | Responsabilitat |
| --- | --- |
| Responsable del tractament `[PENDENT]` | Escollir opció, validar l'abast i acceptar el lliurament. |
| DPD `[PENDENT]` | Revisar dades, excepcions, bloqueig i evidències. |
| Responsable funcional `[PENDENT]` | Validar que l'export és comprensible i complet. |
| Coordinador de sortida d'Avaluapro `[PENDENT]` | Planificar, executar i mantenir el registre. |
| Responsable tècnic `[PENDENT]` | Exportar, verificar, transferir i suprimir. |
| Responsable de seguretat `[PENDENT]` | Aprovar canals, accessos, claus i destrucció. |
| Nou encarregat `[SI ESCAU]` | Rebre, verificar i confirmar importació. |
| Subencarregats | Retornar o suprimir segons instrucció i contracte. |

## 5. Principis

1. Cap dada s'elimina abans que el responsable confirmi el lliurament, tret d'instrucció expressa.
2. No es lliuren secrets, tokens actius o dades d'altres clients.
3. L'export ha de ser estructurat, documentat i verificable.
4. La migració s'ha de provar abans del tall.
5. Les dades temporals caduquen, no es migren automàticament.
6. Les supressions i limitacions pendents formen part de la migració.
7. Les còpies de treball creades durant la sortida tenen data d'expiració.
8. Cada pas ha de tenir responsable, data i evidència.

## 6. Calendari candidat

| Fita | Termini candidat |
| --- | --- |
| Notificació de finalització ordinària | 30 dies abans |
| Reunió i acta d'inici | 5 dies laborables |
| Inventari i abast tancats | 10 dies |
| Export inicial | 15 dies des de la instrucció |
| Importació de prova | 30 dies |
| Correcció de defectes | 15 dies |
| Tall final | Data acordada |
| Acceptació | 5 dies després de verificació |
| Supressió de producció | 15 dies després de l'acceptació |
| Expiració màxima de backups | 90 dies després de la supressió activa |
| Certificat final | 15 dies després de l'última supressió |

Els terminis s'han d'adaptar al volum, contractació pública, risc i infraestructura.

## 7. Fase 0. Preparació contractual

Abans que existeixi una sortida real, el contracte ha d'indicar:

- propietat de dades, domini, projecte i comptes;
- formats;
- costos ordinaris i extraordinaris;
- assistència;
- SLA;
- terminis;
- subencarregats;
- devolució d'actius;
- drets sobre codi i documentació;
- continuïtat si l'empresa tanca;
- auditories;
- responsable de les claus.

No s'ha d'esperar al final del contracte per decidir qui és titular del projecte Firebase.

## 8. Fase 1. Acta d'inici

```text
Cas de sortida:
Responsable:
Contracte:
Causa:
Opció escollida:
Data efectiva:
Entorns:
Categories de dades:
Període:
Destinatari:
Format:
Canal:
Clau i custodi:
Subencarregats:
Excepcions:
Calendari:
Responsables:
```

L'acta ha de prohibir canvis d'abast no aprovats.

## 9. Fase 2. Inventari

Inventariar:

- Firestore privat;
- cotutories;
- paquets de notes;
- invitacions;
- qüestionaris;
- backups;
- IndexedDB institucional gestionable;
- exports sota custòdia de l'empresa;
- logs;
- incidències;
- drets oberts;
- dades bloquejades;
- subencarregats;
- configuracions;
- esquemes i versions.

### Classificació de cada element

| Estat | Acció |
| --- | --- |
| Actiu i necessari | Exportar o transferir |
| Temporal caducat | Suprimir |
| Duplicat | No exportar; registrar eliminació |
| Sotmès a dret o reclamació | Transferir amb marca o bloquejar |
| Secret o credencial | No exportar com a dada; rotar o transferir per canal específic |
| D'un altre client | Excloure |
| Dada derivada regenerable | Exportar només si s'ha acordat |

## 10. Fase 3. Congelació i control de canvis

Abans de l'export final:

- fixar data i hora de tall;
- registrar versió de l'aplicació i esquema;
- limitar canvis no essencials;
- tancar qüestionaris;
- resoldre paquets pendents;
- sincronitzar cotutories;
- registrar supressions pendents;
- evitar nous subencarregats o canvis d'arquitectura;
- crear una còpia de seguretat controlada.

Si el servei continua obert durant la migració, cal un registre incremental de canvis.

## 11. Fase 4. Paquet de sortida

### Estructura candidata

```text
avaluapro-exit-AAAA-MM-DD/
  manifest.json
  README.md
  schema/
  data/
  memberships/
  deletions/
  restrictions/
  checksums/
  reports/
```

### `manifest.json`

Ha d'indicar:

- client;
- data i hora;
- entorn;
- versió;
- categories;
- recomptes;
- format i codificació;
- exclusions;
- errors;
- checksums;
- responsable executor.

### Dades

Format preferent:

- JSON o JSON Lines per dades jeràrquiques;
- CSV només per taules simples;
- UTF-8;
- dates ISO 8601;
- identificadors estables;
- valors de qualificació documentats;
- relacions explícites.

### Documentació

- diccionari de camps;
- claus i relacions;
- valors enumerats;
- significat de tombstones;
- dades derivades;
- limitacions;
- instruccions d'importació.

### Exclusions

- credencials;
- claus privades;
- tokens de sessió;
- tokens sociomètrics;
- respostes temporals caducades;
- secrets de proveïdors;
- dades de tercers o altres clients;
- backups duplicats;
- logs no necessaris.

## 12. Fase 5. Protecció del lliurament

- xifrar el paquet;
- utilitzar canal aprovat;
- enviar la clau per un canal diferent;
- limitar accés i caducitat;
- verificar identitat del destinatari;
- registrar descàrrega;
- evitar correu personal o enllaç públic;
- eliminar còpies temporals locals;
- no incloure noms d'alumnes al nom del fitxer.

## 13. Fase 6. Validació

### Validació tècnica

- checksums correctes;
- recompte per col·lecció;
- cap fitxer buit inesperat;
- esquema llegible;
- dates vàlides;
- relacions resoltes;
- absència de secrets;
- mostra importada.

### Validació funcional

- classes i alumnes;
- qualificacions;
- tasques;
- tutoria;
- membres de cotutories;
- antecedents;
- dades bloquejades o limitades;
- supressions pendents;
- absència de qüestionaris caducats.

### Acceptació

```text
Paquet:
Data de recepció:
Checksums:
Recomptes:
Importació de prova:
Incidències:
Correccions:
Acceptat per:
Data d'acceptació:
Autorització per suprimir:
```

El silenci no ha de considerar-se acceptació, tret que el contracte defineixi un mecanisme formal compatible.

## 14. Fase 7. Tall i transferència

- aturar escriptures;
- fer export incremental final;
- confirmar hora de tall;
- transferir l'últim delta;
- revocar accessos antics;
- activar l'entorn nou;
- validar rols;
- provar funcions prioritàries;
- mantenir retorn enrere durant la finestra acordada;
- comunicar resultat.

No s'ha de mantenir dos entorns actius indefinidament.

## 15. Fase 8. Supressió

### Ordre

1. còpies temporals de migració;
2. entorns de prova;
3. sistemes actius de l'encarregat;
4. comptes i accessos;
5. fitxers i dispositius;
6. subencarregats;
7. backups quan expirin;
8. documentació amb contingut personal no necessària.

### Sistemes a comprovar

- Firestore;
- Authentication;
- Hosting i configuració;
- Storage, si s'activa;
- Cloud Storage de backups o exports;
- GitHub Issues o artefactes;
- suport;
- correu;
- equips;
- carpetes sincronitzades;
- eines d'auditoria;
- proveïdors.

El repositori de codi no hauria de contenir dades reals. Si se'n detecten, cal tractar-ho com una incidència.

## 16. Backups

- identificar totes les polítiques de retenció;
- impedir ús ordinari;
- no restaurar dades ja retornades o suprimides;
- registrar data màxima d'expiració;
- reaplicar supressions si una restauració excepcional és necessària;
- obtenir confirmació del proveïdor quan sigui possible.

La supressió activa pot precedir l'expiració física dels backups si aquests queden protegits i fora d'ús.

## 17. Bloqueig i excepcions

Només es conserven dades després del termini ordinari quan:

- existeix obligació legal;
- hi ha reclamació o incident;
- cal defensar responsabilitats;
- ho ordena una autoritat.

Cada excepció ha d'indicar:

```text
Dada o categoria:
Base:
Abast:
Ubicació:
Accés:
Responsable:
Data de revisió:
Data prevista d'eliminació:
```

No es poden conservar dades educatives “per si de cas”.

## 18. Subencarregats

Per cada subencarregat:

- enviar instrucció;
- identificar entorns i dades;
- obtenir confirmació;
- registrar còpies que encara expiren;
- revocar credencials;
- tancar facturació i comptes;
- conservar evidència.

Si el responsable és titular directe d'un servei, s'ha de transferir l'administració, no eliminar-ne les dades sense instrucció.

## 19. Certificat final

```text
CERTIFICAT DE RETORN I SUPRESSIÓ

Responsable:
Encarregat:
Contracte:
Cas:
Opció executada:
Paquets lliurats:
Data d'acceptació:
Sistemes actius suprimits:
Accessos revocats:
Subencarregats confirmats:
Backups pendents d'expiració:
Data màxima d'expiració:
Dades bloquejades i base:
Incidències:
Persona executora:
Persona revisora:
Data:
Signatura:
```

Si encara hi ha backups pendents, el document és provisional fins a la confirmació final.

## 20. Finalització d'emergència

Si Avaluapro no pot continuar operant:

- activar el pla de continuïtat;
- informar immediatament el responsable;
- congelar canvis no essencials;
- prioritzar export i accés del responsable;
- facilitar documentació, repositori i configuració acordats;
- coordinar proveïdors;
- no retenir dades per disputes econòmiques quan la normativa o el contracte ho impedeixin;
- nomenar un custodi o liquidador tècnic;
- executar supressió posterior.

Abans del pilot cal identificar qui pot actuar si Marc no està disponible.

## 21. Costos

El contracte ha de separar:

- sortida ordinària inclosa;
- migració complexa;
- transformacions especials;
- suport del nou proveïdor;
- conservació extraordinària;
- urgència.

Els costos no han de convertir la reversibilitat en impracticable ni impedir l'exercici de drets.

## 22. Auditoria

El responsable pot sol·licitar:

- inventari;
- recomptes;
- checksums;
- logs de transferència;
- confirmacions de proveïdors;
- evidència de revocació;
- certificat;
- auditoria proporcional.

No s'han de revelar dades d'altres clients o secrets de seguretat.

## 23. Prova abans del pilot

- [ ] Crear entorn fictici complet.
- [ ] Generar paquet de sortida.
- [ ] Importar-lo en una base nova.
- [ ] Comparar recomptes i mostres.
- [ ] Verificar tombstones i supressions.
- [ ] Confirmar que no hi ha tokens.
- [ ] Simular el delta final.
- [ ] Revocar comptes.
- [ ] Suprimir l'entorn origen.
- [ ] Verificar backups pendents.
- [ ] Emetre certificat fictici.
- [ ] Mesurar temps i corregir el procediment.

## 24. Decisions pendents

- [ ] Titularitat dels projectes i comptes.
- [ ] Format definitiu.
- [ ] Canal de transferència.
- [ ] Calendari contractual.
- [ ] Costos.
- [ ] Dades oficials i dades de suport.
- [ ] Tractament de dades bloquejades.
- [ ] Obligacions dels subencarregats.
- [ ] Custodi tècnic en tancament.
- [ ] Criteri d'acceptació.

## 25. Fonts

- [Llei 29/2021, obligacions de l'encarregat i supressió](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: model de contracte d'encarregat](https://www.apda.ad/assets/pdf/models/Model-contracte_encarregat_de_tractament.pdf)
- [APDA: obligacions](https://www.apda.ad/obligacions)
- [Firebase: exportació i importació de Firestore](https://firebase.google.com/docs/firestore/manage-data/export-import)
