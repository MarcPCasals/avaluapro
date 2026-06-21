# Bloc 9: revisio final de seguretat

Data: 4 de juny de 2026

Avís d'actualització: aquest document recull una revisió anterior. La situació actual de les rules compartides, els qüestionaris sociomètrics i les mesures institucionals es troba a `docs/checklist-desplegament-rules-2026-06.md` i `docs/mesures-tecniques-organitzatives-preliminars.md`.

Aquest document recull la revisio final que es pot fer des del projecte i separa les comprovacions que necessiten comptes reals, dispositius reals o una accio manual del docent.

## Resultat tecnic local

| Comprovacio | Estat | Resultat |
| --- | --- | --- |
| Build de produccio | Correcte | `npm run build` passa correctament. Hi ha un avis de mida de chunk de Vite, no bloquejant. |
| Lint | Correcte | `npm run lint` passa correctament. |
| Espais i diff | Correcte | `git diff --check` passa correctament. |
| Carrega local de l'app | Correcte | L'app carrega a `http://127.0.0.1:5173/avaluapro/` i mostra la demo, la navegacio principal, classes, UTs i menus. |
| Pantalla de dades i seguretat | Correcte | Es mostra usuari, sincronitzacio, copia al nuvol, mida local, accions de copia/restauracio i esborrat. |

## Checklist de proves del bloc 9

| Punt | Estat | Detall |
| --- | --- | --- |
| 1. Revisar consola sense errors | Parcial | La pantalla local renderitza sense error visible i build/lint passen. Cal confirmar la consola real de Chrome/Safari en l'entorn desplegat. |
| 2. Provar login amb diversos comptes | Pendent de prova real | Cal provar-ho amb el compte de Marc i almenys un compte docent extern. Despres cal confirmar que apareixen a Firebase Authentication. |
| 3. Provar restauracio de backup | Pendent de prova real | El flux i la pantalla estan disponibles. Cal provar amb un backup manual real i comprovar que les dades restaurades son correctes. |
| 4. Provar enviament de notes | Pendent de prova real | Les rules i el flux de paquets estan preparats. Cal prova amb dos comptes: emissor i receptor. |
| 5. Provar esborrat total | Pendent amb precaucio | La pantalla explica l'us de reinici de curs i permet descarregar copia abans. Fer-ho nomes despres de guardar backup. |
| 6. Provar iPad/Safari | Pendent de dispositiu real | Cal provar login, carregar dades, posar notes, refrescar pagina i comprovar persistencia. |
| 7. Provar usuari nou sense dades | Correcte localment | Un usuari sense sessio veu la demo inicial i pot accedir als menus de dades i ajuda. |
| 8. Checklist final de seguretat | Fet | Aquest document deixa la checklist preparada per revisio amb direccio/Ministeri. |

## Checklist final de seguretat

- Les rules preparades separen les dades privades per usuari a `/users/{uid}`; cal verificar la versió efectivament desplegada abans d'un pilot.
- Les dades privades d'un usuari no son llegibles per altres usuaris autenticats.
- Les copies al nuvol viuen dins del mateix espai privat de l'usuari.
- Els paquets de notes entre docents nomes es poden llegir pel docent emissor o pel correu destinatari.
- Les importacions i recepcions de paquets queden registrades al flux de comparticio.
- Les copies manuals JSON nomes es descarreguen quan l'usuari les demana.
- La pantalla de dades i seguretat explica estat de sessio, sincronitzacio, copies i mida local.
- L'esborrat total es presenta com una accio de reinici de curs i ofereix descarregar copia abans.
- Els camps sensibles han d'estar orientats a observacions pedagogiques i no a informacio medica o familiar innecessaria.
- Les fotos encara no fan servir Firebase Storage. La migracio esta documentada com a mesura futura recomanada.
- App Check esta documentat com a mesura futura per reforcar l'us public de Firebase.

## Proves manuals recomanades abans d'obrir a mes docents

1. Entrar a l'app desplegada amb el compte de Marc.
2. Entrar amb un segon compte docent `@educand.ad`.
3. Confirmar a Firebase Authentication que els dos comptes apareixen com a usuaris.
4. Crear una classe petita de prova amb alumnes ficticis.
5. Posar algunes notes i una tasca.
6. Crear una copia al nuvol.
7. Descarregar una copia manual JSON.
8. Esborrar dades amb el boto de reinici de curs.
9. Restaurar la copia manual JSON i comprovar que tornen classes, alumnes, notes i tasques.
10. Enviar notes des d'un compte docent a un altre.
11. Rebre i importar el paquet des del compte destinatari.
12. Comprovar que el compte emissor no pot veure dades privades del destinatari.
13. Provar el mateix flux en iPad Safari.

## Que cal apuntar si hi ha una incidencia

- URL exacta on passa.
- Compte utilitzat.
- Accio exacta que s'ha fet.
- Captura de pantalla.
- Missatge de consola si n'hi ha.
- Si afecta login: revisar dominis autoritzats, restriccions HTTP de la API key i Firebase Authentication.
- Si afecta sincronitzacio o backups: revisar rules de Firestore i mida de les dades.
