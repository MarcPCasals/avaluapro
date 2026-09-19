# Iteració 14 — Tasques, constància, comportament i notes

Data de tancament: 19 de setembre de 2026

## Resultat

Mode aula ja treballa directament amb els registres existents d'AvaluaPro. No s'ha creat cap sistema paral·lel per a les tasques, la constància, el comportament o les absències. Tot el que es registra durant la classe reapareix als apartats i a les estadístiques que ja utilitza el docent.

## Tasques i constància

Una activitat pot continuar sense seguiment, generar una evidència a cada sessió o generar-la només al final. Quan el docent confirma que l'activitat s'ha treballat, Mode aula activa la tasca i prepara la graella de l'alumnat:

- l'alumnat present queda com a **Fet** per defecte;
- l'alumnat absent queda com a **Exempt** i no rep cap negatiu de constància;
- el docent només modifica les excepcions: **Incompleta**, **No feta** o un altre estat;
- la mateixa evidència no pot crear dues tasques ni duplicar registres;
- la UT temporal de Programació es relaciona amb la UT de seguiment del grup per nom, ordre o selecció activa;
- si una activitat continua en una altra sessió, l'evidència final només s'activa a l'últim fragment.

El panell **Tasques** mostra només les evidències de la sessió actual. Abans de treballar-les apareixen com a preparades; després passen a actives amb la graella completa.

## Comportament i selecció múltiple

El panell **Alumnat** permet seleccionar una o diverses persones i aplicar el mateix registre a totes. Els dos tipus existents d'AvaluaPro, incidència i observació positiva, es mantenen com a base estadística. Mode aula hi afegeix botons de text sistemàtic i l'opció **Altres…** per als casos no previstos.

Cada registre conserva el grup, la sessió, la UP, l'aplicació i la categoria que l'ha originat. L'alumne mostra el nombre de registres creats en aquella sessió, i la informació queda disponible al seguiment general d'AvaluaPro.

## Reflexió, nota privada i revisió

El resum de tancament mostra només el que s'havia acordat: alumnat absent o que ha marxat, tasques pendents, recordatoris creats i els dos camps opcionals de text.

- la **reflexió pedagògica** forma part del resultat de l'activitat i és visible per direcció;
- la **nota privada** es desa en la col·lecció privada del docent i només el propietari la pot consultar;
- un camp buit no crea cap registre i buidar una nota o reflexió existent l'elimina;
- **Revisar** permet ajustar el temps real, el comentari d'aplicació, la reflexió, els materials que han faltat, les adaptacions útils i la recomanació de conservar, modificar o retirar l'activitat.

La nota privada, els resultats i el tancament utilitzen la mateixa cua local-first d'Agenda. La prova de recàrrega sense connexió confirma que la sessió, el temps real i la nota continuen disponibles.

## Verificació visual i funcional

- pantalla completa comprovada a 1440 × 1000;
- Mode aula i diàleg de revisió comprovats a 1024 × 768;
- panell d'alumnat de 390 píxels, sense desbordament horitzontal;
- selecció múltiple i registre positiu comprovats amb dades temporals;
- absència, activació de tasca, valor per defecte **Fet**, valor **Exempt** i canvi a **Incompleta** comprovats;
- resum final validat amb una absència i una tasca pendent;
- les dades representatives temporals es van retirar després de la prova;
- cap compte ni dada real es van modificar durant la verificació.

La revisió visual també va detectar i corregir un defecte del compte enrere: abans d'iniciar-se podia interpretar un valor nul com l'any 1970 i mostrar temps excedit. Ara l'estat inicial conserva exactament el temps previst i té una prova de regressió.

## Validació tècnica

- 35 proves del domini de Planificació;
- 18 proves de sincronització local de Planificació;
- 6 proves específiques de Mode aula, assistència i tasques;
- 81 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint complet correcte;
- construcció de producció correcta;
- auditoria Firebase preparada per desplegar, sense bloquejos ni respostes pendents de sincronitzar;
- `git diff --check` correcte.

Commit funcional: `a4abce0`.

## Pas següent

La iteració 15 completarà les absències i sortides a mitja sessió amb activitats perdudes, recuperació, recordatoris, text de correu copiable, materials per preparar i avisos d'adaptacions dins de Mode aula.
