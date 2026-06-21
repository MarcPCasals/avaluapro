# Acord de nivell de servei preliminar

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta contractual; no és un SLA vigent

> Els percentatges, horaris i terminis són candidats. No s'han de contractar fins a conèixer el pla de Firebase, la cobertura humana, els costos, els requisits del Ministeri i els resultats dels simulacres.

## 1. Objecte

Definir:

- serveis coberts;
- horari;
- prioritats;
- resposta i actualitzacions;
- disponibilitat;
- manteniment;
- recuperació;
- exclusions;
- mesura i informes;
- conseqüències de l'incompliment.

## 2. Serveis coberts

- aplicació web;
- autenticació integrada;
- dades privades;
- sincronització;
- backups contractats;
- paquets de notes;
- cotutories;
- sociometria, si està activada;
- suport;
- manteniment correctiu i de seguretat.

## 3. Franges de servei

| Element | Proposta |
| --- | --- |
| Horari ordinari | `[PENDENT]` |
| Dies laborables | Calendari d'Andorra `[PENDENT]` |
| Guàrdia P1 | `[PENDENT: inclosa o opcional]` |
| Manteniment | `[PENDENT]` |
| Períodes crítics | Tancaments d'avaluació `[PENDENT]` |

## 4. Objectius de suport candidats

Temps mesurat dins l'horari contractat.

| Prioritat | Acusament | Primera anàlisi | Actualització | Objectiu de restauració o alternativa |
| --- | ---: | ---: | ---: | ---: |
| P1 | 1 hora | 2 hores | Cada 4 hores | 4-8 hores |
| P2 | 4 hores | 1 dia laborable | Diària | 2 dies laborables |
| P3 | 1 dia laborable | 3 dies laborables | Segons acord | 10 dies laborables o versió planificada |
| P4 | 2 dies laborables | Següent planificació | Segons acord | Sense termini garantit |

La correcció definitiva pot requerir més temps que restaurar o oferir una alternativa.

## 5. Incidents de dades

Una sospita fundada:

- s'escala immediatament;
- es notifica al responsable sense dilació;
- té objectiu intern màxim de 24 hores;
- no queda limitada pels terminis ordinaris del tiquet.

## 6. Disponibilitat

### Proposta inicial

Objectiu candidat de disponibilitat mensual de l'aplicació:

`[PENDENT: no fixar abans de validar proveïdor i arquitectura]`

No s'ha de copiar automàticament el SLA comercial d'un proveïdor. L'SLA d'Avaluapro depèn de tota la cadena:

- hosting;
- autenticació;
- Firestore;
- DNS;
- xarxa;
- codi;
- operació.

### Càlcul

```text
Disponibilitat = (minuts del període - indisponibilitat computable)
                 / minuts del període × 100
```

## 7. Indisponibilitat computable

Situació en què els usuaris autoritzats no poden utilitzar una funció essencial per una causa sota responsabilitat contractual d'Avaluapro.

No tota degradació visual equival a indisponibilitat.

## 8. Exclusions candidates

- manteniment avisat;
- força major;
- xarxa o dispositiu del client;
- configuració no autoritzada;
- ús contrari a instruccions;
- serveis del responsable;
- suspensió per protegir dades;
- beta o funcionalitat no contractada.

Una fallada d'un subencarregat no s'ha d'excloure automàticament si Avaluapro n'és contractualment responsable.

## 9. Manteniment

### Planificat

- preavís candidat de 5 dies laborables;
- fora de períodes crítics;
- durada estimada;
- funcions afectades;
- retorn enrere;
- confirmació posterior.

### Urgent

Pot executar-se sense preavís complet per seguretat o integritat. S'ha d'informar tan aviat com sigui possible.

## 10. RPO i RTO

Referència:

`docs/pla-continuitat-recuperacio-preliminar.md`

Els valors contractuals han de coincidir amb backups, personal i proves reals.

## 11. Responsabilitats del client

- mantenir usuaris i rols;
- protegir dispositius;
- comunicar baixes;
- utilitzar canals;
- no compartir comptes;
- conservar dades oficials al sistema corresponent;
- facilitar informació mínima;
- designar interlocutors.

## 12. Comunicacions

Per incidències generals:

- hora d'inici;
- impacte;
- alternativa;
- pròxima actualització;
- resolució;
- causa resumida quan sigui adequada.

## 13. Mesura

Fonts:

- monitoratge;
- logs;
- tiquets;
- estat de proveïdors;
- desplegaments;
- simulacres.

Cal acordar fus horari i tractament de dades incompletes.

## 14. Informe mensual o trimestral

- disponibilitat;
- P1-P4;
- temps de resposta;
- manteniments;
- vulnerabilitats obertes;
- restauracions;
- incidents de seguretat;
- accions correctores.

No inclourà dades d'alumnes.

## 15. Crèdits o conseqüències

Opcions a negociar:

- pla corrector;
- hores de servei;
- crèdit econòmic;
- auditoria;
- dret de resolució per incompliment reiterat.

No s'ha de prometre una penalització abans d'avaluar assegurança, preu i contractació pública.

## 16. Canvis

Qualsevol canvi de:

- arquitectura;
- proveïdor;
- cobertura;
- horari;
- funció essencial;
- RPO/RTO;
- disponibilitat

requereix revisió de l'SLA.

## 17. Pendents

- [ ] Definir serveis contractats.
- [ ] Aprovar horari i guàrdia.
- [ ] Aprovar disponibilitat.
- [ ] Validar objectius amb simulacres.
- [ ] Alinear SLA dels proveïdors.
- [ ] Definir informes.
- [ ] Negociar conseqüències.
- [ ] Revisar assegurança.

## 18. Fonts

- [Firebase: condicions i serveis](https://firebase.google.com/terms)
- [Firebase: SLA publicat per serveis concrets](https://firebase.google.com/terms/service-level-agreement)
- [Firebase Status Dashboard](https://status.firebase.google.com/)
