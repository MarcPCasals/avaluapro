## Inspiration

AvaluaPro began during my first year as a teacher.

It all started because, during my first few months in the classroom, I realized that I needed a practical place to record assessment results, daily tasks and my students' progress. The digital tools available to teachers were mainly designed for administration and final reports. If I wanted something more sophisticated that went beyond paper, the alternatives were paid applications that still were not adapted to what I needed. They had not been created around the decisions a teacher has to make every day: who needs help, who is becoming less consistent, whether a difficulty is temporary, or how the dynamics of a class are changing. They were not well adapted to the Andorran education system either.

At that point, I was not a developer. My profession is teaching, and I had no conventional software engineering background. In February 2026, I started learning how to build applications with AI. AvaluaPro was born and has grown entirely with the help of OpenAI Codex: I bring the classroom problem, pedagogical knowledge, ideas and product decisions, while Codex helps me understand the technology and turn those decisions into working software.

At first, I only wanted a better gradebook for teachers. As I started recording more information, I realized that the real value was not simply storing marks. Competency progress, consistency, work habits, behavior, tutoring observations and classroom relationships could reveal patterns that no isolated gradebook could show.

These patterns matter because teachers need to understand the students and the group they actually have in front of them. The earlier a change is noticed, the earlier teaching can be adapted and meaningful, individualized support can be provided.

For OpenAI Build Week, this led me to a new question: how can AI help teachers reason from classroom data without treating the privacy of minors as an afterthought?

That question inspired my Build Week extension: a privacy-conscious AI Teacher Briefing that prepares useful classroom information for AI-assisted analysis while keeping student identities and unnecessary sensitive information out of the exported package.

## What it does

AvaluaPro is a classroom intelligence workspace created by a teacher, for teachers. It is designed around the real daily needs of teaching and the competency-based education model used in Andorra.

It brings together:

- competency assessment;
- marks, criteria and learning progress;
- daily tasks and work consistency;
- behavior follow-up;
- tutoring information;
- classroom analytics;
- sociograms and group dynamics;
- cooperative group planning;
- classroom seating plans;
- controlled collaboration between teachers.

The main workflow is practical: a teacher creates a class, adds students and assessment criteria, records marks and daily work throughout the year, and watches the automatically generated analytics evolve.

Instead of waiting until the end of a term, the teacher can identify changes earlier and adapt teaching for an individual student or the whole class. AvaluaPro turns information that is normally scattered across different tools into a more coherent and centralized view.

The tutoring workspace is especially important. It combines individual progress with group-level information, sociometry, cooperative groups and seating plans. This helps tutors understand both each student and the social dynamics of the class. Teachers can also share the appropriate information with colleagues, reducing repeated work and improving coordination.

During OpenAI Build Week, using GPT-5.6, I extended AvaluaPro with **Briefing IA**, a privacy-conscious AI preparation layer.

The new feature creates a pseudonymized classroom package from the information already inside AvaluaPro. Student names are replaced with aliases such as `Student A`, `Student B` and `Student C`.

The exported package can contain selected educational signals such as:

- competency and learning indicators;
- consistency and work-habit patterns;
- behavior indicators;
- sociometric and cooperative-group context;
- concrete pedagogical support needs.

It deliberately excludes:

- names and surnames;
- email addresses;
- photographs;
- family information;
- diagnosis labels;
- unprocessed free-text teacher observations;
- the correspondence between aliases and real students.

The feature does not automatically send information to OpenAI or any other AI provider. The teacher first reviews the exact prompt and pseudonymized JSON package, then decides whether to use them in an institutionally approved AI environment.

The local identity map remains inside AvaluaPro so that the teacher can interpret the response. It is never included in the exported package.

This is pseudonymization, not complete anonymization. AvaluaPro can still connect an alias to a student locally, so the information must continue to be handled responsibly as personal educational data.

