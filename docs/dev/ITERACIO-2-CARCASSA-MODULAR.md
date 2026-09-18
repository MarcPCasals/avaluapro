# Iteració 2 — Carcassa, navegació i funcionalitats desactivables

Data d'inici: 18 de setembre de 2026  
Estat: COMPLETA

## Objectiu observable

AvaluaPro ha de continuar funcionant igual amb els mòduls nous desactivats. Amb una previsualització explícita han d'aparèixer els botons Agenda i Programació, i cadascun ha de carregar el seu espai sense afegir dades ni col·leccions.

## Límits d'aquesta iteració

- Cap col·lecció nova a IndexedDB o Firebase.
- Cap regla nova de Firestore.
- Cap activació general per als usuaris.
- Cap activitat, UP, sessió o horari real encara.

## Evidència de tancament

- [x] AvaluaPro sense paràmetres manté la navegació actual.
- [x] `?preview=planning,agenda` mostra els dos mòduls.
- [x] Programació i Agenda es generen en fitxers JavaScript separats.
- [x] Canviar entre els mòduls i Avaluació no perd la classe activa.
- [x] Una recàrrega sense la previsualització torna de manera segura a Avaluació.
- [x] Ordinador i amplada iPad no tenen desbordament horitzontal de la carcassa.
- [x] Lint, prova focalitzada i compilació Firebase correctes.
- [x] Mides abans i després registrades.

## Resultat

- Programació, Agenda i les cinc pantalles grans existents tenen punts d'entrada diferits.
- Les dues carcasses noves estan amagades per defecte i no creen dades.
- La navegació de previsualització es reparteix en dues files a 1024 × 1366 i el document manté `scrollWidth = 1024`.
- Avaluació, Seguiment, Alumnes, Estadístiques Globals i Briefing IA s'han obert consecutivament sense errors de consola.
- La preferència d'un mòdul de previsualització no deixa una pantalla buida: sense el paràmetre, l'aplicació torna a Avaluació.

## Mida de compilació

| Recurs | Abans | Després | Canvi |
|---|---:|---:|---:|
| JavaScript inicial minificat | 1.616,94 kB | 956,19 kB | −660,75 kB (−40,9%) |
| JavaScript inicial gzip | 443,61 kB | 277,07 kB | −166,54 kB (−37,5%) |
| Programació diferida | — | 2,69 kB | fitxer propi |
| Agenda diferida | — | 1,91 kB | fitxer propi |
| CSS compartit dels mòduls | — | 3,15 kB | fitxer propi |

El paquet inicial encara supera els 500 kB perquè la barra superior, l'estat global i diversos diàlegs continuen sent comuns. Ja no és monolític: Tutoria (351,25 kB), Estadístiques (100,48 kB) i la resta de pantalles es descarreguen quan s'obren. La reducció addicional es farà només si una iteració posterior la necessita, per no barrejar una refactorització general amb el model nou.

## Validació executada

- 3 proves del selector de previsualització.
- Suite completa de seguretat i sincronització, incloses 62 proves de regles de Firestore.
- `npm run lint`.
- `npm run build:firebase`.
- Prova visual en ordinador i a 1024 × 1366.
