# Procediment preliminar de suport i manteniment

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta operativa; pendent de canals, equip, cobertura, eina i contracte

## 1. Objectiu

Definir com Avaluapro:

- rep consultes;
- classifica incidències;
- protegeix dades durant el diagnòstic;
- escala problemes;
- informa l'usuari;
- aplica correccions;
- documenta i tanca casos;
- planifica manteniment.

## 2. Abast

Inclou:

- accés i autenticació;
- sincronització;
- backups i restauració;
- dades privades;
- paquets de notes;
- cotutories;
- sociometria;
- errors funcionals;
- rendiment;
- desplegaments;
- consultes d'ús;
- manteniment preventiu.

No inclou:

- assessorament pedagògic;
- decisió sobre qualificacions;
- administració del dispositiu del centre, tret de contracte;
- incidències de serveis aliens fora de la capacitat d'Avaluapro.

## 3. Canals

| Canal | Ús |
| --- | --- |
| Portal o correu de suport `[PENDENT]` | Casos ordinaris |
| Canal urgent `[PENDENT]` | P1 i possibles violacions |
| Estat del servei `[PENDENT]` | Incidències generals |
| Canal del DPD `[PENDENT]` | Drets i privacitat |

No s'han d'enviar dades d'alumnes a l'assumpte ni a canals personals.

## 4. Horari candidat

Suport ordinari:

`[PENDENT: dies laborables i franja horària d'Andorra]`

Fora d'horari:

- registre automàtic del cas;
- atenció urgent només si s'ha contractat guàrdia;
- cap expectativa 24/7 implícita.

## 5. Prioritats

| Prioritat | Criteri |
| --- | --- |
| P1 crítica | Exposició activa, pèrdua extensa, accés general bloquejat o corrupció greu |
| P2 alta | Funció essencial bloquejada per diversos usuaris, sense alternativa raonable |
| P3 mitjana | Error limitat amb alternativa o afectació individual |
| P4 baixa | Consulta, millora, defecte visual o funció no essencial |

La prioritat pot pujar si afecta menors, dades sensibles o períodes d'avaluació.

## 6. Informació mínima del cas

```text
Identificador:
Data i hora:
Centre:
Usuari:
URL:
Funció:
Descripció:
Impacte:
Usuaris afectats:
Missatge d'error:
Passos:
Alternativa disponible:
Dades personals adjuntes:
Autorització:
```

Cal evitar captures completes i backups.

## 7. Circuit

1. registrar i acusar recepció;
2. verificar identitat;
3. classificar prioritat i possible incident;
4. demanar només informació mínima;
5. reproduir amb dades fictícies;
6. escalar si cal;
7. comunicar diagnòstic i següent actualització;
8. corregir i provar;
9. desplegar segons control de canvis;
10. confirmar amb l'usuari;
11. eliminar adjunts sensibles;
12. tancar i documentar.

## 8. Escalat

| Situació | Circuit |
| --- | --- |
| Possible violació | Protocol d'incidents |
| Vulnerabilitat | Política de vulnerabilitats |
| Pèrdua o corrupció | Pla de continuïtat |
| Dret d'una persona | Procediment de drets |
| Proveïdor extern | Obrir cas i conservar referència |
| Error pedagògic o dada factual | Responsable funcional |

## 9. Accés excepcional

Només després d'esgotar alternatives.

Requereix:

- autorització escrita;
- abast exacte;
- durada;
- compte individual;
- MFA;
- registre;
- prohibició de còpia;
- revocació;
- informe.

## 10. Tractament d'adjunts

- preferir dades fictícies;
- anonimitzar captures;
- xifrar fitxers;
- caducar enllaços;
- restringir descàrrega;
- eliminar després del tancament;
- no reutilitzar per proves.

## 11. Manteniment preventiu

- revisar dependències;
- revisar alertes;
- provar backups;
- revisar dominis i comptes;
- revisar rules;
- revisar costos i quotes;
- comprovar certificats i domini;
- revisar logs i purgues;
- actualitzar documentació.

## 12. Manteniment planificat

Requereix:

- motiu;
- risc;
- entorn de prova;
- pla de proves;
- retorn enrere;
- finestra;
- avís;
- responsable;
- verificació posterior.

Finestra candidata:

`[PENDENT]`

## 13. Canvis urgents

Es poden accelerar per:

- vulnerabilitat crítica;
- pèrdua de dades;
- exposició;
- indisponibilitat greu.

No s'ometen:

- còpia o punt de retorn;
- revisió mínima;
- prova;
- registre;
- comunicació posterior.

## 14. Tancament

Un cas es tanca quan:

- la causa està resolta o acceptada;
- l'usuari ha estat informat;
- les dades adjuntes s'han eliminat;
- les accions pendents tenen responsable;
- s'ha valorat actualitzar documentació, tests o AIPD.

## 15. Indicadors

- casos per prioritat;
- temps de resposta;
- temps de resolució;
- reobertures;
- incidències de dades;
- casos amb adjunts sensibles;
- canvis urgents;
- problemes recurrents;
- compliment d'objectius.

No s'han d'utilitzar per culpabilitzar usuaris.

## 16. Pendents

- [ ] Escollir eina de suport.
- [ ] Definir canals i cobertura.
- [ ] Assignar titulars i suplents.
- [ ] Aprovar prioritats.
- [ ] Preparar plantilles.
- [ ] Configurar eliminació d'adjunts.
- [ ] Fer simulacre P1.
- [ ] Formar suport.

## 17. Referències

- `docs/acord-nivell-servei-preliminar.md`
- `docs/politica-vulnerabilitats-actualitzacions-preliminar.md`
- `docs/protocol-incidents-violacions-seguretat-preliminar.md`
- `docs/pla-continuitat-recuperacio-preliminar.md`
- `docs/compromis-confidencialitat-formacio-preliminar.md`
