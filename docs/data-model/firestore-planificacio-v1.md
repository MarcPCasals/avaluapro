# Firestore de Planificació — versió 1

## Estructura

```text
users/{ownerUid}/
├── planningAcademicYears/{yearId}
├── planningTemporalUnits/{utId}
├── planningTimetables/{timetableId}
├── planningTimetableSlots/{slotId}
└── planningCalendarEvents/{eventId}

planningUnits/{upId}
├── phases/{phaseId}
├── activities/{activityId}
├── accessGrants/{granteeEmail}
└── applications/{applicationId}
    ├── activityOverrides/{overrideId}
    └── sessions/{sessionId}
        ├── items/{itemId}
        └── results/{resultId}

planningPrivateNotes/{noteId}
```

La configuració dins de `users/{ownerUid}` hereta l'aïllament actual del compte. Cap altre usuari la pot llegir. Una UP compartida conté les dades pedagògiques i l'aplicació real necessàries per a la consulta autoritzada.

## Projecció d'accés de la UP

El document `planningUnits/{upId}` afegeix tres camps de persistència al model de domini:

```json
{
  "ownerEmailLower": "owner@example.test",
  "authorizedEmails": ["direction@example.test"],
  "accessByEmail": {
    "direction@example.test": {
      "role": "directionReader",
      "classIds": [],
      "status": "active"
    }
  }
}
```

`authorizedEmails` és la clau de consulta. `accessByEmail` resol el rol sense una lectura addicional. `accessGrants/{granteeEmail}` conserva la concessió versionada i la vinculació futura amb el `uid` del convidat.

Els tres rols convidats són:

| Rol | UP | Aplicació real | Escriptura Agenda |
|---|---:|---:|---:|
| `directionReader` | Lectura | Lectura | No |
| `planningEditor` | Edició | Només grups de `classIds` | No |
| `planningAgendaEditor` | Edició | Grups de `classIds` | Sí, als mateixos grups |

Direcció no rep notes privades, incidències individuals ni diagnòstics complets.

La UP incorpora una fotografia textual del currículum a `curriculum`, a més dels identificadors d'origen opcionals. Les activitats poden incorporar `diversityMeasures` amb la mesura pedagògica i els noms seleccionats. El model no hi copia diagnòstics ni notes personals, i les regles rebutgen camps superiors inesperats als documents d'UP i d'activitat.

## Consultes selectives

El servei `planningFirestore.js` limita cada lectura:

| Funció | Abast màxim |
|---|---|
| `loadPlanningAcademicYears` | Cursos del docent |
| `loadPlanningTemporalUnits` | UT d'un curs |
| `loadPlanningTimetables` | Versions d'horari d'un curs |
| `loadPlanningTimetableSlots` | Franges d'una versió |
| `loadPlanningCalendarEvents` | Esdeveniments d'un curs entre dues dates |
| `loadOwnedPlanningUnits` | UP pròpies, filtrables per curs i UT |
| `loadSharedPlanningUnits` | UP concedides al correu autenticat |
| `loadPlanningUnitStructure` | Una UP, les seves fases i activitats |
| `loadPlanningApplications` | Aplicacions d'una UP i grup opcional |
| `loadPlanningSessions` | Sessions d'una aplicació entre dues dates |
| `loadPlanningSessionDetail` | Elements i resultats d'una sessió; reutilitza l'encapçalament si ja s'ha consultat |
| `loadPlanningPrivateNotes` | Notes del propietari per UP o sessió |

Els límits de resultats formen part de cada consulta. Els històrics no es carreguen durant l'arrencada general.

Els elements de sessió nous conserven `sourcePlanningUnitId` quan provenen d'una activitat. Aquest vincle no duplica el contingut pedagògic: permet recuperar descripcions i materials de la UP exacta quan s'obre el detall, sense consultar totes les UP pròpies i arxivades.

La cronologia consulta les sessions en trams consecutius de vuit setmanes. Els trams s'uneixen per `session.id` a la vista local, de manera que ampliar cap al passat o el futur no repeteix els documents ja visibles.

Agenda, Programació i el càlcul de la pròxima classe utilitzen el mateix repositori per `uid`. El repositori només comparteix consultes en curs i l'estat temporal de validació dels àmbits; les entitats continuen vivint a IndexedDB. Una validació es considera recent durant trenta segons i qualsevol canvi local la invalida abans de la pròxima lectura.

## Índexs

`firestore.indexes.json` declara els índexs per:

- UP pròpies o compartides, amb filtres de curs i UT;
- UT ordenades dins del curs;
- versions i franges d'horari;
- esdeveniments per interval de dates;
- notes privades per UP o sessió.

Les sessions d'una aplicació utilitzen l'índex simple de `startsAt` perquè la ruta ja fixa UP i grup.

## Invariants de seguretat

- `id`, `entityType`, `schemaVersion`, `ownerUid` i `createdAt` no es poden substituir en una actualització.
- Un editor no pot canviar propietari ni concessions.
- Un col·laborador d'Agenda només pot escriure aplicacions incloses a `classIds`.
- Una revocació ha d'eliminar alhora la concessió i la projecció del document de la UP.
- Les consultes globals sense propietari o correu autoritzat es deneguen.
- Els documents amb camps inesperats es rebutgen.
- `planningPrivateNotes` només admet el propietari i limita el text a 5.000 caràcters.
