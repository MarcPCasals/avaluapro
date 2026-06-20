# Flux De Treball Checkpoint

Data del checkpoint: 20 de juny de 2026

## Bloc Actiu

Disposició d'aula.

Aquest arxiu passa a ser el checkpoint general viu del projecte.

La idea és simple:

- aquí hi deixem el bloc actiu;
- hi escrivim el flux de treball real;
- hi marquem què està tancat, què falta i quin és el següent pas;
- quan un bloc es tanqui, aquest document es reescriu amb el bloc nou.

Així no acumulem documents antics que després ja no aporten gaire valor.

## Context Actual

Avaluapro ja disposa de moltes dades útils per fer propostes de disposició d'aula:

- perfil acadèmic tutorial;
- seguiment tutorial;
- diagnòstics i mesures educatives;
- relacions socials i de treball;
- relacions a evitar;
- perfils cooperatius;
- lectures sociomètriques compartides;
- criteris de suport, vulnerabilitat i influència.

Per tant, el problema principal ja no és tant la manca de dades, sinó el fet que la funcionalitat de seating encara no és prou pràctica, clara i robusta per al dia a dia docent.

## Problemes Actuals Detectats

### 1. La vista és massa carregada

Les targetes dels alumnes mostren massa informació al mateix temps.

Conseqüència:

- costa veure patrons espacials;
- costa entendre ràpidament què està passant a l'aula;
- l'espai visual queda massa ocupat per text.

### 2. Modificar una proposta és feixuc

Quan la proposta automàtica no convenç, el docent no té un camí prou àgil per dir al programa:

- aquest alumne no el vull aquí;
- aquests dos no poden estar a prop;
- aquest alumne ha d'estar més controlat;
- aquesta zona no m'agrada;
- aquesta part de la proposta és bona i aquesta altra no.

### 3. Falta explicació pedagògica

El programa hauria de justificar millor:

- per què una proposta és bona;
- per què una proposta és dubtosa;
- per què un canvi manual empitjora o millora la situació.

### 4. No hi ha memòria real de disposicions

Ara mateix una proposta guardada no queda prou integrada com a historial recuperable.

Cal poder:

- guardar-la;
- recuperar-la;
- duplicar-la;
- comparar-la;
- marcar-la com a disposició activa.

## Objectiu General Del Bloc

```text
Passar de "tenir una proposta automàtica" a "tenir una eina de decisions d'aula clara, editable, explicable i recuperable"
```

## Principis De Disseny Del Bloc

### 1. Primer ha de ser llegible

La disposició d'aula és sobretot una eina espacial.

La vista principal ha de prioritzar:

- posició;
- color;
- alertes;
- relacions;
- criteri pedagògic.

No ha de prioritzar textos llargs dins de cada targeta.

### 2. L'edició manual ha de ser guiada

No n'hi ha prou amb poder moure alumnes.

Cal permetre:

- fixar;
- restringir;
- recalcular;
- demanar alternatives;
- entendre l'impacte dels canvis.

### 3. El programa ha de tenir opinió

No ha de ser una graella muda.

Ha de dir:

- això és equilibrat;
- això és arriscat;
- això empitjora;
- això millora per aquest motiu.

### 4. Guardar forma part del flux principal

La disposició d'aula no és una prova puntual.

És una estratègia que evoluciona al llarg del curs.

## Flux D'Ús Ideal

### Pas 1. Triar punt de partida

El docent pot escollir:

1. Generar una proposta nova.
2. Recuperar una disposició guardada.
3. Duplicar una disposició anterior.

### Pas 2. Definir objectiu principal

Abans de generar la proposta, el docent hauria de poder indicar el focus:

- equilibri general;
- més calma i conducta;
- més suport als vulnerables;
- millors relacions de treball;
- separar conflictes;
- més supervisió docent.

### Pas 3. Aplicar restriccions ràpides

Abans o després del càlcul, el docent pot indicar:

- mai a prop;
- millor a prop;
- zona preferent;
- zona a evitar;
- alumne fix;
- seient bloquejat.

### Pas 4. Generar proposta

