import { useMemo, useState } from 'react'
import { Brain, Braces, ClipboardCheck, Copy, Download, EyeOff, LockKeyhole, ShieldCheck, Upload, UsersRound } from 'lucide-react'
import { buildPrivacySafeTeacherBriefing } from '../../lib/aiTeacherBriefing'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const EXCLUDED_FIELD_LABELS = {
  'diagnosis labels': 'diagnòstics',
  'email addresses': 'correus electrònics',
  'family information': 'informació familiar',
  'local identity map': 'mapa de correspondència',
  photos: 'fotografies',
  'raw free-text observations': 'observacions textuals',
  'student names': 'noms',
  surnames: 'cognoms',
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Some embedded browsers expose the Clipboard API but deny write access.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

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

function DownloadButton({ content }) {
  const [status, setStatus] = useState('')

  function handleDownload() {
    try {
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `avaluapro-briefing-ia-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setStatus('Descarregat')
      window.setTimeout(() => setStatus(''), 1800)
    } catch {
      setStatus('No s’ha pogut descarregar')
      window.setTimeout(() => setStatus(''), 2200)
    }
  }

  return (
    <span className="ai-copy-action">
      <button className="secondary-action" onClick={handleDownload} type="button">
        <Download size={17} />
        Descarregar paquet JSON
      </button>
      {status && <small>{status}</small>}
    </span>
  )
}

export function AiTeacherBriefingView() {
  const state = useAvaluaproStore()
  const briefing = useMemo(() => buildPrivacySafeTeacherBriefing(state), [state])
  const { activeClass, activeUt, localIdentityMap, promptPackage, promptText } = briefing
  const promptJson = JSON.stringify(promptPackage, null, 2)
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

      <section className="ai-briefing-metrics" aria-label="Resum del briefing IA">
        <BriefingMetric
          helper="Alumnes pseudonimitzats com Student A, Student B..."
          label="Alumnes"
          value={promptPackage.classContext.studentCount}
        />
        <BriefingMetric
          helper="Cap nom, correu ni identificador permanent."
          label="Identificadors"
          tone="positive"
          value="0"
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

      <section className="ai-briefing-ready" aria-labelledby="ai-workflow-title">
        <header>
          <ClipboardCheck size={24} />
          <div>
            <h3 id="ai-workflow-title">Com utilitzar el briefing</h3>
            <p>Segueix aquests quatre passos. AvaluaPro no envia cap dada automàticament.</p>
          </div>
        </header>
        <ol className="ai-briefing-steps">
          <li>
            <strong>1</strong>
            <div>
              <span>Copia les instruccions</span>
              <small>És el prompt que indica a la IA què ha d’analitzar i quins límits ha de respectar.</small>
              <CopyButton onCopy={() => copyTextToClipboard(promptText)}>Copiar prompt</CopyButton>
            </div>
          </li>
          <li>
            <strong>2</strong>
            <div>
              <span>Descarrega les dades pseudonimitzades</span>
              <small>El fitxer JSON conté els senyals educatius sense noms ni diagnòstics.</small>
              <DownloadButton content={promptJson} />
            </div>
          </li>
          <li>
            <strong>3</strong>
            <div>
              <span>Obre una IA autoritzada</span>
              <small>Enganxa el prompt i adjunta-hi el fitxer JSON. Revisa la resposta abans d’actuar.</small>
              <Upload aria-hidden="true" size={20} />
            </div>
          </li>
          <li>
            <strong>4</strong>
            <div>
              <span>Interpreta els àlies</span>
              <small>Consulta la correspondència inferior per saber a quin alumne es refereix la resposta.</small>
              <LockKeyhole aria-hidden="true" size={20} />
            </div>
          </li>
        </ol>
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
            <li key={field}>{EXCLUDED_FIELD_LABELS[field] || field}</li>
          ))}
        </ul>
      </section>

      <section className="ai-local-map" aria-labelledby="ai-local-map-title">
        <header>
          <ClipboardCheck size={20} />
          <div>
            <h3 id="ai-local-map-title">4. Correspondència per interpretar la resposta</h3>
            <p>Aquesta relació queda dins d’Avaluapro i no forma part del briefing copiat.</p>
          </div>
        </header>
        <div>
          {localIdentityMap.map((entry) => (
            <span key={entry.alias}>
              <strong>{entry.alias}</strong>
              {entry.name}
            </span>
          ))}
        </div>
      </section>

      <details className="ai-briefing-technical">
        <summary>
          <Braces size={18} />
          Veure contingut tècnic del briefing
        </summary>
        <div className="ai-briefing-workbench">
          <article className="ai-briefing-panel">
            <header>
              <div>
                <h3>Prompt complet</h3>
                <p>Conté només les instruccions que es copien al primer pas.</p>
              </div>
            </header>
            <textarea readOnly value={promptText} />
          </article>

          <article className="ai-briefing-panel">
            <header>
              <div>
                <h3>Paquet JSON pseudonimitzat</h3>
                <p>És el paquet pseudonimitzat que es descarrega per separat al segon pas.</p>
              </div>
            </header>
            <pre>{promptJson}</pre>
          </article>
        </div>
      </details>
    </section>
  )
}
