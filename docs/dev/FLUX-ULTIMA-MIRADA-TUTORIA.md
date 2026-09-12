# Flux de treball — Última mirada per a grups cooperatius i disposició d’aula

## Objectiu

Fer que el mode tutoria no depengui només de les notes actuals del curs. A principi de curs, quan encara no hi ha dades actuals, Avaluapro ha d’utilitzar els antecedents acadèmics i el perfil inicial de l’alumne per generar propostes més bones de:

- Grups cooperatius.
- Disposició d’aula.
- Explicacions pedagògiques associades.

La idea clau és que “última mirada” sigui una font comuna: si hi ha dades actuals, mana l’actual; si no n’hi ha, entren els antecedents.

## Principi de decisió

Per a cada alumne, el programa ha de resoldre una mirada acadèmica efectiva amb aquest ordre:

1. Notes actuals de tutoria o avaluació enllaçada.
2. Notes manuals de tutoria.
3. Antecedents per competències.
4. Nota global d’antecedents (`lastLookGrade`).
5. Sense dades.

Aquest ordre ha de ser únic i compartit. No convé que grups cooperatius i disposició d’aula interpretin les dades de manera diferent.

## Bloc 1 — Crear la mirada acadèmica efectiva

### Tasca

Crear una utilitat o funció interna que, per cada alumne, retorni:

- `averageScore`
- `averageGrade`
- `evaluatedCount`
- `notDevelopedCount`
- `notDevelopedPercent`
- `academicSource`
- `hasCurrentAcademicData`
- `antecedentProfile`

### Criteri

Si l’alumne té notes actuals, aquestes continuen manant.

Si no té notes actuals però té antecedents:

- Les notes de competències d’antecedents han de calcular una mitjana.
- Si no hi ha competències però sí `lastLookGrade`, aquesta nota ha de comptar com a mirada global.
- El perfil d’antecedents (`reforç`, `invisible`, `priority`, etc.) ha de quedar disponible per a la resta del mode tutoria.

## Bloc 2 — Integrar-ho a `tutorialSummary.studentProfiles`

### Tasca

Modificar la construcció dels perfils tutorials perquè incorporin la mirada acadèmica efectiva.

### Resultat esperat

Un alumne sense notes actuals però amb antecedent `D` no ha de quedar com a alumne “sense dades” ni com a perfil mitjà. Ha d’aparèixer com a alumne amb risc acadèmic basat en antecedents.

### Textos recomanats

- `Rendiment: C · antecedents`
- `Sense notes actuals; s’estan usant antecedents`
- `Perfil inicial: reforç`

## Bloc 3 — Grups cooperatius

### Tasca

Ajustar el motor de grups perquè faci servir la mirada acadèmica efectiva.

### Comportaments esperats

- Alumne amb antecedent baix → `performanceLevel = baix`.
- Alumne amb antecedent alt → pot actuar com a referent acadèmic si no té alertes socials.
- Alumne amb perfil `reforç` → suma prioritat pedagògica.
- Alumne amb perfil `invisible` → no només compta com a risc acadèmic; també ha de tendir a quedar en grups on tingui suport i visibilitat.

### Explicacions

Les explicacions dels grups han d’indicar quan la decisió ve d’antecedents, per evitar que sembli una conclusió basada en dades actuals inexistents.

Exemple:

> Grup equilibrat perquè combina alumnat amb antecedents acadèmics forts amb alumnat que venia amb perfil de reforç.

## Bloc 4 — Disposició d’aula

### Tasca

Fer que la disposició d’aula aprofiti la mateixa mirada acadèmica efectiva que els grups cooperatius.

### Comportaments esperats

- Perfil `reforç` o nota baixa d’antecedents: preferència per zones més supervisables.
- Perfil `invisible`: evitar zones massa perifèriques o massa enrere.
- Perfil alt/estable: pot funcionar com a suport proper, si no hi ha incompatibilitats sociomètriques.
- Si hi ha sociograma actual, sociograma i antecedents s’han de combinar.

### Explicacions

El panell lateral i els motius de posició han de distingir:

- “segons dades actuals”
- “segons antecedents”
- “segons sociometria”
- “segons restricció docent”

## Bloc 5 — Interfície i transparència

### Tasca

Afegir petites pistes visuals o textuals perquè el docent entengui quina font està usant el programa.

### Possibles llocs

- Targeta de l’alumne a la disposició d’aula.
- Panell lateral de detall.
- Resum de qualitat de grups cooperatius.
- Informe o explicació de proposta.

### Objectiu

El docent ha de poder confiar en la proposta perquè veu d’on surt.

## Bloc 6 — Tests

### Tests mínims

Crear o ampliar tests per validar:

- Sense notes actuals + antecedent `D` → `averageScore` efectiu baix.
- Sense notes actuals + antecedents per competències → mitjana calculada correctament.
- Notes actuals + antecedents → guanyen les notes actuals.
- Perfil `reforç` → augmenta prioritat de suport.
- Perfil `invisible` → genera senyal específica de visibilitat/suport.
- Grups cooperatius reparteixen perfils baixos i alts usant antecedents.
- Disposició d’aula situa perfils vulnerables en zones raonables.

## Bloc 7 — QA manual

### Escenaris a provar

1. Classe amb notes actuals i antecedents.
2. Classe sense notes actuals però amb antecedents complets.
3. Classe amb només `lastLookGrade`.
4. Classe amb perfils d’antecedents però sense notes.
5. Classe amb sociograma actual i antecedents.

### Pantalles a revisar

- Informes tutorials.
- Grups cooperatius.
- Disposició d’aula.
- Panell de detall d’alumne.
- Textos d’explicació i avisos.

## Bloc 8 — Publicació

Abans de publicar:

1. Executar lint.
2. Executar build.
3. Executar tests relacionats amb tutoria, grups cooperatius i disposició.
4. Revisar que no s’han modificat canvis locals no relacionats.
5. Fer commit.
6. Fer push.
7. Desplegar a Firebase Hosting.
8. Confirmar que la versió publicada conté el canvi.

## Resultat final esperat

A principi de curs, Avaluapro podrà generar grups cooperatius i disposicions d’aula amb criteri pedagògic encara que no hi hagi notes actuals, perquè farà servir la millor mirada disponible: antecedents acadèmics, perfil inicial, sociometria i criteri docent.
