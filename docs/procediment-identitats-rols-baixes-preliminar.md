# Procediment preliminar d'identitats, rols, substitucions i baixes

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta institucional; pendent de font oficial, rols aprovats i implementació

> Google Authentication verifica un compte, però no autoritza per si sola l'accés a alumnes, centres o funcions. L'autorització ha de provenir del responsable institucional.

## 1. Objectiu

Regular tot el cicle de vida d'una identitat:

1. sol·licitud;
2. verificació;
3. alta;
4. assignació de rols i grups;
5. revisió;
6. canvi o substitució;
7. suspensió;
8. baixa;
9. tractament de còpies locals i responsabilitats.

## 2. Principis

- compte individual;
- denegació per defecte;
- mínim privilegi;
- separació per centre;
- permisos vinculats a funcions vigents;
- cap rol heretat indefinidament;
- revocació immediata;
- traçabilitat;
- revisió periòdica;
- accés temporal per a substitucions.

## 3. Actors

| Actor | Responsabilitat |
| --- | --- |
| Responsable institucional `[PENDENT]` | Aprovar el model i les fonts autoritzadores |
| Administració d'identitats `[PENDENT]` | Executar altes, canvis, suspensions i baixes |
| Direcció o responsable de centre `[PENDENT]` | Confirmar funció, centre, grups i dates |
| Responsable funcional `[PENDENT]` | Validar necessitats d'accés |
| Avaluapro | Aplicar tècnicament la instrucció i registrar el resultat |
| Usuari | Protegir el compte i comunicar canvis o incidències |
| DPD i seguretat | Supervisar casos sensibles i auditories |

## 4. Font oficial d'autorització

Opcions a decidir:

- directori institucional;
- sistema acadèmic;
- API del Ministeri;
- fitxer signat;
- ordre registrada d'una persona autoritzada.

La font ha d'aportar:

- identificador estable;
- correu institucional;
- centre;
- funció;
- grups o àmbit;
- data d'inici;
- data prevista de final;
- autoritzador.

No són fonts suficients:

- el domini del correu;
- una petició del mateix usuari;
- una invitació informal;
- aparèixer a Firebase Authentication.

## 5. Rols candidats

| Rol | Àmbit candidat |
| --- | --- |
| Docent | Matèries i grups assignats |
| Tutor | Dades tutorials del grup autoritzat |
| Cotutor | Espai tutorial concret i temporal |
| Orientació | Categories i centres específicament autoritzats |
| Direcció | Supervisió definida, no accés indiscriminat per defecte |
| Administrador funcional | Usuaris, rols i configuració sense contingut ordinari |
| Administrador tècnic | Infraestructura sense accés ordinari a contingut |
| Suport | Metadades; contingut només excepcional |
| Auditor | Lectura temporal d'evidències delimitades |

Cal separar permisos de:

- lectura;
- creació;
- modificació;
- eliminació;
- compartició;
- exportació;
- administració.

## 6. Alta

### Requisits

- ordre o registre d'alta;
- identitat verificada;
- rol i àmbit;
- dates;
- formació;
- compromís de confidencialitat;
- dispositiu conforme;
- MFA quan correspongui.

### Circuit

1. rebre sol·licitud;
2. verificar autoritzador;
3. contrastar font oficial;
4. crear o vincular identitat;
5. assignar permisos mínims;
6. provar accés positiu i negatiu;
7. informar l'usuari;
8. registrar l'alta;
9. programar revisió.

## 7. Registre d'alta

```text
Cas:
Usuari:
Identificador institucional:
Centre:
Rol:
Grups o àmbit:
Data d'inici:
Data de final:
Autoritzador:
Formació:
MFA:
Dispositiu:
Executor:
Revisor:
```

No s'han d'incloure dades d'alumnes al registre.

## 8. Canvi de rol

Un canvi s'ha de tractar com:

1. retirada dels permisos anteriors;
2. conservació només del que continuï justificat;
3. assignació del nou rol;
4. revisió de cotutories, paquets i exports;
5. prova negativa de l'àmbit anterior;
6. registre.

