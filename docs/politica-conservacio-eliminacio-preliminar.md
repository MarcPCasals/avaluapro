# Política preliminar de conservació, bloqueig i eliminació

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta institucional; pendent d'aprovació del responsable, el DPD i assessorament jurídic

> Els terminis d'aquest document són criteris i objectius proposats per evitar una conservació indefinida. No són terminis oficials del Ministeri ni substitueixen la normativa educativa, administrativa, d'arxiu o de responsabilitats que resulti aplicable.

## 1. Objectiu

Definir el cicle de vida de les dades tractades mitjançant Avaluapro:

1. recollida;
2. ús actiu;
3. revisió;
4. tancament de curs o finalitat;
5. retorn, resum o transferència;
6. bloqueig quan correspongui;
7. eliminació segura;
8. acreditació de l'actuació.

La política vol evitar:

- històrics indefinits en un quadern docent;
- dades duplicades entre dispositius, Firestore i backups;
- accés després d'un canvi de docent o funció;
- conservació de sociometria o observacions sensibles sense utilitat actual;
- backups que contradiguin una supressió;
- confondre Avaluapro amb l'expedient acadèmic oficial.

## 2. Principis

### Necessitat

Cada dada es conserva només mentre serveixi per a una finalitat educativa, de seguretat o de responsabilitat definida.

### Diferenciació

Cal separar:

- dades oficials que una norma obliga a conservar;
- dades de suport temporal del docent;
- dades tècniques de seguretat;
- còpies de recuperació;
- dades bloquejades per possibles responsabilitats.

### Revisió, no acumulació

El canvi de curs no justifica copiar automàticament tot l'històric. S'ha de seleccionar el context mínim necessari.

### Eliminació completa per capes

Una eliminació ha de considerar:

- IndexedDB i emmagatzematge local;
- Firestore privat;
- espais compartits;
- paquets i invitacions;
- qüestionaris;
- backups al núvol;
- fitxers exportats sota control institucional;
- dispositius gestionats;
- proveïdors i subencarregats.

### Responsabilitat demostrable

El responsable ha de poder demostrar:

- criteri aplicat;
- data de revisió;
- dades eliminades o bloquejades;
- excepcions;
- persona que ho autoritza i executa.

## 3. Responsabilitats

| Actor | Responsabilitat |
| --- | --- |
| Responsable del tractament `[PENDENT]` | Aprovar terminis, excepcions, bloqueig i destrucció. |
| DPD `[PENDENT]` | Assessorar, supervisar i revisar riscos. |
| Responsable funcional o centre `[PENDENT]` | Distingir dades oficials i dades de suport, i validar necessitats pedagògiques. |
| Docent | Revisar, resumir i eliminar dades segons les instruccions institucionals. |
| Empresa Avaluapro | Implementar controls, executar instruccions i acreditar operacions tècniques. |
| Administració de sistemes `[PENDENT]` | Gestionar comptes, dispositius, logs, backups i destrucció. |
| Proveïdors | Aplicar supressió o expiració segons contracte. |

Avaluapro no decidirà unilateralment terminis legals del sistema educatiu.

## 4. Estats del cicle de vida

### Activa

Dada necessària i accessible per a la feina ordinària.

### En revisió

Dada que s'ha de validar, resumir, transferir o eliminar en tancar una finalitat.

### Limitada

Dada conservada però amb ús temporalment restringit, per exemple mentre es comprova l'exactitud.

### Bloquejada

Dada identificada i reservada, sense ús ni visualització ordinària, disponible només per a òrgans competents i possibles responsabilitats durant el termini aplicable.

El bloqueig no és:

- un arxiu pedagògic;
- una manera de continuar consultant la dada;
- una excusa per conservar-la indefinidament.

### Eliminada

Dada retirada dels sistemes actius i sotmesa a l'expiració definida de backups. La destrucció ha d'impedir una recuperació ordinària.

### Anonimitzada

Dada transformada de manera irreversible perquè ningú no pugui tornar a identificar la persona amb mitjans raonables. Eliminar el nom o substituir-lo per un codi reversible no és anonimitzar.

