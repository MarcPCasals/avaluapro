import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, ShieldCheck } from 'lucide-react'
import { validateSafeAssistancePackage } from '../../data/adapters/safeAssistancePackage.js'
import { downloadJson } from '../../lib/downloads.js'
import { prepareSafeAssistanceExport } from './safeAssistanceExport.js'

export const SAFE_EXPORT_CONFIRMATION = 'EXPORTAR PAQUET SEGUR'

const SUMMARY_LABELS = Object.freeze({
  absenceRecords: 'Absències regenerades',
  classes: 'Grups ficticis',
  competencies: 'Competències numerades',
  evaluationMarks: 'Qualificacions regenerades',
  sociometricRelations: 'Relacions regenerades',
  students: 'Alumnes ficticis',
  trackingRecords: 'Registres regenerats',
  trackingTasks: 'Tasques numerades',
})

export function SafeAssistanceExportPanel({ state }) {
  const [preparedExport, setPreparedExport] = useState(null)
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState('')

  const canPrepare = Array.isArray(state?.classes) && state.classes.length > 0
  const canDownload = Boolean(preparedExport && confirmation === SAFE_EXPORT_CONFIRMATION)

  const handlePrepare = () => {
    setStatus('')
    setConfirmation('')
    try {
      setPreparedExport(prepareSafeAssistanceExport(state))
    } catch {
      setPreparedExport(null)
      setStatus('No s’ha pogut preparar un paquet segur. No s’ha creat cap fitxer.')
    }
  }

  const handleCancel = () => {
    setPreparedExport(null)
    setConfirmation('')
    setStatus('Paquet temporal descartat. No s’ha creat cap fitxer.')
  }

  const handleDownload = () => {
    if (!canDownload) return
    const validation = validateSafeAssistancePackage(preparedExport.package)
    if (!validation.ok) {
      setPreparedExport(null)
      setConfirmation('')
      setStatus('El paquet ha deixat de ser vàlid i s’ha descartat. No s’ha creat cap fitxer.')
      return
    }

    downloadJson(preparedExport.package, 'avaluapro-paquet-segur-v1.json')
    setPreparedExport(null)
    setConfirmation('')
    setStatus('Paquet segur descarregat. La còpia temporal en memòria s’ha eliminat.')
  }

  return (
    <section className="safe-assistance-export" data-safe-assistance-export>
      <div className="safe-assistance-export-heading">
        <ShieldCheck size={23} />
        <div>
          <h3>Paquet segur per a assistència tècnica</h3>
          <p>
            No és una còpia de seguretat i no es pot restaurar. Crea dades noves per reproduir una incidència sense
            incloure noms, diagnòstics, observacions, dates, identificadors ni relacions originals.
          </p>
        </div>
      </div>

      <div className="safe-assistance-export-guard">
        <AlertTriangle size={19} />
        <p>
          Utilitza’l només quan un problema no es pugui reproduir amb la demostració fictícia. El fitxer no es crea
          fins que revisis el resum i escriguis la frase de confirmació exacta.
        </p>
      </div>

      {!preparedExport ? (
        <button className="secondary-action" disabled={!canPrepare} onClick={handlePrepare} type="button">
          <ShieldCheck size={18} />
          Preparar resum segur
        </button>
      ) : (
        <div className="safe-assistance-export-review">
          <div className="safe-assistance-export-ok">
            <CheckCircle2 size={19} />
            <div>
              <strong>Validació superada</strong>
              <span>Només es mostra el recompte del paquet nou. No hi ha cap llista de noms ni correspondències.</span>
            </div>
          </div>

          <div className="safe-assistance-export-summary" aria-label="Resum del paquet segur">
            {Object.entries(SUMMARY_LABELS).map(([key, label]) => (
              <span key={key}>
                {label}
                <strong>{preparedExport.summary[key] || 0}</strong>
              </span>
            ))}
          </div>

          <label className="safe-assistance-export-confirmation">
            <span>
              Per confirmar, escriu <strong>{SAFE_EXPORT_CONFIRMATION}</strong>
            </span>
            <input
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
              spellCheck="false"
              value={confirmation}
            />
          </label>

          <div className="safe-assistance-export-actions">
            <button className="secondary-action" onClick={handleCancel} type="button">
              Cancel·lar i descartar
            </button>
            <button className="primary-action" disabled={!canDownload} onClick={handleDownload} type="button">
              <Download size={18} />
              Descarregar paquet segur
            </button>
          </div>
        </div>
      )}

      {status && <strong className="safe-assistance-export-status" role="status">{status}</strong>}
    </section>
  )
}