The goal is not to automate educational decisions or replace professional judgment. AvaluaPro helps teachers notice relevant patterns earlier while keeping privacy, context and the teacher firmly in the process.

## How I built it

I started learning to build software with AI in February 2026. Before beginning this journey, I did not know React, Firebase, application architecture or automated testing. My daily job is teaching, not programming.

AvaluaPro has been developed from the beginning through an iterative collaboration with OpenAI Codex. I define the educational problem, explain how teachers actually work, choose the priorities, test the result and make the final product decisions. Codex helps me inspect the code, understand technical options, implement features, find problems, write tests and deploy the application.

It was not created from a single prompt. This project has been growing since February through many cycles of iteration and classroom ideas, implementation, testing, mistakes, conversations and improvements. As the product became more capable, Codex also helped me reorganize the architecture and understand the privacy consequences of different technical decisions.

AvaluaPro is built with:

- React and Vite;
- JavaScript;
- Zustand for application state;
- IndexedDB for resilient local storage;
- Firebase Authentication for teacher access;
- Cloud Firestore for data synchronization;
- Firebase Hosting for deployment;
- Firebase Security Rules and automated security tests;
- Node.js tests for critical privacy behavior.

AvaluaPro already existed before OpenAI Build Week. During the challenge, I used **GPT-5.6 through OpenAI Codex** as my engineering partner to design, implement, test and deploy the new privacy-conscious AI Teacher Briefing.

For the Build Week extension, GPT-5.6 through Codex helped me:

- inspect the existing React, Firebase and privacy architecture;
- design the data-minimization and pseudonymization flow;
- implement the briefing generator;
- build and integrate the new React interface;
- turn configured needs into useful pedagogical supports without exporting diagnosis labels;
- create automated tests that check that identifiers and sensitive fields are not included;
- test the production workflow and prepare transparent documentation for the judges.

My role remained essential throughout the process. I provided the educational context and decided which information would be useful or inappropriate. I tested the workflow from a teacher's perspective, questioned unclear or unsafe proposals and approved the final behavior.

The production application is available at:

https://avaluapro.web.app/

## Challenges I ran into

The greatest challenge has been protecting data about minors.

Firebase provides professional infrastructure, authentication, encryption and access controls. However, I learned that using professional cloud technology is not enough by itself. Privacy also requires data minimization, controlled sharing, clear roles, retention rules, human oversight and honest communication about what the system can and cannot guarantee.

For Build Week, the biggest challenge was resisting the easiest AI demo.

Technically, it would have been simpler to add a button that sent all classroom data directly to a model. But AvaluaPro contains educational, behavioral, tutoring and sociometric information about minors. In this context, the difficult question is not how to call an AI API. It is deciding what should be allowed to leave the application.

This led to deliberate decisions that made the feature less automatic but more responsible:

- no names or direct identifiers in the AI package;
- no diagnosis labels;
- no unprocessed teacher observations;
- no family information;
- no identity map in the exported package;
- no automatic transmission to an external provider;
- no AI API key stored in the browser;
- teacher review before any external AI use.

Another challenge was understanding the difference between pseudonymization and anonymization. Replacing a name with `Student A` reduces exposure, but the data is not truly anonymous if the teacher can reconnect that alias to a real student. I therefore describe the package honestly as pseudonymized.

I also had to combine signals from very different areas of the product. Learning results, habits, behavior and classroom relationships needed to become a package that was compact enough for AI analysis, understandable enough for a teacher to inspect and useful enough to support real classroom decisions.

The tutoring workspace presented a similar product challenge. It needed to connect individual and group information while making collaboration between teachers useful, controlled and understandable.

Finally, I had to be transparent about the Build Week timeline. AvaluaPro is a product I had already started building. The work submitted for the challenge is the new AI Teacher Briefing and its privacy workflow, not the entire pre-existing application.

## Accomplishments I am proud of

I am proud that a need from my first year as a teacher has become a real, working product.

