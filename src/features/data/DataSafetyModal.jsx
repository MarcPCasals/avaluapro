import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, Download, FileArchive, HardDrive, Info, Upload } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { COLLECTIONS } from '../../data/seedData'
import { buildBackupStatusMessage, summarizeBackup } from '../../lib/backupDiagnostics'
import { downloadJson, getTodaySlug } from '../../lib/downloads'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const CONTACT_EMAIL = 'mperezc@educand.ad'

function formatBytes(bytes = 0) {
  if (!bytes) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function estimateDataUrlBytes(value = '') {
  const base64 = String(value).split(',')[1] || ''
  return Math.round((base64.length * 3) / 4)
}

function buildCollectionSummary(state) {
  return COLLECTIONS.map((collection) => ({
    collection,
    count: state[collection]?.length || 0,
  }))
}

export function DataSafetyModal({ onClose }) {
  const fileInputRef = useRef(null)
  const state = useAvaluaproStore()
  const createBackup = useAvaluaproStore((store) => store.createBackup)
  const restoreBackup = useAvaluaproStore((store) => store.restoreBackup)
  const [storageEstimate, setStorageEstimate] = useState(null)
  const [restoreStatus, setRestoreStatus] = useState('')
  const [lastImportSummary, setLastImportSummary] = useState(null)

  const collectionSummary = useMemo(() => buildCollectionSummary(state), [state])
  const photoBytes = useMemo(
    () =>
      state.students.reduce((total, student) => total + estimateDataUrlBytes(student.photoUrl), 0) +
      state.seatingCharts.reduce((total, chart) => total + estimateDataUrlBytes(chart.imageData), 0),
    [state.seatingCharts, state.students],
  )
  const totalRows = collectionSummary.reduce((total, item) => total + item.count, 0)
  const backupBytes = new Blob([JSON.stringify(createBackup())]).size
  const currentSummary = summarizeBackup(createBackup())
  const usagePercent =
    storageEstimate?.quota && storageEstimate?.usage
      ? Math.min(100, Math.round((storageEstimate.usage / storageEstimate.quota) * 100))
      : null

  useEffect(() => {
    let cancelled = false

    async function loadStorageEstimate() {
      if (!navigator.storage?.estimate) return
      const estimate = await navigator.storage.estimate()
      if (!cancelled) setStorageEstimate(estimate)
    }

    loadStorageEstimate()

    return () => {
      cancelled = true
    }
  }, [])

  const handleDownloadBackup = () => {
    downloadJson(createBackup(), `avaluapro-backup-complet-${getTodaySlug()}.json`)
  }

  const handleRestoreFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const shouldRestore = window.confirm(
      'Aquesta acció substituirà totes les dades locals actuals per les del backup seleccionat. Abans de continuar, assegura’t que tens una còpia recent si vols conservar l’estat actual.',
    )
    if (!shouldRestore) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      await restoreBackup(backup, { filename: file.name })
      const summary = summarizeBackup(backup)
      setLastImportSummary({ filename: file.name, summary })
      setRestoreStatus(buildBackupStatusMessage(backup, file.name))
    } catch (error) {
      setRestoreStatus(error.message || 'No s’ha pogut restaurar aquest backup.')
      setLastImportSummary(null)
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title="Backups i seguretat de dades">
      <div className="data-safety-panel">
        <section className="data-safety-hero">
          <div>
            <span>
              <Database size={18} />
              Dades locals
            </span>
            <strong>Avaluapro desa les dades reals al dispositiu.</strong>
            <p>
              Classes, alumnes, fotos, llocs fixos, notes, tasques, comentaris, diagnòstics i rúbriques entren al backup complet.
              El núvol queda preparat com a següent fase, però ara la còpia important és aquest fitxer.
            </p>
          </div>
          <button className="primary-action" onClick={handleDownloadBackup} type="button">
            <Download size={18} />
            Descarregar backup complet
          </button>
        </section>

        <section className="data-safety-grid">
          <article className="data-card important">
            <FileArchive size={20} />
            <strong>{formatBytes(backupBytes)}</strong>
            <span>Mida aproximada del backup complet</span>
          </article>
          <article className="data-card">
            <HardDrive size={20} />
            <strong>{storageEstimate ? formatBytes(storageEstimate.usage) : 'Calculant...'}</strong>
            <span>Ús local estimat del navegador</span>
          </article>
          <article className="data-card">
            <Info size={20} />
            <strong>{formatBytes(photoBytes)}</strong>
            <span>Espai aproximat ocupat per fotos i llocs fixos</span>
          </article>
          <article className="data-card">
            <Database size={20} />
            <strong>{totalRows}</strong>
            <span>Registres repartits en col·leccions</span>
          </article>
        </section>

        {state.backupMeta && (
          <section className="backup-loaded-card">
            <CheckCircle2 size={20} />
            <div>
              <strong>Últim backup carregat</strong>
              <span>{state.backupMeta.filename || 'Backup importat'}</span>
              <small>
                {state.backupMeta.importedAt
                  ? new Date(state.backupMeta.importedAt).toLocaleString('ca-ES')
                  : 'Data no disponible'}
              </small>
            </div>
          </section>
        )}

        {usagePercent !== null && (
          <section className="storage-meter-card">
            <div>
              <strong>Espai del navegador</strong>
              <span>
                {formatBytes(storageEstimate.usage)} de {formatBytes(storageEstimate.quota)} utilitzats
              </span>
            </div>
            <div className="storage-meter">
              <span style={{ width: `${usagePercent}%` }} />
            </div>
          </section>
        )}

        <section className="data-safety-actions">
          <div>
            <h3>Restaurar una còpia</h3>
            <p>
              Fes-ho només quan vulguis substituir l’estat actual per un backup anterior. Abans de restaurar,
              és recomanable descarregar una còpia de l’estat actual.
            </p>
            {restoreStatus && <strong>{restoreStatus}</strong>}
          </div>
          <button className="secondary-action" onClick={() => fileInputRef.current?.click()} type="button">
            <Upload size={18} />
            Importar backup
          </button>
          <input
            ref={fileInputRef}
            accept="application/json,.json"
            className="sr-only"
            onChange={handleRestoreFile}
            type="file"
          />
        </section>

        {lastImportSummary && (
          <section className="backup-diagnosis-card">
            <div>
              <h3>Diagnosi del backup importat</h3>
              <p>{lastImportSummary.filename}</p>
            </div>
            <div className="backup-diagnosis-grid">
              {lastImportSummary.summary.rows.map((row) => (
                <span key={row.collection}>
                  {row.label}
                  <strong>{row.count}</strong>
                </span>
              ))}
            </div>
            {lastImportSummary.summary.warnings.length > 0 ? (
              <div className="backup-warning-list">
                {lastImportSummary.summary.warnings.map((warning) => (
                  <p key={warning}>
                    <AlertTriangle size={15} />
                    {warning}
                  </p>
                ))}
              </div>
            ) : (
              <p className="backup-ok">
                <CheckCircle2 size={15} />
                No s’han detectat avisos importants en l’estructura del backup.
              </p>
            )}
          </section>
        )}

        <section className="collection-summary">
          <h3>Què entra al backup?</h3>
          <div>
            {currentSummary.rows.map((item) => (
              <span key={item.collection}>
                {item.label}
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </section>

        <section className="storage-advice">
          <AlertTriangle size={20} />
          <div>
            <strong>Si algun dia se supera el límit de dades</strong>
            <p>
              Descarrega un backup complet, elimina o arxiva tasques antigues i revisa si hi ha moltes fotos o imatges de llocs fixos.
              Si el problema continua, escriu a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  )
}
