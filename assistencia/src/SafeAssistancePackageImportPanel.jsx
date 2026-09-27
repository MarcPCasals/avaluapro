import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, ShieldCheck } from 'lucide-react'
import {
  MAX_SAFE_ASSISTANCE_PACKAGE_BYTES,
  parseSafeAssistancePackageText,
} from '../../src/data/adapters/importSafeAssistancePackage.js'

export const SAFE_IMPORT_CONFIRMATION = 'CARREGAR PAQUET SEGUR'

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

export function SafeAssistancePackageImportPanel({ onLoadPackage }) {
  const inputRef = useRef(null)
  const [preparedImport, setPreparedImport] = useState(null)
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState('')
  const canLoad = Boolean(preparedImport && confirmation === SAFE_IMPORT_CONFIRMATION)

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const discardPrepared = (message = '') => {
    setPreparedImport(null)
    setConfirmation('')
    setStatus(message)
    clearInput()
  }

  const handleFile = async (file) => {
    discardPrepared()
    if (!file || file.size > MAX_SAFE_ASSISTANCE_PACKAGE_BYTES) {
      setStatus('Fitxer rebutjat. No s’ha carregat ni conservat cap paquet.')
      return
    }

    try {
      setPreparedImport(parseSafeAssistancePackageText(await file.text()))
    } catch {
      discardPrepared('Fitxer rebutjat. No s’ha carregat ni conservat cap paquet.')
    }
  }

  const handleLoad = () => {
    if (!canLoad) return
    try {
      onLoadPackage(preparedImport.package)
      discardPrepared('Paquet segur carregat només en memòria. Es perdrà en tancar la sessió.')
    } catch {
      discardPrepared('El paquet ha deixat de ser vàlid i s’ha descartat sense carregar-lo.')
    }
  }

  return (
    <section className="safe-assistance-import" data-safe-assistance-import>
      <div className="safe-assistance-import-heading">
        <FileUp aria-hidden="true" size={23} />
        <div>
          <h3>Carregar un paquet segur</h3>
          <p>
            Disponible només en aquest entorn aïllat. El fitxer es valida abans de mostrar-ne el resum i es torna a
            validar abans de substituir la demostració en memòria.
          </p>
        </div>
      </div>

      <div className="safe-assistance-import-guard">
        <AlertTriangle aria-hidden="true" size={19} />
        <p>
          No carreguis còpies de seguretat, exports ordinaris ni fitxers modificats manualment. Aquesta entrada només
          accepta el paquet segur creat per la pantalla específica d’AvaluaPro.
        </p>
      </div>

      {!preparedImport ? (
        <label className="safe-assistance-file-button">
          <ShieldCheck aria-hidden="true" size={18} />
          Seleccionar paquet segur
          <input
            accept="application/json,.json"
            onChange={(event) => handleFile(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
        </label>
      ) : (
        <div className="safe-assistance-import-review">
          <div className="safe-assistance-import-ok">
            <CheckCircle2 aria-hidden="true" size={19} />
            <div>
              <strong>Primera validació superada</strong>
              <span>Revisa només els recomptes. El nom del fitxer i el contingut individual no es mostren.</span>
            </div>
          </div>

          <div className="safe-assistance-import-summary" aria-label="Resum del paquet segur seleccionat">
            {Object.entries(SUMMARY_LABELS).map(([key, label]) => (
              <span key={key}>
                {label}
                <strong>{preparedImport.summary[key] || 0}</strong>
              </span>
            ))}
          </div>

          <label className="safe-assistance-import-confirmation">
            <span>
              Per carregar-lo només en memòria, escriu <strong>{SAFE_IMPORT_CONFIRMATION}</strong>
            </span>
            <input
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
              spellCheck="false"
              value={confirmation}
            />
          </label>

          <div className="safe-assistance-import-actions">
            <button className="secondary-action" onClick={() => discardPrepared('Paquet temporal descartat.')} type="button">
              Cancel·lar i descartar
            </button>
            <button className="primary-action" disabled={!canLoad} onClick={handleLoad} type="button">
              <FileUp aria-hidden="true" size={18} />
              Carregar només en memòria
            </button>
          </div>
        </div>
      )}

      {status && <strong className="safe-assistance-import-status" role="status">{status}</strong>}
    </section>
  )
}