Only a few months ago, I had never built an application. I started learning with AI in February 2026, and today AvaluaPro is a deployed classroom platform that includes assessment, analytics, tutoring, sociometry, collaboration, local resilience, cloud synchronization, security rules and automated tests.

I am not proud because I became a software expert overnight. Far from it. I am proud because I have learned how to combine my professional knowledge as a teacher with the engineering capabilities of Codex. This has allowed me to create a tool grounded in real classroom practice.

AvaluaPro has already been used in real teaching workflows and presented to the Ministry of Education of Andorra. A possible pilot or institutional model is being explored. This does not represent an official endorsement, but it shows that both the problem and the product are real.

I am especially proud that the Build Week feature is not a decorative AI addition. It establishes a responsible workflow before direct AI integration.

The accomplishments that matter most to me are:

- building a meaningful AI workflow without exposing an API key in the browser;
- keeping the teacher in control of everything that leaves the application;
- excluding direct identifiers and unnecessary sensitive information;
- retaining useful pedagogical support needs without exporting diagnosis labels;
- separating the local identity map from the AI package;
- adding automated privacy tests;
- documenting clearly what existed before Build Week;
- deploying the extension in the real production application.

What I hope will surprise the judges is how much useful classroom context AvaluaPro can connect without losing sight of a teacher's daily work.

A mark, a missing task, a change in consistency or a classroom relationship has limited meaning on its own. Together, these signals can help a teacher understand what may be changing and decide where professional attention is needed.

## What I learned

I learned that knowing the classroom problem deeply is a real technical advantage.

Even without a conventional programming background, I was able to make meaningful product decisions because I understood the users, the workflow and the consequences of getting those decisions wrong. Codex gave me access to engineering capabilities, but my teaching experience gave the project its direction.

I learned how to work with an AI engineering partner. That means much more than asking for code. I had to explain the educational intent, question proposals, compare alternatives, test real workflows and remain responsible for the final decisions.

Technically, I learned how to structure a growing React application, manage local and synchronized state, use Firebase securely, write automated tests and deploy changes to production.

I also learned that encryption and authentication are only part of data protection. A secure system must also consider what information is collected, why it is needed, who can access it, how it is shared and when it should be deleted.

The main Build Week lesson is that educational AI is not only a model problem. It is also a data architecture and governance problem.

Useful educational AI needs guardrails before prompts. It needs minimization, role clarity, human review and a clear boundary between internal identity and external analysis.

Privacy constraints also improved the feature. Instead of asking an AI system to know everything about a student, the briefing asks it to reason over a selected set of classroom signals and return practical options for a teacher to review.

Most importantly, this project changed what I believed I could create as a teacher. I started in February with needs that came from the classroom and no software engineering background. With Codex, those ideas became a working product that I can test, improve and share.

## What's next for AvaluaPro

The immediate next step is to make AvaluaPro intuitive enough for any teacher to use and then run a controlled pilot with several educators.

For the AI capability, the next step is to turn the Build Week briefing into an institutionally approved workflow. My vision is for AI to analyze a deliberately minimized and pseudonymized selection of classroom signals and help teachers:

- identify patterns earlier;
- prepare tutoring conversations;
- plan targeted interventions;
- create cooperative groups;
- adapt upcoming lessons;
- coordinate support between teachers.

The AI would propose options. The teacher would interpret the context, review the suggestions and decide what to do.

Future work includes:

- adding a server-side AI connector instead of placing an API key in the browser;
- using an approved provider configuration with clear data processing and retention terms;
- logging and auditing institutional AI requests;
- keeping human review before any decision affects a student;
- expanding the briefing with teacher-specific workflows;
- completing the legal and technical review required for a controlled educational pilot.

In the long term, I want AvaluaPro to become a privacy-conscious classroom intelligence platform built around the reality of teaching.

It is not intended to replace teachers. It is intended to help them notice relevant patterns earlier, support students more precisely and make better use of their limited time, while keeping professional judgment and privacy at the center.
