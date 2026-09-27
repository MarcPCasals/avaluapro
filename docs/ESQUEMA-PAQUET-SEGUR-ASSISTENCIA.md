# Esquema del paquet segur d’assistència

**Versió de l’esquema:** 1
**Versió de la política:** 1
**Estat actual:** recorregut complet implementat localment: validador, regeneració, revisió, exportació controlada i importació exclusiva a l’entorn d’assistència. Encara no està publicat.

## Finalitat

El paquet segur servirà només per reproduir una incidència que no es pugui reproduir amb el conjunt sintètic general. No és una còpia anonimitzada d’AvaluaPro ni una còpia de seguretat.

El paquet només pot arribar a l’entorn d’assistència després que l’eina local, utilitzada directament per Marc, hagi regenerat la informació i el validador l’hagi acceptada. La pantalla de preparació i exportació existeix dins `Dades i Compte → Còpies i estat`, i la càrrega només existeix dins l’entorn aïllat. Cap d’aquests canvis està publicat encara.

## Principi de llista tancada

El validador no busca únicament paraules perilloses. Defineix exactament tots els camps i valors que poden existir. Qualsevol camp desconegut provoca el rebuig complet del paquet.

No hi ha cap camp de text lliure. Les úniques etiquetes admeses segueixen patrons impersonals:

- `Grup 01`, `Grup 02`…
- `Àrea 01`, `Àrea 02`…
- `Alumne 01`, `Alumne 02`…
- `Competència 01`, `Criteri 01` i `Tasca 01`…

## Capçalera obligatòria

El paquet declara obligatòriament:

- tipus `avaluapro-assistance-safe-package`;
- versió d’esquema `1`;
- política `deidentified-safe-package`;
- absència de dades reals;
- persistència només en memòria;
- generador local autoritzat;
- política de validació `1` amb estat superat.

Aquestes declaracions no es consideren una prova suficient: el contingut complet es torna a validar sempre.

## Informació estructurada permesa

| Col·lecció | Informació permesa | Informació exclosa |
| --- | --- | --- |
| Grups | ID nou, etiqueta fictícia, àrea fictícia i indicador de tutoria | nom real del grup, curs, centre o docent |
| Alumnes | ID nou, etiqueta `Alumne NN`, mig grup, nivell regenerat i recomptes limitats | noms, correus, fotos, documents, diagnòstics i text lliure |
| Avaluació | competències i criteris numerats, colors tancats i nivells A–D/NA | descripcions curriculars, comentaris i valors originals identificables |
| Seguiment | tasques numerades, períodes abstractes i estats tancats | títols reals, dates exactes i observacions |
| Absències | dia i franja abstractes, hores limitades | dates, hores, motius i justificacions reals |
| Sociometria | relacions regenerades `positive` o `avoid` | respostes, formularis, tokens i relacions originals |

## Identificadors i relacions

- Tots els identificadors han de ser UUID v4 nous amb un prefix segur segons el tipus.
- No s’admeten identificadors de Firebase, hashes ni correspondències reversibles.
- No es pot repetir cap identificador, inclosos els criteris.
- Tota referència ha d’apuntar a un element existent dins del mateix paquet.
- Les relacions entre alumnat, tasques, absències i grups han de conservar coherència interna.
- No s’admet una relació sociomètrica d’un perfil amb si mateix.

## Causes de rebuig automàtic

El paquet es rebutja completament si apareix qualsevol d’aquestes situacions:

- camp desconegut;
- etiqueta que no segueix el patró fictici;
- correu, URL, data exacta o altre text introduït dins una etiqueta;
- identificador no regenerat o repetit;
- valor fora dels catàlegs tancats;
- recompte negatiu, excessiu o incoherent;
- referència absent o creuada entre grups;
- col·lecció per sobre del límit de seguretat;
- capçalera o política incompletes.

Els errors només indiquen el tipus d’incidència i la posició estructural segura. No reprodueixen el nom d’un camp desconegut ni el seu valor.

## Regeneració implementada

El motor pur actual:

- usa la font només per conèixer una estructura mínima de classes, alumnat, competències, criteris i tasques;
- limita el paquet a sis classes, quatre competències, quatre criteris per competència i vuit tasques per classe;
- arrodoneix la mida dels grups a les franges 12, 18, 24, 30 o 36, de manera que no conserva el recompte exacte;
- crea nous UUID v4 criptogràfics sense hash ni correspondència exportada;
- crea de zero totes les etiquetes impersonals;
- regenera qualificacions, recomptes, suport fictici, seguiment i absències sense consultar els valors originals;
- regenera les relacions sociomètriques i no copia les relacions d’origen;
- manté totes les dates com a índexs abstractes;
- valida el paquet complet abans de retornar-lo;
- retorna únicament el paquet nou i un resum de recomptes, mai la font ni un mapa de correspondències.

El motor continua sense accés directe a IndexedDB, Firebase ni la botiga real. La pantalla rep l’estat ja disponible a AvaluaPro, en deriva immediatament una font mínima i només passa aquesta estructura limitada al generador. L’acció sempre l’inicia Marc i la font no s’exporta ni s’exposa a l’entorn d’assistència.

## Exportació local implementada

- Marc inicia la preparació amb un botó específic; no s’executa automàticament.
- El paquet nou només es conserva temporalment en memòria.
- La pantalla mostra vuit recomptes i cap nom, perfil, valor individual o correspondència.
- La descàrrega continua bloquejada fins que Marc escriu exactament `EXPORTAR PAQUET SEGUR`.
- El resultat es valida de nou immediatament abans de crear el fitxer.
- El fitxer té un nom fix no identificable: `avaluapro-paquet-segur-v1.json`.
- El paquet temporal es descarta després de descarregar, cancel·lar o fallar una validació.
- El mateix recorregut es pot provar a l’entorn aïllat amb el conjunt sintètic integrat, sense obrir el compte real.

## Importació aïllada implementada

- L’entrada de fitxers només es compila dins l’aplicació d’assistència.
- Rebutja fitxers de més de 2 MiB abans d’analitzar-los.
- No mostra ni conserva el nom del fitxer seleccionat.
- Analitza el JSON i aplica una primera validació completa abans de mostrar el resum.
- No mostra incidències amb valors ni fragments del contingut rebutjat.
- Exigeix escriure exactament `CARREGAR PAQUET SEGUR`.
- L’adaptador de memòria torna a validar el paquet abans de convertir-lo en dades visibles.
- La conversió afegeix únicament camps visuals sintètics: dates basades en una referència fixa, franges horàries fictícies, notes buides i diagnòstics buits.
- La càrrega queda marcada com a canvi temporal i es pot desfer tornant al conjunt sintètic integrat.
- No hi ha cap camí d’escriptura cap a l’aplicació real, Firebase ni l’emmagatzematge del navegador.

## Flux operatiu implementat

1. Marc inicia la generació dins l’AvaluaPro real sense una sessió de Codex inspeccionant la pantalla.
2. El motor de generació crea una transformació temporal en memòria.
3. Descarta camps prohibits i regenera identificadors, etiquetes, dates, valors i relacions.
4. El validador comprova el resultat complet.
5. Marc veu només un resum de recomptes i categories, sense contingut identificable.
6. Només un resultat completament vàlid es pot exportar.
7. L’entorn d’assistència torna a validar-lo abans de carregar-lo en memòria.
8. El paquet desapareix en restablir, recarregar o tancar la sessió i no es pot reimportar a l’aplicació real.

## Límit important del validador

El validador pot demostrar que el format no conté camps lliures, identificadors originals ni etiquetes identificables. Per si sol no pot demostrar que una seqüència numèrica de qualificacions o absències no s’ha copiat d’un perfil real.

El motor actual regenera aquests patrons, i tant la pantalla local de revisió i exportació com l’importador exclusiu amb segona validació estan implementats. Això no permet considerar segura una conversió manual o un JSON que només hagi canviat els noms: l’únic origen admès continua sent l’exportador específic d’AvaluaPro.
