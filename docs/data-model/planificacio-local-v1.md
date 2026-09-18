# Model local de Planificació v1

Data: 18 de setembre de 2026

Base IndexedDB: `avaluapro-planning-v1`

## Magatzems

| Magatzem | Clau | Propòsit |
|---|---|---|
| `entities` | `uid::ruta` | Còpia local que l'usuari pot continuar editant |
| `outbox` | `uid::ruta` | Última operació pendent de cada document |
| `conflicts` | `uid::ruta` | Versions local i remota que necessiten una decisió |

Cada magatzem té un índex per `uid`. `entities` i `outbox` també es poden consultar pels `scopeKeys` d'un curs, UT, UP, grup, aplicació o sessió. Això permet carregar només l'abast que necessita la pantalla oberta.

## Identitat comuna

`planningEntityLocation.js` assigna una ruta única a cada entitat. Per exemple:

```text
users/{uid}/planningAcademicYears/{yearId}
planningUnits/{planningUnitId}/activities/{activityId}
planningUnits/{planningUnitId}/applications/{applicationId}/sessions/{sessionId}
```

La mateixa ruta s'utilitza com a identitat a la memòria local, la cua i Firestore. Les dades de dos comptes no comparteixen mai una clau local.

## Operació pendent

Una entrada d'`outbox` conté:

- `operation`: `upsert` o `delete`;
- `revision`: identificador únic de l'edició concreta;
- `baseUpdatedAt`: versió remota sobre la qual s'ha editat;
- `queuedAt`: moment en què s'ha desat localment;
- `attempts` i `lastError`: informació tècnica sense dades personals;
- `value`: document complet quan és una alta o modificació.

Una nova edició del mateix document substitueix l'operació anterior. Si la confirmació de la versió anterior arriba tard, la comparació de `revision` impedeix que retiri la nova.

## Fusió remota

1. Sense canvi local pendent, la versió remota actualitza la memòria local.
2. Si remot i pendent són idèntics, es considera una confirmació que havia arribat sense resposta.
3. Si `baseUpdatedAt` encara coincideix, es manté l'edició local pendent.
4. Si la versió remota ha canviat, es crea un conflicte amb les dues còpies.
5. Només una consulta marcada explícitament com a inventari complet pot interpretar una absència com una eliminació.

En resoldre un conflicte es pot conservar la versió remota o rebassar la local sobre la versió remota actual. La segona opció crea una revisió nova i actualitza `updatedAt` abans de tornar-la a enviar.

## Tancament de sessió

`clearPlanningLocalData(uid)` elimina entitats, cua i conflictes d'aquell compte. Per defecte rebutja l'operació si encara hi ha canvis pendents, perquè tancar la sessió no pot convertir-se en una pèrdua de dades.
