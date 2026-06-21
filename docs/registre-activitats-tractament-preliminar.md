# Registre d'activitats de tractament preliminar

Data: 20 de juny de 2026
Versió: 0.1
Estat: esborrany de treball; no és el RAT formal del Ministeri

## 1. Capçalera pendent

| Element | Estat |
| --- | --- |
| Responsable del tractament | Pendent de designació formal pel Ministeri. |
| Corresponsables | Pendent de determinar el rol dels centres. |
| DPD | Pendent d'identificar nom i contacte institucional. |
| Encarregat | Futura societat Avaluapro, si és contractada com a prestadora. |
| Subencarregats | Google/Firebase; altres proveïdors pendents d'inventari i autorització. |
| Àmbit territorial | Andorra, amb infraestructura tecnològica subjecta a revisió contractual i de transferències. |

## 2. RAT-01. Identitat i organització acadèmica

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Identificar alumnes, assignar-los a classes i organitzar l'activitat docent. |
| Persones afectades | Alumnes i docents. |
| Dades | Nom, grup, mig grup, identificadors interns, fotografia opcional, docents assignats. |
| Base candidata | Obligació legal o missió d'interès públic. |
| Destinataris | Docents autoritzats, tutors, direcció o orientació segons funcions. |
| Sistemes | IndexedDB, Firestore privat, espais compartits autoritzats i backups. |
| Conservació | Curs acadèmic i període addicional que determini la política institucional. |
| Mesures | Autenticació, permisos per rol, separació per centre i grup, minimització, exportació i supressió. |
| Pendent | Norma educativa concreta, necessitat de la fotografia i política d'històrics. |

## 3. RAT-02. Avaluació competencial

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Registrar evidències i qualificacions per avaluar l'aprenentatge. |
| Persones afectades | Alumnes. |
| Dades | Competències, criteris, rúbriques, qualificacions, adaptacions i estadístiques derivades. |
| Base candidata | Obligació legal o missió d'interès públic. |
| Destinataris | Docents responsables, tutor i òrgans educatius autoritzats. |
| Conservació | Segons normativa acadèmica i separant el quadern de suport de l'expedient oficial. |
| Mesures | Accés per classe i matèria, registre d'enviaments, no duplicar càlculs, còpies controlades. |
| Pendent | Determinar quines dades són oficials i quines són suport temporal del docent. |

## 4. RAT-03. Seguiment de tasques i hàbits

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Fer seguiment de constància, tasques i necessitats d'intervenció educativa. |
| Persones afectades | Alumnes. |
| Dades | Tasques, dates, estats, exempcions, recordatoris i indicadors derivats. |
| Base candidata | Missió d'interès públic vinculada a la funció educativa. |
| Destinataris | Docents i tutor autoritzats. |
| Conservació | Preferentment durant el curs; neteja de registres que ja no aportin valor. |
| Mesures | Fets observables, vocabulari controlat, diferenciació entre absència de dades i resultat negatiu. |
| Pendent | Termini definitiu i ús admès de perfils o alertes. |

## 5. RAT-04. Tutoria, comportament i orientació

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Preparar tutories, equips educatius i intervencions pedagògiques. |
| Persones afectades | Alumnes i, excepcionalment, informació vinculada a famílies. |
| Dades | Incidències, agenda, observacions, DOIPs, acords, antecedents i necessitats educatives. |
| Base candidata | Obligació legal o missió d'interès públic. |
| Categories especials | Pot incloure o revelar dades de salut; exigeix una base addicional de l'article 9.2. |
| Destinataris | Tutor, orientació, direcció i docents legitimats segons necessitat. |
| Conservació | Mínima i diferenciada per tipus de registre; evitar conservar textos lliures indefinidament. |
| Mesures | Avisos de minimització, etiquetes controlades, permisos reforçats i registre d'accessos sensible. |
| Pendent | Base de l'article 9.2, rols exactes, bloqueig i terminis. |

## 6. RAT-05. Sociometria i relacions de grup

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Donar suport a l'acció tutorial i a l'organització segura del grup. |
| Persones afectades | Alumnes. |
| Dades | Identitat de qui respon, eleccions positives, rebuigs, relacions i resultats derivats. |
| Base candidata | Missió d'interès públic només si el responsable acredita necessitat i proporcionalitat. |
| Destinataris | Tutor i docents específicament autoritzats. |
| Conservació | Enllaç 24 hores; dades brutes fins a sincronitzar i màxim provisional de set dies; resultat derivat segons política institucional. |
| Mesures | Token individual, un sol ús, no enumeració, caducitat, informació prèvia i purga. |
| Pendent | Aprovació metodològica, alternativa per a qui no participa, conservació del resultat i purga automàtica. |

