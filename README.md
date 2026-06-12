# Avaluapro

Avaluapro és una aplicació educativa per avaluar competències, fer seguiment d'hàbits de treball i comportament, i generar estadístiques docents a partir de dades d'avaluació, constància i tutoria.

Aplicació en producció:

- https://avaluapro.web.app

## Documentació per a Direcció i Ministeri

El repositori inclou una guia de documents per presentar Avaluapro a Direcció, responsables de centre o Ministeri:

- `docs/guia-documents-direccio-ministeri.md`

Aquest document indica quins fitxers llegir, per què serveix cadascun i quina ruta cal seguir dins del repositori.

Els documents principals són:

- `docs/fitxa-tecnica-direccio-ministeri.md`
- `docs/proteccio-dades-avaluapro.md`
- `docs/mapa-dades.md`
- `docs/firebase-acces.md`
- `docs/comparticio-docents.md`
- `docs/checklist-final-seguretat.md`

## Eines auxiliars

- `docs/google-forms-sociograma.md`: guia per crear un Google Forms sociomètric i importar-ne les respostes a Avaluapro.
- `scripts/generar-formulari-sociometric-avaluapro.gs`: Apps Script per generar automàticament el formulari sociomètric i una plantilla compatible amb Avaluapro.

## Desenvolupament

Projecte creat amb Vite + React.

Comandes habituals:

```bash
npm install
npm run dev
npm run lint
npm run build
```