No s'han d'acumular permisos antics i nous per comoditat.

## 9. Substitucions

L'accés d'un substitut ha de tenir:

- data d'inici i caducitat;
- grups concrets;
- informació mínima necessària;
- exclusió de dades històriques no necessàries;
- responsable de seguiment;
- baixa automàtica o alerta de venciment.

El docent substituït:

- pot quedar suspès;
- no ha de mantenir accés concurrent si no està justificat;
- conserva autoria dels registres, encara que perdi accés.

## 10. Absències temporals

Opcions:

- mantenir accés si continua la funció;
- suspendre sessions;
- limitar funcions;
- retirar temporalment grups.

La decisió correspon al responsable i s'ha de registrar.

## 11. Baixa

### Activadors

- final de contracte;
- canvi de centre;
- canvi de funció;
- final de substitució;
- revocació;
- compte compromès;
- inactivitat no justificada.

### Objectiu temporal

La revocació ha de ser immediata quan deixa d'existir la necessitat o hi ha risc.

### Accions

- desactivar autorització;
- revocar sessions;
- retirar rols, grups i cotutories;
- cancel·lar invitacions;
- revisar paquets pendents;
- transferir propietats necessàries;
- retirar repositoris i eines;
- gestionar dispositius;
- identificar exports;
- registrar la baixa;
- conservar autoria i evidències mínimes.

## 12. Dades locals

Revocar el núvol no elimina automàticament:

- IndexedDB;
- captures;
- fitxers JSON;
- carpetes sincronitzades;
- impressions.

Cal:

- instrucció de destrucció;
- MDM quan sigui possible;
- comprovació;
- declaració de l'usuari;
- tractament d'incident si no es pot garantir la custòdia.

## 13. Propietat d'espais

Abans d'una baixa:

- transferir o tancar cotutories;
- assignar nou responsable funcional;
- exportar dades necessàries;
- evitar comptes orfes;
- no transferir automàticament dades a un docent no autoritzat.

## 14. Suspensió d'emergència

Es pot suspendre preventivament per:

- compte compromès;
- ús indegut;
- error de permisos;
- petició institucional urgent.

La suspensió:

- no elimina dades;
- preserva evidències;
- s'ha de revisar;
- ha de tenir responsable i resultat.

## 15. Revisió periòdica

| Revisió | Freqüència candidata |
| --- | --- |
| Comptes i rols | Trimestral |
| Cotutories | En cada canvi i trimestral |
| Administradors | Mensual o trimestral segons risc |
| Accessos temporals | Setmanal |
| Comptes inactius | Mensual |
| Dispositius | Trimestral |

## 16. Prova d'accés

Per cada rol:

- pot consultar només l'àmbit assignat;
- no pot consultar un altre centre;
- no pot elevar privilegis;
- no pot exportar si no està autoritzat;
- perd accés després de la baixa;
- no reentra amb una invitació antiga.

## 17. Indicadors

- altes;
- canvis;
- baixes;
- temps de revocació;
- accessos temporals caducats;
- comptes sense responsable;
- permisos excessius;
- còpies locals pendents;
- incidències.

## 18. Controls abans del pilot

- [ ] Font oficial definida.
- [ ] Rols aprovats.
- [ ] Administradors assignats.
- [ ] Alta i baixa centralitzades.
- [ ] Caducitat dels accessos temporals.
- [ ] MFA administratiu.
- [ ] Registre d'operacions.
- [ ] Prova de substitució.
- [ ] Prova de canvi de centre.
- [ ] Prova de baixa amb cotutoria.
- [ ] Procediment de còpies locals.

## 19. Fonts

- [Llei 29/2021, seguretat, responsabilitat i mínim accés](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: obligacions i protocols](https://www.apda.ad/storage/helps/6GgNFl4CzaBOQFVvrmwypgMtjf0baHlRkTcQVeCP.pdf)
- `docs/compromis-confidencialitat-formacio-preliminar.md`
- `docs/politica-conservacio-eliminacio-preliminar.md`
