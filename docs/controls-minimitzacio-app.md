# Controls de minimitzacio dins l'app

Data: 4 de juny de 2026

Aquest document resumeix els controls afegits a Avaluapro per reduir dades sensibles dins de l'aplicacio, especialment en camps oberts i exportacions.

## Objectiu

Reduir el risc que un docent guardi mes informacio de la necessaria. Avaluapro ha de prioritzar dades pedagogiques, concretes i accionables, i evitar que els camps oberts es converteixin en espais per guardar dades mediques, familiars o personals innecessaries.

## Principis aplicats

1. **Etiquetes abans que text lliure**
   - Diagnostics, perfils tutorials, intel.ligencies multiples i tipus de seguiment es guien amb opcions predefinides.
   - El text lliure queda per justificar decisions o registrar acords pedagogics.

2. **Text curt i necessari**
   - Els camps oberts sensibles tenen limits raonables de caracters.
   - L'objectiu no es escriure informes llargs dins Avaluapro, sino resums docents utiles.

3. **Avisos visibles**
   - Els camps de diagnostics, anotacions, tutoria, DOIPs, relacions, incidents, agenda, tasques i antecedents mostren avisos d'us responsable.
   - El missatge comu es: escriure fets observables, acords i informacio pedagogica necessaria.

4. **Exportacions diferenciades**
   - Els paquets de notes entre docents son exportacions netes: nomes notes finals de competencia.
   - Les copies completes i els antecedents poden contenir dades sensibles i s'han de custodiar amb mes cura.

## Camps amb avisos i limits

| Espai | Tipus de dada | Control aplicat |
| --- | --- | --- |
| Perfil d'alumne | Notes de diagnostic | Avis clar + limit de text |
| Perfil d'alumne | Informacio general | Avis clar + limit de text |
| Antecedents academics | Valoracio qualitativa | Avis clar + limit de text |
| Anotacions d'alumne | Equip educatiu | Avis clar + limit de text |
| Anotacions d'alumne | Tutoria | Avis clar + limit de text |
| Seguiment | Negatius de comportament | Avis clar + limit de text |
| Seguiment | Entrada de diari | Avis clar + limit de text |
| Seguiment | Nota directa a l'agenda | Avis clar + limit de text |
| Seguiment | Nota de tasca | Avis clar + limit de text |
| Seguiment | Recordatoris | Avis clar + limit de text |
| Mode tutoria | Registres tutorials i DOIPs | Avis clar + limit de text |
| Mode tutoria | Comentari per reunio | Avis clar + limit de text |
| Mode tutoria | Relacions del sociograma | Avis clar + limit de text |

## Exportacions

### Paquets de notes entre docents

Es consideren una exportacio neta:

- inclouen notes finals de competencia;
- inclouen classe, materia, alumne i ultima mirada;
- no inclouen comentaris;
- no inclouen diagnostics;
- no inclouen DOIPs;
- no inclouen fotos;
- no inclouen sociograma;
- no inclouen registres de seguiment.

### Antecedents academics

Poden contenir dades sensibles:

- ultima mirada per competencies;
- perfil anterior de constancia/risc;
- valoracio qualitativa inicial;
- diagnostics capturats si el docent ho decideix.

Per tant, l'app indica que aquests fitxers s'han de conservar nomes si son necessaris i no s'han de compartir fora del context docent autoritzat.

### Copies completes

Una copia completa pot contenir gairebe totes les dades del docent. Avaluapro la tracta com a fitxer sensible i la pantalla de copies i seguretat recorda que cal custodiar-la.

## Criteri d'escriptura responsable

Formulacio recomanada:

> Escriu observacions pedagogiques, concretes i necessaries. Evita informacio medica, familiar o personal que no sigui imprescindible per a la funcio docent.

Exemples recomanables:

- "Cal revisar si porta el material durant les properes dues setmanes."
- "Acord d'equip educatiu: donar instruccions per passos i revisar agenda els dilluns."
- "Evitar seure'l amb X en treball cooperatiu durant aquesta UT."

Exemples a evitar:

- Diagnosi medica detallada.
- Informacio familiar no necessaria.
- Judicis personals sobre l'alumne.
- Relats llargs de conflictes si amb una sintesi pedagogica n'hi ha prou.

## Estat

Aquest bloc queda implementat com a control intern de minimitzacio. No substitueix la validacio legal ni el contracte d'encarregat de tractament, pero ajuda a demostrar que Avaluapro incorpora mesures de proteccio des del disseny.

