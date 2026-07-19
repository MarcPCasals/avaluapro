# AvaluaPro Judge Guide

This guide lets an English-speaking judge test the OpenAI Build Week extension without entering real student data or
learning the full Catalan interface.

## Submission Scope

AvaluaPro is a pre-existing classroom product. The work submitted for OpenAI Build Week is the **privacy-conscious AI
Teacher Briefing**, designed, implemented, tested and deployed with Codex during the submission period.

- Live app: <https://avaluapro.web.app/>
- Build Week evidence: [BUILD_WEEK_2026.md](BUILD_WEEK_2026.md)
- Main implementation commit: [`537ee16`](https://github.com/marcpcasals/avaluapro/commit/537ee16)

## Five-Minute Test

### 1. Open The Fictitious Demo

Open <https://avaluapro.web.app/> in a desktop browser.

AvaluaPro loads a complete fictitious classroom on first launch. No Google sign-in is required. If the interactive guide
opens, close it with the `X`. Do not replace the demo with personal data.

### 2. Open The Build Week Feature

Click `Briefing IA` in the main navigation. In English, this means `AI Briefing`.

At the top of the view, verify:

- `0 identificadors directes`: zero direct identifiers;
- `Text lliure: Exclòs`: raw free text is excluded;
- `Mapa local: No copiat`: the local identity map is not copied;
- `Porta de sortida manual`: the package leaves only after a teacher chooses to copy it.

### 3. Inspect The Workflow

Scroll to `Com utilitzar el briefing` (`How to use the briefing`). The interface presents four explicit steps:

- copy the AI instructions;
- download the separate pseudonymized JSON package;
- paste the prompt and attach the file in an institutionally approved AI environment;
- use AvaluaPro's local correspondence to interpret the aliases in the response.

Open `Veure contingut tècnic del briefing` (`View technical briefing content`) to inspect both pieces. Check that the JSON
contains classroom metrics, competency signals and aliases such as `Student F`, but no student names, diagnosis labels or
raw observations.

### 4. Verify The Human Review Boundary

The buttons `Copiar prompt` and `Descarregar paquet JSON` mean `Copy prompt` and `Download JSON package`.

AvaluaPro does not call an AI service automatically. The teacher sees the exact outgoing package first and decides whether
to use the prompt and file in an institutionally approved environment. The package is pseudonymized, not claimed to be
anonymous.

### 5. Inspect The Local Identity Boundary

Near the bottom, review:

`Correspondència per interpretar la resposta`

Translation: `Correspondence for interpreting the response`.

The mapping lets the teacher understand the briefing inside AvaluaPro. It is deliberately absent from both copyable
outputs.

## Optional Product Context

The following pre-existing views show why the AI briefing has useful signals to work from:

1. `Avaluació`: competency assessment.
2. `Seguiment`: daily work, consistency and intervention tracking.
3. `Estadístiques Globals`: class-level analytics across achievement, habits and behavior.

Tutor mode is also available in the demo:

1. Click the settings icon with the tooltip `Configuració del grup` (`Class settings`).
2. Enable `Aquest grup també és una tutoria` (`This class is also a tutor group`).
3. Close settings and open `Mode tutoria` (`Tutor Mode`).
4. Explore `Relacions i grups` (`Relationships and Groups`) for cooperative groups and seating plans.

This setting changes only the local fictitious demo used by that browser.

## Catalan UI Translation Key

| Catalan label | English meaning |
| --- | --- |
| `Avaluació` | Assessment |
| `Seguiment` | Daily Follow-up |
| `Estadístiques Globals` | Global Analytics |
| `Briefing IA` | AI Briefing |
| `Mode tutoria` | Tutor Mode |
| `Avaluació tutorial` | Tutor Assessment |
| `Seguiment tutorial` | Tutor Follow-up |
| `Relacions i grups` | Relationships and Groups |
| `Informes tutorials` | Tutor Reports |
| `Sociograma` | Sociogram |
| `Qüestionari sociomètric` | Sociometric Questionnaire |
| `Grups cooperatius` | Cooperative Groups |
| `Disposició d’aula` | Classroom Seating |
| `Dades i Compte` | Data and Account |
| `Dades demo` | Demo Data |
| `Veure guia` | View Guide |
| `Començar amb les meves dades` | Start With My Data |

The labels match the Catalan interface exactly so judges can identify them visually.

## Code Review Path

The smallest useful review path is:

1. [`src/lib/aiTeacherBriefing.js`](src/lib/aiTeacherBriefing.js): package construction, aliases and exclusions.
2. [`src/features/ai/AiTeacherBriefingView.jsx`](src/features/ai/AiTeacherBriefingView.jsx): review interface and copy actions.
3. [`tests/ai-teacher-briefing.test.js`](tests/ai-teacher-briefing.test.js): privacy assertions.
4. [`BUILD_WEEK_2026.md`](BUILD_WEEK_2026.md): prior-versus-new work and Codex contribution.

Run the focused test:

```bash
npm install
npm run test:ai-briefing
```

## Expected Result

A successful review should confirm that:

- the feature works with the included fictitious classroom;
- the outgoing package contains useful multi-signal teaching context;
- direct student identifiers and selected sensitive fields are excluded;
- aliases can be resolved only through a local map that is not copied;
- no external AI request occurs;
- the teacher remains responsible for reviewing context and deciding what to do.

## Known Limits

- The product interface is currently in Catalan because its first users are educators in Andorra.
- The Build Week feature prepares an AI-ready package but does not yet include a server-side OpenAI connector.
- Pseudonymized educational signals may still be personal data.
- Direct institutional AI use requires an approved provider, contractual safeguards, retention controls and a completed
  data-protection review.
