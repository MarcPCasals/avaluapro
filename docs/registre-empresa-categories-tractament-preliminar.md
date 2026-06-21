# Registre preliminar de categories i activitats de tractament de l'empresa Avaluapro

Data: 21 de juny de 2026
Versió: 0.1
Estat: esborrany empresarial; pendent de constitució de la societat, contractes i validació jurídica

> Aquest document no és el RAT del Ministeri. Separa les activitats que la futura empresa executaria com a encarregada de tractament de les activitats corporatives en què actuaria com a responsable.

## 1. Finalitat

Preparar el registre que la futura empresa Avaluapro haurà de mantenir per:

- identificar els responsables per compte dels quals tracta dades;
- descriure les categories de serveis i operacions efectuades;
- registrar transferències, subencarregats i mesures;
- documentar els tractaments corporatius propis;
- mantenir historial de canvis;
- posar el registre a disposició de l'APDA quan sigui requerit.

## 2. Capçalera empresarial

| Element | Contingut |
| --- | --- |
| Raó social | `[PENDENT]` |
| Nom comercial | Avaluapro `[PENDENT DE REGISTRE]` |
| NRT | `[PENDENT]` |
| Domicili | `[PENDENT]` |
| Representant | Marc Pérez Casals o qui correspongui |
| Contacte de privacitat | `[PENDENT]` |
| DPD | `[PENDENT DE DETERMINAR SI ÉS OBLIGATORI O CONVENIENT]` |
| Contacte de seguretat | `[PENDENT]` |
| Data d'inici d'activitat | `[PENDENT]` |
| Versió aprovada | `[PENDENT]` |

## 3. Diferència entre els dos blocs

### Bloc A. Empresa com a encarregada

El Ministeri o l'entitat educativa decideix:

- finalitats educatives;
- base jurídica;
- persones afectades;
- categories autoritzades;
- rols;
- conservació;
- drets.

Avaluapro executa operacions tècniques seguint instruccions.

### Bloc B. Empresa com a responsable

La societat decideix les finalitats i mitjans essencials de:

- gestió de clients i contractes;
- facturació;
- personal;
- proveïdors;
- comunicacions comercials pròpies, si n'hi hagués;
- seguretat corporativa;
- consultes i suport no vinculats al contingut educatiu.

Les dades educatives no s'han d'incorporar als tractaments corporatius propis.

---

# Bloc A. Registre de categories com a encarregada

## 4. Responsables per compte dels quals s'actua

Cal obrir una fitxa per cada client responsable.

| Camp | Contingut |
| --- | --- |
| Identificador intern | `CLI-AAAA-NNN` |
| Responsable | `[PENDENT: Ministeri, centre o entitat]` |
| Adreça i contacte | `[PENDENT]` |
| DPD | `[PENDENT]` |
| Representant | `[PENDENT]` |
| Contracte principal | `[PENDENT]` |
| Contracte d'encàrrec | `[PENDENT]` |
| Data d'inici i final | `[PENDENT]` |
| Entorns | `[PENDENT]` |
| Subencarregats autoritzats | `[PENDENT]` |
| Transferències | `[PENDENT]` |
| Estat | Precontractual / actiu / sortida / tancat |

No s'ha de donar d'alta un client institucional sense aquesta fitxa i les instruccions mínimes.

## 5. CAT-E01. Allotjament, emmagatzematge i sincronització

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Allotjar i sincronitzar dades educatives dins Avaluapro. |
| Operacions | Recollida tècnica, registre, estructuració, consulta, modificació, sincronització, còpia i supressió. |
| Persones afectades | Alumnes, docents i personal autoritzat. |
| Categories | Identitat, grup, qualificacions, tasques, tutoria, orientació, relacions, fotografies opcionals i configuració. |
| Categories especials | Només les expressament autoritzades; poden existir dades de salut o necessitats educatives. |
| Sistemes | IndexedDB, Firestore, Hosting i backups aprovats. |
| Subencarregats | Google/Firebase o infraestructura definitiva autoritzada. |
| Transferències | `[PENDENT DE REVISIÓ CONTRACTUAL]` |
| Conservació | Segons instruccions i política institucional. |
| Mesures | `docs/mesures-tecniques-organitzatives-preliminars.md` |

