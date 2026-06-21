# Rols i bases jurídiques preliminars d'Avaluapro

Data: 20 de juny de 2026
Estat: anàlisi preliminar; requereix validació del Ministeri, del centre i del seu DPD

## 1. Per què cal separar els escenaris

El rol jurídic no depèn de qui ha programat l'aplicació, sinó de qui decideix les finalitats i els mitjans essencials del tractament.

Avaluapro té actualment dos escenaris diferents:

1. **Ús personal actual del docent:** Marc decideix com utilitza l'eina dins la seva activitat docent.
2. **Servei institucional futur:** el Ministeri o el centre autoritza l'eina, determina les finalitats educatives, els usuaris, les dades permeses, la conservació i els drets.

No s'han de barrejar contractualment ni documentalment.

## 2. Model recomanat per a l'ús institucional

| Actor | Rol provisional recomanat | Responsabilitat principal |
| --- | --- | --- |
| Ministeri o entitat educativa competent | Responsable del tractament | Decideix finalitats, base jurídica, col·lectius, dades, rols, conservació i drets. |
| Centre educatiu | Responsable, corresponsable o unitat sota l'autoritat del Ministeri | Depèn del model organitzatiu i de qui tingui capacitat real de decisió. Ho ha de determinar el Ministeri. |
| Docents, tutors, orientació i direcció | Persones autoritzades | Tracten dades dins les seves funcions i permisos, no com a encarregats independents. |
| Futura empresa Avaluapro | Encarregada del tractament | Presta el servei seguint instruccions documentades del responsable. |
| Google/Firebase | Subencarregat tecnològic | Allotjament, autenticació i base de dades segons el servei contractat. |
| Proveïdor d'IA futur | Subencarregat addicional | Només si tracta dades personals per compte del responsable i està autoritzat contractualment. |

La futura empresa no hauria d'utilitzar les dades educatives per a finalitats pròpies, publicitat, entrenament general de models o analítica comercial identificable. Si decidís finalitats pròpies, podria passar a ser responsable per aquells tractaments.

## 3. Situació actual

En l'ús personal actual no hi ha encara un contracte institucional que assigni formalment els rols. Per prudència:

- no s'ha de presentar Google com a únic responsable de la legalitat;
- Marc no ha d'assumir que l'autenticació institucional equival a una autorització del tractament;
- el centre o el Ministeri ha de confirmar si l'eina està autoritzada i sota quines instruccions;
- les funcionalitats compartides i sociomètriques no s'han de considerar institucionalment validades.

## 4. Bases jurídiques provisionals

La LQPD exigeix una base jurídica per a cada finalitat. La base l'ha de determinar el responsable i mantenir-la durant tot el cicle de vida.

| Activitat | Base principal candidata | Decisió pendent |
| --- | --- | --- |
| Avaluació acadèmica i seguiment necessari | Obligació legal o missió d'interès públic, article 6.1.c o 6.1.e | Identificar la norma educativa concreta i el responsable competent. |
| Tutoria i orientació educativa | Missió d'interès públic o obligació legal | Delimitar quines observacions són necessàries i quins perfils hi accedeixen. |
| Gestió d'usuaris docents i seguretat | Missió d'interès públic, obligació legal o necessitat contractual segons el model | Definir el model de servei i la relació laboral/administrativa dels usuaris. |
| Cotutoria i enviament de notes | Mateixa base que la funció educativa que justifica la comunicació | Confirmar destinataris, atribucions i registre de les comunicacions. |
| Sociometria | Missió d'interès públic només si és necessària, proporcionada i forma part de la funció tutorial autoritzada | Validar finalitat, metodologia, informació als alumnes, conservació i alternatives. |
| Fotografies d'alumnes dins el quadern | Base educativa si són realment necessàries; si són opcionals, cal una anàlisi separada | No assumir automàticament consentiment ni necessitat. Mantenir-les opcionals. |
| Analítica tècnica de seguretat | Interès legítim o necessitat del servei, segons qui decideixi el tractament | Limitar-la a dades tècniques mínimes i documentar-la separadament. |
| IA educativa futura | La mateixa base de la finalitat educativa original, si és compatible, més contracte i garanties específiques | Fer una nova anàlisi de necessitat, proporcionalitat i impacte abans d'activar-la. |

## 5. Categories especials de dades

Les etiquetes com TDAH, TEA, dislèxia o altres diagnòstics poden revelar dades de salut. No n'hi ha prou amb una base de l'article 6: també cal identificar una excepció aplicable de l'article 9.2 de la LQPD.

Abans d'un pilot institucional s'ha de decidir:

- si Avaluapro necessita realment conservar diagnòstics;
- si es poden substituir per necessitats o adaptacions pedagògiques;
- quina norma o excepció de l'article 9.2 n'habilita el tractament;
- quins perfils hi poden accedir;
- quin termini de conservació s'aplica;
- si cal separar-les tècnicament de la resta de dades.

Fins que això no estigui validat, la recomanació és minimitzar aquestes dades i evitar informació clínica detallada.

## 6. Per què el consentiment no ha de ser la base general

El consentiment no és la base recomanada per al nucli d'Avaluapro:

- l'avaluació i la tutoria formen part de la funció educativa;
- pot existir desequilibri entre administració, centre, docent, família i alumne;
- retirar el consentiment no hauria de deixar sense base activitats educatives necessàries;
- la participació no sempre és realment lliure.

El consentiment només s'hauria d'estudiar per a finalitats opcionals i separables. La casella del qüestionari sociomètric acredita lectura de la informació, no consentiment.

## 7. Contracte d'encàrrec

Si la futura empresa presta Avaluapro al Ministeri, cal un contracte escrit que reguli, com a mínim:

- objecte, durada, naturalesa i finalitat;
- categories de dades i persones afectades;
- instruccions documentades;
- confidencialitat del personal autoritzat;
- mesures de seguretat;
- assistència en drets, incidències i AIPD;
- autorització i llista de subencarregats;
- ubicació i transferències internacionals;
- retorn, bloqueig o destrucció al final del servei;
- auditories i evidències de compliment.

## 8. Decisions que ha de prendre el Ministeri

- [ ] Identificar formalment el responsable del tractament.
- [ ] Determinar el rol dels centres.
- [ ] Identificar el DPD i el canal de contacte.
- [ ] Aprovar la base jurídica de cada activitat.
- [ ] Identificar la base de l'article 9.2 per a dades de salut.
- [x] Preparar terminis candidats de conservació: `docs/politica-conservacio-eliminacio-preliminar.md`.
- [ ] Aprovar institucionalment els terminis de conservació i bloqueig.
- [ ] Aprovar la llista de subencarregats.
- [ ] Decidir si el projecte de núvol serà del Ministeri o del proveïdor.
- [ ] Aprovar el contracte d'encàrrec.

## 9. Fonts oficials

- [Llei 29/2021, qualificada de protecció de dades personals](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions, RAT, DPD i AIPD](https://www.apda.ad/obligacions)
- [APDA: tractament de dades personals en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