## 5. Regla general proposada

Avaluapro ha de funcionar com a espai de treball del curs actual, no com a arxiu acadèmic permanent.

Com a criteri inicial:

- revisar totes les dades al final de cada curs;
- transferir al sistema oficial només allò que hi hagi de constar;
- conservar a Avaluapro únicament un resum mínim justificat per iniciar el curs següent;
- eliminar el detall del curs anterior després d'un període breu de verificació;
- no conservar cap categoria indefinidament perquè sigui tècnicament possible.

## 6. Matriu preliminar de conservació

Els terminis següents són **propostes per validar**.

| Categoria | Període actiu proposat | Tancament proposat | Destí final | Estat tècnic actual |
| --- | --- | --- | --- | --- |
| Identitat, classe i perfil bàsic | Mentre el docent tingui l'alumne assignat | Revisió en canvi de curs o docent; marge màxim candidat de 3 mesos | Eliminar o conservar només l'antecedent mínim autoritzat | Eliminació manual disponible; flux institucional pendent |
| Qualificacions i rúbriques de treball | Curs actual i període de revisió acadèmica | Transferir o verificar amb el sistema oficial; màxim candidat de 3 mesos després del tancament | Eliminar el detall no oficial o bloquejar si existeix obligació | No hi ha purga automàtica per curs |
| Tasques i registres de constància | Curs actual | Resumir si aporten context; màxim candidat de 3 mesos | Eliminar detall | Neteja manual parcial per data |
| Conducta, agenda i incidències | Mentre siguin necessàries per a la intervenció del curs | Revisió obligatòria en cada tancament; màxim candidat de 3 mesos | Eliminar o conservar un resum objectiu justificat | Eliminació i revisió encara insuficients |
| Observacions tutorials i DOIPs | Mentre existeixi la finalitat tutorial | Revisar registre per registre; màxim candidat de 3 mesos després del curs, excepte instrucció legal | Transferir resum necessari o eliminar | Sense purga automàtica |
| Diagnòstics i necessitats educatives | Mentre siguin necessaris i el docent estigui autoritzat | Validació almenys anual i en cada canvi d'assignació | Actualitzar, eliminar o transferir només l'adaptació necessària | Revisió manual |
| Fotos | Curs actual i mentre siguin útils | Eliminar en canvi d'alumnat o si deixen de ser necessàries; marge candidat de 30 dies | Eliminar de dades actives i backups en expirar | Eliminació manual; Storage no implantat |
| Sociometria bruta, tokens i enllaços | Enllaç durant 24 hores; resposta fins a sincronització | Eliminar immediatament després de sincronitzar; límit màxim provisional de 7 dies després de caducar | Destruir | Eliminació manual disponible; purga programada implementada i provada, pendent de desplegament i activació |
| Resultat sociomètric derivat | Mentre sostingui una intervenció tutorial concreta | Revisió al final de la intervenció i del curs; màxim candidat de 3 mesos | Eliminar; no traspassar automàticament al curs següent | Revisió manual |
| Grups cooperatius i disposicions | Mentre la versió sigui vigent | Eliminar propostes descartades; versions utilitzades fins al final del curs | Eliminar | Històric manual, sense purga |
| Antecedent acadèmic resumit | Curs següent, si és necessari | Revisió anual | Substituir pel resum més recent o eliminar | Funció existent; termini no automatitzat |
| Paquets de notes entre docents | Fins a importació i verificació | Candidat: 30 dies després d'importar; paquets no importats, màxim 90 dies | Eliminar | Eliminació automàtica pendent |
| Invitacions de cotutoria | Fins a acceptació, rebuig o caducitat | Candidat: 30 dies després de resoldre; pendents, màxim 30 dies | Eliminar metadades no necessàries | Caducitat i purga pendents |
| Dades d'una cotutoria compartida | Mentre duri l'assignació | Revocar immediatament la baixa; tancar l'espai en acabar; marge candidat de 30 dies per verificar exportació | Retornar, transferir o eliminar | Revocació local implementada; prova real i tancament pendents |
| Tombstones de sincronització | Mentre siguin necessaris per propagar l'eliminació | Candidat: 90 dies després de confirmar sincronització de membres | Purgar | Purga automàtica pendent |
| Backups automàtics al núvol | Recuperació d'errors recents | Objectiu candidat: finestra mòbil de 30 dies | Sobreescriure o eliminar | Es creen; no hi ha retenció automàtica garantida |
| Backups manuals al núvol | Fins a verificar la finalitat concreta | Candidat: 90 dies, sense arxiu indefinit | Eliminar | Eliminació/expiració a completar |
| Fitxers JSON descarregats | Només durant migració, recuperació o lliurament | Eliminar tan aviat com es verifiqui l'operació; màxim candidat de 30 dies | Destrucció segura del dispositiu i còpies | Fora del control directe de l'app |
| Compte i perfil docent | Mentre estigui autoritzat | Revocació immediata; candidat de 30 dies per retornar dades | Eliminar o bloquejar metadades justificades | Procés centralitzat pendent |
| Logs operatius i de seguretat | Per detectar errors i accessos | Candidat general de 12 mesos, reduïble segons necessitat | Eliminar o anonimitzar | Logging institucional pendent |
| Registre d'incidents | Durant gestió i responsabilitats | Segons termini jurídic aprovat | Bloquejar i eliminar en prescriure | Registre documental preparat |
| Registre d'exercici de drets | Durant tramitació i responsabilitats | Segons termini jurídic aprovat | Bloquejar i eliminar en prescriure | Procediment preparat; eina pendent |
| Evidències de consentiment, si s'utilitza | Mentre duri el tractament i responsabilitats | Segons base i prescripció aplicable | Bloquejar i eliminar en prescriure | Model institucional pendent |
| Dades enviades a IA futura | Només durant la petició autoritzada | Preferència: retenció nul·la pel proveïdor | Eliminar immediatament | IA no activada |

