# Bloc 3: Minimitzacio de dades

Data: 4 de juny de 2026  
Estat: criteri intern de disseny i us responsable

Aquest document defineix com Avaluapro ha de reduir dades sensibles sense perdre valor docent. La idea no es deixar de registrar informacio util, sino evitar guardar detalls que no aporten decisio pedagogica i que augmenten risc de proteccio de dades.

## Principi general

Avaluapro ha de guardar la dada minima necessaria per:

- avaluar competencialment;
- fer seguiment d'habits i comportament;
- preparar reunions;
- orientar intervencions docents;
- entendre el grup en tutoria.

Si una dada no ajuda a prendre una decisio docent concreta, millor no guardar-la.

## 1. Diagnostics

Els diagnostics son dades molt sensibles. Avaluapro els ha de tractar principalment com a etiquetes controlades, no com a text lliure extens.

Etiquetes actuals:

- Dislexia / Discalculia;
- TDAH;
- TEA;
- QI limit o TDL;
- Alumne de progres;
- Altes capacitats.

### Criteri

| Que guardar | Que evitar |
| --- | --- |
| Etiqueta pedagogicament util | Detalls medics extensos |
| Mesura docent que ajuda l'alumne | Historial clinic |
| Necessitat visible per adaptar feina | Informacio familiar no necessaria |
| Observacio breu i accionable | Diagnosi escrita amb detalls personals |

Exemple recomanat:

> Li ajuda tenir instruccions curtes i comprovacio visual abans d'entregar.

Exemple a evitar:

> Informacio clinica, familiar o personal que no sigui imprescindible per a la funcio docent.

## 2. Camps oberts de text

Els camps oberts son els espais amb mes risc. Avaluapro n'utilitza en:

- informacio general de l'alumne;
- notes de diagnostic;
- equips educatius;
- comentaris de tutoria;
- DOIPs;
- incidents i punts negres;
- diari docent;
- antecedents academics;
- registres tutorials;
- notes de relacions del sociograma.

### Regla practica

Els textos han de ser:

- breus;
- observables;
- pedagogics;
- accionables;
- datats quan calgui.

No han de ser:

- historials personals;
- valoracions subjectives;
- dades mediques extenses;
- informacio familiar no necessaria;
- judicis sobre l'alumne.

## 3. Avisos pedagogics dins l'app

Avaluapro ja incorpora avisos en camps sensibles. El text base recomanat es:

> Escriu observacions pedagogiques, concretes i necessaries. Evita informacio medica, familiar o personal que no sigui imprescindible per a la funcio docent.

Aquest avis s'ha d'aplicar especialment a:

- diagnostics;
- informacio general;
- equip educatiu;
- tutoria;
- antecedents;
- incidents;
- diari;
- recordatoris;
- DOIPs;
- registres tutorials;
- relacions.

## 4. Etiquetes millor que text lliure

Sempre que sigui possible, Avaluapro hauria de convertir dades repetides en etiquetes controlades.

| Ambit | Millor com a etiqueta | Text lliure nomes si... |
| --- | --- | --- |
| Diagnostics | Si | Cal explicar una adaptacio concreta |
| Perfil tutorial | Si | Cal una observacio breu |
| Antecedents | Si | Cal resum inicial del traspas |
| Intel.ligencies multiples | Si | No cal text lliure habitualment |
| Exempcions | Si | No cal text lliure habitualment |
| Competencies modificades | Si | No cal text lliure habitualment |
| Sociograma | Parcialment | Cal explicar una relacio concreta |
| DOIPs | No del tot | Cal resumir resposta de l'equip |

### Dades que han de ser etiquetes

- diagnostics;
- altes capacitats;
- alumne de progres;
- competencies modificades;
- exempcions de materia;
- perfil anterior;
- perfil actual;
- intel.ligencies multiples;
- rols estrella/conflictiu;
- tipus de relacio;
- tipus de registre tutorial.

### Dades que poden necessitar text lliure

- acord d'equip educatiu;
- comentari de tutoria;
- resposta DOIP;
- motiu d'una nota a l'agenda;
- incident concret;
- recomanacio inicial d'antecedents;
- nota breu d'una relacio.

## 5. Fotos d'alumnes

Les fotos identifiquen directament menors. Avaluapro les pot utilitzar per:

- perfil d'alumne;
- disposicio d'aula;
- reconeixement visual del grup.

### Criteri

- Les fotos han de ser opcionals.
- S'ha de reutilitzar una sola foto per alumne.
- No s'han de duplicar en diverses parts de l'app.
- Cal comprimir-les.
- En una fase futura, s'han de migrar a Firebase Storage.

La foto no ha de ser necessaria per usar Avaluapro. Ha de ser una ajuda visual, no una obligacio.

## 6. DOIPs i comentaris de tutoria

Els DOIPs i comentaris tutorials poden contenir informacio molt sensible. Per tant, han de ser resums pedagogics, no copies literals d'informes extensos.

### Recomanat

- Que s'ha demanat?
- Quina resposta pedagogica dona l'equip?
- Quin acord o seguiment cal fer?
- Quina accio docent concreta es deriva?

### A evitar

- dades familiars que no aporten accio docent;
- dades mediques detallades;
- judicis personals;
- textos llargs copiats sense filtrar;
- informacio que no caldria per prendre decisions educatives.

## 7. Sociograma i relacions

El sociograma es una dada tutorial sensible perque descriu relacions socials del grup. Pot ser molt util, pero s'ha de fer servir amb cura.

### Que guardar

- tipus de relacio: positiva, afinitat, evitar de moment;
- intensitat;
- nota breu si cal;
- rols funcionals: estrella o conflictiu;
- versions de grups i disposicions d'aula.

### Que evitar

- etiquetes humiliants o judicis personals;
- explicacions llargues de conflictes;
- informacio familiar o medica;
- conclusions fixes sobre l'alumne.

El sociograma ha de ser una eina de decisio docent, no un registre social exposat.

## Decisions del Bloc 3

1. Els diagnostics es mantenen com a etiquetes controlades.
2. Les notes de diagnostics i informacio general es mantenen, pero amb avisos clars i criteri de brevetat.
3. DOIPs, tutoria i equip educatiu es mantenen com a text lliure necessari, pero amb avisos i recomanacio de resum pedagogic.
4. Intel.ligencies multiples, exempcions, perfil tutorial, competencies modificades i rols socials han de funcionar com a etiquetes.
5. Les fotos son opcionals i s'ha de preparar migracio futura a Storage.
6. El sociograma es mante per valor tutorial, pero amb llenguatge funcional i minim.

## Estat

El Bloc 3 queda orientat a reduir dades sensibles, reforcar avisos dins l'app i prioritzar etiquetes controlades. El seguent pas natural es revisar conservacio, exportacio i eliminacio: quant temps es guarden dades i com es tanquen cursos.
