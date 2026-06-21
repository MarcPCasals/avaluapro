# Bloc 5: backups i conservació

Aquest document defineix com Avaluapro gestiona còpies de seguretat, restauracions i conservació de dades al llarg del curs.

La política institucional de referència és `docs/politica-conservacio-eliminacio-preliminar.md`. Els terminis que s'hi proposen encara han de ser aprovats pel responsable i implementats tècnicament.

## 1. Còpies manuals JSON

La còpia manual és un fitxer JSON descarregat al dispositiu del docent.

Nom recomanat:

```text
avaluapro-copia-manual-<usuari>-<classes>classes-<alumnes>alumnes-<data>.json
```

La còpia manual conté l'estat complet del docent:

- classes;
- alumnes;
- notes;
- tasques i registres de seguiment;
- comentaris i tutoria;
- diagnòstics;
- DOIPs;
- sociograma;
- grups cooperatius;
- disposicions d'aula;
- antecedents;
- configuració docent.

No inclou els qüestionaris sociomètrics temporals, els tokens individuals ni les respostes brutes. Els moments i les relacions sociomètriques que el docent ja ha sincronitzat sí que formen part de les dades pedagògiques ordinàries.

És una dada molt sensible. S'ha de conservar en un lloc segur i no enviar per canals no controlats si conté dades reals d'alumnes.

## 2. Còpies al núvol

Les còpies al núvol es desen dins la ruta privada de l'usuari:

```text
users/<uid>/cloudBackups/<backupId>
```

Cada còpia guarda metadades al document principal i les dades reals en subcol·leccions separades.

Nom visible recomanat:

```text
Còpia manual al núvol · <data> · <classes> classes · <alumnes> alumnes
Còpia automàtica diària · <data> · <classes> classes · <alumnes> alumnes
```

## 3. Còpia automàtica diària

Avaluapro crea una còpia automàtica diària al núvol quan:

- el docent ha iniciat sessió amb Google;
- l'app ha carregat correctament;
- encara no s'ha creat cap còpia automàtica aquell dia.

La còpia automàtica no substitueix la còpia manual de final de curs. Serveix per recuperar errors recents o canvis accidentals.

## 4. Restauració

Abans de restaurar una còpia, Avaluapro ha de mostrar:

- què hi ha actualment;
- què conté la còpia entrant;
- recomanació de descarregar abans una còpia manual de l'estat actual.

Restaurar una còpia substitueix l'estat local actual. Si hi ha sessió iniciada, després cal revisar si s'ha de sincronitzar aquest estat amb Firebase.

## 5. Política de final de curs

Al final del curs, i només d'acord amb la política institucional aprovada, es recomana:

1. verificar que les dades necessàries consten al sistema oficial;
2. crear una còpia temporal només si és necessària per verificar el tancament;
3. exportar antecedents acadèmics només dels alumnes que interessi conservar per al curs vinent;
4. registrar la ubicació i la data d'eliminació de qualsevol còpia;
5. reiniciar el curs quan ja no calgui treballar amb les dades actuals;
6. eliminar les còpies temporals en acabar la verificació.

Un backup complet no s'ha d'utilitzar com a arxiu acadèmic permanent. No cal conservar indefinidament tasques, incidències o observacions si ja no aporten valor pedagògic.

## 6. Eliminació de dades antigues

Avaluapro incorpora una neteja conservadora:

- només elimina tasques antigues d'una classe abans d'una data triada;
- elimina també els registres d'aquelles tasques;
- no elimina notes;
- no elimina comentaris;
- no elimina diagnòstics;
- no elimina DOIPs;
- no elimina antecedents;
- no elimina sociograma, grups cooperatius ni disposicions d'aula.

Abans de fer aquesta neteja, es recomana descarregar una còpia manual.

## 7. Antecedents acadèmics

Els antecedents han de ser una exportació mínima per començar el curs vinent amb context útil.

Han d'incloure:

- nom de l'alumne per poder fer la coincidència;
- etiqueta de curs anterior;
- última mirada per competència;
- perfil pedagògic resumit;
- valoració qualitativa breu;
- diagnòstics només si són necessaris per iniciar el curs amb criteri.

No han d'incloure:

- classe antiga;
- mig grup antic;
- tasques del curs anterior;
- incidències completes;
- comentaris llargs de tutoria;
- sociograma;
- disposicions d'aula;
- identificadors interns innecessaris.

## 8. Riscos principals

| Risc | Mesura |
| --- | --- |
| Perdre dades per restauració accidental | Confirmació amb resum abans de restaurar |
| Fitxers JSON sensibles fora del control de l'app | Nom clar i avisos de custòdia |
| Acumulació de tasques antigues | Neteja específica de tasques per data |
| Antecedents massa carregats | Export minimalista només amb dades útils |
| Còpies al núvol massa opaques | Mostrar darreres còpies, data, tipus i volum |

## 9. Qüestionaris sociomètrics

S'aplica provisionalment aquesta política específica:

1. l'enllaç públic i els tokens individuals caduquen al cap de 24 hores;
2. les respostes brutes només es conserven fins que el docent les ha revisat i sincronitzat;
3. després de sincronitzar, el propietari ha d'utilitzar `Eliminar dades brutes`;
4. aquesta eliminació esborra el qüestionari, els tokens i les respostes de Firestore;
5. les relacions i el moment sociomètric derivats es conserven separadament dins les dades pedagògiques del docent;
6. eliminar una classe també elimina els qüestionaris al núvol creats pel mateix docent.
7. els qüestionaris temporals i els tokens queden exclosos tant de les còpies manuals com de les còpies al núvol.

Com a límit operatiu provisional, les respostes brutes no haurien de superar els set dies després de la caducitat. Abans d'un pilot institucional cal implementar una purga automàtica en un backend de confiança, perquè una aplicació web no pot garantir l'eliminació si cap docent torna a obrir-la.

El termini del resultat pedagògic derivat s'haurà de fixar amb el Ministeri o el responsable del tractament segons la finalitat, el curs acadèmic i la política documental aplicable.
