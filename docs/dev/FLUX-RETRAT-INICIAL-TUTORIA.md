# Flux de treball — Retrat inicial de la tutoria

## Estat del document

Implementació iniciada el 12 de setembre de 2026. Aquest document continua sent la referència funcional per decidir què s’ha de mostrar, com s’han d’interpretar les respostes i en quin ordre convé ampliar la funcionalitat.

### Progrés actual

- [x] Càlcul de cobertura i fitxes pendents.
- [x] Agregació de preguntes de resposta única i múltiple amb denominadors independents.
- [x] Classificació de l’accés a dispositius en categories útils per al tutor.
- [x] Sis gràfics prioritaris de la primera versió.
- [x] Avís quan ha respost menys de la meitat del grup.
- [x] Proves unitàries dels càlculs.
- [x] Revisió visual local amb dades fictícies en ordinador i iPad horitzontal.
- [ ] Comprovació amb respostes reals d’un formulari actiu.
- [x] Bloc d’actuacions tutorials privades amb accés directe a la fitxa individual.
- [x] Activitats extraescolars, reforç, dedicació setmanal i preferències al pati.
- [ ] Connexió amb el sociograma sense duplicar la funcionalitat existent.

## Objectiu

Transformar les respostes de la **Fitxa personal de l’alumnat** en un retrat inicial del grup que ajudi el tutor o tutora a prendre decisions durant les primeres setmanes de curs.

El retrat ha de permetre respondre preguntes concretes:

- D’on prové l’alumnat i quina diversitat lingüística té el grup?
- Quines ajudes declaren que els faciliten aprendre?
- Com prefereixen treballar?
- Què fan quan no entenen alguna cosa?
- Tenen condicions adequades per fer feina digital a casa?
- Quina càrrega d’activitats o reforç tenen fora de l’escola?
- Quins interessos i dinàmiques socials poden ajudar a cohesionar el grup?
- Quines actuacions individuals ha de prioritzar el tutor o tutora?

La finalitat no és diagnosticar ni classificar alumnes, sinó donar una primera orientació basada en allò que ells mateixos han declarat.

## Nom provisional de la funcionalitat

**Retrat inicial de la tutoria**

Altres noms possibles:

- Radiografia inicial del grup.
- Coneixem la tutoria.
- Perfil inicial del grup.

“Retrat inicial” és el nom recomanat perquè comunica que és una fotografia orientativa d’un moment concret i no una descripció definitiva de l’alumnat.

## Principis de disseny

### 1. Les dades han de conduir a una decisió

Cada targeta o gràfic ha de respondre a una pregunta tutorial. Si una dada no pot modificar cap actuació, no cal destacar-la.

### 2. Declaració, no diagnòstic

Els textos de la interfície han de dir:

- “L’alumnat declara que...”
- “Preferències declarades...”
- “Respostes recollides a la fitxa inicial...”

No han de dir:

- “Aquest és un grup visual.”
- “Aquests alumnes són poc autònoms.”
- “Aquesta escola prepara millor o pitjor.”

### 3. No utilitzar “estils d’aprenentatge” rígids

La pregunta sobre què ajuda a aprendre s’ha d’interpretar com un conjunt de **preferències observables i ajudes declarades**, no com una tipologia fixa de l’alumne.

### 4. Separar retrat del grup i seguiment confidencial

Les dades pedagògiques agregades poden formar part del retrat del grup. Les dades de salut, família i seguiments personals han d’aparèixer només en una àrea privada d’actuacions tutorials.

### 5. Mostrar sempre la cobertura

Cap percentatge és interpretable si no se sap quants alumnes han respost.

La pantalla ha de mostrar sempre:

- Alumnes del grup.
- Fitxes enviades.
- Fitxes pendents.
- Data de la darrera resposta.
- Percentatge de participació.

### 6. No confondre absència de resposta amb una resposta negativa

“No ha respost”, “No” i “Prefereixo no respondre” són situacions diferents i s’han de conservar separades.

## Estructura general de la pantalla

### Capçalera — Estat de la recollida

Mostrar:

- `24 de 27 fitxes rebudes`.
- Percentatge de participació.
- Nombre de fitxes pendents de revisar.
- Data d’obertura i tancament del qüestionari.
- Avís quan la cobertura encara sigui insuficient per interpretar el grup.

Accions possibles:

- Veure qui falta per respondre.
- Obrir la gestió de respostes.
- Actualitzar el retrat després de rebre noves fitxes.