## 6. CAT-E02. Comptes, autenticació i permisos

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Autenticar usuaris i aplicar rols i accessos. |
| Operacions | Alta tècnica, autenticació, consulta d'identitat, assignació, canvi, revocació i registre. |
| Persones afectades | Docents, administradors i suport. |
| Categories | UID, nom, correu, centre, rols, membres, dates i metadades de sessió. |
| Categories especials | No previstes. |
| Sistemes | Firebase Authentication, Firestore i identitat institucional. |
| Subencarregats | Google/Firebase; servei d'identitat controlat pel responsable, si escau. |
| Conservació | Mentre existeixi autorització i període de responsabilitat aprovat. |
| Mesures | Compte individual, mínim privilegi, MFA administratiu, revisió i baixa. |

## 7. CAT-E03. Backups, restauració i continuïtat

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Crear, conservar temporalment i restaurar còpies. |
| Operacions | Còpia, emmagatzematge, verificació, restauració, exportació i eliminació. |
| Persones afectades | Persones incloses en les dades copiades. |
| Categories | Dades educatives actives i metadades de backup. |
| Exclusions | Tokens i respostes sociomètriques brutes; secrets i credencials. |
| Sistemes | Backups d'Avaluapro, backups institucionals i exports autoritzats. |
| Conservació | Finestra aprovada; terminis candidats a la política de conservació. |
| Mesures | Xifratge, accés restringit, proves, retenció i reaplicació de supressions. |

## 8. CAT-E04. Compartició entre docents

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Paquets de notes, invitacions i cotutories. |
| Operacions | Enviament, recepció, consulta, importació, edició compartida, revocació i eliminació. |
| Persones afectades | Alumnes i docents. |
| Categories | Identificadors, qualificacions, tutoria, relacions, autoria, membres i estats. |
| Sistemes | `teacherGradePackages`, `tutoringSpaces` i safates d'invitacions. |
| Conservació | Fins a importació, fi de l'assignació o termini aprovat. |
| Mesures | Destinatari explícit, propietari, cotutor, revocació, tombstones i proves de rules. |

## 9. CAT-E05. Sociometria

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Recollir temporalment respostes sociomètriques i sincronitzar resultats. |
| Operacions | Generació de token, consulta temporal, recollida, sincronització i purga. |
| Persones afectades | Alumnes. |
| Categories | Identitat, eleccions positives, dificultats de relació i resultats derivats. |
| Sensibilitat | Molt alta. |
| Sistemes | `sociometricSurveys`, `accessTokens`, `responses` i dades tutorials derivades. |
| Conservació | Enllaç 24 hores; dades brutes fins a sincronització i límit provisional de set dies. |
| Mesures | Token aleatori individual, un sol ús, no enumeració, informació prèvia, tancament i purga. |
| Activació | Només amb aprovació metodològica i jurídica del responsable. |

## 10. CAT-E06. Suport tècnic

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Diagnosticar i resoldre incidències. |
| Operacions | Recepció de consulta, diagnòstic, accés excepcional, correcció i documentació. |
| Persones afectades | Docents i, excepcionalment, alumnes inclosos en evidències. |
| Categories | Identitat docent, metadades, errors i contingut educatiu només si és imprescindible. |
| Regla | Diagnòstic sense dades, captures anonimitzades i dades fictícies per defecte. |
| Accés excepcional | Temporal, autoritzat, supervisat i registrat. |
| Conservació | Fins a tancament i responsabilitats; adjunts sensibles s'han d'eliminar abans. |
| Sistemes | Eina de suport `[PENDENT]`, correu institucional i registres de seguretat. |

Procediment de referència: `docs/procediment-suport-manteniment-preliminar.md`.

## 11. CAT-E07. Seguretat, monitoratge i incidents

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Detectar accessos, errors i violacions; investigar i recuperar. |
| Operacions | Registre, consulta, correlació, preservació, bloqueig i comunicació. |
| Persones afectades | Usuaris, administradors i persones afectades per una incidència. |
| Categories | UID, correu, IP si està disponible, dates, accions, dispositiu i metadades. |
| Minimització | No registrar textos educatius complets ni secrets. |
| Conservació | Termini tècnic i jurídic aprovat. |
| Mesures | Logs protegits, alertes, accés restringit i protocol d'incidents. |

Política de vulnerabilitats: `docs/politica-vulnerabilitats-actualitzacions-preliminar.md`.

