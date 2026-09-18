# 0004 — Planificació local-first i conflictes explícits

Data: 18 de setembre de 2026

Estat: acceptada

## Context

Programació, Agenda i Mode aula generaran canvis durant una classe, també quan la xarxa sigui inestable. A més, el mateix docent pot editar des de l'ordinador i l'iPad. Desar directament a Firestore faria dependre la conservació del canvi de la connexió i una escriptura tardana podria substituir una versió remota més nova.

## Decisió

- Cada canvi es desa primer a una IndexedDB pròpia de Planificació.
- L'entitat i l'operació pendent s'escriuen dins la mateixa transacció local.
- La cua conserva una sola operació per document i una revisió única per cada edició.
- Una confirmació remota només retira exactament la revisió enviada.
- Firestore compara `baseUpdatedAt` dins una transacció abans d'escriure.
- Si la versió remota ha canviat, es conserven les dues versions i l'estat passa a `Cal revisar`.
- Les consultes limitades o per dates no es consideren inventaris complets; l'absència d'un document no implica que s'hagi eliminat.
- La còpia local queda separada per compte i s'elimina en tancar sessió quan no hi ha canvis pendents.
- Si hi ha canvis pendents, es bloqueja el tancament de sessió abans d'esborrar-los.

## Conseqüències

La interfície futura només parlarà amb un repositori de Planificació. El formulari podrà respondre de seguida i mostrar `Desat`, `Desant`, `Pendent`, `Sense connexió`, `Cal revisar` o `Error` sense confondre un desament local amb una confirmació de Firebase.

El cost és mantenir metadades locals de versió i una pantalla de resolució de conflictes. Aquest cost evita una pèrdua silenciosa, que és més greu que demanar una decisió quan dos dispositius han modificat el mateix document.