### Bloc 1 — Procedència i diversitat

Inclou:

1. Escola anterior.
2. Llengües utilitzades habitualment a casa.

### Bloc 2 — Com aprèn i treballa el grup

Inclou:

1. Què ajuda l’alumnat a aprendre.
2. Com prefereix treballar.
3. Què fa quan no entén alguna cosa.

Aquest és el bloc pedagògic principal.

### Bloc 3 — Condicions i càrrega fora de l’escola

Inclou:

1. Accés a dispositius per fer feina escolar.
2. Activitats extraescolars.
3. Reforç escolar.
4. Dedicació setmanal declarada.

### Bloc 4 — Interessos i cohesió

Inclou:

1. Preferències a l’hora del pati.
2. Accés al sociograma d’amistat i confiança.

### Bloc 5 — Atenció tutorial privada

Inclou alertes i actuacions pendents relacionades amb:

- Situacions de salut declarades.
- Pautes mèdiques o informes que cal revisar.
- Suports actuals.
- Suports escolars anteriors.
- Situacions familiars que l’alumne vol explicar.
- Alumnes que prefereixen parlar personalment.
- Missatges o expectatives que requereixen resposta del tutor.

Aquest bloc no ha de funcionar com una classificació del grup. Ha de funcionar com una llista privada de tasques i seguiments.

## Definició dels gràfics prioritaris

### Gràfic 1 — Què ajuda a aprendre

**Camp d’origen:** `learningHelps`

**Representació:** barres horitzontals ordenades de major a menor.

**Càlcul:**

- Comptar quants alumnes han marcat cada opció.
- Dividir cada recompte pel nombre de fitxes que han respost aquesta pregunta.
- Mostrar recompte i percentatge.

**Nota d’interpretació:** és una pregunta de resposta múltiple; els percentatges poden sumar més del 100 %.

**Decisions que pot facilitar:**

- Incorporar més exemples resolts.
- Escriure els passos de les tasques.
- Alternar explicació, pràctica i manipulació.
- Preveure més temps o suports visuals.

### Gràfic 2 — Com prefereix treballar el grup

**Camp d’origen:** `workPreferences`

**Representació:** barres horitzontals.

**Càlcul:** recompte i percentatge de cada preferència sobre les respostes vàlides.

**Nota d’interpretació:** les preferències no obliguen a treballar sempre de la mateixa manera. Serveixen per planificar varietat i introduir progressivament altres formes de treball.

### Gràfic 3 — Què fa quan no entén alguna cosa

**Camp d’origen:** `helpSeeking`

**Representació:** barra apilada al 100 % o barres horitzontals.

**Categories:**

- Ho torna a provar pel seu compte.
- Pregunta al professor o professora.
- Pregunta a un company o companya.
- Busca un exemple o una explicació.
- De vegades es queda bloquejat o bloquejada.

**Senyal tutorial destacat:** nombre d’alumnes que declaren que de vegades es queden bloquejats.

**Decisions que pot facilitar:** treballar estratègies per demanar ajuda, normalitzar l’error i oferir protocols quan apareix un bloqueig.

### Gràfic 4 — Accés digital per fer feina escolar

**Camps d’origen:**

- `homeDeviceAccess`
- `homeMobileCount`
- `homeTabletCount`
- `homeComputerCount`

**Representació:** barra apilada al 100 %.

**Categories derivades recomanades:**

1. Sense cap dispositiu disponible.
2. Només mòbil.
3. Tauleta o ordinador disponible.
4. Diversos tipus de dispositiu disponibles.

**Indicador principal:** alumnes sense tauleta ni ordinador disponible per fer feina escolar.

**Precaució:** el recompte d’aparells de la llar no garanteix que siguin d’ús propi o que estiguin sempre disponibles. En una futura versió del formulari convindria preguntar si l’accés és propi, compartit o ocasional i si hi ha connexió estable.

### Gràfic 5 — Escola de procedència

**Camps d’origen:**

- `previousSchool`
- `previousSchoolOther`

**Representació:** barres horitzontals.

**Indicadors complementaris:**

- Escola majoritària.
- Nombre d’escoles de procedència diferents.
- Nombre d’alumnes procedents d’escoles diferents de les opcions principals.

**Ús recomanat:** entendre necessitats de transició, coneixença i cohesió.

**Ús que cal evitar:** comparar rendiment o necessitats per escola quan els grups són petits.

