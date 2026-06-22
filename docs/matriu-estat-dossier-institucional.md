# Matriu d'estat del dossier institucional d'Avaluapro

Data: 21 de juny de 2026
Objectiu: distingir evidencia existent, proves locals, desplegament, validacio real i decisions externes

## Llegenda

| Estat | Significat |
| --- | --- |
| Implementat | Existeix al codi o al servei actual. |
| Provat localment | Hi ha prova automatitzada o verificacio local, no prova real completa. |
| Pendent de desplegament | El canvi existeix al repositori pero no esta publicat. |
| Pendent de prova real | Requereix comptes, dispositius o escenaris reals amb dades ficticies. |
| Pendent institucional | Requereix decisio o aprovacio del Ministeri. |
| Pendent extern | Requereix assessorament, contracte, auditoria o proveidor. |

## Matriu

| Area | Evidencia principal | Estat | Bloqueig abans d'un pilot institucional | Proxima accio |
| --- | --- | --- | --- | --- |
| Dades privades | `users/{uid}` i `firestore.rules` | Implementat | Verificar configuracio desplegada i prova amb segon compte. | Fer prova d'aillament real. |
| Paquets de notes | Regles i flux d'importacio | Implementat; prova real pendent | Enviament, recepcio i destinatari equivocat. | Provar amb dos comptes ficticis. |
| Membres de cotutoria | Propietari, acceptacio i sortida | Desplegat i provat localment | Prova real de revocacio. | Provar amb dos comptes. |
| Subcol.leccions compartides | Llista tancada de deu col.leccions | Desplegat i auditat | Mantenir proves davant canvis. | Revisio continua. |
| Eliminacions compartides | Tombstones i bloqueig de `delete` | Provat localment | Conflictes simultanis i propagacio entre dispositius. | Prova amb dos comptes. |
| Sociometria | Token individual, avís i 24 hores | Desplegat i provat | Neteja de tres qüestionaris antics inaccessibles i prova ficticia del flux nou. | Completar neteja i prova real controlada. |
| Purga sociometrica | Politica provisional | Pendent | No hi ha eliminacio automatica en set dies. | Implementar backend programat abans del pilot. |
| Backups | Local, nuvol i restauracio | Implementat; prova real pendent | Restauracio, retencio i eliminacio verificades. | Fer prova completa i registrar resultat. |
| Minimitzacio | Avisos i documents de criteri | Implementat parcialment | Revisar camps oberts i categories especialment sensibles. | Prova de regressio i revisio pedagogica. |
| Conservacio | Politica preliminar | Documentat | Terminis sense aprovacio ni automatitzacio. | Decisio del Ministeri i implantacio. |
| Drets | Procediment preliminar | Documentat | Responsable, canal, terminis i execucio tecnica final. | Validacio institucional i simulacre. |
| Incidents | Protocol preliminar | Documentat | Contactes, rols i registre real no aprovats. | Assignar responsables i fer exercici. |
| Identitats docents | Procediment d'alta, rol i baixa | Documentat | Font oficial, substitucions i baixa real. | Acordar model amb el Ministeri. |
| Administradors | Govern IAM i accessos excepcionals | Documentat; no implantat | MFA, doble control, logs i compte d'emergencia. | Implantar en l'entorn institucional. |
| Entorns | Desenvolupament i produccio actuals | Pendent | No hi ha separacio completa de proves i produccio. | Crear projectes i dades ficticies separats. |
| App Check | Pla d'activacio | Ajornat | Validacio Safari/iPad i entorn estable. | Pilot tecnic abans d'obligar-lo. |
| Fotos | Compressio actual i pla Storage | Parcial | Escalabilitat, retencio i regles definitives. | Decidir despres dels requisits institucionals. |
| RAT i rols | Esborranys institucionals | Documentat | Responsable, bases i terminis no confirmats. | Revisio del DPD o assessor. |
| AIPD | Cribratge i AIPD preliminar | Documentat | Aprovacio professional i mesures residuals. | Revisio abans de dades reals. |
| Contracte | Esborrany d'encarrec | Documentat | Parts, instruccions, auditories i responsabilitats. | Negociacio juridica. |
| Proveidors | Inventari de subencarregats | Documentat | Condicions, ubicacions i acceptacio de Firebase. | Verificacio contractual. |
| Continuitat | Pla, RPO/RTO i reversibilitat preliminars | Documentat | Capacitat operativa i compromisos no validats. | Prova de recuperacio i acord de servei. |
| Suport | Procediment i SLA preliminars | Documentat | Equip, horaris i recursos encara inexistents. | Dimensionar amb el model de contractacio. |
| Empresa | Full de ruta i registre preliminar | Pendent extern | Forma societaria, fiscalitat, assegurances i contractacio. | Gestoria andorrana quan hi hagi interès escrit. |
| Marca i autoria | Historial Git i proposta OMPA | Parcial | Cerca de marca, titularitat i estrategia de registre. | Consulta OMPA; no assumir patentabilitat. |
| IA | Principis de minimitzacio | Ajornada | Proveidor, contracte, AIPD, retencio i supervisio. | No incloure-la al primer pilot. |

## Bloquejos tecnics immediats

1. eliminar els tres qüestionaris antics que continuen inaccessibles;
2. provar el flux nou amb dades ficticies;
3. provar amb dos comptes i almenys un iPad;
4. verificar conflictes, revocacio i restauracio;
5. registrar incidencies i resultats.

## Bloquejos institucionals

1. model de contractacio i necessitat de societat;
2. responsable, encarregat i rols dels docents;
3. acceptacio de Firebase/Google Cloud;
4. propietat i administracio de la infraestructura;
5. bases juridiques, dades permeses i terminis;
6. AIPD i contracte d'encarrec;
7. condicions d'un pilot limitat.

## Criteri de sortida

El dossier es pot enviar per obtenir decisions. No s'ha de presentar com una certificacio de conformitat ni com una autoritzacio per introduir dades reals.
