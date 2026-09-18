# ADR 0001 — Carcassa modular i càrrega diferida

Data: 18 de setembre de 2026  
Estat: acceptada  
Iteració: 2 — Carcassa, navegació i funcionalitats desactivables

## Context

AvaluaPro tenia totes les pantalles principals importades des de `App.jsx`. El paquet JavaScript principal arribava a 1.616,94 kB minificats. Afegir Programació, Agenda i Mode aula dins del mateix paquet augmentaria el temps d'arrencada i faria més difícil separar les dades i els permisos de cada domini.

Programació i Agenda també necessiten una activació controlada: han de poder-se provar a producció sense aparèixer a tots els usuaris i sense crear encara col·leccions de Firebase.

## Decisió

- Les pantalles de primer nivell es carreguen amb `React.lazy` i `Suspense`.
- Programació viu a `src/features/planning/` i Agenda a `src/features/agenda/`.
- Cada mòdul nou té un punt d'entrada propi i no importa l'altre mòdul.
- Els espais opcionals estan desactivats per defecte.
- La URL `?preview=planning,agenda` els mostra només per a proves de navegació i disseny.
- La previsualització no és un permís, no activa regles i no crea dades.
- Si una preferència local apunta a un mòdul desactivat, l'aplicació torna a Avaluació.
- Les pestanyes de semestre i UT només es mostren als modes que ja les utilitzen.

## Conseqüències

- L'arrencada inicial deixa de descarregar el codi complet de totes les pantalles.
- Els nous mòduls poden créixer sense entrar al paquet inicial.
- La navegació es pot provar abans de definir el model de dades.
- Un enllaç de previsualització pot exposar les carcasses buides, però no permet llegir o escriure informació nova.
- Les funcionalitats no es podran activar de manera general fins que les iteracions de model, permisos i sincronització estiguin tancades.

## Verificació

- Prova unitària del selector de mòduls de previsualització.
- `npm run lint`.
- `npm run build:firebase` i comprovació que Vite genera fitxers separats per a Programació, Agenda i les pantalles principals.
- Prova visual amb els mòduls desactivats i amb `?preview=planning,agenda`.