### Gràfic 6 — Llengües familiars

**Camps d’origen:**

- `familyLanguages`
- `familyLanguageOther`

**Representació:** barres horitzontals de resposta múltiple.

**Indicadors complementaris:**

- Nombre de llengües presents al grup.
- Alumnes que declaren dues o més llengües habituals.

**Precaució:** la llengua familiar descriu la diversitat del grup, però no permet inferir per si sola el nivell lingüístic ni el rendiment acadèmic.

## Gràfics de la segona fase

### Activitats extraescolars i reforç

**Camps d’origen:**

- `hasExtracurriculars`
- `extracurricularActivities`
- `hasReinforcement`
- `reinforcementActivities`

**Representació recomanada:** barres per franges d’hores setmanals.

**Franges inicials:**

- Cap activitat.
- Entre 1 i 3 hores.
- Entre 4 i 6 hores.
- Entre 7 i 9 hores.
- 10 hores o més.

Cal mostrar la distribució i no només la mitjana, perquè una mitjana pot amagar situacions molt diferents.

### Preferències al pati

**Camp d’origen:** `breakPreferences`

**Representació:** barres horitzontals.

Es poden mantenir les activitats concretes i afegir una agrupació pedagògica revisable:

- Esports d’equip.
- Activitats tranquil·les.
- Activitats creatives.
- Socialització.
- Estudi o deures.

### Amistats i confiança

**Camp d’origen:** `classFriendIds`

**Representació:** sociograma separat.

**Lectures possibles:**

- Eleccions recíproques.
- Alumnes sense eleccions rebudes.
- Subgrups.
- Alumnes que connecten grups diferents.

El sociograma ha de ser visible només per als tutors autoritzats. No s’ha de projectar davant de l’alumnat ni incloure en exportacions ordinàries.

## Tractament de les respostes obertes

### Camps

- `learningChallenges`
- `tutorExpectations`
- `studentMessage`
- Altres respostes obertes relacionades amb aprenentatge i interessos.

### Criteri

No utilitzar un núvol de paraules com a representació principal. Pot descontextualitzar missatges personals i donar importància a paraules freqüents sense explicar-ne el sentit.

### Flux recomanat

1. El tutor llegeix la resposta original.
2. Pot assignar una o diverses etiquetes temàtiques.
3. Les etiquetes es poden resumir amb recomptes de classe.
4. La resposta original continua visible i separada de la interpretació del tutor.

### Etiquetes inicials possibles

- Organització i deures.
- Comprensió de les explicacions.
- Participació o por de preguntar.
- Relacions amb companys.
- Preocupacions personals.
- Necessitat d’ajuda individual.
- Confiança i escolta tutorial.
- Altres.

Les etiquetes automàtiques, si algun dia s’incorporen, han de ser sempre revisables i no han de substituir la lectura del tutor.

## Dades que no s’han de convertir en gràfics generals

Han de romandre a la fitxa individual o a la llista privada de seguiments:

- Nom, data i lloc de naixement.
- Adreça i parròquia concreta.
- Telèfons.
- Noms, professions i llocs de treball dels responsables.
- Noms i edats dels germans.
- Composició familiar detallada.
- Explicacions sobre situacions familiars.
- Detalls de salut, al·lèrgies, medicació o informes.
- Detall dels suports o seguiments personals.
- Missatges personals de l’alumne.

El nombre de germans, la professió familiar o la parròquia poden descriure el grup, però tenen poc valor pedagògic directe i poden afavorir lectures socials inadequades. No formen part de la primera versió del retrat.

## Regles de càlcul comunes

### Denominador

Cada gràfic ha d’utilitzar com a denominador el nombre d’alumnes amb una resposta vàlida a aquella pregunta, no necessàriament el total del grup.

Exemple:

```text
Veure exemples resolts: 18 de 24 respostes · 75 %
3 alumnes encara no han enviat la fitxa
```

### Respostes múltiples

En les preguntes on es poden marcar diverses opcions:

- Cada alumne compta una vegada dins de cada opció seleccionada.
- Els percentatges poden sumar més del 100 %.
- La interfície ho ha d’explicar de manera visible.

### Valors desconeguts o absents

No s’han de convertir en zero.

Cal distingir:

- Sense resposta.
- No.
- No ho sap.
- Prefereix no respondre.
- Prefereix parlar-ne personalment.

### Recalcular, no desar resultats duplicats

