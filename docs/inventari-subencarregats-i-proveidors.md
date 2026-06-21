# Inventari preliminar de subencarregats i proveïdors

Data de revisió: 20 de juny de 2026
Versió: 0.1
Estat: inventari tècnic preliminar; pendent de contractes, titularitat institucional i revisió de transferències

## 1. Criteri

No tot proveïdor és automàticament un subencarregat.

Es considera candidat a subencarregat quan tracta dades personals per compte de la futura empresa Avaluapro en la prestació del servei al responsable.

Cal diferenciar:

- **subencarregat actiu:** tracta dades del servei;
- **proveïdor tècnic sense contingut educatiu:** presta infraestructura de desenvolupament o publicació, però no hauria de rebre dades d'alumnes;
- **proveïdor condicional:** només serà subencarregat si s'activa una funcionalitat o flux;
- **proveïdor independent:** tracta dades per finalitats pròpies o sota una relació directa amb el responsable.

## 2. Inventari resum

| Proveïdor | Servei | Estat preliminar | Dades potencials | Decisió pendent |
| --- | --- | --- | --- | --- |
| Google / Firebase | Authentication, Firestore i Hosting | Subencarregat actiu en el model SaaS | Comptes docents, dades educatives i metadades | Contracte, entitat, subencarregats, transferències i propietat del projecte |
| GitHub | Repositori, Actions i Pages | Proveïdor tècnic; no ha de contenir dades educatives | Codi, commits, comptes i logs tècnics | Compte empresarial, DPA aplicable i evitar secrets/dades reals |
| Google Workspace institucional | Identitat i correu `educand.ad` | Relació probablement directa amb el Ministeri | Identitat docent i correu | Confirmar si forma part de l'encàrrec o és infraestructura del responsable |
| Navegador i dispositiu | IndexedDB i descàrregues | Mitjà sota control de l'usuari o centre | Còpia local i fitxers JSON | Política de dispositius, xifratge i MDM |
| Andorra Telecom | Possible hosting, backup o connectivitat | Condicional; no contractat | Depèn del servei | Oferta, rol, ubicació, SLA i contracte |
| Proveïdor d'IA | Anàlisi educativa futura | Condicional; prohibit fins a aprovació | Dades pseudonimitzades i text filtrat | Selecció, contracte, retenció, entrenament i AIPD |
| Proveïdor de domini | DNS i domini futur | Condicional | Dades de compte i logs; no contingut educatiu | Titularitat i contracte |
| Gestoria, assessor o auditor | Serveis professionals | Condicional | Dades corporatives i eventual informació d'incidents | Confidencialitat i minimització |
| Eina de suport o incidències | Suport futur | Condicional | Identitat docent i contingut només si s'adjunta | Selecció i configuració sense dades d'alumnes |

## 3. Google / Firebase

### Serveis actuals

- Firebase Authentication;
- Cloud Firestore;
- Firebase Hosting;
- eines administratives de Firebase.

No consten actius al producte:

- Firebase Storage;
- Cloud Functions;
- Crashlytics;
- Analytics com a flux funcional de dades educatives;
- serveis generatius.

### Dades

- UID i correu docent;
- noms, grups i dades educatives;
- qualificacions, seguiment i tutoria;
- sociometria;
- backups;
- metadades tècniques.

### Ubicació coneguda

Firestore actual:

`europe-southwest1`

Aquesta dada no permet concloure per si sola que tot el tractament, suport, metadades o subencarregats quedin exclusivament en aquesta regió.

### Condicions oficials

Google publica:

- Firebase Data Processing and Security Terms;
- Standard Contractual Clauses;
- llista de Firebase Subprocessors;
- informació de seguretat i certificacions.

Les condicions indiquen que Google actua generalment com a processador de les dades del client i que també contempla clients que actuen com a processadors, amb autorització del responsable per nomenar Google i els seus subencarregats.

### Pendent

- [ ] Determinar quina entitat contractual de Google presta cada servei.
- [ ] Confirmar que les condicions cobreixen la LQPD i el model encarregat-subencarregat.
- [ ] Descarregar o conservar la versió contractual aplicable.
- [ ] Revisar la llista actual de subencarregats.
- [ ] Revisar accessos i transferències fora d'Andorra.
- [ ] Decidir si el projecte Firebase serà del Ministeri.
- [ ] Configurar compte de pagament i suport institucional.
- [ ] Activar logs, alertes i controls addicionals necessaris.

### Fonts

