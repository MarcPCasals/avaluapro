# Vídeo de demostració d’AvaluaPro per a Devpost

Durada objectiu: entre 2 minuts i 45 segons i 2 minuts i 55 segons.

El límit oficial és inferior a tres minuts. Grava primer la pantalla, després grava la veu en anglès per separat i combina
les dues pistes. És recomanable fer servir la teva veu; un accent natural és completament adequat per explicar aquesta història.

## Pla de gravació

Utilitza la demostració amb dades fictícies de <https://avaluapro.web.app/>. No iniciïs sessió ni introdueixis dades reals
d’alumnes.

| Temps | Què has de mostrar | Narració en anglès |
| --- | --- | --- |
| 0:00-0:15 | Comença a l’espai d’avaluació d’AvaluaPro. Mantén visibles el logotip, l’avís de dades demo i la taula de competències. | **I'm Marc Pérez Casals, a teacher from Andorra. AvaluaPro began because I needed more than a place to store grades: I needed to understand each learner and the whole class.** |
| 0:15-0:35 | Mostra l’avaluació competencial i talla a `Seguiment`, amb les tasques, els estats de lliurament i els percentatges de constància. | **Teachers can assess competencies, record daily work, follow consistency and behavior, and spot changes throughout the course. Information that was previously scattered becomes one practical classroom workflow.** |
| 0:35-0:57 | Alterna entre `Estadístiques Globals`, el diagnòstic principal de `Mode tutoria` i `Relacions i grups`. Acaba amb els grups cooperatius o la disposició de l’aula. | **Global analytics connect achievement, habits and behavior. Tutor mode adds sociometry, individual and group diagnostics, cooperative groups and classroom seating, helping teachers turn daily records into personalized action.** |
| 0:57-1:10 | Torna breument a la vista global, entra a `Briefing IA` i atura’t un moment al títol. | **This working classroom-intelligence foundation existed before Build Week. During the challenge, I used OpenAI Codex to add a new privacy-conscious bridge between all this educational context and AI.** |
| 1:10-1:32 | Mostra el títol, `0 identificadors directes`, la mètrica `Suports pedagògics` i la llista de camps exclosos. | **The privacy gate removes direct identifiers, raw text and diagnosis labels. It keeps only concrete classroom support needs, such as shorter instructions or additional processing time, without naming their clinical origin.** |
| 1:32-1:55 | Mostra el flux de quatre passos, `Copiar prompt` i `Descarregar paquet JSON`. No pugis el fitxer demo enlloc durant la gravació. | **The teacher copies the instructions and downloads a separate JSON file containing selected competency, consistency, behavior, group and pedagogical support signals. Both actions are explicit, and nothing is sent automatically.** |
| 1:55-2:15 | Obre els detalls tècnics i mostra un bloc `pedagogicalSupportNeeds` al costat d’un àlies. Després talla a la correspondència local visible. | **Inside the JSON, the AI sees aliases and concrete accommodations, never their clinical source. The real correspondence stays inside AvaluaPro, allowing the teacher to interpret the response and retain professional control.** |
| 2:15-2:34 | Mostra el commit de Build Week a GitHub, els fitxers del generador i del component React, i després un terminal amb `npm run test:ai-briefing` superat. | **Codex helped inspect the architecture, build the generator and interface, integrate the workflow, and add privacy tests confirming that names, raw observations and the identity map stay out of the copied package.** |
| 2:34-2:55 | Torna a la part superior de `Briefing IA` i acaba amb el títol i el panell de zero identificadors. | **The goal is not to replace the teacher, but to help teachers spot the right patterns earlier while keeping professional judgment, privacy and the teacher firmly in the loop. Built by a teacher for teachers, AvaluaPro is a step toward responsible classroom intelligence.** |

## Traducció dels textos de la interfície

| Text de la interfície | Equivalent en anglès |
| --- | --- |
| `Avaluació` | Assessment |
| `Seguiment` | Daily follow-up |
| `Estadístiques Globals` | Global analytics |
| `Briefing IA` | AI Briefing |
| `0 identificadors directes` | Zero direct identifiers |
| `Suports pedagògics` | Pedagogical supports |
| `Mapa local: No copiat` | Local identity map not copied |
| `Copiar prompt` | Copy prompt |
| `Descarregar paquet JSON` | Download JSON package |
| `Correspondència per interpretar la resposta` | Correspondence for interpreting the response |
| `Veure contingut tècnic del briefing` | View technical briefing content |

Els textos en català coincideixen exactament amb la interfície; la narració n’explica el significat en anglès.

## Llista de comprovació per gravar amb el Mac

1. Utilitza Chrome o Safari en una finestra neta i a pantalla completa, si pot ser a 1920 × 1080.
2. Obre l’aplicació en una finestra privada nova perquè la demostració fictícia es carregui des del principi.
3. Tanca la guia interactiva abans de gravar.
4. Abans de gravar, marca la classe demo com a grup de tutoria a `Configuració del grup` perquè aparegui `Mode tutoria`.
5. Amaga els marcadors, les pestanyes personals, les notificacions, el correu i qualsevol informació del compte.
6. Grava quatre clips curts i sense veu: flux principal de l’aula, eines de tutoria, briefing IA i codi/proves.
7. Abans de gravar el pla dels detalls tècnics, obre’ls i situa el JSON al primer bloc visible de
   `pedagogicalSupportNeeds`. Comença a gravar quan el text ja estigui ben enquadrat.
8. Comença cada clip uns segons abans de l’acció prevista i deixa una pausa curta al final.
9. Mou el cursor lentament i evita escriure en directe sempre que sigui possible.
10. Grava la narració per separat amb Notes de Veu en una habitació silenciosa.
11. Combina els quatre clips i la pista de veu amb iMovie, mantenint la durada final per sota de 2:55.
12. Afegeix títols breus de secció en anglès només si ajuden: `The problem`, `Existing classroom intelligence`,
    `Built during Build Week`, `Privacy gate`,
    `Built with Codex`, `Teacher stays in control`.
13. No afegeixis música amb drets d’autor. El silenci sota la narració és perfectament acceptable.
14. Exporta el vídeo en MP4 i 1080p, i puja’l a YouTube amb una visibilitat que compleixi el requisit de Devpost.

## Text recomanat per a YouTube

Títol:

```text
AvaluaPro - Privacy-Conscious AI Teacher Briefing | OpenAI Build Week 2026
```

Descripció:

```text
AvaluaPro turns classroom assessment, work habits, behavior and group dynamics into actionable teacher intelligence.

For OpenAI Build Week 2026, AvaluaPro was extended with Codex through a privacy-conscious AI Teacher Briefing that creates a pseudonymized, teacher-reviewed package without automatically sending student data to an AI provider.

Live demo: https://avaluapro.web.app/
Source code: https://github.com/MarcPCasals/avaluapro
Build Week evidence: https://github.com/MarcPCasals/avaluapro/blob/main/BUILD_WEEK_2026.md
```

## Revisió final abans de publicar

- El vídeo dura menys de tres minuts.
- L’àudio és clar i està en anglès.
- S’hi explica explícitament que AvaluaPro ja existia abans de Build Week.
- La funcionalitat creada durant Build Week queda identificada sense ambigüitats.
- La contribució de Codex s’explica amb exemples concrets.
- Només hi apareixen dades fictícies d’alumnes.
- No es veuen pestanyes personals, correus electrònics, notificacions ni converses privades amb Codex.
- El vídeo de YouTube es pot obrir sense demanar accés.
