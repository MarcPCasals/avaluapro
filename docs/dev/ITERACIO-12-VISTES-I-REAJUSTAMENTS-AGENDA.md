# Iteració 12 — Avui, setmana, cronologia i reajustaments

Data de tancament: 19 de setembre de 2026

## Resultat

Agenda ja mostra les sessions reals que provenen de la calendarització d'una UP i permet reajustar-les sense perdre la relació amb la programació ideal. El docent pot treballar des de tres escales: la sessió actual o pròxima, la setmana lectiva i la cronologia completa d'un grup.

Les lectures es fan per interval i sota demanda. La vista Avui carrega la setmana vigent; Setmana canvia només el tram visible; Cronologia carrega el curs del grup seleccionat. Això evita mantenir obertes totes les sessions de tots els grups alhora.

## Vista Avui

- mostra automàticament la sessió en curs o la pròxima sessió prevista;
- permet seleccionar una altra sessió d'avui i n'actualitza el detall a la mateixa pantalla;
- ensenya activitats, minuts, fragments i indicacions sense temps;
- reuneix els materials externs de professorat i alumnat;
- mostra totes les sessions del dia;
- incorpora els recordatoris d'avui i dels tres dies següents procedents d'AvaluaPro;
- avisa de les excepcions lectives pròximes;
- conserva accessos directes a calendaritzar una UP, l'horari i el calendari.

## Setmana i cronologia

La vista Setmana distribueix de dilluns a divendres les sessions reals, diferencia les anul·lades i permet avançar, retrocedir o tornar a la setmana actual. Cada sessió obre el detall complet.

La cronologia agrupa totes les sessions del curs per grup, amb número correlatiu, data, hora, UP, activitats i estat. Canviar de grup torna a carregar només el seu recorregut.

## Reajustaments amb previsualització

El diàleg **Reajustar la sessió** separa tres decisions:

1. **Sessió:** anul·lar-la o restaurar-la. La sessió anul·lada es conserva a la cronologia i els seus minuts deixen de comptar com a assignats; en tornar a calendaritzar, només aquests minuts reapareixen com a pendents.
2. **Activitat:** modificar títol o minuts i escollir entre només aquest grup, UP base i grup, o grup amb proposta pendent per a la UP.
3. **Continuació:** indicar els minuts que falten, veure en quines sessions encaixaran i confirmar després la redistribució. Primer s'aprofita l'espai lliure de sessions futures i només es crea una sessió nova si cal.

Cap previsualització escriu dades. Els canvis entren al repositori local-first només quan el docent prem el botó de confirmació corresponent.

## Classes extraordinàries

Una excepció de tipus **Classe extraordinària** pot incloure hora, durada, grup o mig grup i l'opció d'avançar la seqüència. Quan aquesta opció està activa, la classe es converteix en una candidata real de calendarització fins i tot si aquell dia hi ha una anul·lació o un bloqueig lectiu. La sessió conserva l'identificador de l'esdeveniment que l'ha originada.

Firestore admet aquest vincle només dins el document de sessió validat. La resta de permisos es manté: el propietari i els col·laboradors explícits del grup són els únics que poden gestionar l'Agenda.

## Validació

- 32 proves del domini de Planificació;
- 17 proves de sincronització local de Planificació;
- 81 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció Firebase correcta;
- `git diff --check` correcte;
- vista Avui validada a 1440 × 1000 sense desbordament horitzontal;
- Setmana, Cronologia i els tres reajustaments validats a 1024 × 768;
- finestra de reajustament de 983 × 472 dins una pantalla de 1024 × 768;
- dades representatives temporals retirades després de la prova;
- cap compte ni dada real modificats durant la validació.

Commit funcional: `cb11c36`.

## Publicació verificada

La versió s'ha publicat a `https://avaluapro.web.app` el 19 de setembre de 2026.

- les regles desplegades i les regles locals tenen exactament la mateixa petjada;
- la portada publicada respon correctament i manté `no-cache`;
- `?preview=agenda` mostra Agenda i, sense autenticació, protegeix les dades demanant iniciar sessió;
- la navegació normal continua ocultant Agenda i Programació durant el pilot;
- el paquet publicat conté Sessions d'avui, Cronologia del grup, la previsualització de continuació, els tres abasts i Classe extraordinària;
- la verificació publicada no ha creat ni modificat cap dada real.

## Pas següent

La iteració 13 convertirà una sessió prevista en una experiència de classe: avís cinc minuts abans, Mode aula, cronologia centrada en l'activitat actual, temporitzador silenciós, correcció retroactiva i assistència completa o de mig grup.
