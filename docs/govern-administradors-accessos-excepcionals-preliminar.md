# Govern preliminar d'administradors i accessos excepcionals

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta de control privilegiat; pendent de comptes corporatius, IAM, logs i aprovació

## 1. Objectiu

Evitar que els privilegis tècnics permetin consultar o modificar dades educatives sense necessitat, i garantir que qualsevol excepció sigui:

- justificada;
- temporal;
- autoritzada;
- registrada;
- supervisada;
- revocada;
- revisada.

## 2. Principis

- cap administrador omnipotent per defecte;
- comptes corporatius individuals;
- separació entre compte ordinari i privilegiat;
- MFA resistent al phishing quan sigui viable;
- mínim privilegi;
- doble control en accions crítiques;
- logs protegits;
- revisió freqüent;
- cap credencial compartida;
- emergència no equivalent a accés habitual.

## 3. Rols privilegiats candidats

| Rol | Permisos candidats | Sense accés ordinari a |
| --- | --- | --- |
| Administrador d'identitats | Altes, baixes i rols | Contingut educatiu |
| Administrador Firebase | Configuració, IAM i facturació | Consulta massiva de documents |
| Desplegador | Hosting, versions i rules | Dades de producció |
| Responsable de backups | Còpies i restauració | Ús pedagògic del contingut |
| Suport privilegiat | Accés temporal a cas concret | Altres centres o alumnes |
| Auditor | Evidències i logs delimitats | Modificació |
| Custodi d'emergència | Recuperació excepcional | Operació diària |

## 4. Comptes

- compte nominal;
- correu corporatiu;
- MFA;
- dispositiu conforme;
- cap ús compartit;
- cap compte personal com a únic propietari;
- almenys dos administradors per continuïtat;
- claus de recuperació custodiades;
- revisió de sessions i credencials.

## 5. IAM

Per cada compte:

```text
Compte:
Persona:
Rol IAM:
Projecte:
Justificació:
Data d'alta:
Data de revisió:
Data de baixa:
Autoritzador:
MFA:
```

Cal preferir rols predefinits mínims o rols personalitzats revisats.

## 6. Accions de doble control

Requereixen aprovació o revisió per una segona persona:

- donar rol d'administrador;
- modificar IAM;
- exportar tota la base;
- restaurar producció;
- desactivar rules;
- eliminar un projecte;
- canviar facturació o titularitat;
- crear claus de servei;
- consultar massivament dades;
- activar un nou subencarregat.

En una empresa unipersonal cal compensar amb:

- autorització institucional;
- assessor extern;
- registre reforçat;
- revisió posterior immediata.

## 7. Accés excepcional de suport

### Requisits

- tiquet;
- autorització del responsable o persona delegada;
- problema no resoluble amb dades fictícies;
- àmbit concret;
- durada màxima;
- compte temporal o elevació temporal;
- registre;
- informe.

### Durada candidata

Màxim inicial de 4 hores, prorrogable amb nova justificació.

### Finalització

- revocar;
- tancar sessions;
- eliminar còpies;
- registrar accions;
- confirmar al responsable;
- revisar si cal millorar eines de suport.

## 8. Accés d'emergència

Ús només quan:

- no hi ha cap administrador ordinari disponible;
- cal contenir una exposició;
- cal recuperar el servei essencial;
- existeix risc greu.

Controls:

- credencial segellada o gestor empresarial;
- accés monitorat;
- avís immediat;
- rotació després de l'ús;
- revisió en 24 hores;
- prova semestral sense dades reals.

## 9. Accés a Firestore

La consola pot permetre més accés que l'aplicació.

Cal:

- restringir IAM;
- evitar consultes exploratòries amb dades reals;
- usar identificadors de cas;
- limitar exports;
- registrar accessos;
- valorar eines que ocultin contingut per defecte;
- separar suport de producció.

## 10. Claus i secrets

- evitar claus de servei persistents;
- preferir identitats federades o credencials temporals;
- no descarregar JSON de servei si no és imprescindible;
- gestor de secrets;
- rotació;
- revocació;
- inventari;
- secret scanning;
- cap secret al repositori o documentació.

## 11. Logs privilegiats

Registrar:

- autenticació;
- canvi IAM;
- desplegament;
- canvi de rules;
- exportació;
- restauració;
- eliminació;
- accés excepcional;
- creació o ús de claus;
- activació d'emergència.

Els logs han de tenir:

- hora fiable;
- identitat;
- acció;
- recurs;
- resultat;
- retenció;
- protecció contra alteració.

## 12. Revisió d'accessos

| Àmbit | Freqüència candidata |
| --- | --- |
| Administradors | Mensual |
| IAM de producció | Mensual |
| Claus i secrets | Mensual |
| Accessos excepcionals | Després de cada cas |
| Comptes d'emergència | Semestral |
| Subencarregats | Anual i en cada canvi |

## 13. Conflictes d'interès

Qui desenvolupa una correcció crítica no hauria de ser l'única persona que:

- l'aprova;
- la desplega;
- valida l'impacte;
- tanca l'incident.

Quan no sigui possible, cal revisió independent posterior.

## 14. Proveïdors

L'accés de Google, auditor, assessor o futur suport:

- ha d'estar contractualment delimitat;
- s'ha de registrar quan sigui controlable;
- no ha de crear comptes permanents innecessaris;
- s'ha de retirar en acabar;
- requereix confidencialitat.

## 15. Baixa d'un administrador

- revocar IAM;
- sessions;
- tokens;
- claus;
- GitHub;
- Firebase;
- domini;
- facturació;
- gestor de contrasenyes;
- dispositius;
- recuperar documentació;
- rotar secrets coneguts.

## 16. Registre d'accés excepcional

```text
Cas:
Persona:
Compte:
Autoritzador:
Motiu:
Sistema:
Abast:
Inici:
Final:
Accions:
Dades consultades:
Còpies creades:
Revocació:
Revisió:
```

## 17. Proves abans del pilot

- [ ] Dos administradors disponibles.
- [ ] MFA verificat.
- [ ] Comptes privilegiats separats.
- [ ] IAM mínim revisat.
- [ ] Accés excepcional simulat.
- [ ] Emergència simulada.
- [ ] Export massiu amb doble control.
- [ ] Baixa d'administrador simulada.
- [ ] Logs verificats.
- [ ] Secrets inventariats.

## 18. Fonts

- [Llei 29/2021, seguretat i confidencialitat](https://www.portaljuridicandorra.ad/L2021029)
- [Firebase IAM](https://firebase.google.com/docs/projects/iam/permissions)
- `docs/procediment-suport-manteniment-preliminar.md`
- `docs/protocol-incidents-violacions-seguretat-preliminar.md`
- `docs/pla-continuitat-recuperacio-preliminar.md`
