# Devpost OpenAI Build Week Submission Draft

This file is a copy-ready draft for the Devpost submission.

Important framing:

- AvaluaPro existed before OpenAI Build Week.
- The Build Week work is the new privacy-conscious AI Teacher Briefing.
- The submission should clearly separate the existing product from the new extension.
- Do not claim that the whole application was created during Build Week.

## Tagline

Avaluapro turns classroom data into privacy-conscious teacher intelligence: competencies, habits, behavior and sociograms in one actionable workspace, so teachers can support every learner earlier.

## Project Story

## Inspiration

AvaluaPro began during my first year as a teacher. I needed one practical place to record assessment results and the daily work my students completed. The tools available to us were designed mainly for administration and reporting, not for the decisions a teacher has to make every day in the classroom.

As I collected more information, I realized the real opportunity was not simply storing marks. Competency progress, consistency, behavior, tutoring observations and classroom relationships could reveal patterns that no isolated gradebook could show. By the time one of those patterns becomes obvious without the right tools, several valuable weeks may already have passed.

I wanted to create a tool by and for teachers: one that makes our work easier, but also improves it. Understanding these different dimensions helps us see the learners and the group we actually have in front of us, so we can provide richer and more personalized teaching.

For OpenAI Build Week, that vision led to a sharper question: how can AI help teachers reason over classroom data without turning the privacy of minors into an afterthought?

That inspired the Build Week extension: a privacy-conscious AI Teacher Briefing that prepares useful classroom intelligence for AI review while keeping student identities and sensitive fields out of the exported package.

## What it does

AvaluaPro is a classroom intelligence workspace designed around the real daily needs of teachers, including the competency-based model used in the Andorran education system. It brings together assessment, daily work and consistency, behavior follow-up, tutoring, sociograms, cooperative groups, seating plans and classroom analytics.

The core workflow is intentionally practical: a teacher creates a class, adds students and assessment criteria, records marks and daily work throughout the year, and watches the automatically generated analytics evolve. Instead of waiting until the end of a term, the teacher can notice changes early and adjust teaching for an individual learner or the whole class.

Its tutoring workspace turns otherwise scattered information into a coherent view of both students and group dynamics. Teachers can also share the appropriate classroom information with colleagues, reducing repeated work and helping teaching teams build a more complete picture together.

During OpenAI Build Week, I extended it with **Briefing IA**, a privacy-conscious AI preparation layer.

The new feature takes the signals already inside AvaluaPro and builds a pseudonymized briefing package for a teacher to review before using AI. It replaces student names with aliases such as `Student A`, `Student B` and `Student C`, and it excludes direct identifiers and sensitive fields from the copied AI package.

It does not send data automatically to any AI provider. That is intentional. Instead, the teacher can inspect the exact JSON package and prompt before deciding whether to use it in an approved AI environment.

The briefing includes:

- class-level learning, habit and behavior signals;
- focus students detected from the current classroom data;
- sociometric counts and cooperative group context when available;
- a copyable prompt asking an AI assistant for practical teaching recommendations;
- a local identity map that stays inside AvaluaPro and is not included in the copied AI package.

The goal is not to automate educational decisions or replace professional judgment. It is to give the teacher a safer, faster way to prepare for the next class, tutoring conversation or teaching-team meeting.

## How we built it

The existing AvaluaPro app is built with React and Vite, with Zustand for client state, IndexedDB for resilient local data, Firebase Authentication for teacher access, Cloud Firestore for synchronized data and Firebase Hosting for deployment. Automated tests protect critical data and privacy behavior.

I came to this project as a teacher learning to build software, not as a professional developer. I provided the classroom knowledge, product vision, priorities and creative decisions; OpenAI Codex became my engineering partner. It helped me turn those decisions into architecture, interfaces, tests and working production code, while explaining the trade-offs as the product grew.

AvaluaPro existed before Build Week. During the challenge, I used Codex to design, implement, test and deploy the new privacy-conscious AI Teacher Briefing. This is the work submitted for Build Week, clearly separated from the pre-existing product.

The Build Week extension added:

- `src/lib/aiTeacherBriefing.js` for the pseudonymized briefing generator;
- `src/features/ai/AiTeacherBriefingView.jsx` for the teacher-facing UI;
- navigation integration through the main `Briefing IA` (`AI Briefing`) tab;
- tests in `tests/ai-teacher-briefing.test.js`;
- documentation in `BUILD_WEEK_2026.md` and the README.

The feature was validated with automated tests, linting, production build checks and browser inspection of the deployed app. Its privacy test verifies that the exported package does not include direct student names, raw observations or the local identity map.

The production app is available at:

https://avaluapro.web.app

## Challenges we ran into

Protecting data about minors has been the hardest challenge throughout AvaluaPro. Firebase provides strong infrastructure, authentication and access controls, but using professional cloud technology is not by itself a complete privacy strategy. The product also needs data minimization, clear roles, controlled sharing, retention rules, human oversight and honest communication about what is and is not anonymous.

For Build Week, the biggest challenge was resisting the easiest AI demo.

Technically, it would have been simple to add a button that sends all classroom data directly to a model. But AvaluaPro works with educational data about minors, including behavior, tutoring and sociometric signals. In that context, the hard part is not calling an API. The hard part is deciding what should be allowed to leave the app at all.

Another challenge was the difference between pseudonymization and anonymization. Replacing a student's name with `Student A` reduces exposure, but it is not true anonymization if the teacher can still map the alias back to a real learner. That distinction shaped the design: the feature is a privacy gate, not a claim that the data becomes anonymous.

