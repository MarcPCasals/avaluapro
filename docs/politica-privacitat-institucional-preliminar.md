# Política de privacitat institucional preliminar d'Avaluapro

Data: 21 de juny de 2026
Versió: 0.1
Estat: esborrany no publicable fins a completar els camps institucionals i validar-lo jurídicament

> **Advertiment:** no s'ha de publicar aquest text amb camps `[PENDENT]`. Una política incompleta pot desinformar i no compleix el deure de transparència.

## 1. Qui és responsable de les dades?

| Element | Informació |
| --- | --- |
| Responsable del tractament | `[PENDENT: entitat pública o centre competent]` |
| Adreça | `[PENDENT]` |
| Correu de contacte | `[PENDENT]` |
| Delegat de protecció de dades | `[PENDENT]` |
| Contacte del DPD | `[PENDENT]` |
| Encarregat del servei | `[PENDENT: futura societat Avaluapro]` |

El responsable decideix per què i com es tracten les dades. Avaluapro, si és contractada com a prestadora, actuarà seguint les seves instruccions documentades.

## 2. Què és Avaluapro?

Avaluapro és una aplicació de suport docent per:

- avaluació competencial;
- seguiment de tasques i hàbits;
- tutoria i orientació;
- coordinació entre docents;
- sociometria, si s'autoritza;
- grups cooperatius i disposicions d'aula;
- còpies de seguretat i recuperació.

Avaluapro no substitueix necessàriament el sistema acadèmic oficial ni pren decisions automàtiques vinculants sobre l'alumnat.

## 3. De qui tractem dades?

- alumnes;
- docents;
- tutors, cotutors, orientació i direcció;
- administradors;
- representants legals, quan correspongui;
- personal de suport estrictament autoritzat.

## 4. Quines dades podem tractar?

### Dades d'alumnes

- nom, grup i identificadors interns;
- fotografia opcional, si s'autoritza;
- competències, criteris, rúbriques i qualificacions;
- tasques, constància i exempcions;
- incidències i notes d'agenda;
- observacions tutorials;
- necessitats i adaptacions pedagògiques;
- categories especials expressament autoritzades;
- relacions de grup i sociometria;
- antecedents acadèmics mínims;
- agrupaments i disposicions d'aula.

### Dades de docents

- nom;
- correu institucional;
- UID o identificador de compte;
- centre, classes i rols;
- autoria i dates de canvis;
- metadades de seguretat i accés.

No s'han d'introduir dades familiars, mèdiques, econòmiques o personals que no siguin necessàries per a una finalitat educativa autoritzada.

## 5. Per a què s'utilitzen?

| Finalitat | Descripció |
| --- | --- |
| Organització | Assignar alumnes, classes, docents i rols. |
| Avaluació | Registrar i analitzar el progrés competencial. |
| Seguiment | Identificar necessitats d'acompanyament. |
| Tutoria | Preparar reunions, acords i intervencions. |
| Coordinació | Compartir informació necessària entre professionals autoritzats. |
| Sociometria | Comprendre relacions del grup quan estigui justificat i autoritzat. |
| Seguretat | Autenticar, aplicar permisos, prevenir errors i investigar incidents. |
| Continuïtat | Crear backups, restaurar i exportar dades. |

Les dades no s'utilitzaran per:

- publicitat;
- venda;
- entrenament general de models;
- rànquings públics;
- sancions automàtiques;
- finalitats comercials alienes al servei.

## 6. Quina és la base jurídica?

La base jurídica definitiva serà aprovada pel responsable i s'haurà d'indicar per cada finalitat.

| Activitat | Base pendent de confirmació |
| --- | --- |
| Avaluació i organització acadèmica | Obligació legal o missió d'interès públic. |
| Seguiment, tutoria i coordinació | Obligació legal o missió d'interès públic. |
| Seguretat i continuïtat | Necessitat del tractament principal i obligacions de seguretat. |
| Activitats opcionals | `[PENDENT: base específica]` |
| Categories especials | `[PENDENT: base de l'article 6 i excepció de l'article 9.2 de la LQPD]` |

El consentiment no es presenta com a base general del nucli educatiu. Quan una funcionalitat sigui realment opcional i separable, el responsable n'haurà de determinar la base i les conseqüències de no participar.

## 7. D'on provenen les dades?

- del docent;
- de l'alumne en qüestionaris concrets;
- d'altres docents autoritzats;
- d'importacions aprovades;
- de sistemes oficials, si en el futur s'integren;
- de càlculs derivats dels registres base.

Quan les dades no s'obtinguin directament de la persona, s'haurà d'informar de la font o categoria de font quan correspongui.

## 8. Qui pot accedir-hi?

Segons rol i necessitat:

- docent de la matèria;
- tutor o cotutor;
- orientació;
- direcció;
- administradors autoritzats;
- suport tècnic excepcional i auditat;
- proveïdors autoritzats.

