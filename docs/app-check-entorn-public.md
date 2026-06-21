# Bloc 8: App Check, abus i entorn public

Aquest document defineix com Avaluapro ha de protegir l'entorn public de Firebase, especialment quan l'app passi d'un pilot personal a un us amb mes docents.

## 1. Que protegeix App Check

Firebase App Check ajuda a reduir peticions a Firebase fetes des de clients no autoritzats.

Exemple de risc:

- algu obre el codi public;
- veu la configuracio web de Firebase;
- intenta fer peticions a Firestore des d'un script propi.

Les rules de Firestore continuen sent la proteccio principal de les dades. App Check no substitueix les rules, pero afegeix una capa per verificar que les peticions venen de l'app oficial.

## 2. Que no protegeix App Check

App Check no resol:

- errors de rules;
- un usuari autenticat que te permisos massa amplis;
- un docent que descarrega i comparteix un backup JSON;
- dades sensibles escrites en camps oberts;
- errors humans en enviar notes al correu equivocat.

Per tant, App Check es una capa tecnica addicional, no una solucio completa de proteccio de dades.

## 3. Decisio actual

Decisio del Bloc 8:

- no activar App Check de manera obligatoria encara;
- documentar-lo com a mesura futura;
- provar-lo abans amb Firebase Hosting, Safari, Chrome i iPad;
- activar-lo quan l'entorn public sigui estable i hi hagi mes docents.

Motiu:

Si s'activa massa aviat i no esta ben provat, pot bloquejar docents legitims, especialment en iPad/Safari o en entorns escolars amb configuracions restrictives.

## 4. Dominis autoritzats

Cal mantenir controlats els dominis des d'on Avaluapro pot iniciar sessio i fer servir Firebase.

Dominis previstos:

```text
marcpcasals.github.io
avaluapro.firebaseapp.com
avaluapro.web.app
localhost
127.0.0.1
```

Si mes endavant es compra domini propi:

```text
avaluapro.com
www.avaluapro.com
```

Accions:

- revisar Firebase Authentication > Settings > Authorized domains;
- revisar Google Cloud > APIs & Services > Credentials > API key restrictions;
- evitar dominis antics o desconeguts;
- mantenir `localhost` i `127.0.0.1` nomes per desenvolupament.

## 5. Restriccions de la API Key

La clau web de Firebase no es una contrasenya. Ha de ser visible al navegador perque l'app pugui funcionar.

La proteccio recomanada es:

- restringir-la per HTTP referrers;
- permetre nomes dominis d'Avaluapro;
- restringir-la a les APIs necessaries;
- no activar APIs no utilitzades.

APIs principals previstes:

- Identity Toolkit API;
- Cloud Firestore API;
- Firebase Hosting si s'utilitza;
- Firebase Storage quan s'activi.

Si apareix l'error `API_KEY_HTTP_REFERRER_BLOCKED`, normalment falta afegir algun domini a les restriccions HTTP de la clau.

## 6. Entorn de proves i entorn real

Ara Avaluapro fa servir un sol projecte Firebase:

```text
avaluapro
```

Per a una fase institucional seria recomanable valorar dos entorns:

| Entorn | Funcio |
| --- | --- |
| Proves/demo | Test, formacio i validacio sense dades reals |
| Produccio | Dades reals de docents i alumnes |

No es imprescindible per al pilot, pero seria una millora important abans d'un desplegament gran.

## 7. Demo i dades reals

La demo inicial ha de contenir nomes dades ficticies.

Punt d'atencio:

- si un docent inicia sessio i sincronitza mentre esta mirant la demo, pot pujar dades ficticies al seu espai personal;
- aixo no es una fuga de dades, pero pot embrutar el seu estat inicial.

Mesura recomanada:

- explicar clarament que la demo es pot esborrar abans de començar;
- mantenir el flux "Començar amb les meves dades";
- evitar que la demo contingui cap dada real.

## 8. Logs i diagnostic d'incidencies

Quan hi hagi problemes, revisar:

| Problema | On mirar |
| --- | --- |
| No inicia sessio | Firebase Authentication, Authorized domains, API key restrictions |
| Login torna pero no queda registrat | AuthDomain, navegador, bloqueig de cookies, consola |
| No sincronitza | Firestore rules, connexio, usuari autenticat |
| Paquet de notes no apareix | `teacherGradePackages`, correu destinatari, rules |
| Backup no es restaura | `users/{uid}/cloudBackups`, mida, errors de coincidencia |
| Fotos massa grans | Compressio local, mida de documents, futur Storage |

## 9. Resposta davant incidencies

Protocol simple:

1. preguntar quin compte Google s'ha utilitzat;
2. comprovar si apareix a Firebase Authentication;
3. comprovar l'URL exacta des d'on s'ha obert Avaluapro;
4. mirar si hi ha missatge a consola;
5. descarregar copia manual si encara hi ha dades locals;
6. no esborrar dades fins haver fet copia;
7. si afecta rules, revisar i publicar rules abans de repetir la prova.

## 10. Quan activar App Check

Es recomana activar App Check quan es compleixin aquestes condicions:

- Avaluapro ja funciona estable amb diversos docents;
- el domini definitiu esta clar;
- Firebase Hosting o domini propi esta provat;
- login funciona en Chrome, Safari i iPad;
- la versio de rules prevista per al pilot esta desplegada i verificada;
- hi ha una manera clara d'atendre incidencies.

Activacio recomanada:

1. activar App Check en mode monitoratge, si l'opcio esta disponible;
2. revisar peticions bloquejades o sospitoses;
3. provar amb diversos dispositius;
4. activar enforcement nomes quan no bloquegi usuaris legitims.

## 11. Estat actual

| Mesura | Estat |
| --- | --- |
| Rules Firestore | Versió reforçada preparada i provada localment; desplegament pendent de resoldre els qüestionaris antics |
| Separacio per usuari | Implementada |
| Paquets entre docents | Implementats amb rules especifiques |
| API key restringida per domini | Configuracio externa a Google Cloud |
| Firebase Storage | Preparat, no activat |
| App Check | Documentat, no activat |
| Entorn demo separat | Recomanat mes endavant |
| Protocol d'incidencies | Documentat en aquest bloc |
