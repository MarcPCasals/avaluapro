# Publicació automàtica a Firebase Hosting

El flux `.github/workflows/firebase-hosting-merge.yml` comprova les proves
d'avaluació i estadístiques, compila amb `npm run build:firebase` i publica
a https://avaluapro.web.app quan s'actualitza `main`. També es pot executar
manualment des de la pestanya Actions de GitHub.

La publicació utilitza el projecte i lloc `avaluapro`, el canal `live` i
Firebase CLI 15.22.0. Només desplega Hosting. El flux de GitHub Pages continua
independent, amb la seva compilació per a `/avaluapro/`.

## Autorització inicial del propietari

Una sola vegada, des de l'arrel d'aquesta còpia del repositori, executa:

```sh
./node_modules/.bin/firebase init hosting:github --project avaluapro
```

Seguint la integració oficial de Firebase, aquesta ordre inicia la sessió
a GitHub, crea el compte de servei de desplegament al projecte i desa la seva
clau xifrada com a secret del repositori. Cal un compte amb permisos per crear
el compte de servei al projecte i administrar els secrets del repositori.

Respon a les preguntes així:

| Pregunta | Resposta |
| --- | --- |
| Proceed? | Yes |
| GitHub repository | `MarcPCasals/avaluapro` |
| Run a build script before every deploy? | Yes |
| Build script | `npm ci && npm run build:firebase` |
| Automatic deployment to live on merge? | Yes |
| Live branch | `main` |
| Overwrite the existing live workflow? | No |

Si apareix una pregunta per sobreescriure un flux de previsualitzacions
existent, respon No. Si pregunta si vols configurar instruccions per a agents,
pots rebutjar-ho: no forma part de l'autorització de publicació.

El secret que ha de quedar a GitHub es diu
`FIREBASE_SERVICE_ACCOUNT_AVALUAPRO`. No cal copiar cap clau al codi ni al xat.
El flux de producció ja està publicat al repositori: no cal publicar els fitxers
locals addicionals que pugui generar l'assistent de Firebase.

## Primera publicació i comprovació

Un cop finalitzada l'autorització, torna a executar el flux
**Deploy to Firebase Hosting** des de
https://github.com/MarcPCasals/avaluapro/actions/workflows/firebase-hosting-merge.yml
o torna a executar l'execució que havia fallat per falta del secret.

Una execució correcta ha de completar les proves, la compilació i el pas
**Deploy to avaluapro.web.app**. Fins que aquest pas no acabi correctament,
no s'ha de considerar publicada la versió a Firebase.

Les actualitzacions següents de `main` iniciaran la publicació automàticament.

Documentació oficial:
https://firebase.google.com/docs/hosting/github-integration