Els recomptes i percentatges s’han de calcular a partir de les respostes vigents. No convé desar una segona còpia permanent de cada estadística si es pot derivar de les dades originals.

### Actualització

El retrat s’ha d’actualitzar quan:

- Arriba una resposta nova.
- S’elimina una resposta errònia.
- Es reobre i es torna a enviar una fitxa.
- Canvia el conjunt d’alumnes de la classe.

## Privacitat i minimització

### Accés

El retrat i les actuacions derivades de la Fitxa personal només han d’estar disponibles dins del Mode tutoria i per als tutors o cotutors expressament autoritzats.

### Grups petits

Quan una categoria sensible correspon a molt pocs alumnes, el resum no ha de facilitar-ne la identificació indirecta.

Criteri inicial recomanat:

- En blocs pedagògics no sensibles, mostrar recomptes reals.
- En salut, família i suports, prioritzar “Hi ha seguiments pendents” i la llista privada d’accions.
- Evitar creuaments de variables sensibles.

### Exportacions

Els gràfics i resums de la Fitxa personal no s’han d’incorporar automàticament a:

- Paquets de notes.
- Informes acadèmics generals.
- Exportacions CSV o Excel ordinàries.
- Documents compartits amb altres docents sense permís tutorial.
- Materials projectats a l’aula.

Qualsevol exportació futura ha de tenir un propòsit explícit, una selecció manual i una revisió prèvia del contingut.

## Creuaments de dades

### Creuaments útils i prudents

- Ajudes per aprendre × preferències de treball.
- Accés digital × tipus de tasca prevista.
- Càrrega extraescolar × disponibilitat declarada, si en el futur es pregunta directament.

### Creuaments que cal evitar o revisar especialment

- Llengua familiar × rendiment.
- Escola de procedència × rendiment.
- Professió familiar × resultats.
- Situació familiar × conducta.
- Salut o suport × qualsevol classificació pública del grup.

Una coincidència estadística dins d’una classe petita no demostra una relació causal i pot reforçar prejudicis.

## Flux d’ús ideal

### Pas 1. Crear i compartir la Fitxa personal

El tutor crea el qüestionari de la classe i comparteix un únic enllaç amb l’alumnat.

### Pas 2. Recollir les respostes

La pantalla mostra l’estat de participació i permet identificar qui encara no ha enviat la fitxa.

### Pas 3. Revisar les fitxes individuals

Abans d’interpretar el grup, el tutor revisa:

- Identificacions errònies.
- Respostes incompletes o incoherents.
- Alertes personals urgents.
- Peticions per parlar personalment.

### Pas 4. Generar el retrat inicial

Quan hi ha prou respostes, Avaluapro genera els recomptes i gràfics a partir de les respostes vigents.

La generació no modifica les respostes originals.

### Pas 5. Llegir les idees clau

La pantalla destaca un màxim de tres o quatre observacions descriptives, per exemple:

- “La majoria del grup declara que li ajuden els exemples resolts i els passos escrits.”
- “5 alumnes indiquen que de vegades es queden bloquejats quan no entenen una tasca.”
- “4 alumnes no disposen de tauleta ni ordinador per fer feina escolar.”

Els textos han de descriure les dades, no diagnosticar ni prescriure automàticament.

### Pas 6. Convertir informació en actuacions

El tutor pot registrar decisions com:

- Preparar una rutina per demanar ajuda.
- Introduir més exemples resolts.
- Alternar treball individual, parelles i grup petit.
- Preveure una alternativa a una activitat digital a casa.
- Programar entrevistes individuals.
- Preparar una activitat de cohesió.

### Pas 7. Tornar al retrat durant el curs

El retrat inicial es conserva com a context, però no es tracta com una veritat permanent. Les observacions i dades del curs poden confirmar, matisar o contradir les preferències declarades inicialment.

## Ordre d’implementació recomanat

### Fase 1 — Base estadística

1. Definir la població i les respostes vàlides.
2. Calcular participació i cobertura.
3. Crear una utilitat comuna per a preguntes de resposta única.
4. Crear una utilitat comuna per a preguntes de resposta múltiple.
5. Separar dades sense resposta, desconegudes i confidencials.
6. Validar els càlculs amb dades de prova.

### Fase 2 — Primera pantalla útil

Implementar:

1. Estat de participació.
2. Ajudes per aprendre.
3. Preferències de treball.
4. Estratègies quan no s’entén una cosa.
5. Accés digital.
6. Escola de procedència.
7. Llengües familiars.

