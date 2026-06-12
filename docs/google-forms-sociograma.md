# Google Forms per al sociograma

Aquest document explica com crear una plantilla reutilitzable de Google Sheets + Google Forms per recollir respostes sociomètriques i importar-les a Avaluapro.

## Objectiu

El qüestionari demana a cada alumne:

- el seu nom;
- 4 companys o companyes amb qui li agrada estar o treballar;
- 3 companys o companyes amb qui li costa més estar o treballar.

Avaluapro pot importar aquestes respostes i convertir-les en:

- eleccions positives;
- rebuigs o incompatibilitats;
- mètriques de cohesió;
- classificació social orientativa;
- dades útils per a sociograma, grups cooperatius i disposició d'aula.

## Fitxer d'Apps Script

El codi està a:

`scripts/generar-formulari-sociometric-avaluapro.gs`

## Idea general

No cal editar el codi cada vegada que canvia la classe.

La forma recomanada és crear un Google Sheets que faci de plantilla. Dins aquest full hi haurà un menú anomenat `Avaluapro` amb tres accions:

- `Preparar plantilla`;
- `Crear formulari sociomètric`;
- `Crear full d'importació`.

Cada curs o cada tutoria només cal fer una còpia del full, enganxar els alumnes nous i generar el formulari.

## Crear la plantilla una sola vegada

1. Crea un Google Sheets nou amb un nom tipus `Plantilla sociograma Avaluapro`.
2. Ves a `Extensions > Apps Script`.
3. Enganxa el contingut de `scripts/generar-formulari-sociometric-avaluapro.gs`.
4. Desa el projecte.
5. Torna al Google Sheets i recarrega la pàgina.
6. Apareixerà el menú `Avaluapro`.
7. Clica `Avaluapro > Preparar plantilla`.

El full crearà aquestes pestanyes:

- `Configuració`;
- `Alumnes`;
- `Enllaços`;
- `Import Avaluapro` quan calgui.

## Crear un formulari per a una classe

1. A la pestanya `Configuració`, revisa:
   - `Classe`;
   - `Eleccions positives`;
   - `Rebuigs`.
2. A la pestanya `Alumnes`, enganxa els alumnes de la tutoria, un per fila.
3. Clica `Avaluapro > Crear formulari sociomètric`.
4. Accepta els permisos de Google si ho demana.
5. El full guardarà els enllaços a la pestanya `Enllaços`.

Els enllaços importants són:

- formulari per editar;
- formulari per respondre;
- full de respostes.

## Reutilitzar la plantilla cada any

La recomanació és no barrejar respostes de cursos diferents.

Per a cada curs o classe:

1. Obre la plantilla original.
2. Fes `Fitxer > Fes-ne una còpia`.
3. Canvia el nom del fitxer, per exemple `Sociograma 2n B 2026-2027`.
4. Canvia la classe a `Configuració`.
5. Enganxa els alumnes nous a `Alumnes`.
6. Crea el formulari.

Així cada tutoria té el seu formulari i el seu full de respostes.

## Importar les respostes a Avaluapro

1. Obre el full de respostes vinculat al Google Forms.
2. Copia les columnes:

   `Alumne`, `Elecció 1`, `Elecció 2`, `Elecció 3`, `Elecció 4`, `Rebuig 1`, `Rebuig 2`, `Rebuig 3`.

3. Ves a Avaluapro.
4. Obre `Mode tutoria`.
5. Ves a `Relacions`.
6. Clica `Qüestionari sociomètric`.
7. Enganxa les respostes.
8. Revisa els avisos de noms aproximats o alumnes no trobats.
9. Clica `Importar relacions`.

## Crear un full d'importació manual

Si no vols fer servir Google Forms, pots crear una taula buida amb el mateix format:

1. Clica `Avaluapro > Crear full d'importació`.
2. Omple les columnes manualment.
3. Copia la taula i importa-la a Avaluapro.

## Recomanació pràctica

Abans d'enviar el formulari al grup real, fes una prova amb 3 o 4 respostes fictícies. Això permet comprovar que:

- els noms coincideixen amb els d'Avaluapro;
- les columnes s'importen bé;
- el sociograma es genera com esperes.

## Notes tècniques

Google Forms no pot impedir fàcilment que un alumne es repeteixi o es triï a si mateix si fem servir desplegables senzills. Avaluapro revisa aquests casos en importar:

- si un alumne es tria a si mateix, ho marca com a incidència;
- si una mateixa parella apareix com a elecció i rebuig, conserva el rebuig;
- si un nom no coincideix exactament, intenta fer coincidència aproximada.

Aquest enfocament és menys sofisticat que una app pròpia de formularis, però és ràpid, robust i fàcil d'usar en un centre educatiu.
