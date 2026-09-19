# Iteració 19 — Pilot d'una UP i un grup

Estat: `PILOT CREAT I PUBLICAT · PRIMER BLOC CALENDARITZAT`.

Data de preparació: 19 de setembre de 2026.

## 1. Abast

Aquest és un pilot personal del docent dins del seu espai privat d'AvaluaPro. No és un pilot institucional ni incorpora altres docents. S'utilitzarà una sola UP, un sol grup i l'horari real durant dues o tres setmanes.

Queden fora del pilot:

- migració completa de l'Agenda antiga;
- activació massiva per a altres usuaris;
- enviament automàtic de correus;
- decisions institucionals, comercials o de protecció de dades de tercers;
- canvis amplis no relacionats amb una incidència observada.

## 2. Selecció del pilot

Cal fixar aquestes dades abans de crear res a Programació:

| Camp | Valor |
| --- | --- |
| Grup | `1rD` |
| Assignatura | Ciències Físiques i de la Natura (CFN) |
| Codi i títol de la UP | `UP 1.1 · La fórmula secreta` |
| Document o contingut d'origen | `Taller 1.1 CFN.docx` |
| Dies i hores reals | Dilluns 08:30–09:30; dimecres 11:00–12:00; divendres 08:30–09:30 mig grup B i 12:00–13:00 mig grup A, al Laboratori 2 |
| Durada normal de la sessió | 60 minuts, amb 55 minuts programables |
| Data de primera sessió | Dimecres 23 de setembre de 2026, 11:00–12:00 |
| Durada del pilot | 2 o 3 setmanes |
| Dispositius | Ordinador i almenys una sessió amb iPad |

Els grups que la versió publicada mostra actualment són `1rC`, `1rD`, `SG`, `PI 3rA` i `PI I`. El curs, la UT, la UP, l'horari i el primer bloc de sessions ja s'han creat dins l'espai autenticat del docent.

## 3. Adaptació de la UP 1.1

- El Word conté 22 activitats. S'han conservat totes, amb les descripcions, els agrupaments, els materials i els comentaris d'aplicació.
- Les files sumen 1.300 minuts. El total de 1.330 minuts imprès al document no coincideix amb la suma verificable i no s'ha traslladat.
- Les activitats es mantenen en l'ordre original de l'1 al 22. Les subfases repetides `P1`, `R1` i `R2` s'han desambiguat perquè l'Agenda no les reordeni.
- S'han normalitzat els títols llargs, el nivell `1r d'ESO`, els moments pedagògics, els recursos curriculars i les tasques amb evidència final.
- Els materials que cal comprar, preparar, imprimir, reservar o dur com a alumne generen recordatoris amb un dia d'antelació.
- Les dues pràctiques s'han vinculat al `Laboratori 2`.
- El JSON importable és `docs/dev/pilot/iteracio-19/up-1-1-cfn-1rd.json` i es pot regenerar sense tocar el Word original amb `scripts/build-pilot-up-1-1.mjs`.

## 4. Regla dels mitjos grups

Les franges A i B del mateix divendres són dues sessions reals, però una sola passa pedagògica. Totes dues reben la mateixa activitat, els mateixos minuts i el mateix número de fragment. La següent activitat només avança després que els dos mitjos grups hagin fet el tram compartit.

La previsualització mostra el mig grup i l'espai, i el resum de minuts compta una sola vegada el contingut duplicat per A i B. Quan es reprèn la calendarització, el progrés de la UP també evita sumar-lo dues vegades.

## 5. Línia de base tècnica

- Darrer canvi funcional publicat: `8c0aeb5`.
- Pla de treball: `898ef4f`.
- Firebase Hosting: `https://avaluapro.web.app`.
- Estat autenticat observat: `Sincronitzat`; Programació i Agenda mostren `Desat` i zero canvis pendents.
- Auditoria Firebase: `readyToDeploy: false` per una diferència preexistent d'un qüestionari sociomètric antic que no forma part del pilot.
- Regles locals i publicades: hash idèntic `3a68adcdd8f5312fd64368f5a58cc1c0c6b9dd3d89d389680ce7f91b81379c73`.
- Avís conegut: el qüestionari antic informa de 9 respostes públiques, 8 declarades i 8 privades. No s'ha reconciliat ni modificat durant aquest treball.

## 6. Execució del pilot

El 19 de setembre de 2026 s'ha creat i comprovat a producció:

- curs `2026-2027`;
- `UT 1`, del 9 de setembre al 22 de desembre de 2026;
- `UP 1.1 · La fórmula secreta`, amb 22 activitats i 1.300 minuts verificables;
- horari `Horari 2026-2027`, vigent des del 9 de setembre, amb quatre franges de 1rD;
- primer bloc progressiu de 8 activitats i 495 minuts, distribuït en 12 sessions reals del 23 de setembre al 12 d'octubre.

S'ha verificat en la cronologia publicada que les sessions del divendres 25 de setembre comparteixen exactament els mateixos fragments: `Grup B` a les 08:30 i `Grup A` a les 12:00. La mateixa regla s'aplica als divendres 2 i 9 d'octubre.

