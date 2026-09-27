# Auditoria final del mode d’assistència segura

**Data:** 27 de setembre de 2026
**Abast:** codi local, paquet compilat d’assistència, proves automatitzades, recorregut visual amb dades sintètiques i verificació dels recursos estàtics publicats.
**Fora d’abast:** compte real autenticat, dades d’alumnat i comprovació funcional amb informació real.

## Conclusió

No s’ha detectat cap via directa perquè l’entorn d’assistència iniciï sessió, consulti Firebase, obri IndexedDB real, utilitzi l’emmagatzematge del navegador o restauri el paquet a l’aplicació real.

L’exportador segur s’ha publicat a l’AvaluaPro habitual després de la petició explícita de Marc. L’entorn d’assistència continua separat i local. Marc haurà de comprovar personalment la pantalla d’exportació dins el seu compte; aquesta verificació autenticada no correspon a l’assistent.

## Fronteres comprovades

| Frontera | Control aplicat | Resultat |
| --- | --- | --- |
| Entrada d’assistència | aplicació Vite separada i marcador estructural propi | Superada |
| Credencials | llançador obligatori i eliminació de variables conegudes | Superada |
| Xarxa | política de contingut i bloqueig d’orígens externs en execució | Superada |
| Persistència | IndexedDB, Storage, CacheStorage i service workers bloquejats | Superada |
| Components visuals | nou components purs sense botiga ni serveis remots | Superada |
| Exportació | font mínima, regeneració, resum i confirmació exacta | Superada |
| Fitxer resultant | esquema tancat, UUID nous i cap text lliure | Superada |
| Importació | límit de mida, dues validacions i memòria exclusiva | Superada |
| Retorn a l’estat inicial | restabliment del conjunt fictici integrat | Superada |
| Aplicació real | sense importador ni restauració del paquet segur | Superada |
| Procés de l’assistent | protocol persistent `AGENTS.md` | Superada |

## Informació que no surt al paquet

- noms, correus, fotografies o documents;
- diagnòstics, suports reals, observacions o text lliure;
- qualificacions, absències, seguiment o sociometria originals;
- dates i hores originals;
- identificadors originals o taules de correspondència;
- informació del compte, del centre o del docent.

## Informació estructural que sí es conserva

- nombre de classes, fins al límit establert;
- indicador de grup de tutoria;
- nombre de competències, criteris i tasques, amb límits;
- mida aproximada de cada grup, arrodonida a 12, 18, 24, 30 o 36.

Aquesta estructura és necessària per reproduir problemes de distribució i volum. No permet identificar un alumne individual, però continua sent una revelació estructural mínima i deliberada.

## Riscos residuals

### 1. Error humà en triar l’adjunt

Una persona podria intentar adjuntar una còpia ordinària. El validador la rebutjaria, però el control principal és utilitzar exclusivament `avaluapro-paquet-segur-v1.json` i seguir la guia.

### 2. Permanència del fitxer a Descàrregues

El paquet no conté dades reals segons l’esquema, però continua sent recomanable eliminar-lo quan la incidència estigui resolta.

### 3. Límit del control de procés

El protocol, el llançador i les barreres del navegador protegeixen el flux normal. No constitueixen un aïllament absolut davant un procés deliberadament maliciós amb accés complet al sistema operatiu.

### 4. Verificació autenticada pendent

La compilació i els recursos publicats demostren que s’ha servit el paquet previst, però no que la pantalla funcioni correctament amb el compte de Marc. Aquesta comprovació l’ha de fer Marc sense compartir la pantalla ni les dades.

## Criteris de publicació aplicats

- petició explícita i separada de Marc;
- commit selectiu que exclogui captures, fitxers temporals i canvis aliens;
- repetició de les proves de seguretat i de les dues compilacions;
- revisió dels recursos públics desplegats sense iniciar sessió;
- comprovació manual de Marc dins `Dades i Compte → Còpies i estat`, pendent;
- prova de Marc que el fitxer creat té el nom fix i que el resum no mostra identitats, pendent;
- cap enviament del fitxer fins que aquesta comprovació manual sigui satisfactòria.

## Evidència actual

- 79 proves específiques de la frontera d’assistència superades;
- 309 proves totals de seguretat superades;
- compilació de l’entorn d’assistència superada;
- compilació estàtica d’AvaluaPro superada;
- prova visual d’exportació i importació feta només amb dades sintètiques;
- commit selectiu `71d0004` enviat a `main`;
- desplegament exclusiu de Firebase Hosting completat;
- HTML i recursos principals publicats idèntics a la compilació local;
- cap accés al compte real ni a dades d’alumnat;
- auditoria administrativa remota no repetida perquè la sessió havia caducat i el protocol exclou la lectura de Firestore real; no s’han modificat regles ni dades.
