# Google Forms per al sociograma

Aquest document explica com crear un qüestionari sociomètric amb Google Forms i importar-ne les respostes a Avaluapro.

## Objectiu

El formulari demana a cada alumne:

- el seu nom;
- 4 companys o companyes amb qui li agrada estar o treballar;
- 3 companys o companyes amb qui li costa més estar o treballar.

Avaluapro pot importar aquestes respostes i convertir-les en relacions del sociograma:

- eleccions positives;
- rebuigs o incompatibilitats;
- mètriques de cohesió;
- classificació social orientativa.

## Fitxer d'Apps Script

El codi està a:

`scripts/generar-formulari-sociometric-avaluapro.gs`

## Com crear el formulari

1. Ves a `https://script.google.com/`.
2. Crea un projecte nou.
3. Enganxa el contingut de `scripts/generar-formulari-sociometric-avaluapro.gs`.
4. Substitueix la llista `ALUMNES` pels alumnes reals de la classe.
5. Revisa `CONFIG_AVALUAPRO.classe`.
6. Executa `crearFormulariSociometricAvaluapro()`.
7. Accepta els permisos de Google.
8. Copia l'enllaç del formulari que apareix al registre d'execució.

El mateix script crea també un full de respostes vinculat.

## Com importar les respostes a Avaluapro

1. Obre el full de respostes del Google Forms.
2. Copia les files amb les columnes:

   `Alumne`, `Eleccio 1`, `Eleccio 2`, `Eleccio 3`, `Eleccio 4`, `Rebuig 1`, `Rebuig 2`, `Rebuig 3`.

3. Ves a Avaluapro.
4. Obre `Mode tutoria`.
5. Ves a `Relacions`.
6. Clica `Qüestionari sociomètric`.
7. Enganxa les respostes.
8. Revisa els avisos de noms aproximats o alumnes no trobats.
9. Clica `Importar relacions`.

## Recomanació pràctica

Abans d'enviar el formulari al grup real, fes una prova amb 3 o 4 respostes fictícies. Això permet comprovar que:

- els noms coincideixen amb els d'Avaluapro;
- les columnes s'importen bé;
- el sociograma es genera com esperes.

## Notes tècniques

Google Forms no pot impedir fàcilment que un alumne es repeteixi o es triï a si mateix si fem servir desplegables senzills. Avaluapro ja revisa aquests casos en importar:

- si un alumne es tria a si mateix, ho marca com a incidència;
- si una mateixa parella apareix com a elecció i rebuig, conserva el rebuig;
- si un nom no coincideix exactament, intenta fer coincidència aproximada.

Aquest enfocament és menys sofisticat que una app pròpia de formularis, però és molt més ràpid, robust i fàcil d'usar en un centre educatiu.
