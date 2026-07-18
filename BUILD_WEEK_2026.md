# OpenAI Build Week 2026: AvaluaPro

AvaluaPro is a classroom intelligence workspace for teachers. It combines competency assessment, work habits,
behavior tracking, tutoring, sociometry, cooperative groups and privacy-aware data handling in one runnable web app.

This document separates the pre-existing product from the Build Week extension, so judges can evaluate the work added
during the OpenAI Build Week submission period.

## What existed before Build Week

Before July 13, 2026, AvaluaPro already existed as a real classroom product with:

- React, Vite, Zustand and Firebase implementation.
- Firebase Authentication with Google sign-in.
- Cloud Firestore synchronization and private per-teacher data spaces.
- IndexedDB local persistence.
- Competency assessment, criteria and marks.
- Work habit and behavior tracking.
- Global analytics and intervention views.
- Tutoring, sociometric surveys, cooperative groups and seating support.
- Backup and restore flows.
- Firestore security rules and automated security tests.
- A substantial privacy and institutional dossier for educational deployment.

The existing production app is available at:

- <https://avaluapro.web.app>

## Build Week extension

During Build Week, AvaluaPro was meaningfully extended with a new feature:

### Privacy-safe AI Teacher Briefing

Path in the app:

```text
Estadístiques Globals -> Briefing IA
```

This feature prepares a teacher briefing package for future or external AI use without automatically sending student
data to any AI provider.

It does four things:

1. Builds a pseudonymized classroom package from learning, habit, behavior and sociometric signals.
2. Replaces student identities with aliases such as `Student A`, `Student B`, etc.
3. Excludes names, surnames, emails, photos, diagnosis labels, family information, raw free-text observations and the
   local identity map.
4. Generates a copyable prompt that asks an AI assistant for class-level and student-level teaching options, while
   requiring human review.

The local identity map remains visible only inside AvaluaPro and is not included in the copied prompt or JSON package.

## Why this matters

Many AI education demos start by sending rich student data to a model. AvaluaPro takes the opposite approach: the product
first creates a privacy gate.

The teacher can inspect the exact package that would leave the app before deciding whether to use it in an approved AI
environment. This is especially important because AvaluaPro works with minors and may contain sensitive educational,
behavioral, tutoring and sociometric signals.

## Files added or changed for Build Week

Main feature:

- `src/lib/aiTeacherBriefing.js`
- `src/features/ai/AiTeacherBriefingView.jsx`
- `src/components/MainNavigation.jsx`
- `src/features/analytics/AnalyticsView.jsx`
- `src/App.css`

Tests and scripts:

- `tests/ai-teacher-briefing.test.js`
- `package.json`

Documentation:

- `BUILD_WEEK_2026.md`
- `README.md`

## How Codex was used

Codex was used as the main engineering partner during Build Week to:

- inspect the existing AvaluaPro architecture and privacy dossier;
- identify a feature that could be honestly evaluated as new Build Week work;
- design the privacy-safe AI briefing flow;
- implement the pseudonymization and prompt-generation helper;
- integrate the new React view into the existing analytics navigation;
- add tests that verify the copied AI package does not include direct student identifiers or sensitive free-text fields;
- update documentation for Devpost judges.

Product and privacy decisions remained explicit: the app does not auto-send student data to an AI service, and the
teacher keeps human review before any generated recommendation is used.

## How to run

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Run the Build Week privacy test:

```bash
npm run test:ai-briefing
```

Run the usual checks:

```bash
npm run lint
npm run build
```

## Sample data

On first launch, AvaluaPro loads a fictitious demo classroom. Judges can use the demo data to inspect the Build Week
feature without entering real student information.

Recommended demo path:

1. Open the app.
2. Keep the demo classroom.
3. Open `Estadístiques Globals`.
4. Click `Briefing IA`.
5. Inspect the pseudonymized JSON package.
6. Copy the prompt and confirm it contains aliases, metrics and guardrails, but no student names or raw observations.

## Current limits

- The Build Week feature does not call the OpenAI API directly from the browser.
- This is intentional: putting an API key in a client-side educational app would be unsafe.
- A future institutional version should use a backend connector, approved provider terms, retention controls and a
  completed data protection review before direct AI calls are enabled.
