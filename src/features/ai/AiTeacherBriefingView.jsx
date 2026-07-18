import { useMemo, useState } from 'react'
import { AlertTriangle, Brain, CheckCircle2, ClipboardCheck, Copy, EyeOff, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react'
import { buildPrivacySafeTeacherBriefing } from '../../lib/aiTeacherBriefing'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function BriefingMetric({ helper, label, tone = '', value }) {
  return (
    <article className={`ai-briefing-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function CopyButton({ children, onCopy, variant = 'primary-action' }) {
  const [status, setStatus] = useState('')

  async function handleCopy() {
    try {
      await onCopy()
      setStatus('Copiat')
      window.setTimeout(() => setStatus(''), 1800)
    } catch {
      setStatus('No s’ha pogut copiar')
      window.setTimeout(() => setStatus(''), 2200)
    }
  }

  return (
    <span className="ai-copy-action">
      <button className={variant} onClick={handleCopy} type="button">
        <Copy size={17} />
        {children}
      </button>
      {status && <small>{status}</small>}
    </span>
  )
}

function FocusStudentCard({ student }) {
  return (
    <article className="ai-focus-card">
      <header>
        <strong>{student.alias}</strong>
        <span>{student.halfGroup}</span>
      </header>
      <dl>
        <div>
          <dt>Rendiment</dt>
          <dd>{student.evaluation.grade}</dd>
        </div>
        <div>
          <dt>Constància</dt>
          <dd>{student.tracking.consistencyPercent === null ? 'S/D' : `${student.tracking.consistencyPercent}%`}</dd>
        </div>
        <div>
          <dt>Vermells</dt>
          <dd>{student.tracking.redPoints}</dd>
        </div>
        <div>
          <dt>Incidències</dt>
          <dd>{student.behavior.incidentCount}</dd>
        </div>
      </dl>
      <ul>
        {student.signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
      <p>{student.suggestedFocus}</p>
    </article>
  )
}

export function AiTeacherBriefingView() {
  const state = useAvaluaproStore()
  const briefing = useMemo(() => buildPrivacySafeTeacherBriefing(state), [state])
  const { activeClass, activeUt, localIdentityMap, promptPackage, promptText } = briefing
  const promptJson = JSON.stringify(promptPackage, null, 2)
  const focusStudents = promptPackage.focusStudents || []
  const excludedFields = promptPackage.privacyGuardrails.excludedFields || []
  const activeClassLabel = activeClass?.name || 'Classe activa'

  return (
    <section className="ai-briefing-view">
      <header className="ai-briefing-hero">
        <div>
          <span className="ai-briefing-pill">
            <Brain size={17} />
            Build Week · Privacy-safe AI
          </span>
          <h2>Briefing IA segur per al docent</h2>
          <p>
            Converteix les dades de la classe en un paquet pseudonimitzat que pots revisar abans de copiar-lo a una IA.
            Avaluapro no envia res automàticament i no inclou noms, diagnòstics ni observacions textuals.
          </p>
        </div>
        <aside>
          <ShieldCheck size={24} />
          <strong>0 identificadors directes</strong>
          <small>La correspondència real queda només dins d’Avaluapro.</small>
        </aside>
      </header>

      <div className="ai-briefing-context">
        <div>
          <UsersRound size={18} />
          <span>
            {activeClassLabel}
            <strong>{activeClass?.subject || 'Matèria no indicada'} · {activeUt?.name || 'UT no indicada'}</strong>
          </span>
        </div>
        <div>
          <LockKeyhole size={18} />
          <span>
            Porta de sortida manual
            <strong>El docent revisa i copia el paquet si ho considera adequat.</strong>
          </span>
        </div>
      </div>

      <section className="ai-briefing-metrics" aria-label="Resum del paquet IA">
        <BriefingMetric
          helper="Alumnes pseudonimitzats com Student A, Student B..."
          label="Alumnes"
          value={promptPackage.classContext.studentCount}
        />
        <BriefingMetric
          helper="Només alumnes amb senyals combinades rellevants."
          label="Focus"
          tone="warning"
          value={focusStudents.length}
        />
        <BriefingMetric
          helper="Observacions i notes textuals queden fora del prompt."
          label="Text lliure"
          tone="positive"
          value="Exclòs"
        />
        <BriefingMetric
          helper="La IA rep mètriques, no identitat ni diagnòstics."
          label="Mapa local"
          tone="positive"
          value="No copiat"
        />
      </section>

      <section className="ai-briefing-privacy-panel">
        <div>
          <EyeOff size={22} />
          <div>
            <h3>Què queda fora del paquet IA</h3>
            <p>
              Aquest filtre és intencionat: redueix risc abans d’usar qualsevol proveïdor d’IA i obliga a mantenir
              revisió humana.
            </p>
          </div>
        </div>
        <ul>
          {excludedFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </section>

      <section className="ai-briefing-workbench">
        <article className="ai-briefing-panel">
          <header>
            <div>
              <h3>Prompt pseudonimitzat</h3>
              <p>Text preparat per enganxar en una IA aprovada o en un entorn de prova amb dades demo.</p>
            </div>
            <CopyButton onCopy={() => navigator.clipboard.writeText(promptText)}>Copiar prompt</CopyButton>
          </header>
          <textarea readOnly value={promptText} />
        </article>

        <article className="ai-briefing-panel">
          <header>
            <div>
              <h3>Paquet JSON que sortiria de l’app</h3>
              <p>És exactament el bloc de dades que s’inclou dins del prompt.</p>
            </div>
            <CopyButton onCopy={() => navigator.clipboard.writeText(promptJson)} variant="secondary-action">
              Copiar JSON
            </CopyButton>
          </header>
          <pre>{promptJson}</pre>
        </article>
      </section>

      <section className="ai-focus-section">
        <div className="section-heading compact">
          <AlertTriangle size={20} />
          <div>
            <h3>Alumnes de focus per a la IA</h3>
            <p>La IA només veu aquests codis. El nom real no s’inclou al prompt ni al JSON.</p>
          </div>
        </div>
        {focusStudents.length === 0 ? (
          <div className="ai-briefing-empty">
            <CheckCircle2 size={20} />
            <strong>No hi ha senyals combinades prou fortes ara mateix.</strong>
            <span>El prompt continuarà incloent el resum de classe i les proteccions de privacitat.</span>
          </div>
        ) : (
          <div className="ai-focus-grid">
            {focusStudents.map((student) => (
              <FocusStudentCard key={student.alias} student={student} />
            ))}
          </div>
        )}
      </section>

      <details className="ai-local-map">
        <summary>
          <ClipboardCheck size={18} />
          Veure correspondència local que no es copia a la IA
        </summary>
        <div>
          {localIdentityMap.map((entry) => (
            <span key={entry.alias}>
              <strong>{entry.alias}</strong>
              {entry.name}
            </span>
          ))}
        </div>
      </details>
    </section>
  )
}