## 7. Dades oficials i quadern docent

Abans d'aprovar terminis, el Ministeri ha de classificar cada categoria:

| Classificació | Tractament |
| --- | --- |
| Expedient o document oficial | Conservar segons la norma sectorial i, preferentment, en el sistema oficial. |
| Evidència temporal de treball | Eliminar en completar la finalitat i el període de revisió. |
| Resum pedagògic per continuïtat | Conservar només el mínim i revisar anualment. |
| Dada sensible d'intervenció | Termini curt, accés reforçat i eliminació en acabar la necessitat. |
| Configuració o dada tècnica | Conservar mentre el compte o servei estigui actiu. |

Si Clickedu o un altre sistema és l'expedient oficial, Avaluapro no ha de duplicar-ne indefinidament el contingut.

## 8. Procediment de tancament de curs

### Abans del tancament

- confirmar que les qualificacions necessàries consten al sistema oficial;
- resoldre paquets pendents;
- sincronitzar cotutories;
- tancar i purgar qüestionaris sociomètrics;
- revisar incidències, observacions, diagnòstics i DOIPs;
- identificar dades subjectes a una reclamació o revisió oberta.

### Preparar continuïtat

- crear només els antecedents mínims necessaris;
- evitar traspassar sociogrames, incidències completes i textos tutorials llargs;
- documentar qui autoritza el traspàs;
- no utilitzar un backup complet com a antecedent ordinari.

### Verificació

- generar una exportació només si és necessària i està autoritzada;
- comprovar que es pot obrir;
- registrar ubicació, custodi i data d'eliminació;
- no crear múltiples còpies “per si de cas”.

### Tancament

- retirar accessos de docents que canvien de funció;
- tancar espais compartits;
- eliminar el detall que ja no sigui necessari;
- iniciar el període de verificació aprovat;
- programar la purga final.

### Certificació

El registre de tancament ha d'indicar:

```text
Curs i centre:
Classes afectades:
Responsable:
Data de tancament:
Dades transferides al sistema oficial:
Antecedents mínims conservats:
Espais compartits tancats:
Backups creats i data d'expiració:
Dades eliminades:
Dades bloquejades i motiu:
Excepcions:
Data prevista de purga final:
Persona executora:
Persona revisora:
```

