# Auditoria visual del mode tutoria

Data: 21 de juny de 2026

## Abast

Pantalles revisades:

1. Entrada de «Relacions i grups».
2. Sociograma.
3. Grups cooperatius.
4. Disposició d’aula.
5. Informes sociomètrics.

Objectiu: reduir el pes visual i aconseguir que, en entrar en una eina, el docent vegi primer el resultat que ha vingut a consultar o editar.

## Diagnòstic general

El problema principal no és estètic, sinó de jerarquia. Les pantalles mostren simultàniament:

- navegació;
- explicació de l’eina;
- configuració;
- accions d’edició;
- accions de desament;
- exportació;
- diagnòstic;
- historial;
- resultat principal.

Això converteix cada eina en un taller complet sempre desplegat. La proposta comuna és:

1. Capçalera mínima: tornar, títol i una sola acció principal.
2. Resultat principal immediat.
3. Botó «Configurar» per als paràmetres que canvien la proposta.
4. Botó «Més accions» per a exportar, copiar, projectar, historial o opcions menys freqüents.
5. Panell lateral per a configuracions complexes, sense empènyer el resultat cap avall.

## 1. Entrada de Relacions i grups — salut: millorable

### Què funciona

- Les quatre eines són fàcils d’identificar.
- El resum inicial dona context del grup.

### Sobrecàrrega

Després dels quatre accessos, la mateixa pantalla continua amb «Registrar relació», «Mapa ràpid», «Cercador per alumne» i altres blocs. L’entrada deixa de ser un selector d’eines i es converteix també en una pantalla de gestió.

### Proposta

- Mantenir com a primera vista només:
  - resum compacte del grup;
  - quatre accessos a les eines;
  - botó principal «Afegir relació».
- Obrir «Afegir relació» en un modal o panell lateral.
- Reubicar «Mapa ràpid» i «Cercador per alumne» dins el sociograma.
- Fer que les eines siguin una subnavegació persistent quan se n’obre una, evitant haver de «Tornar a eines» per canviar.

## 2. Sociograma — salut: bona, amb excés a la franja superior

### Què funciona

- El mapa és clarament la peça protagonista.
- La selecció d’un alumne genera una lectura contextual útil.
- La llegenda és completa.

### Sobrecàrrega

Abans del mapa hi ha:

- text explicatiu;
- botó de retorn;
- qüestionari sociomètric;
- quatre filtres;
- «Només recíproques»;
- «Restablir mapa»;
- sis targetes d’indicadors.

Els sis indicadors competeixen amb el mapa i repeteixen informació que també apareix als informes.

### Proposta concreta

Capçalera:

- esquerra: «Sociograma»;
- centre: filtre segmentat «Tot / Social / Treball / Rebuig»;
- dreta: «Qüestionari» i menú «Més».

El menú «Més» contindria:

- Només recíproques;
- Restablir posicions;
- ajuda o explicació del mapa.

Indicadors:

- mostrar només tres: «Inclusió», «Rebuig» i «Reciprocitat»;
- botó «Veure tots els indicadors» per desplegar cohesió, subgrups i treball.

Resultat:

- el mapa ha de començar just després de la capçalera;
- la fitxa de l’alumne seleccionat hauria d’aparèixer com a panell lateral, no com un bloc sota el mapa;
- la llegenda es pot plegar sota un botó «Llegenda».

## 3. Grups cooperatius — salut: sobrecarregada

### Problema principal

És la pantalla amb el conflicte de jerarquia més evident. La primera franja conté cinc camps i fins a vuit accions abans dels grups:

- mida;
- criteri;
- mig grup;
- nom de versió;
- observació;
- guardar;
- desfer;
- refer;
- crear grup;
- copiar per al docent;
- copiar per a l’alumnat;
- projectar.

Totes les accions tenen un pes visual semblant, encara que la freqüència d’ús sigui molt diferent.

### Primera vista proposada

Una barra compacta:

- «Grups de 4»;
- «Equilibrat»;
- estat «1 grup a revisar»;
- botó principal «Regenerar»;
- botó secundari «Configurar»;
- menú «Més accions».

Immediatament a sota: les targetes dels grups.

### Reubicació

Panell «Configurar»:

- mida;
- criteri;
- prioritzar mig grup.

Modal «Guardar versió»:

- nom;
- observació;
- botó guardar.

Menú «Més accions»:

- crear grup;
- copiar per al docent;
- copiar per a l’alumnat;
- projectar grups;
- historial de versions.

Edició:

- desfer/refer només s’han de mostrar quan hi ha canvis;
- poden quedar flotants a prop dels grups o a la barra inferior d’edició;
- «Detall i modificació» pot simplificar-se a «Editar grup».

### Botons nous

- «Configurar»: obre un panell lateral.
- «Compartir»: agrupa copiar per al docent, alumnat i projectar.
- «Versions»: mostra historial i permet guardar una versió nova.

## 4. Disposició d’aula — salut: crítica per ordre de continguts

### Problema principal

El plànol de l’aula, que és el resultat principal, apareix després de:

- capçalera i controls;
- ajuda de la matriu;
- noms predefinits;
- observació;
- disposició activa;
- restriccions;
- iteració intel·ligent;
- qualitat global;
- conflictes;
- quatre mètriques;
- recomanacions;
- historial.

El docent ha entrat per veure o moure alumnes, però ha de travessar gairebé tot el sistema abans d’arribar a les taules.

### Primera vista proposada

- barra superior mínima;
- plànol de l’aula ocupant tota la zona principal;
- indicador compacte «88/100 · 2 conflictes»;
- botons «Millorar» i «Configurar»;
- panell lateral contextual quan es clica un alumne.

### Reubicació

Panell «Configurar aula»:

- mig grup;
- dimensions o taules actives;
- bloquejar seient;
- restriccions;
- objectiu de la proposta.

Panell «Diagnòstic»:

- qualitat global;
- conflictes;
- suports;
- prioritaris davant;
- parelles de treball;
- recomanacions.

Modal «Guardar versió»:

- nom;
- observació;
- marcar com activa.

Panell «Versions»:

- historial;
- comparar;
- carregar;
- duplicar;
- eliminar.

### Botons nous

- «Diagnòstic (2)»: obre els conflictes i recomanacions.
- «Versions»: separa l’historial de l’edició actual.
- «Configurar aula»: agrupa restriccions, matriu i objectius.

## 5. Informes sociomètrics — salut: funcional però massa llarga

### Problema principal

La selecció del tipus, les seccions, els resums de configuració i la vista prèvia completa viuen en una única columna. Abans de començar a llegir l’informe es repeteixen diverses vegades el tipus seleccionat, les pàgines estimades i el nombre d’alumnes.

### Proposta

Convertir la pantalla en dues fases clares:

1. Triar informe.
2. Previsualitzar informe.

Primera vista:

- quatre tipus d’informe;
- recomanació destacada («Informe ràpid»);
- botó «Generar vista prèvia».

Vista prèvia:

- informe ocupant la zona principal;
- botó principal «Guardar PDF»;
- botó «Personalitzar» que obre un panell lateral amb:
  - seccions;
  - alumnes;
  - moments comparats;
  - estimació de pàgines.

### Elements eliminables o fusionables

- eliminar la targeta «Tipus seleccionat», perquè ja queda marcat a les quatre opcions;
- fusionar «Seccions actives», «Estimació» i «Alumnes» en una sola línia resum;
- no mostrar alhora configurador complet i informe complet;
- canviar «Imprimir / guardar PDF» per «Guardar PDF».

## Prioritat recomanada

1. Disposició d’aula: portar el plànol a dalt.
2. Grups cooperatius: reduir la capçalera i agrupar accions.
3. Informes: separar configuració i vista prèvia.
4. Sociograma: plegar indicadors i controls secundaris.
5. Entrada de Relacions i grups: convertir-la en una entrada neta.

## Riscos d’accessibilitat observables

- Molts controls petits i seguits dificulten el toc a iPad.
- Diversos botons secundaris tenen contrast baix, especialment quan estan desactivats.
- La jerarquia depèn molt de color, contorns i mida, amb poca separació semàntica entre accions principals i opcionals.
- Els panells molt llargs compliquen trobar el focus actual i recordar on era el resultat principal.

Les captures no permeten confirmar navegació per teclat, ordre de focus ni lectura amb tecnologia assistiva.

## Evidències

- `01-relacions-eines.png`
- `02-sociograma.png`
- `03-grups-cooperatius.png`
- `04-disposicio-aula.png`
- `05-informes-sociometrics.png`
- `06-grups-ipad.png`
- `07-disposicio-ipad.png`
