# Bloc 7: comparticio entre docents

Aquest document defineix com Avaluapro permet compartir notes entre docents mantenint una politica simple: nomes es comparteixen dades enviades voluntariament i nomes al docent destinatari indicat.

## 1. Que es comparteix

La comparticio actual es limita als paquets de notes entre professor d'assignatura i tutor.

El paquet inclou:

- emissor;
- correu destinatari;
- classe origen;
- materia;
- alumnes;
- notes finals de competencia;
- UT o ultima mirada d'on surt la nota;
- estat del paquet: enviat o importat.

No inclou:

- comentaris;
- diagnostics;
- DOIPs;
- comportament;
- agenda;
- fotos;
- sociograma;
- grups cooperatius;
- disposicio d'aula;
- camps oberts de text.

## 2. Ruta Firestore

Els paquets viuen fora de l'espai privat `users/{uid}` perque han de poder ser llegits per dos docents:

```text
teacherGradePackages/{packageId}
```

Aquesta ruta es l'unica ruta compartida prevista actualment.

## 3. Qui pot enviar

Pot crear un paquet:

- un usuari autenticat amb Google;
- que sigui l'emissor real del paquet;
- amb `senderUid` igual al seu `request.auth.uid`;
- amb `senderEmail` igual al seu correu autenticat;
- amb un paquet que segueixi l'esquema `avaluapro.teacher-grade-package`.

El docent emissor nomes envia les dades que decideix enviar clicant el boto corresponent. No hi ha publicacio automatica de notes cap a altres docents.

## 4. Qui pot rebre

Pot llegir un paquet:

- el docent emissor;
- el docent destinatari si el seu correu autenticat coincideix amb `recipientEmailLower`.

Cap altre docent pot llegir el paquet.

El destinatari no pot veure res del quadern personal de l'emissor: nomes el paquet enviat explicitament.

## 5. Importacio i confirmacio de rebuda

Quan el tutor importa un paquet, Avaluapro marca el paquet com a:

```text
status: imported
importedAt: <data i hora>
importedByEmail: <correu del tutor>
importedByUid: <uid del tutor>
```

Aixo permet que l'emissor vegi que el cami s'ha completat correctament, sense haver de demanar confirmacio manual.

El destinatari nomes pot actualitzar aquests camps de confirmacio. No pot modificar:

- notes;
- alumnes;
- materia;
- emissor;
- destinatari;
- contingut del paquet.

## 6. Registre d'enviaments

L'app mostra els darrers paquets enviats pel docent emissor.

Per cada enviament es mostra:

- materia;
- classe origen;
- correu destinatari;
- data d'enviament;
- estat: enviat o importat pel tutor;
- data de rebuda/importacio si ja s'ha completat.

## 7. Registre d'importacions

El tutor veu la seva safata de paquets rebuts.

Abans d'importar, Avaluapro fa una previsualitzacio:

- alumnes amb coincidencia exacta;
- alumnes amb coincidencia probable;
- alumnes que cal revisar;
- alumnes sense coincidencia;
- nombre de notes importables.

Les files sense coincidencia fiable no s'importen per evitar posar notes a l'alumne equivocat.

## 8. Errors clars

L'app ha de mostrar missatges concrets quan:

- no hi ha sessio de Google;
- el correu destinatari no es valid;
- el paquet no es valid;
- el paquet es massa gran;
- cap alumne coincideix;
- hi ha alumnes sense coincidencia;
- el paquet no esta adrecat al compte connectat;
- la classe de desti no es una tutoria adequada.

## 9. Politica simple

Politica d'us:

> Avaluapro nomes comparteix dades quan un docent les envia voluntariament. El destinatari nomes pot veure el paquet enviat al seu correu, no el quadern complet de l'emissor.

Aquesta politica busca ser segura sense frenar el dia a dia:

- un clic per preparar paquet;
- correu destinatari amb `@educand.ad` per defecte;
- registre automatic d'enviament;
- confirmacio automatica quan el tutor importa;
- revisio de coincidencies abans d'incorporar notes.

## 10. Riscos i mesures

| Risc | Mesura |
| --- | --- |
| Enviar a un correu equivocat | Correu visible abans d'enviar i registre d'enviament |
| Importar notes a alumnes equivocats | Previsualitzacio i bloqueig de files sense coincidencia |
| Destinatari modificant contingut | Rules: nomes pot marcar importat |
| Docent veient dades no enviades | Rules: nomes emissor o destinatari del paquet |
| Compartir dades massa sensibles | Paquet limitat a notes finals de competencia |
