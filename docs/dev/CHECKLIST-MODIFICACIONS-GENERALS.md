# Checklist de modificacions generals

Aquest document recull modificacions concretes però generals d'AvaluaPro. Serveix com a llista de treball per anar atacant punts petits o mitjans sense barrejar-los amb fulls de ruta grans.

## Estat

- [ ] Pendent
- [x] Fet

## Prioritat 1 - Cotutoria compartida

- [x] Detectar una classe existent quan s'accepta una tutoria compartida.
- [x] Comparar classes pel nom normalitzat encara que no estiguin marcades com a tutoria.
- [x] Si ja existeix una classe amb el mateix nom, demanar confirmacio abans de vincular-hi la tutoria compartida.
- [x] Si l'usuari confirma, assignar la cotutoria a la classe existent i conservar alumnes, notes i dades CFN.
- [x] Si l'usuari cancel-la, permetre crear una classe nova com fins ara.
- [x] Afegir o adaptar tests per comprovar que no es creen duplicats quan ja hi ha una classe coincident.

## Prioritat 2 - Perfil de l'alumne

- [x] Amagar les dades sociometriques quan el perfil de l'alumne s'obre des d'avaluacio.
- [x] Amagar les dades sociometriques quan el perfil de l'alumne s'obre des de seguiment.
- [x] Mantenir les dades sociometriques visibles quan el perfil s'obre des del mode tutoria.
- [x] Revisar la vista d'impressio del perfil per evitar que hi aparegui informacio sociometrica fora de tutoria.
- [x] Adaptar els tests del perfil sociometric si cal.

## Prioritat 3 - Sociograma

- [x] Moure la seccio "Registrar relacio" del professor dins de la pantalla del boto del questionari sociometric.
- [x] Mantenir la mateixa logica de guardat de relacions.
- [x] Deixar la pantalla general del sociograma centrada en consulta, lectura i analisi.
- [x] Comprovar que el mapa rapid, els informes sociometrics i la disposicio d'aula continuen funcionant.

## Prioritat 4 - Suggeriments i dubtes

- [x] Afegir un boto per enviar suggeriments o preguntes.
- [x] Crear un formulari amb nom opcional, categoria i missatge.
- [x] Categories inicials: suggeriment i dubte.
- [x] Preparar l'assumpte del correu amb el format `Suggerencia/Dubte AvaluaPro_Nom`.
- [x] Enviar el missatge a `mperezc@educand.ad`.
- [x] Decidir implementacio inicial: `mailto:` simple o Firebase Function amb enviament real.
- [x] Mostrar confirmacio d'enviament o instruccio clara segons el sistema triat.

## Prioritat 5 - Llocs fixos manuals fora de tutoria

- [x] Substituir o complementar l'actual pujada d'imatges de "Llocs fixos" amb un editor manual d'aula.
- [x] Reutilitzar el disseny visual de la disposicio d'aula del mode tutoria.
- [x] No reutilitzar la logica interna de propostes sociometriques.
- [x] Permetre configurar una aula d'una classe que no sigui tutoria.
- [x] Permetre col-locar alumnes manualment.
- [x] Permetre deixar alumnes pendents de col-locar.
- [x] Permetre activar, desactivar o bloquejar taules.
- [x] Permetre guardar i recuperar disposicions.
- [x] Fer que funcioni amb grup sencer i, si escau, amb mitjos grups.
- [x] Comprovar el funcionament en ordinador i iPad.

## Notes de criteri

- La informacio sociometrica ha de quedar reservada al mode tutoria.
- Les eines generals han de ser utils per qualsevol docent, encara que no sigui tutor del grup.
- Les dades ja existents d'una classe no s'han de duplicar ni perdre quan s'accepta una cotutoria compartida.
- Els canvis s'han d'implementar pas a pas, validant cada bloc abans de passar al seguent.