## 7. RAT-06. Compartició entre docents

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Traspassar qualificacions i compartir tutories entre professionals autoritzats. |
| Persones afectades | Alumnes i docents. |
| Dades | Notes, identificadors, perfils tutorials, relacions, autoria, membres i invitacions. |
| Base candidata | La mateixa base educativa que habilita la funció i la comunicació interna. |
| Destinataris | Docent destinatari o membres acceptats de la cotutoria. |
| Conservació | Paquets puntuals fins a importació i termini de control; cotutories mentre duri l'assignació. |
| Mesures | Destinatari explícit, propietari, revocació, tombstones, autoria i rules provades. |
| Pendent | Política institucional de baixes, conflictes, auditoria i purga de paquets. |

## 8. RAT-07. Comptes docents i seguretat

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Autenticar usuaris, aplicar permisos i protegir el servei. |
| Persones afectades | Docents, administradors i personal de suport. |
| Dades | UID, correu institucional, nom visible, rols, dates i metadades tècniques necessàries. |
| Base candidata | Missió d'interès públic, obligació de seguretat o execució del servei segons el model. |
| Destinataris | Administradors autoritzats i proveïdors tecnològics. |
| Conservació | Mentre el compte estigui actiu i durant el període necessari per responsabilitats i seguretat. |
| Mesures | Google Authentication, mínim privilegi, revocació, entorns separats i registre d'operacions. |
| Pendent | Procés d'alta/baixa, font oficial de rols i suport administratiu. |

## 9. RAT-08. Backups, exportacions i recuperació

| Camp | Contingut preliminar |
| --- | --- |
| Finalitat | Recuperar dades davant errors, pèrdues o canvi de dispositiu. |
| Persones afectades | Alumnes i docents inclosos en les dades copiades. |
| Dades | Còpia de les col·leccions educatives; s'exclouen tokens i respostes sociomètriques brutes. |
| Base candidata | Necessitat de seguretat i continuïtat del tractament principal. |
| Destinataris | Docent autoritzat i administradors estrictament necessaris. |
| Conservació | Historial limitat; termini institucional pendent. |
| Mesures | Separació per usuari, restauració confirmada, noms clars, exclusió de secrets temporals i eliminació. |
| Pendent | Nombre màxim, periodicitat, xifratge de fitxers manuals i procediment de destrucció. |

## 10. RAT-09. IA educativa futura

Activitat no activada. No s'ha d'incorporar al servei institucional fins que existeixin:

- finalitat concreta;
- dades mínimes d'entrada;
- base jurídica validada;
- proveïdor i contracte;
- prohibició d'entrenament o reutilització no autoritzada;
- política de conservació;
- revisió de transferències;
- intervenció humana;
- actualització de l'AIPD.

## 11. Informació transversal pendent

- [ ] Responsable, corresponsables i DPD.
- [ ] Bases jurídiques i normes sectorials concretes.
- [ ] Excepció de l'article 9.2 per a dades de salut.
- [ ] Països, regions i garanties de transferència.
- [ ] Llista contractual de subencarregats.
- [x] Matriu preliminar de conservació i bloqueig preparada: `docs/politica-conservacio-eliminacio-preliminar.md`; terminis definitius pendents d'aprovació.
- [x] Procediment de drets preliminar preparat: `docs/procediment-exercici-drets-preliminar.md`; pendent d'aprovació i operativa institucional.
- [ ] Registre d'accessos.
- [x] Protocol i registre d'incidències preliminars preparats: `docs/protocol-incidents-violacions-seguretat-preliminar.md`; pendent d'eina, responsables i simulacre.
- [x] Catàleg preliminar de mesures tècniques i organitzatives preparat: `docs/mesures-tecniques-organitzatives-preliminars.md`; pendent d'arquitectura definitiva i verificació.
- [x] Pla preliminar de continuïtat i recuperació preparat: `docs/pla-continuitat-recuperacio-preliminar.md`; pendent de RPO/RTO aprovats i simulacres.
- [ ] Data d'aprovació i responsable de cada revisió del RAT.

## 12. Fonts oficials

- [Article 34 de la LQPD: registre d'activitats](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions i contingut del RAT](https://www.apda.ad/obligacions)
- [APDA: guia per a centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
