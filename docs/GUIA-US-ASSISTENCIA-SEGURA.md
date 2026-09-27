# Guia breu d’ús de l’assistència segura

## Idea essencial

Marc continua veient els noms i les dades reals dins el seu AvaluaPro habitual. L’assistent tècnic només ha de treballar a l’entorn separat **AvaluaPro Assistència**, amb alumnes ficticis.

El paquet segur és una excepció per reproduir una incidència que no apareix amb la demostració integrada. No és una còpia de seguretat, no conserva els perfils reals i no es pot restaurar a AvaluaPro.

> **Situació actual:** aquesta funció està preparada i comprovada localment, però encara no està publicada. No apareixerà a l’AvaluaPro que utilitza Marc fins que es faci un desplegament separat i explícit.

## Cas normal: no generar cap fitxer

1. Explicar la incidència sense noms, captures ni exemples reals.
2. Demanar que es reprodueixi amb el conjunt fictici integrat.
3. Utilitzar el paquet segur només si la incidència continua sense aparèixer.

## Generar el paquet segur

Aquests passos els fa **Marc tot sol** dins l’AvaluaPro real. L’assistent no ha d’obrir ni inspeccionar aquesta pantalla.

1. Obrir `Dades i Compte`.
2. Entrar a `Còpies i estat`.
3. Localitzar `Paquet segur per a assistència tècnica`.
4. Prémer `Preparar resum segur`.
5. Revisar únicament els vuit recomptes mostrats.
6. Escriure exactament `EXPORTAR PAQUET SEGUR`.
7. Prémer `Descarregar paquet segur`.

El fitxer correcte es diu sempre:

`avaluapro-paquet-segur-v1.json`

No cal obrir-lo ni modificar-lo.

## Fer-lo servir amb l’assistent

1. Treballar en una tasca dedicada al projecte AvaluaPro.
2. Indicar explícitament: `Utilitza només l’entorn d’assistència i aquest paquet segur`.
3. Adjuntar només `avaluapro-paquet-segur-v1.json`.
4. L’assistent ha d’obrir exclusivament l’entorn local iniciat amb `npm run dev:assistance` o `npm run preview:assistance`.
5. Dins la pestanya `Paquet`, seleccionar el fitxer i revisar els recomptes.
6. Escriure exactament `CARREGAR PAQUET SEGUR`.
7. Fer les comprovacions amb els perfils `Alumne 01`, `Alumne 02`…
8. Prémer `Restableix la demostració` o tancar la sessió quan s’acabi la prova.

## Fitxers que no s’han d’adjuntar mai

- còpies de seguretat d’AvaluaPro;
- exports ordinaris JSON, CSV, Excel o PDF;
- captures de pantalla de l’aplicació real;
- llistes de classe;
- fotografies, informes, diagnòstics o observacions;
- un JSON editat manualment per canviar només els noms;
- qualsevol fitxer amb un nom diferent si no se’n coneix amb certesa l’origen.

L’importador segur rebutjarà una còpia ordinària perquè conté camps no admesos, però la regla principal continua sent no lliurar-la.

## En acabar

1. Restablir o tancar l’entorn d’assistència: el paquet carregat desapareix de la memòria.
2. Eliminar el fitxer `avaluapro-paquet-segur-v1.json` de Descàrregues quan la incidència estigui resolta.
3. No reutilitzar un paquet antic per a una incidència diferent; generar-ne un de nou si torna a ser imprescindible.

## Si s’ha seleccionat o adjuntat un fitxer incorrecte

1. Aturar la prova immediatament.
2. No demanar a l’assistent que l’obri ni que comprovi si és segur.
3. Retirar l’adjunt si encara és possible.
4. Si una còpia amb dades reals ja s’ha obert o transmès, tractar-ho com una possible incidència de privacitat i seguir el procediment del centre.

## Recordatori final

- **Marc:** veu i gestiona les dades reals al seu compte.
- **Entorn d’assistència:** només mostra dades fictícies o regenerades.
- **Assistent tècnic:** no entra al compte real, no veu noms reals i no fa la comprovació autenticada final.