El programa ha de retornar:

- distribució visual;
- lectura de qualitat;
- alertes;
- punts forts;
- punts a revisar.

### Pas 5. Ajust manual assistit

El docent pot:

- moure un alumne;
- fixar una posició;
- recalcular només una part;
- demanar una alternativa millor.

I el programa ha de respondre amb impacte pedagògic:

- millora;
- es manté acceptable;
- empitjora;
- conflicte detectat.

### Pas 6. Guardar i etiquetar

Quan la proposta és bona:

- guardar;
- posar nom;
- afegir observació;
- marcar com a activa.

## Proposta Funcional Del Redisseny

### Capa 1. Vista principal simplificada

Les targetes dels alumnes haurien de mostrar molt menys text.

Millor mostrar:

- nom curt;
- codi curt;
- color de perfil;
- icones petites;
- contorns o avisos visuals.

La informació extensa hauria d'anar a un panell lateral, no a la targeta principal.

### Capa 2. Panell lateral d'alumne

Quan cliques un alumne, s'obre un panell amb:

- resum del perfil;
- per què està on està;
- relacions properes positives;
- relacions de risc;
- motius de revisió;
- accions ràpides.

Accions ràpides previstes:

- mou aquest alumne;
- fixa aquest alumne;
- vull que estigui a prop de;
- vull que no estigui a prop de;
- necessita zona preferent;
- torna a calcular mantenint aquest alumne fix.

### Capa 3. Restriccions pedagògiques de seating

El bloc ha de tenir una secció pròpia de restriccions.

Tipus mínims:

- mai a prop;
- millor a prop;
- zona preferent;
- zona a evitar;
- alumne fix;
- seient bloquejat.

Aquestes restriccions han de ser visibles, editables i amb motiu curt.

### Capa 4. Motor d'explicació

Cada proposta hauria de portar:

- puntuació global;
- resum curt;
- coses que fa bé;
- coses que cal revisar;
- conflictes detectats;
- justificació dels canvis manuals.

### Capa 5. Historial de disposicions

Cada classe hauria de poder tenir:

- disposicions guardades;
- nom;
- data;
- observació;
- objectiu pedagògic;
- estat actiu.

I accions:

- recuperar;
- duplicar;
- comparar;
- eliminar;
- marcar com a activa.

## Flux De Treball Per Fases

### Fase 1: Redisseny Visual De La Graella

Objectiu: fer la disposició més neta, atractiva i llegible.

Incloure:

1. Targetes simplificades.
2. Menys text persistent.
3. Millor jerarquia visual.
4. Més pes de color, icones i alertes.
5. Més claredat espacial de la graella.

Resultat esperat:

El docent pot entendre la proposta d'un cop d'ull sense llegir cada targeta sencera.

### Fase 2: Panell Lateral D'Alumne I Accions Ràpides

Objectiu: fer que editar una proposta sigui pràctic.

Incloure:

1. Selecció d'alumne.
2. Panell lateral amb resum contextual.
3. Accions ràpides sobre posició i restriccions.
4. Explicació de per què està col·locat allà.

Resultat esperat:

El docent pot intervenir sobre alumnes concrets sense haver de lluitar contra la graella.

### Fase 3: Restriccions Pedagògiques De Seating

Objectiu: deixar que el docent digui millor què vol.

Incloure:

1. Mai a prop.
2. Millor a prop.
3. Zona preferent.
4. Zona a evitar.
5. Alumne fix.
6. Seient bloquejat.

Resultat esperat:

El programa entén millor el criteri docent abans de recalcular.

### Fase 4: Explicació I Validació De Propostes

Objectiu: convertir el seating en una eina que justifica decisions.

Incloure:

1. Score global.
2. Resum curt de qualitat.
3. Alertes automàtiques.
4. Explicació de conflictes.
5. Comparació abans/després de canvis manuals.

Resultat esperat:

El docent sap no només què ha generat el programa, sinó si és una bona proposta i per què.

### Fase 5: Guardat, Historial I Recuperació

Objectiu: donar memòria real a la disposició d'aula.

Incloure:

1. Guardar proposta.
2. Nom i observació.
3. Recuperar propostes.
4. Duplicar propostes.
5. Marcar disposició activa.
6. Comparar disposicions.

Resultat esperat:

La disposició d'aula passa a formar part de l'historial pedagògic real de la classe.

### Fase 6: Iteració Intel·ligent

Objectiu: arribar més de pressa a una proposta ferma.

Incloure:

1. Genera una alternativa.
2. Mantén aquests alumnes igual.
3. Recalcula només aquesta zona.
4. Millora aquesta proposta segons aquest objectiu.

Resultat esperat:

El docent pot iterar sense començar de zero cada vegada.

## Decisions De Producte A Respectar

1. La targeta d'alumne ha de ser visualment lleugera.
2. El detall ha d'anar fora de la targeta principal.
3. Les restriccions han de ser visibles i fàcils d'editar.
4. El programa ha d'explicar quan una proposta és dolenta.
5. Guardar i recuperar forma part del flux principal, no és un extra.

## Estat Actual D'aquest Bloc

Fases 1, 2, 3 i 4 implementades.

Completat:

- targetes d'alumne simplificades;
- menys text persistent;
- mig grup identificat amb color sense tenyir tota la targeta;
- estats pedagògics convertits en icones compactes;
- accions de fixar i revisar més discretes;
- taules lliures i espais desactivats amb menys pes visual;
- comprovació visual en escriptori i iPad.
- selecció directa d'alumne des de la graella;
- panell lateral amb resum contextual;
- explicació de zona, fila, columna i motius de col·locació;
- lectura d'alumnes propers i alertes de risc;
- accions ràpides per moure, fixar, revisar, deixar pendent i regenerar mantenint el lloc;
- comprovació funcional i visual de la Fase 2 en escriptori i iPad el 19 de juny de 2026.
- nom curt visual dins de la graella, per exemple `Duran Pi, Jana` es mostra com `Jana PD`, mantenint el nom complet al panell lateral;
- restriccions `mai a prop` i `millor a prop` entre alumnes;
- zona preferent i zona a evitar per alumne;
- alumnes fixats i seients bloquejats integrats en el càlcul;
- restriccions visibles, editables i comptabilitzades des del panell lateral i la barra de la graella;
- motor de proposta adaptat perquè tingui en compte les restriccions i avisi quan no es poden complir;
- restriccions incloses en les dades de la disposició quan es guarda;
- comprovació funcional i visual de la Fase 3 en escriptori i iPad el 20 de juny de 2026.
- score global de qualitat entre 0 i 100 amb nivells `Molt sòlida`, `Bona`, `Acceptable amb revisions` i `Riscosa`;
- resum pedagògic curt de cada proposta;
- punts forts visibles sobre compatibilitat, suport, seguiment docent, relacions de treball i compliment de restriccions;
- conflictes explicats amb noms d’alumnes i motiu concret;
- penalització reforçada dels conflictes crítics, com ara una relació de rebuig forta o una restricció `mai a prop` incomplerta;
- comparació automàtica abans/després dels canvis manuals, amb diferència de puntuació i conflictes resolts o afegits;
- comprovació del motor amb casos favorables i crítics, `lint` i build de producció el 20 de juny de 2026;
- validació visual específica de la Fase 4 pendent perquè el navegador integrat no s’ha pogut iniciar en aquesta sessió.

Següent pas pendent:

- Fase 5: guardat, historial i recuperació.

## Ordre Recomanat De Treball

1. Fase 1: redisseny visual de la graella. Completada.
2. Fase 2: panell lateral d'alumne i accions ràpides. Completada.
3. Fase 3: restriccions pedagògiques de seating. Completada.
4. Fase 4: explicació i validació de propostes. Completada.
5. Fase 5: guardat, historial i recuperació. Següent.
6. Fase 6: iteració intel·ligent.

## Missatge Recomanat Per Continuar

```text
Llegeix docs/dev/FLUX-DE-TREBALL-CHECKPOINT.md i continua amb la Fase 5 del bloc de disposició d'aula. No rellegeixis tota la conversa antiga.
```