### Fase 3 — Accions tutorials privades

1. Crear el resum de seguiments pendents.
2. Enllaçar cada senyal amb la fitxa individual corresponent.
3. Permetre marcar una actuació com a revisada o pendent.
4. Comprovar els permisos de tutors i cotutors.

### Fase 4 — Context i cohesió

1. Afegir càrrega extraescolar i reforç.
2. Afegir preferències al pati.
3. Connectar amb el sociograma sense duplicar dades.
4. Afegir etiquetes manuals per a respostes obertes.

### Fase 5 — Decisions i evolució

1. Permetre registrar actuacions derivades del retrat.
2. Diferenciar el retrat inicial de les observacions posteriors.
3. Valorar una comparació temporal només si es repeteix la fitxa amb un objectiu justificat.

## Tests mínims

### Càlculs

- Una pregunta de resposta única calcula bé recompte i percentatge.
- Una pregunta múltiple compta cada opció sense duplicar alumnes.
- Els percentatges múltiples poden superar conjuntament el 100 %.
- Una resposta absent no es converteix en “No”.
- “No ho sé” i “Prefereixo no respondre” es mantenen diferenciats.
- El denominador correspon a les respostes vàlides de cada pregunta.
- Eliminar una resposta actualitza tots els recomptes afectats.

### Dispositius

- Sense dispositiu entra a la categoria correcta.
- Només mòbil no es confon amb accés a ordinador.
- Tauleta o ordinador genera accés digital ampli.
- Diversos dispositius no multipliquen el nombre d’alumnes.

### Privacitat

- Les dades de salut no apareixen als gràfics generals.
- Les explicacions familiars no apareixen a cap resum públic.
- Un docent no autoritzat no pot accedir al retrat.
- Les exportacions ordinàries no incorporen aquestes estadístiques.
- Les respostes obertes originals només són visibles dins l’espai tutorial autoritzat.

## QA manual

### Classes de prova

1. Classe sense cap resposta.
2. Classe amb poques respostes.
3. Classe amb totes les respostes.
4. Classe amb respostes múltiples diverses.
5. Classe amb alumnes sense dispositiu.
6. Classe amb opcions “Altres”.
7. Classe amb respostes eliminades i reenviades.
8. Tutoria compartida amb dos tutors autoritzats.
9. Docent de la classe sense permís tutorial.

### Pantalles

- Ordinador amb una classe d’uns 25–30 alumnes.
- iPad en horitzontal.
- iPad en vertical.
- Vista amb textos llargs i noms d’escoles o llengües noves.
- Vista amb percentatges i recomptes molt petits.

## Criteris d’acceptació de la primera versió

La primera versió es pot considerar funcional quan:

1. Mostra quantes fitxes s’han rebut i quantes falten.
2. Els sis gràfics prioritaris coincideixen amb les respostes de prova.
3. Cada gràfic mostra recompte, percentatge i denominador.
4. Les preguntes múltiples s’expliquen correctament.
5. El tutor pot arribar des d’una alerta privada fins a la fitxa individual.
6. Les dades sensibles no apareixen fora del Mode tutoria.
7. La pantalla és llegible en ordinador i iPad.
8. Els textos descriuen tendències sense etiquetar ni diagnosticar l’alumnat.

## Decisions pendents abans d’implementar

1. Confirmar el nom definitiu de la pantalla.
2. Decidir a partir de quina cobertura es mostra el retrat complet.
3. Decidir si les observacions descriptives es generen automàticament o només es mostren les dades.
4. Definir si el tutor pot ocultar manualment un gràfic que no consideri útil.
5. Acordar com es presenten els recomptes petits en els blocs sensibles.
6. Revisar els permisos exactes dels cotutors per a salut i família.
7. Decidir si les actuacions derivades es guarden com a notes tutorials o en un registre específic.

## Resultat final esperat

Després de recollir les fitxes, el tutor o tutora disposa d’una pantalla clara que resumeix la diversitat, les preferències d’aprenentatge, les formes de treball, les estratègies davant la dificultat i les condicions d’estudi del grup.

Al mateix temps, les situacions personals que requereixen atenció es converteixen en actuacions tutorials privades, sense exposar-les ni utilitzar-les per etiquetar l’alumnat.

El resultat ha de servir per passar de “tenir moltes respostes individuals” a “comprendre millor el grup i decidir què convé fer durant les primeres setmanes”.