## 12. CAT-E08. Assistència en drets, AIPD i auditories

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Ajudar el responsable a complir obligacions. |
| Operacions | Cerca, exportació, rectificació, limitació, supressió, evidència i resposta tècnica. |
| Persones afectades | Sol·licitants i persones incloses en les dades. |
| Categories | Les necessàries per identificar i executar el cas. |
| Conservació | Durant la tramitació i responsabilitats; contingut mínim al registre. |
| Mesures | Cas identificat, instrucció documentada, doble verificació i resposta segura. |

## 13. CAT-E09. Migració, retorn i finalització

| Camp | Contingut preliminar |
| --- | --- |
| Servei | Exportar, transferir, validar i eliminar dades al final del servei. |
| Operacions | Inventari, còpia, transformació, transferència, verificació, tall, supressió i certificació. |
| Persones afectades | Totes les incloses en l'entorn del client. |
| Categories | Dades del servei, esquema, metadades i registre de supressions. |
| Exclusions | Secrets, tokens actius i dades alienes al client. |
| Conservació | Només durant la finestra contractual de sortida. |
| Mesures | Xifratge, checksum, canal segur, acceptació i certificat final. |

## 14. CAT-E10. IA educativa futura

Estat: **no activa i no autoritzada**.

No s'incorporarà al registre com a categoria operativa activa fins que existeixin:

- instrucció del responsable;
- finalitat i dades mínimes;
- base jurídica;
- nova AIPD;
- proveïdor autoritzat;
- contracte;
- retenció i entrenament definits;
- intervenció humana.

## 15. Transferències internacionals

Per cada responsable i categoria cal registrar:

| Camp | Contingut |
| --- | --- |
| País o organització | `[PENDENT]` |
| Proveïdor | `[PENDENT]` |
| Servei i dades | `[PENDENT]` |
| Base o garantia | `[PENDENT]` |
| Mesures complementàries | `[PENDENT]` |
| Document contractual | `[PENDENT]` |
| Data de revisió | `[PENDENT]` |

Utilitzar una regió europea no resol per si sol tots els accessos o subencarregats.

## 16. Mesures generals

Referència:

`docs/mesures-tecniques-organitzatives-preliminars.md`

Per cada contracte s'ha de conservar la versió de les mesures aplicable durant el període corresponent.

## 17. Subencarregats

Referència:

`docs/inventari-subencarregats-i-proveidors.md`

El registre ha d'indicar:

- autorització;
- data d'alta;
- servei;
- dades;
- ubicació;
- transferències;
- data de baixa;
- confirmació de supressió.

---

# Bloc B. Activitats pròpies de l'empresa com a responsable

## 18. RAT-P01. Clients, contractació i relació institucional

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Gestionar propostes, contractes, contactes i relació amb clients. |
| Persones | Interlocutors, representants i personal tècnic o administratiu. |
| Dades | Nom, càrrec, entitat, contacte, comunicacions i decisions contractuals. |
| Base candidata | Mesures precontractuals, contracte, obligació legal o interès legítim. |
| Destinataris | Gestoria, assessorament, administracions i proveïdors autoritzats. |
| Conservació | Relació activa i terminis legals o de responsabilitat. |
| Mesures | Accés limitat, correu corporatiu, arxiu ordenat i eliminació. |

No s'hi han d'adjuntar backups o dades d'alumnes.

## 19. RAT-P02. Facturació, comptabilitat i fiscalitat

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Emetre factures, cobrar, comptabilitzar i complir obligacions. |
| Persones | Clients, proveïdors, representants i professionals. |
| Dades | Identificació, NRT, adreça, factures, bancàries i operacions. |
| Base candidata | Obligació legal i execució contractual. |
| Destinataris | Bancs, gestoria, auditors i administracions competents. |
| Conservació | Segons normativa fiscal, mercantil i de responsabilitats aplicable. |
| Mesures | Accés restringit, còpies, segregació i canal segur. |

## 20. RAT-P03. Personal, col·laboradors i selecció

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Selecció, contractació, nòmines, prevenció i gestió laboral. |
| Persones | Candidats, personal i col·laboradors. |
| Dades | Identitat, contacte, CV, contracte, bancàries, laborals i formació. |
| Categories especials | Només les exigides o necessàries per obligacions laborals. |
| Base candidata | Contracte, obligació legal i mesures precontractuals. |
| Destinataris | Gestoria, seguretat social, bancs i administracions. |
| Conservació | Segons normativa laboral i de responsabilitats; CV no seleccionats amb termini curt. |
| Mesures | Expedient separat, confidencialitat i baixa immediata d'accessos. |