Durant la comprovació s'han resolt dues friccions reals:

- la lectura per grup conservava les 12 sessions a Firebase però no les mostrava si faltava un índex compost; la consulta ara manté el filtre privat del grup i ordena el resultat breu al client (`6313bc0`);
- la portada d'Agenda només carregava la setmana actual i podia dir que no hi havia pròxima sessió; ara obre un horitzó de sis setmanes, suficient per als períodes habituals de vacances (`8c0aeb5`).

La verificació funcional inclou 43 proves de domini i documents, 84 proves de regles de Firestore, lint, compilació de producció, lectura autenticada de la cronologia i comprovació directa dels 12 documents de sessió desats a Firebase.

## 7. Preparació abans de la primera classe

1. Crear el curs acadèmic amb les dates reals.
2. Crear les UT del curs.
3. Importar o escriure la UP seleccionada i revisar-ne fases, subfases, activitats, minuts i materials.
4. Crear l'horari anual i marcar els mitjos grups quan correspongui.
5. Assignar la UP al grup i previsualitzar la calendarització.
6. Confirmar només les primeres sessions necessàries; la resta es pot incorporar progressivament.
7. Esperar que Programació i Agenda mostrin `Desat` o `Sincronitzat` i zero canvis pendents.
8. Crear una còpia de seguretat al núvol després del primer canvi confirmat.
9. Obrir la primera sessió des d'Agenda sense modificar dades i revisar activitats, materials i alumnat.

## 8. Rutina de cada sessió

### Abans

- comprovar que el dispositiu té connexió o que la còpia local està disponible;
- obrir Agenda i confirmar que la sessió, el grup i els materials són els esperats;
- anotar només si hi ha un desajust.

### Durant

- passar llista;
- utilitzar el cronòmetre quan sigui útil;
- avançar les activitats i registrar únicament excepcions;
- marcar tasques, comportament, absències o sortides només quan correspongui;
- evitar canviar simultàniament la mateixa sessió des de dos dispositius.

### Després

- tancar la classe amb el resum;
- esperar l'estat `Sincronitzat`;
- comprovar que no queda cap canvi pendent;
- registrar una incidència només si el resultat no coincideix amb l'acció feta;
- l'endemà, reobrir almenys una sessió de mostra per confirmar temps, notes i activitats.

## 9. Registre d'incidències

Només s'hi anotaran problemes o friccions reals. Les dades d'alumnat no s'escriuran en aquest document: s'utilitzaran codis neutres com `alumne A`.

| Data i hora | Dispositiu | Pas | Resultat esperat | Resultat observat | Estat de sincronització | Severitat | Resolució |
| --- | --- | --- | --- | --- | --- | --- | --- |

Severitat:

- `BLOQUEIG`: impedeix fer la classe o hi ha risc de pèrdua de dades;
- `ALTA`: l'acció es pot completar només amb una volta important;
- `MITJANA`: causa confusió o feina repetida;
- `BAIXA`: detall visual o de text sense impacte operatiu.

## 10. Controls de dades i sincronització

Es comprovaran aquests punts a les 24 hores, al cap d'una setmana i al final:

| Control | 24 h | 1 setmana | Final |
| --- | --- | --- | --- |
| Canvis pendents en tancar |  |  |  |
| Errors de sincronització |  |  |  |
| Conflictes entre dispositius |  |  |  |
| Sessions creades |  |  |  |
| Sessions tancades |  |  |  |
| Resultats reoberts i coincidents |  |  |  |
| Còpia diària disponible |  |  |  |
| Lectures Firebase |  |  |  |
| Escriptures Firebase |  |  |  |
| Emmagatzematge Firebase |  |  |  |

Les mètriques de Firebase es compararan amb la línia de base anterior al pilot. Un augment ha de poder explicar-se per les sessions i els canvis reals; una sincronització sense canvis no ha de generar escriptures de files.

## 11. Criteris de pausa

El pilot s'atura abans de continuar si passa qualsevol d'aquests casos:

- una edició confirmada no reapareix després de recarregar;
- la cua deixa canvis pendents sense recuperació automàtica;
- un dispositiu substitueix dades més noves sense mostrar conflicte;
- una nota privada es mostra a un accés compartit;
- una absència o una tasca modifica l'alumne equivocat;
- Firebase informa d'un error de quota persistent.

En cas de pausa, es conserva la còpia local, no es força una reconciliació completa i es compara primer el recompte local, la cua i la còpia del núvol.

## 12. Criteris de tancament

El pilot es considera correcte quan:

- totes les sessions de la mostra es poden preparar, obrir i tancar;
- no hi ha pèrdua ni duplicació de dades;
- ordinador i iPad mostren el mateix estat després de sincronitzar;
- les modificacions de temps i ordre redueixen feina respecte de l'Agenda antiga;
- les lectures i escriptures es mantenen dins d'un patró explicable;
- les incidències de severitat alta o bloqueig estan resoltes;
- es pren una decisió escrita: continuar, repetir el pilot o corregir abans d'ampliar-lo.
