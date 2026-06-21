# Política preliminar de vulnerabilitats i actualitzacions

Data: 21 de juny de 2026
Versió: 0.1
Estat: proposta de seguretat; pendent de canal públic, eines, responsables i proves

## 1. Objectiu

Establir un procés repetible per:

- descobrir vulnerabilitats;
- rebre notificacions externes;
- classificar risc;
- contenir;
- corregir;
- provar;
- desplegar;
- comunicar;
- verificar;
- aprendre.

## 2. Abast

- codi React/Vite;
- dependències npm;
- Firebase SDK;
- Firestore Rules;
- Authentication;
- Hosting;
- GitHub Actions;
- scripts;
- configuració;
- dominis;
- secrets;
- dispositius i comptes administratius;
- proveïdors.

## 3. Fonts de detecció

- alertes de Dependabot;
- `npm audit` com a senyal, no decisió automàtica;
- avisos Firebase i GitHub;
- proves;
- revisió de codi;
- auditoria externa;
- suport;
- investigadors;
- incidents;
- monitoratge;
- OWASP.

## 4. Canal de divulgació

Canal:

`[PENDENT: security@domini]`

Cal publicar:

- abast;
- forma d'informar;
- informació útil;
- prohibició d'exfiltrar dades;
- compromís de resposta;
- política de coordinació;
- absència o existència de recompensa.

No s'ha de publicar una adreça que ningú monitoritzi.

## 5. Informació del report

```text
Data:
Investigador:
Contacte:
Actiu:
Versió:
Descripció:
Passos:
Impacte:
Prova mínima:
Dades accedides:
Divulgació prevista:
```

No s'han d'enviar bases, tokens ni dades d'alumnes.

## 6. Triage

En rebre un avís:

1. acusar recepció;
2. crear identificador;
3. preservar evidències;
4. verificar sense ampliar l'impacte;
5. valorar dades personals;
6. classificar severitat;
7. contenir;
8. assignar responsable;
9. fixar termini;
10. actualitzar l'informador.

## 7. Severitat

| Nivell | Criteri orientatiu |
| --- | --- |
| Crítica | Explotació activa, accés transversal, credencial administrativa o exposició massiva |
| Alta | Accés indegut sensible o alteració important amb condicions realistes |
| Mitjana | Impacte limitat, necessita privilegis o té mitigació |
| Baixa | Impacte menor, defensa addicional o difícilment explotable |

Cal valorar:

- menors;
- salut i sociometria;
- abast;
- facilitat;
- privilegis;
- persistència;
- detecció;
- impacte combinat.

## 8. Objectius candidats

| Severitat | Acusament | Contenció | Correcció o mitigació |
| --- | ---: | ---: | ---: |
| Crítica explotada | 1 hora en cobertura | Immediata | 24 hores si és viable |
| Crítica | 4 hores | 24 hores | 72 hores |
| Alta | 1 dia laborable | 3 dies | 7 dies |
| Mitjana | 3 dies laborables | Segons risc | 30 dies |
| Baixa | 5 dies laborables | No sempre | 90 dies o cicle |

Són objectius candidats, no garanties vigents.

## 9. Contenció

- desactivar funció;
- revocar credencial;
- tancar enllaç;
- restringir rule;
- retirar versió;
- bloquejar desplegament;
- augmentar monitoratge;
- informar el responsable;
- activar incidents si hi ha dades.

## 10. Correcció

Ha d'incloure:

- causa arrel;
- canvi mínim;
- prova de regressió;
- prova negativa;
- revisió;
- compatibilitat de rules i app;
- retorn enrere;
- documentació.

## 11. Dependències

Objectiu:

- Dependabot alerts actius;
- security updates valorades;
- actualitzacions de versió agrupades;
- `package-lock.json`;
- revisió setmanal;
- evitar actualitzar cegament;
- provar build, lint i seguretat;
- retirar dependències innecessàries.

Estat actual:

- lockfile i versions definides;
- Dependabot no acreditat;
- CI només executa build;
- escaneig i política pendents.

## 12. Secrets

- secret scanning;
- gestor de secrets;
- tokens de curta durada;
- rotació;
- mínim privilegi;
- cap secret als logs;
- revisió de l'històric Git;
- revocació immediata si s'exposa.

La configuració web de Firebase no és un secret administratiu; les claus privades i tokens sí.

## 13. Actualitzacions

### Seguretat

Prioritat segons severitat.

### Correctives

Errors funcionals segons suport i SLA.

### Evolutives

Planificades, amb revisió de privacitat si canvien dades o finalitats.

### Proveïdors

Cal revisar canvis de Firebase, GitHub, navegador i sistema operatiu.

## 14. Desplegament d'emergència

- autorització;
- còpia o versió anterior;
- prova mínima;
- desplegament controlat;
- verificació;
- comunicació;
- revisió posterior en 2 dies laborables.

## 15. Divulgació coordinada

- acordar termini raonable;
- no pressionar per ocultar;
- no publicar detalls explotables abans de corregir;
- reconèixer l'investigador si ho accepta;
- informar clients quan correspongui;
- separar comunicació de vulnerabilitat i notificació legal.

## 16. Excepcions i risc acceptat

Una vulnerabilitat no corregida necessita:

- justificació;
- risc;
- mitigació;
- responsable;
- data de caducitat;
- revisió;
- aprovació.

“No hi ha temps” no és una acceptació formal.

## 17. Registre

| Camp | Contingut |
| --- | --- |
| ID | `VULN-AAAA-NNN` |
| Font | Interna o externa |
| Actiu | Component afectat |
| Severitat | Crítica, alta, mitjana o baixa |
| Dades | Possibles categories afectades |
| Estat | Oberta, mitigada, corregida, acceptada |
| Dates | Detecció, contenció, correcció i desplegament |
| Evidència | Tests, commit, informe |
| Responsable | Assignat |
| Comunicació | Client, APDA o investigador |

## 18. Verificació

Abans de tancar:

- vulnerabilitat no reproduïble;
- tests superats;
- desplegament verificat;
- logs revisats;
- credencials rotades;
- abast investigat;
- documentació actualitzada;
- risc residual acceptat.

## 19. Pendents abans del pilot

- [ ] Crear canal de seguretat.
- [ ] Assignar responsables i suplents.
- [ ] Activar Dependabot alerts i security updates.
- [ ] Afegir lint i tests de seguretat al CI.
- [ ] Activar secret scanning disponible.
- [ ] Definir SAST proporcional.
- [ ] Revisar historial per secrets.
- [ ] Preparar registre.
- [ ] Fer simulacre de vulnerabilitat crítica.
- [ ] Contractar auditoria externa.

## 20. Fonts

- [OWASP: Vulnerability Disclosure Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)
- [OWASP: Vulnerability Management Guide](https://owasp.org/www-project-vulnerability-management-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub: Dependabot security updates](https://docs.github.com/github/managing-security-vulnerabilities/configuring-dependabot-security-updates)
- [GitHub: secret scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning)