## 21. RAT-P04. Proveïdors i professionals

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Seleccionar, contractar, pagar i avaluar proveïdors. |
| Persones | Autònoms, representants i contactes. |
| Dades | Identitat, contacte, contracte, facturació i avaluació. |
| Base candidata | Contracte, obligació legal i interès legítim. |
| Conservació | Relació activa i terminis legals. |
| Mesures | Accés limitat, contractes i revisió periòdica. |

## 22. RAT-P05. Consultes, suport i reclamacions corporatives

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Atendre consultes comercials, incidències i reclamacions. |
| Persones | Usuaris, contactes i reclamants. |
| Dades | Identitat, contacte, missatge, dates i resposta. |
| Base candidata | Contracte, interès legítim o obligació legal segons el cas. |
| Conservació | Fins al tancament i període de responsabilitat. |
| Mesures | Minimització, verificació i separació del contingut educatiu. |

Si una consulta conté dades educatives, s'ha de traslladar al circuit d'encàrrec i no reutilitzar-la per a finalitats corporatives.

## 23. RAT-P06. Seguretat corporativa

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Protegir comptes, sistemes, repositoris i instal·lacions. |
| Persones | Personal, col·laboradors, usuaris i tercers relacionats amb una alerta. |
| Dades | Comptes, accessos, IP, dispositiu, dates i accions tècniques. |
| Base candidata | Obligació de seguretat i interès legítim. |
| Conservació | Termini proporcional, incidents i responsabilitats. |
| Mesures | MFA, logs, alertes, accés restringit i protocol d'incidents. |

## 24. RAT-P07. Web, comunicació i analítica

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Publicar informació, respondre contactes i mesurar el servei si s'autoritza. |
| Persones | Visitants i contactes. |
| Dades | Dades tècniques mínimes i formularis de contacte. |
| Analítica | No activada actualment com a tractament propi identificable. |
| Cookies | Inventari i base pendents abans d'activar analítica no necessària. |
| Conservació | Termini curt i agregació quan sigui possible. |
| Mesures | Minimització, configuració protectora i informació. |

## 25. RAT-P08. Propietat intel·lectual i defensa jurídica

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Registrar i defensar marca, codi, contractes i drets. |
| Persones | Autors, titulars, representants i parts de reclamacions. |
| Dades | Identitat, autoria, contractes, registres i comunicacions. |
| Base candidata | Obligació legal, contracte i interès legítim. |
| Conservació | Vida dels drets i terminis de responsabilitat aplicables. |
| Mesures | Accés restringit, integritat documental i còpies. |

## 26. Prohibicions de reutilització

La futura empresa no utilitzarà dades educatives del servei per:

- màrqueting propi;
- perfils comercials;
- venda;
- entrenament general de models;
- demos;
- casos d'èxit identificables;
- desenvolupament amb dades reals;
- estadístiques identificables entre clients.

Per millorar el producte s'han d'utilitzar:

- dades fictícies;
- telemetria tècnica mínima autoritzada;
- resultats realment anonimitzats;
- feedback voluntari sense dades d'alumnes.

## 27. Registre de canvis

| Versió | Data | Canvi | Responsable | DPD informat |
| --- | --- | --- | --- | --- |
| 0.1 | 21/06/2026 | Esborrany inicial | Marc Pérez Casals | No designat |

Qualsevol alta, modificació o baixa s'ha de comunicar al DPD quan existeixi.

## 28. Revisió

- abans de signar un nou contracte;
- abans d'afegir un subencarregat;
- abans d'una nova categoria de dades;
- abans d'IA;
- després d'un incident;
- anualment.

## 29. Punts pendents

- [ ] Constituir i identificar la societat.
- [ ] Determinar si cal designar DPD.
- [ ] Donar d'alta cada responsable-client.
- [ ] Aprovar bases i terminis dels tractaments propis.
- [ ] Completar transferències.
- [ ] Aprovar subencarregats.
- [ ] Implantar logs i mesures.
- [ ] Definir l'eina de suport.
- [ ] Registrar les versions i revisions.

## 30. Fonts

- [Llei 29/2021, article 34: registre d'activitats](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions i RAT](https://www.apda.ad/obligacions)
- [APDA: model de RAT](https://www.apda.ad/assets/pdf/models/003_C9_Model-RAT-versi%C3%B3_feb_25.pdf)
- [APDA: model de contracte d'encarregat](https://www.apda.ad/assets/pdf/models/Model-contracte_encarregat_de_tractament.pdf)