That led to deliberate product decisions even when they made the feature less automatic: no names or direct identifiers in the AI package, no raw free-text observations, no automatic transmission to an external provider, and no API key in the browser. The teacher sees and approves the exact package first, while the alias-to-identity map remains local to AvaluaPro.

We also had to combine signals from different parts of the product: competency results, habits, incidents, sociometric relations and cooperative groups. The output had to be compact enough for AI reasoning, explainable enough for a teacher to inspect, and useful enough to support real decisions.

Another major product challenge has been the tutoring workspace: combining individual and group-level information, sociometry, cooperative groups and seating plans, while allowing colleagues to share only what the tutor legitimately needs.

Finally, the project itself existed before Build Week. So the submission needed to be transparent: AvaluaPro is the existing product, and the new work is the AI Teacher Briefing extension built during the challenge period.

## Accomplishments that we're proud of

I am proud that a first-year classroom need has grown into a real product with the potential to scale. I designed it from zero through a collaboration in which I contributed the educational expertise and Codex contributed the programming capability. That experience showed me that a teacher with a clear problem and strong domain knowledge can build serious software with AI.

The product has already been used in real classroom workflows and presented to the Ministry of Education of Andorra, where the path toward a broader pilot or institutional adoption is now being explored. This is not an official endorsement, but it is meaningful evidence that the problem and the proposed solution are real.

I am also proud that the Build Week feature is not a decorative AI add-on. It fits the direction of the product: helping teachers turn large amounts of classroom data into useful information while treating privacy as part of the design.

I am especially proud of:

- creating a meaningful AI workflow without putting an API key in the browser;
- making the teacher review the exact package before any AI use;
- excluding names, emails, photos, diagnosis labels, family information, raw free-text observations and the identity map from the copied package;
- adding automated tests for privacy expectations;
- documenting clearly what existed before Build Week and what was added during it;
- deploying the extension in the real production app.

What I hope will surprise judges is the breadth of information AvaluaPro can connect without losing sight of daily usability. A mark, an unfinished task, a change in consistency or a classroom relationship is limited on its own. Together, these signals can become practical teacher intelligence.

The result is a more responsible educational AI pattern: first minimize and review the data, then use AI only in an approved context.

## What we learned

I have learned an enormous amount about creating software that makes teachers' work simpler and better, while helping students learn in more personalized, meaningful and engaging ways. Most importantly, I learned that domain knowledge matters: knowing the classroom problem deeply helped me make product decisions even while I was still learning the technology.

Technically, I learned how to build a cloud-connected application, manage local and synchronized state, structure a growing React codebase, test critical behavior and deploy changes safely. I also learned that a cloud database being encrypted and professionally operated does not make every use of it automatically compliant or risk-free.

The main Build Week lesson is that educational AI is not only a model problem. It is a data architecture and governance problem.

A teacher-facing AI feature needs guardrails before prompts. It needs minimization, role clarity, human review, retention thinking and a clear boundary between internal identity and external analysis.

I also learned that privacy constraints can make the product better. They forced the AI feature to be more focused, more explainable and more useful. Instead of asking AI to "know everything" about a student, AvaluaPro asks it to reason over selected classroom signals and return practical options for the teacher.

Using Codex changed what I believed I could build. It was useful not only for writing code, but for keeping engineering, product and privacy reasoning connected while changing a real production codebase. I learned how to direct an AI engineering partner: define the educational intent, question its proposals, test the result and remain responsible for the final decisions.

## What's next for AvaluaPro

The immediate next step is to polish AvaluaPro so that any teacher can use it intuitively, then run a controlled pilot with several educators and learn from their real workflows.

For the AI capability, the next step is to turn the Build Week briefing into an institutionally approved workflow. My vision is for AI to read a deliberately minimized, pseudonymized selection of classroom signals and help the teacher identify patterns, prepare tutoring conversations, plan interventions, create cooperative groups and adapt upcoming lessons. The AI would propose; the teacher would review, contextualize and decide.

That means:

- adding a server-side AI connector instead of any client-side API key;
- using an approved provider configuration with clear data retention and processing terms;
- logging and auditing AI requests at the institutional level;
- keeping human review before decisions affect students;
- expanding the briefing into teacher-specific workflows such as tutoring preparation, group planning and early intervention suggestions;
- completing the legal and technical review needed for a controlled educational pilot.

Long term, AvaluaPro aims to become a privacy-conscious classroom intelligence platform: not a replacement for teachers, but a tool that helps them see the right patterns earlier and support students with more precision.

## Demo Video Notes

Recommended 3-minute structure:

1. Show the existing AvaluaPro workspace with demo data.
2. Explain that the product existed before Build Week.
3. Open `Briefing IA` (`AI Briefing`) from the main navigation.
4. Show aliases such as `Student A` instead of real names.
5. Show that the identity map stays local inside AvaluaPro.
6. Copy the prompt or JSON package.
7. Explain that Build Week added the privacy-conscious AI preparation layer.
8. Close with the main idea: useful AI for teachers starts with data minimization and human review.

## Evidence To Mention

- Build Week feature commit: `537ee16`
- Production app: https://avaluapro.web.app
- Build Week documentation: `BUILD_WEEK_2026.md`
- Feature file: `src/lib/aiTeacherBriefing.js`
- UI file: `src/features/ai/AiTeacherBriefingView.jsx`
- Test file: `tests/ai-teacher-briefing.test.js`