- [Firebase Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms)
- [Firebase Subprocessors](https://firebase.google.com/terms/subprocessors)
- [Firebase Standard Contractual Clauses](https://firebase.google.com/terms/firebase-sccs)
- [Privacy and Security in Firebase](https://firebase.google.com/support/privacy)

## 4. GitHub

### Ús actual

- repositori de codi;
- historial Git;
- GitHub Actions;
- GitHub Pages;
- gestió tècnica del projecte.

### Criteri de minimització

GitHub no ha de contenir:

- bases de dades;
- exports JSON reals;
- captures amb alumnes;
- claus privades;
- logs amb dades educatives;
- incidències amb contingut identificable.

Si només tracta codi i logs tècnics, no és el subencarregat principal del contingut educatiu. Pot continuar tractant dades personals dels desenvolupadors i metadades sota les seves pròpies condicions.

### Pendent

- [ ] Decidir compte personal, organització o Enterprise.
- [ ] Revisar si el DPA de GitHub aplica al pla escollit.
- [ ] Revisar la llista de subencarregats.
- [ ] Separar secrets de desenvolupament i producció.
- [ ] Revisar Actions i artefactes.
- [ ] Evitar publicar mapes de codi o fitxers amb secrets.
- [ ] Determinar si GitHub Pages continuarà en l'entorn institucional.

### Fonts

- [GitHub Data Protection Agreement](https://github.com/customer-terms/github-data-protection-agreement)
- [GitHub Subprocessors](https://docs.github.com/en/site-policy/privacy-policies/github-subprocessors)
- [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-privacy-statement)

## 5. Google Workspace o identitat institucional

El compte `educand.ad` s'utilitza per autenticar docents.

Cal determinar:

- qui administra el directori;
- si l'autenticació és un servei directe del Ministeri;
- quins atributs es faciliten;
- com es fa l'alta i baixa;
- si es poden exigir MFA i polítiques de sessió;
- si Avaluapro ha d'acceptar només dominis institucionals;
- si alumnes utilitzaran comptes o tokens.

Si el Ministeri contracta i controla directament aquest servei, pot no formar part de la cadena de subencàrrec d'Avaluapro.

## 6. Dispositius i navegadors

IndexedDB guarda una còpia local al dispositiu.

No és una entitat jurídica subencarregada, però és una ubicació de risc que exigeix:

- dispositiu xifrat;
- bloqueig;
- actualitzacions;
- separació d'usuaris;
- política de descàrregues;
- esborrat remot o MDM quan sigui possible;
- procediment de pèrdua o robatori;
- baixa de sessions.

## 7. Andorra Telecom

No és actualment proveïdor d'Avaluapro.

Abans d'incloure'l com a partner o subencarregat cal una proposta concreta que indiqui:

- servei;
- arquitectura;
- ubicació;
- administració;
- backups;
- SLA;
- suport;
- certificacions;
- preu;
- contracte d'encàrrec;
- subencarregats;
- reversibilitat.

El simple allotjament a Andorra no garanteix per si sol una arquitectura més segura o un compliment complet.

## 8. Proveïdor d'IA futur

Estat:

**No seleccionat i no autoritzat.**

Requisits mínims:

- dades sense identificadors directes;
- identificador temporal;
- filtratge de text lliure;
- cap diagnòstic clínic per defecte;
- prohibició d'entrenament general;
- retenció nul·la o mínima;
- ubicació i transferències documentades;
- contracte de subencàrrec;
- llista de subencarregats;
- intervenció humana;
- nova AIPD;
- possibilitat de desactivar-lo.

## 9. Procediment d'alta d'un proveïdor

1. descriure el servei;
2. determinar si tractarà dades personals;
3. classificar el rol;
4. identificar dades, persones i ubicacions;
5. revisar contracte, DPA i subencarregats;
6. revisar seguretat i certificacions;
7. revisar transferències;
8. valorar alternatives;
9. obtenir autorització;
10. actualitzar RAT, AIPD, contracte i informació;
11. configurar minimització;
12. provar;
13. registrar data i responsable.

## 10. Procediment de canvi

Per a un nou subencarregat:

- notificar amb l'antelació contractual;
- facilitar identitat, servei, ubicació i garanties;
- permetre objecció;
- resoldre objeccions fundades;
- no activar-lo abans del termini;
- conservar evidència de l'autorització.

## 11. Procediment de baixa

- aplicar `docs/procediment-retorn-migracio-supressio-preliminar.md`;
- exportar o migrar dades;
- revocar credencials;
- eliminar dades i còpies;
- obtenir confirmació;
- revisar logs i secrets;
- actualitzar documents;
- informar quan correspongui;
- provar que el servei continua o queda tancat.

## 12. Registre de revisions

| Data | Proveïdor | Canvi revisat | Responsable | Resultat |
| --- | --- | --- | --- | --- |
| 20/06/2026 | Inventari inicial | Creació | Marc Pérez Casals | Pendent de validació institucional |

## 13. Decisions pendents del Ministeri

- [ ] Autorització general o específica de subencarregats.
- [ ] Termini de notificació de canvis.
- [ ] Propietat dels comptes i projectes.
- [ ] Proveïdors homologats.
- [ ] Requisits territorials.
- [ ] Garanties de transferència.
- [ ] Requisits d'auditoria i certificació.
- [ ] Proveïdor de suport i incidències.
- [ ] Acceptació de Google/Firebase.
- [ ] Paper d'Andorra Telecom.