## 9. Canvi, substitució o baixa d'un docent

En perdre la funció que legitimava l'accés:

1. revocar accés i sessions sense esperar el tancament ordinari;
2. retirar-lo de cotutories;
3. impedir noves sincronitzacions;
4. identificar dades locals al dispositiu;
5. retornar o transferir la informació necessària;
6. eliminar còpies personals i exports;
7. conservar només metadades bloquejades quan siguin necessàries;
8. registrar l'actuació.

Una baixa d'accés no elimina automàticament les còpies locals ja descarregades. El model institucional necessita gestió de dispositius, instruccions i comprovació.

## 10. Backups

### Principi

Un backup serveix per recuperar un sistema, no per crear un arxiu paral·lel.

### Requisits

- finestra mòbil limitada;
- inventari i data d'expiració;
- accés restringit;
- restauració provada;
- eliminació automàtica quan sigui possible;
- exclusió de tokens, secrets i respostes sociomètriques brutes;
- protecció dels exports manuals;
- documentació de dades suprimides que encara puguin existir temporalment en còpies.

### Supressió i backups

Quan una dada s'ha de suprimir:

- s'elimina dels sistemes actius;
- no es restaura deliberadament des d'un backup;
- queda fora d'ús ordinari dins les còpies fins que expirin;
- si es restaura una còpia per una incidència, s'han de tornar a aplicar les supressions registrades;
- una còpia no pot prolongar indefinidament la conservació.

## 11. Bloqueig

Quan la LQPD exigeixi bloquejar després d'una rectificació o supressió:

- la dada s'ha d'identificar i separar;
- no ha d'aparèixer a les pantalles docents;
- no s'ha d'utilitzar per estadístiques, decisions o sincronització;
- l'accés queda limitat als supòsits legals;
- s'ha d'associar a una data de revisió i eliminació final.

### Limitació tècnica actual

Avaluapro no disposa encara d'un magatzem institucional de bloqueig amb permisos i terminis propis. Abans d'un pilot cal decidir si:

1. el responsable gestiona el bloqueig en un sistema institucional separat; o
2. Avaluapro implementa un repositori segregat, auditat i no visible als docents.

Marcar una dada com a “inactiva” dins la mateixa interfície no és necessàriament un bloqueig legal suficient.

## 12. Eliminació segura

### Sistemes actius

- esborrat lògic immediat quan cal propagar-lo;
- confirmació entre dispositius i espais compartits;
- purga física posterior;
- comprovació que la dada no reapareix per sincronització.

### Dispositius i fitxers

- eliminar fitxers i buidar paperera;
- eliminar còpies de carpetes sincronitzades;
- aplicar xifratge i gestió remota als dispositius institucionals;
- destruir o esborrar de manera segura dispositius retirats;
- evitar memòries USB no gestionades.

### Paper

Qualsevol impressió o anotació derivada s'ha de destruir de manera que la informació sigui irrecuperable.

### Proveïdors

Cal obtenir:

- terminis de supressió;
- cicle de backups;
- confirmació contractual;
- certificat quan sigui necessari;
- tractament en acabar el contracte.

## 13. Excepcions

Una dada no s'elimina en la data ordinària quan:

- existeix una obligació legal concreta;
- hi ha una reclamació, revisió o incident obert;
- s'ha d'exercir o defensar una responsabilitat;
- una autoritat n'ordena la conservació;
- s'aplica una finalitat d'arxiu públic autoritzada.

Cada excepció ha de tenir:

- base;
- abast;
- responsable;
- accés;
- data de revisió;
- destí final.

No és una excepció vàlida:

- “potser algun dia serà útil”;
- “Firebase té espai”;
- “sempre ho hem guardat”;
- “és dins d'un backup”.

## 14. Finalització del contracte o del servei

El procediment operatiu de referència és:

`docs/procediment-retorn-migracio-supressio-preliminar.md`

El responsable ha d'escollir per escrit:

- retorn de dades;
- transferència a un nou encarregat;
- eliminació;
- bloqueig temporal justificat.

Proposta de calendari contractual:

| Fita | Termini candidat |
| --- | --- |
| Exportació inicial | 15 dies des de la instrucció |
| Verificació del responsable | 30 dies |
| Supressió dels sistemes actius | 15 dies després de l'acceptació |
| Expiració màxima de backups | 90 dies després de la supressió activa |
| Certificat de supressió | 15 dies després de completar-la |

Aquest calendari s'ha de negociar i adaptar al volum, la infraestructura i les obligacions legals.

## 15. Registre de conservació i purga

Cada procés periòdic ha de deixar:

| Camp | Contingut |
| --- | --- |
| Operació | Revisió, transferència, bloqueig, eliminació o anonimització |
| Categoria | Tipus de dades |
| Abast | Centre, curs, classe, usuari o sistema |
| Criteri | Termini o esdeveniment aplicat |
| Volum | Nombre aproximat de registres |
| Resultat | Complet, parcial o fallit |
| Excepcions | Casos i motius |
| Evidència | Log, informe o certificat |
| Responsable | Autoritza, executa i revisa |
| Dates | Execució i revisió següent |

El registre no ha de copiar el contingut eliminat.

## 16. Automatització necessària

Abans d'un desplegament institucional, cal implementar:

- caducitat i purga de qüestionaris;
- retenció limitada de backups;
- expiració de paquets i invitacions;
- tancament de cotutories;
- purga de tombstones confirmats;
- recordatori i assistent de final de curs;
- eliminació per classe, alumne i compte;
- propagació de supressions;
- exportació i registre d'operacions;
- mecanisme de bloqueig o integració amb el sistema institucional;
- alertes de purgues fallides.

Cap procés crític de purga ha de dependre exclusivament que un docent torni a obrir el navegador.

## 17. Calendari de revisió

| Revisió | Freqüència proposada |
| --- | --- |
| Necessitat de dades actives | Trimestral i final de curs |
| Diagnòstics i dades sensibles | Almenys anual i en canvi de docent |
| Qüestionaris temporals | Diària i automàtica |
| Paquets i invitacions | Setmanal i automàtica |
| Backups | Mensual |
| Comptes i rols | Immediata en canvis i revisió trimestral |
| Política completa | Anual i després de canvis o incidents |

## 18. Decisions pendents del Ministeri

- [ ] Identificar quines dades d'Avaluapro són oficials.
- [ ] Indicar les normes sectorials de conservació.
- [ ] Aprovar terminis per categoria.
- [ ] Fixar terminis de prescripció per al bloqueig.
- [ ] Decidir el sistema oficial d'arxiu.
- [ ] Aprovar el resum d'antecedents.
- [ ] Decidir qui autoritza i certifica cada tancament.
- [ ] Definir dispositius i carpetes permesos per a exports.
- [ ] Aprovar el calendari de finalització contractual.
- [ ] Decidir l'arquitectura tècnica de bloqueig.

## 19. Controls abans del pilot

- [ ] Validació jurídica i del DPD.
- [ ] Matriu de terminis aprovada.
- [ ] Terminis incorporats al RAT i a la informació de privacitat.
- [ ] Contractes alineats amb backups i subencarregats.
- [ ] Purga automàtica de dades temporals.
- [ ] Retenció automàtica de backups.
- [ ] Prova de tancament de curs amb dades fictícies.
- [ ] Prova de baixa d'un docent.
- [ ] Prova de supressió propagada a una cotutoria.
- [ ] Prova de restauració que reaplica supressions.
- [ ] Registre i evidències de purga.

## 20. Fonts oficials

- [Llei 29/2021, principis, transparència, supressió i bloqueig](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: tractament de dades personals en centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
- [APDA: guia d'avaluació d'impacte](https://www.apda.ad/storage/guides/fUCPtAfCs3M44wkQGA9ug4XEUWhRuvtCyMVXnkdJ.pdf)
- [APDA: obligacions](https://www.apda.ad/obligacions)
