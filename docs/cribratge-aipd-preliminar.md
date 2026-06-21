# Cribratge preliminar d'AIPD d'Avaluapro

Data: 20 de juny de 2026
Estat: cribratge intern; no substitueix l'AIPD formal

## 1. Conclusió

**Recomanació: fer una Avaluació d'Impacte en Protecció de Dades abans d'un pilot institucional amb dades reals.**

La decisió formal correspon al responsable del tractament, assessorat pel DPD. Encara que algun ús limitat no assolís individualment els llindars obligatoris, la combinació de factors fa que l'AIPD sigui una mesura de responsabilitat proactiva necessària i defensable.

## 2. Factors de risc presents

| Factor | Presència a Avaluapro | Valoració inicial |
| --- | --- | --- |
| Menors d'edat | Sí, col·lectiu principal | Risc elevat per vulnerabilitat. |
| Avaluació i seguiment sistemàtic | Sí | Pot influir en intervencions i percepcions educatives. |
| Elaboració de perfils o indicadors | Sí, estadístiques i alertes derivades | Cal evitar decisions automàtiques i biaixos. |
| Categories especials | Possibles diagnòstics i dades de salut | Requereix justificació reforçada. |
| Relacions socials | Sí, sociograma i rebuigs | Pot causar estigmatització o dany reputacional. |
| Text lliure | Sí | Pot incorporar dades excessives o inexactes. |
| Compartició | Sí, notes i cotutories | Risc de destinatari incorrecte i excés d'accés. |
| Observació continuada | Sí, tasques, conducta i evolució | Pot convertir-se en monitoratge intensiu. |
| Escala futura | Ministeri o múltiples centres | Pot arribar a gran escala. |
| Tecnologia nova per al context | Plataforma pròpia i futura IA | Augmenta incertesa i necessitat de revisió. |

## 3. Impactes possibles sobre els alumnes

- etiquetatge o estigmatització;
- decisions pedagògiques basades en dades incompletes;
- exposició de diagnòstics, conducta o relacions;
- dany reputacional dins la comunitat educativa;
- accés indegut per canvi de docent o error de permisos;
- dificultat per corregir observacions subjectives;
- conservació excessiva d'històrics;
- pèrdua de confidencialitat en backups o exportacions;
- exclusió o tracte desigual per recomanacions automatitzades;
- manca de comprensió sobre l'ús de les dades.

## 4. Mesures ja incorporades

- autenticació Google;
- separació principal per usuari;
- rules de Firestore i proves amb emulador;
- revocació i sortida de cotutories;
- tombstones per eliminació compartida;
- tokens sociomètrics individuals, caducitat i un sol ús;
- informació prèvia als participants;
- purga manual de dades brutes;
- exclusió de formularis temporals dels backups;
- avisos de minimització en camps sensibles;
- càlcul local de moltes estadístiques derivades.

## 5. Mesures pendents abans del pilot

- [ ] Definir responsable, DPD i bases jurídiques.
- [ ] Determinar la base de l'article 9.2 per a dades de salut.
- [ ] Separar centres, rols i grups en una arquitectura institucional.
- [ ] Desplegar i provar les rules noves.
- [ ] Resoldre la migració dels qüestionaris antics.
- [ ] Implementar purga automàtica.
- [x] Definir una proposta de conservació, bloqueig i final de curs. **Preparada:** `docs/politica-conservacio-eliminacio-preliminar.md`; pendent d'aprovació, automatització i prova.
- [ ] Registrar accessos i operacions sensibles.
- [x] Crear procediments d'exercici de drets i rectificació d'observacions. **Preparat:** `docs/procediment-exercici-drets-preliminar.md`; pendent d'aprovació i simulacre.
- [ ] Revisar Google/Firebase, subencarregats i transferències.
- [ ] Separar desenvolupament, proves i producció.
- [ ] Fer proves manuals amb diversos rols i dades fictícies.
- [x] Establir procediment de violacions de seguretat. **Preparat:** `docs/protocol-incidents-violacions-seguretat-preliminar.md`; pendent d'aprovació, canals i simulacre.
- [ ] Consultar els representants o persones afectades si el responsable ho considera adequat.

## 6. Abast proposat de l'AIPD formal

L'AIPD hauria de cobrir, com a mínim:

1. identitat i organització acadèmica;
2. avaluació i seguiment;
3. conducta, tutoria i orientació;
4. diagnòstics i adaptacions;
5. sociometria;
6. compartició entre docents;
7. backups i exportacions;
8. administració, suport i registres;
9. arquitectura multi-centre;
10. IA, si s'activa en el futur.

## 7. Criteri de sortida

No s'hauria d'iniciar un pilot institucional amb dades reals fins que:

- el responsable aprovi l'AIPD;
- el DPD n'hagi pogut assessorar;
- els riscos alts tinguin mesures concretes;
- el risc residual i la seva acceptació quedin documentats;
- si persisteix un alt risc no mitigat, es valori la consulta prèvia a l'APDA.

## 8. Fonts oficials

- [LQPD, articles 32 i 33](https://www.portaljuridicandorra.ad/L2021029)
- [APDA: guia d'avaluació d'impacte](https://www.apda.ad/storage/guides/fUCPtAfCs3M44wkQGA9ug4XEUWhRuvtCyMVXnkdJ.pdf)
- [APDA: obligacions i AIPD](https://www.apda.ad/obligacions)
- [APDA: guia per a centres educatius](https://www.apda.ad/storage/helps/cXcIFfa9gxLzVZMf2q92zsFVo1p9Ri6nPQ53VTtp.pdf)