No tots els usuaris han d'accedir a totes les dades. L'arquitectura institucional haurà d'aplicar mínim privilegi, separació per centre i grup, i revocació d'accessos.

## 9. Amb qui es comparteixen?

Les dades es poden comunicar:

- a professionals autoritzats de l'organització educativa;
- a proveïdors que actuen com a encarregats o subencarregats;
- a autoritats competents quan existeixi obligació legal;
- a un nou proveïdor durant una migració autoritzada.

La llista preliminar de proveïdors és a `docs/inventari-subencarregats-i-proveidors.md`.

## 10. On es guarden?

Actualment poden existir còpies a:

- navegador del dispositiu, mitjançant IndexedDB;
- Firebase/Google Cloud;
- backups al núvol;
- fitxers exportats pel docent;
- espais compartits autoritzats.

Firestore utilitza actualment la regió `europe-southwest1`. Aquesta regió no determina per si sola la ubicació de tots els serveis, metadades, accessos o subencarregats.

## 11. Transferències internacionals

`[PENDENT DE REVISIÓ CONTRACTUAL]`

Abans de publicar la política cal indicar:

- països o categories de països;
- proveïdors implicats;
- base de la transferència;
- garanties aplicables;
- forma d'obtenir-ne informació.

## 12. Quant temps es conserven?

La matriu completa de terminis candidats és a `docs/politica-conservacio-eliminacio-preliminar.md`.

Els criteris generals són:

- dades de curs només durant el curs i el període de revisió aprovat;
- registres de suport només mentre aportin valor pedagògic;
- sociometria bruta fins a sincronitzar i, provisionalment, un màxim de set dies després de caducar;
- paquets i invitacions només durant el lliurament i verificació;
- comptes només mentre l'usuari estigui autoritzat;
- backups en finestres mòbils limitades;
- bloqueig separat quan existeixin possibles responsabilitats.

Els terminis definitius continuen pendents de validació del responsable, el DPD i la normativa sectorial.

En finalitzar el servei s'aplicarà el procediment acordat de retorn, bloqueig o eliminació.

## 13. Decisions automatitzades i perfils

Avaluapro calcula estadístiques, alertes i propostes pedagògiques.

Aquestes eines:

- són suport per al docent;
- no han de produir per si soles efectes jurídics o decisions equivalents;
- han de ser revisades per una persona;
- poden contenir errors o biaixos;
- s'han de poder explicar i contrastar amb altres evidències.

No hi ha actualment una IA generativa activada.

## 14. Quins drets es poden exercir?

Segons la LQPD i les condicions aplicables:

- accés;
- rectificació;
- supressió;
- limitació;
- oposició;
- portabilitat, quan sigui aplicable;
- no ser objecte de decisions únicament automatitzades;
- reclamació davant l'APDA.

Canal:

`[PENDENT: adreça real del responsable o DPD]`

La sol·licitud pot requerir verificació d'identitat. El responsable informarà si algun dret està limitat per una obligació legal o missió d'interès públic.

## 15. Menors i famílies

La informació s'ha de facilitar amb llenguatge comprensible i adequat a l'edat.

El responsable haurà de definir:

- informació general a famílies;
- informació directa a alumnes;
- participació en activitats opcionals;
- representació legal;
- canals de rectificació;
- protecció davant estigmatització.

## 16. Seguretat

Les mesures inclouen o inclouran:

- autenticació;
- mínim privilegi;
- separació per centre, grup i rol;
- xifratge en trànsit i en repòs;
- proves de permisos;
- backups;
- registre d'operacions sensibles;
- gestió de vulnerabilitats;
- resposta a incidents;
- purga i eliminació;
- formació.

Cap sistema és infal·lible. Les incidències es gestionaran segons el protocol institucional.

## 17. Cookies i emmagatzematge local

Avaluapro utilitza:

- IndexedDB per guardar la còpia local de treball;
- emmagatzematge local per preferències petites;
- mecanismes de Firebase Authentication necessaris per a la sessió.

`[PENDENT: inventari tècnic de cookies i classificació abans de publicar]`

No s'han d'activar cookies publicitàries ni analítica no necessària sense una revisió específica.

## 18. Canvis de la política

La política s'actualitzarà quan canviïn:

- finalitats;
- dades;
- bases jurídiques;
- proveïdors;
- transferències;
- conservació;
- IA;
- arquitectura institucional.

S'indicarà la data i versió. Els canvis materials es comunicaran pels canals aprovats.

## 19. Reclamacions

La persona interessada pot contactar primer amb el responsable o el DPD.

També pot presentar una reclamació davant:

[Agència Andorrana de Protecció de Dades](https://www.apda.ad/)

## 20. Fonts

- [Llei 29/2021, especialment articles 15 a 25](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: guia sobre cookies, política de privadesa i avís legal](https://apda.ad/storage/guides/b090S1LGln1k0StXyghFvQ5SeEdVmk3WrCFlfwU6.pdf)
- [APDA: tractament de dades en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
