import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Clock3,
  Database,
  Download,
  FileArchive,
  HardDrive,
  Info,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { COLLECTIONS } from '../../data/seedData'
import { buildBackupStatusMessage, summarizeBackup } from '../../lib/backupDiagnostics'
import { downloadJson, getTodaySlug } from '../../lib/downloads'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const CONTACT_EMAIL = 'mperezc@educand.ad'
const ANTECEDENTS_EXPORT_APP_ID = 'avaluapro-student-antecedents'
const ANTECEDENTS_EXPORT_VERSION = 1

function formatBytes(bytes = 0) {
  if (!bytes) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function normalizeNameForMatch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function getBackupFilename(state) {
  const userLabel = state.cloud.user?.email?.split('@')[0] || 'local'
  return `avaluapro-copia-manual-${slugify(userLabel)}-${state.classes.length}classes-${state.students.length}alumnes-${getTodaySlug()}.json`
}

function formatDateTime(value) {
  if (!value) return 'Encara no sincronitzat'
  return new Date(value).toLocaleString('ca-ES')
}

function getCloudStatusText(cloud) {
  if (!cloud.user) return 'No has iniciat sessió amb Google.'
  if (cloud.status === 'pending') return 'Hi ha canvis locals pendents de pujar.'
  if (cloud.status === 'syncing') return 'Sincronitzant dades amb el núvol.'
  if (cloud.status === 'error') return cloud.error || 'Hi ha hagut un error de sincronització.'
  if (cloud.lastSyncedAt) return `Última sincronització: ${formatDateTime(cloud.lastSyncedAt)}.`
  return 'Sessió iniciada. Encara no hi ha cap sincronització registrada.'
}

function CloudStatusIcon({ status }) {
  if (status === 'synced') return <CheckCircle2 size={20} />
  if (status === 'pending') return <Clock3 size={20} />
  if (status === 'syncing') return <Loader2 size={20} className="spin-icon" />
  if (status === 'error') return <AlertTriangle size={20} />
  return <Cloud size={20} />
}

function buildRestoreMessage({ currentSummary, incomingSummary, filename }) {
  return [
    `Aquesta acció substituirà totes les dades locals actuals per la còpia "${filename}".`,
    '',
    `Ara tens: ${currentSummary.counts.classes} classes, ${currentSummary.counts.students} alumnes, ${currentSummary.counts.marks} notes i ${currentSummary.counts.tasks} tasques.`,
    `La còpia conté: ${incomingSummary.counts.classes || 0} classes, ${incomingSummary.counts.students || 0} alumnes, ${incomingSummary.counts.marks || 0} notes i ${incomingSummary.counts.tasks || 0} tasques.`,
    '',
    'Abans de continuar, assegura’t que tens una còpia recent si vols conservar l’estat actual.',
    '',
    'Vols continuar?',
  ].join('\n')
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

function buildAntecedentsFilename(classItem) {
  return `avaluapro-antecedents-${slugify(classItem?.name || 'classe')}-${getTodaySlug()}.json`
}

function buildAntecedentsExport({ classItem, students, antecedents }) {
  const antecedentsByStudentId = new Map(antecedents.map((antecedent) => [antecedent.studentId, antecedent]))
  const rows = students
    .map((student) => {
      const antecedent = antecedentsByStudentId.get(student.id)
      if (!antecedent) return null
      return {
        studentName: student.name,
        antecedent: {
          courseLabel: antecedent.courseLabel || '',
          lastLookGrade: antecedent.lastLookGrade || '',
          competencyGrades: antecedent.competencyGrades || {},
          profile: antecedent.profile || '',
          qualitativeNotes: antecedent.qualitativeNotes || '',
          diagnosisSnapshot: antecedent.diagnosisSnapshot || [],
        },
      }
    })
    .filter(Boolean)

  return {
    app: ANTECEDENTS_EXPORT_APP_ID,
    version: ANTECEDENTS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    className: classItem?.name || '',
    students: rows,
  }
}

function parseAntecedentsExport(payload) {
  if (payload?.app !== ANTECEDENTS_EXPORT_APP_ID || !Array.isArray(payload.students)) {
    throw new Error('Aquest fitxer no sembla un export d’antecedents acadèmics d’Avaluapro.')
  }

  return payload.students.map((row) => ({
    studentName: row.studentName || '',
    antecedent: row.antecedent || {},
  }))
}

export function DataSafetyModal({ initialSection = '', onClose }) {
  const fileInputRef = useRef(null)
  const antecedentFileInputRef = useRef(null)
  const antecedentSectionRef = useRef(null)
  const state = useAvaluaproStore()
  const createBackup = useAvaluaproStore((store) => store.createBackup)
  const restoreBackup = useAvaluaproStore((store) => store.restoreBackup)
  const bulkUpsertStudentAntecedents = useAvaluaproStore((store) => store.bulkUpsertStudentAntecedents)
  const createCloudBackup = useAvaluaproStore((store) => store.createCloudBackup)
  const loadCloudBackups = useAvaluaproStore((store) => store.loadCloudBackups)
  const pushAllToCloud = useAvaluaproStore((store) => store.pushAllToCloud)
  const pullFromCloud = useAvaluaproStore((store) => store.pullFromCloud)
  const restoreCloudBackup = useAvaluaproStore((store) => store.restoreCloudBackup)
  const resetToSeed = useAvaluaproStore((store) => store.resetToSeed)
  const deleteOldTrackingData = useAvaluaproStore((store) => store.deleteOldTrackingData)
  const [storageEstimate, setStorageEstimate] = useState(null)
  const [restoreStatus, setRestoreStatus] = useState('')
  const [lastImportSummary, setLastImportSummary] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [cleanupClassId, setCleanupClassId] = useState(() => state.ui.activeClassId || state.classes[0]?.id || '')
  const [cleanupBeforeDate, setCleanupBeforeDate] = useState('')
  const [cleanupStatus, setCleanupStatus] = useState('')
  const [antecedentClassId, setAntecedentClassId] = useState(
    () => state.ui.activeClassId || state.classes[0]?.id || '',
  )
  const [antecedentStatus, setAntecedentStatus] = useState('')

  const collectionSummary = useMemo(() => buildCollectionSummary(state), [state])
  const antecedentClass = state.classes.find((classItem) => classItem.id === antecedentClassId) || state.classes[0]
  const antecedentStudents = useMemo(
    () =>
      state.students
        .filter((student) => student.classId === antecedentClass?.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'ca')),
    [antecedentClass?.id, state.students],
  )
  const antecedentsForClass = useMemo(() => {
    const classStudentIds = new Set(antecedentStudents.map((student) => student.id))
    return state.studentAntecedents.filter((antecedent) => classStudentIds.has(antecedent.studentId))
  }, [antecedentStudents, state.studentAntecedents])
  const photoBytes = useMemo(
    () =>
      state.students.reduce((total, student) => total + estimateDataUrlBytes(student.photoUrl), 0) +
      state.seatingCharts.reduce((total, chart) => total + estimateDataUrlBytes(chart.imageData), 0),
    [state.seatingCharts, state.students],
  )
  const totalRows = collectionSummary.reduce((total, item) => total + item.count, 0)
  const backupBytes = new Blob([JSON.stringify(createBackup())]).size
  const currentSummary = summarizeBackup(createBackup())
  const cleanupClass = state.classes.find((classItem) => classItem.id === cleanupClassId) || state.classes[0]
  const cleanupTaskIds = useMemo(
    () =>
      new Set(
        state.tasks
          .filter((task) => task.classId === cleanupClass?.id && cleanupBeforeDate && task.date && task.date < cleanupBeforeDate)
          .map((task) => task.id),
      ),
    [cleanupBeforeDate, cleanupClass?.id, state.tasks],
  )
  const cleanupSummary = useMemo(
    () => ({
      tasks: cleanupTaskIds.size,
      taskRecords: state.taskRecords.filter((record) => cleanupTaskIds.has(record.taskId)).length,
    }),
    [cleanupTaskIds, state.taskRecords],
  )
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
    if (state.cloud.user) loadCloudBackups()

    return () => {
      cancelled = true
    }
  }, [loadCloudBackups, state.cloud.user])

  useEffect(() => {
    if (initialSection !== 'antecedents') return
    window.setTimeout(() => {
      antecedentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [initialSection])

  const handleDownloadBackup = () => {
    downloadJson(createBackup(), getBackupFilename(state))
  }

  const handleResetToSeed = async () => {
    await resetToSeed()
    setShowDeleteConfirm(false)
    setRestoreStatus('Dades eliminades i demo inicial carregada correctament.')
  }

  const handleDeleteOldTrackingData = async () => {
    if (!cleanupClass?.id || !cleanupBeforeDate) {
      setCleanupStatus('Selecciona una classe i una data límit.')
      return
    }
    if (cleanupSummary.tasks === 0) {
      setCleanupStatus('No hi ha tasques antigues per eliminar amb aquests criteris.')
      return
    }

    const shouldClean = window.confirm(
      [
        `S’eliminaran ${cleanupSummary.tasks} tasques antigues de ${cleanupClass.name} i ${cleanupSummary.taskRecords} registres associats.`,
        '',
        'No s’eliminaran notes, comentaris, diagnòstics, DOIPs, antecedents ni estadístiques de tutoria.',
        'Abans de continuar, és recomanable descarregar una còpia manual.',
        '',
        'Vols continuar?',
      ].join('\n'),
    )
    if (!shouldClean) return

    try {
      const result = await deleteOldTrackingData({ classId: cleanupClass.id, beforeDate: cleanupBeforeDate })
      setCleanupStatus(`Neteja completada: ${result.tasks} tasques i ${result.taskRecords} registres eliminats.`)
    } catch (error) {
      setCleanupStatus(error.message || 'No s’ha pogut completar la neteja de tasques antigues.')
    }
  }

  const handleCreateCloudBackup = async () => {
    try {
      await createCloudBackup('manual')
      setRestoreStatus('Còpia de seguretat creada al núvol correctament.')
    } catch (error) {
      setRestoreStatus(error.message || 'No s’ha pogut crear la còpia al núvol.')
    }
  }

  const handlePushToCloud = async () => {
    try {
      await pushAllToCloud()
      setRestoreStatus('Dades sincronitzades amb el núvol correctament.')
    } catch (error) {
      setRestoreStatus(error.message || 'No s’han pogut sincronitzar les dades amb el núvol.')
    }
  }

  const handlePullFromCloud = async () => {
    const shouldPull = window.confirm(
      [
        'Aquesta acció substituirà les dades locals actuals per les dades guardades a Firebase.',
        '',
        'Abans de continuar, és recomanable descarregar una còpia manual de l’estat actual.',
        '',
        'Vols continuar?',
      ].join('\n'),
    )
    if (!shouldPull) return

    try {
      await pullFromCloud()
      setRestoreStatus('Estat recuperat del núvol correctament.')
    } catch (error) {
      setRestoreStatus(error.message || 'No s’ha pogut recuperar l’estat del núvol.')
    }
  }

  const handleRestoreCloudBackup = async (backup) => {
    const shouldRestore = window.confirm(
      buildRestoreMessage({
        currentSummary,
        incomingSummary: { counts: backup.counts || {} },
        filename: backup.label || backup.id,
      }).replace('per la còpia', 'per la còpia de seguretat al núvol'),
    )
    if (!shouldRestore) return
    try {
      await restoreCloudBackup(backup.id)
      setRestoreStatus(`Còpia del núvol restaurada: ${backup.label || backup.id}.`)
    } catch (error) {
      setRestoreStatus(error.message || 'No s’ha pogut restaurar la còpia del núvol.')
    }
  }

  const handleRestoreFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const summary = summarizeBackup(backup)
      const shouldRestore = window.confirm(
        buildRestoreMessage({
          currentSummary,
          incomingSummary: summary,
          filename: file.name,
        }),
      )
      if (!shouldRestore) return
      await restoreBackup(backup, { filename: file.name })
      setLastImportSummary({ filename: file.name, summary })
      setRestoreStatus(buildBackupStatusMessage(backup, file.name))
    } catch (error) {
      setRestoreStatus(error.message || 'No s’ha pogut restaurar aquesta còpia.')
      setLastImportSummary(null)
    }
  }

  const handleDownloadAntecedents = () => {
    if (!antecedentClass) {
      setAntecedentStatus('No hi ha cap classe seleccionada.')
      return
    }
    if (antecedentsForClass.length === 0) {
      setAntecedentStatus('Aquesta classe encara no té antecedents acadèmics per exportar.')
      return
    }

    const payload = buildAntecedentsExport({
      classItem: antecedentClass,
      students: antecedentStudents,
      antecedents: antecedentsForClass,
    })
    downloadJson(payload, buildAntecedentsFilename(antecedentClass))
    setAntecedentStatus(`Exportats ${payload.students.length} antecedents de ${antecedentClass.name}.`)
  }

  const handleImportAntecedents = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      if (!antecedentClass) throw new Error('Selecciona una classe abans d’importar antecedents.')
      const payload = JSON.parse(await file.text())
      const rows = parseAntecedentsExport(payload)
      const studentsByName = new Map(
        antecedentStudents.map((student) => [normalizeNameForMatch(student.name), student]),
      )
      const matched = []
      const unmatched = []

      rows.forEach((row) => {
        const student = studentsByName.get(normalizeNameForMatch(row.studentName))
        if (!student) {
          unmatched.push(row.studentName || 'Sense nom')
          return
        }
        matched.push({
          studentId: student.id,
          courseLabel: row.antecedent.courseLabel || '',
          lastLookGrade: row.antecedent.lastLookGrade || '',
          competencyGrades:
            row.antecedent.competencyGrades && typeof row.antecedent.competencyGrades === 'object'
              ? row.antecedent.competencyGrades
              : {},
          profile: row.antecedent.profile || '',
          qualitativeNotes: row.antecedent.qualitativeNotes || '',
          diagnosisSnapshot: Array.isArray(row.antecedent.diagnosisSnapshot)
            ? row.antecedent.diagnosisSnapshot
            : [],
        })
      })

      if (matched.length === 0) {
        throw new Error(
          `No s’ha pogut associar cap alumne del fitxer amb la classe ${antecedentClass.name}. Revisa que els noms coincideixin.`,
        )
      }

      const shouldImport = window.confirm(
        [
          `S’importaran ${matched.length} antecedents a la classe ${antecedentClass.name}.`,
          unmatched.length > 0 ? `${unmatched.length} alumnes no coincideixen i s’ignoraran.` : '',
          '',
          'Vols continuar?',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      if (!shouldImport) return

      await bulkUpsertStudentAntecedents(matched)
      setAntecedentStatus(
        [
          `Antecedents importats: ${matched.length}.`,
          unmatched.length > 0 ? `No trobats: ${unmatched.slice(0, 6).join(', ')}${unmatched.length > 6 ? '...' : ''}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch (error) {
      setAntecedentStatus(error.message || 'No s’han pogut importar els antecedents acadèmics.')
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title="Estat de dades i seguretat">
      <div className="data-safety-panel">
        <section className="data-safety-hero">
          <div>
            <span>
              <Database size={18} />
              Estat de dades i seguretat
            </span>
            <strong>Consulta què es desa, on es desa i com protegir-ho.</strong>
            <p>
              Les dades reals viuen primer al dispositiu, en col·leccions separades d’IndexedDB. Si inicies sessió amb
              Google, Avaluapro també sincronitza aquestes dades amb Firebase dins del teu espai privat d’usuari.
            </p>
          </div>
          <button className="primary-action" onClick={handleDownloadBackup} type="button">
            <Download size={18} />
            Còpia manual al dispositiu
          </button>
        </section>

        <section className="data-safety-grid">
          <article className="data-card important account">
            <Cloud size={20} />
            <strong>{state.cloud.user?.email || 'Sense sessió'}</strong>
            <span>Usuari connectat amb Google</span>
          </article>
          <article className="data-card">
            <Clock3 size={20} />
            <strong>{state.cloud.lastSyncedAt ? formatDateTime(state.cloud.lastSyncedAt) : 'Encara cap'}</strong>
            <span>Última sincronització amb Firebase</span>
          </article>
          <article className="data-card">
            <FileArchive size={20} />
            <strong>{state.cloud.lastCloudBackupAt ? formatDateTime(state.cloud.lastCloudBackupAt) : 'Encara cap'}</strong>
            <span>Última còpia de seguretat al núvol</span>
          </article>
          <article className="data-card">
            <HardDrive size={20} />
            <strong>{storageEstimate ? formatBytes(storageEstimate.usage) : formatBytes(backupBytes)}</strong>
            <span>Mida aproximada de dades locals</span>
          </article>
        </section>

        <section className={`backup-loaded-card cloud-${state.cloud.status}`}>
          <CloudStatusIcon status={state.cloud.status} />
          <div>
            <strong>Estat de sincronització</strong>
            <span>{getCloudStatusText(state.cloud)}</span>
            {state.cloud.pendingCollections?.length > 0 && (
              <small>{state.cloud.pendingCollections.length} col·leccions pendents</small>
            )}
          </div>
        </section>

        <section className="data-security-checklist">
          <div className="data-security-heading">
            <ShieldCheck size={21} />
            <div>
              <h3>Revisió de seguretat</h3>
              <p>
                La clau web de Firebase no és una contrasenya: el navegador la necessita per connectar-se. La protecció
                real és que les regles de Firestore només deixin entrar cada usuari a les seves dades.
              </p>
            </div>
          </div>
          <div className="security-status-grid two">
            <article className="security-status-card ok">
              <CheckCircle2 size={18} />
              <div>
                <strong>Regles de Firestore</strong>
                <span>Les dades i còpies estan separades per usuari autenticat.</span>
                <code>users/&lt;uid&gt;/...</code>
              </div>
            </article>
            <article className="security-status-card ok">
              <CheckCircle2 size={18} />
              <div>
                <strong>Còpies al núvol</strong>
                <span>Les còpies històriques tenen una ruta pròpia i protegida.</span>
                <code>users/&lt;uid&gt;/cloudBackups</code>
              </div>
            </article>
            <article className="security-status-card ok">
              <CheckCircle2 size={18} />
              <div>
                <strong>Paquets entre docents</strong>
                <span>
                  Només l’emissor i el tutor destinatari poden veure el paquet. El destinatari només pot marcar-lo com a
                  importat.
                </span>
                <code>teacherGradePackages</code>
              </div>
            </article>
            <article className="security-status-card warning">
              <AlertTriangle size={18} />
              <div>
                <strong>Fotos i imatges</strong>
                <span>
                  Ara es desen comprimides dins les dades. Quan l’ús creixi, convé migrar-les a Firebase Storage amb
                  regles pròpies.
                </span>
                <code>Storage preparat</code>
              </div>
            </article>
          </div>
        </section>

        <section className="responsible-use-card">
          <ShieldCheck size={20} />
          <div>
            <strong>Ús responsable dels camps oberts</strong>
            <p>
              Escriu observacions pedagògiques, concretes i necessàries. Evita informació mèdica, familiar o personal que
              no sigui imprescindible per a la funció docent. Diagnòstics, DOIPs, tutoria, equip educatiu i incidències són
              dades especialment sensibles.
            </p>
          </div>
        </section>

        <section className="responsible-use-card">
          <Database size={20} />
          <div>
            <strong>Què es desa localment i què es desa al núvol?</strong>
            <p>
              Localment es desa l’estat de treball complet perquè l’app pugui funcionar ràpid i conservar dades encara que
              es recarregui la pàgina. Al núvol només s’hi envia quan hi ha sessió de Google: col·leccions separades,
              còpies de seguretat i paquets de notes compartits amb docents destinataris.
            </p>
          </div>
        </section>

        <section className="cloud-backup-panel">
          <div className="cloud-backup-heading">
            <Cloud size={20} />
            <div>
              <h3>Còpies de seguretat al núvol</h3>
              <p>
                Ruta protegida: <code>users/&lt;uid&gt;/cloudBackups</code>. Només l’usuari autenticat pot llegir o restaurar
                les seves còpies.
              </p>
            </div>
            <div className="cloud-backup-actions">
              <button
                className="primary-action compact"
                disabled={!state.cloud.user || state.cloud.backupStatus === 'saving'}
                onClick={handleCreateCloudBackup}
                type="button"
              >
                {state.cloud.backupStatus === 'saving' ? <Loader2 size={17} className="spin-icon" /> : <Cloud size={17} />}
                Crear còpia al núvol
              </button>
              <button
                className="secondary-action compact"
                disabled={!state.cloud.user || state.cloud.status === 'syncing'}
                onClick={handlePushToCloud}
                type="button"
              >
                <Upload size={16} />
                Sincronitzar ara
              </button>
              <button
                className="secondary-action compact"
                disabled={!state.cloud.user || state.cloud.status === 'syncing'}
                onClick={handlePullFromCloud}
                type="button"
              >
                <Download size={16} />
                Recuperar estat
              </button>
            </div>
          </div>
          <div className="cloud-backup-meta">
            <span>
              Última còpia al núvol
              <strong>{state.cloud.lastCloudBackupAt ? formatDateTime(state.cloud.lastCloudBackupAt) : 'Encara cap'}</strong>
            </span>
            <span>
              Estat
              <strong>{state.cloud.backupError || (state.cloud.user ? 'Preparat' : 'Cal iniciar sessió')}</strong>
            </span>
          </div>
          {state.cloud.recentBackups?.length > 0 ? (
            <div className="cloud-backup-list">
              {state.cloud.recentBackups.slice(0, 5).map((backup) => (
                <article key={backup.id}>
                  <div>
                    <strong>{backup.label || 'Còpia de seguretat'}</strong>
                    <span>
                      {formatDateTime(backup.createdAt)}
                      <em>{backup.reason === 'auto-daily' ? 'Automàtica diària' : 'Manual'}</em>
                    </span>
                    <small>
                      {backup.counts?.classes || 0} classes · {backup.counts?.students || 0} alumnes ·{' '}
                      {backup.counts?.marks || 0} notes · {backup.counts?.tasks || 0} tasques
                    </small>
                  </div>
                  <button
                    className="secondary-action compact"
                    disabled={state.cloud.backupStatus === 'restoring'}
                    onClick={() => handleRestoreCloudBackup(backup)}
                    type="button"
                  >
                    Restaurar
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-cloud-backups">
              Encara no hi ha còpies al núvol. Avaluapro en farà una automàtica el primer cop que obris el programa cada dia
              amb Google iniciat.
            </p>
          )}
        </section>

        <section className="data-safety-grid">
          <article className="data-card important">
            <FileArchive size={20} />
            <strong>{formatBytes(backupBytes)}</strong>
            <span>Mida aproximada de la còpia completa</span>
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

        <section className="data-safety-delete-zone">
          <div>
            <Trash2 size={21} />
            <div>
              <h3>Eliminar dades i reiniciar el curs</h3>
              <p>
                Aquesta acció està pensada per tancar un curs o començar de zero. Abans d’esborrar, descarrega una còpia
                manual si vols conservar les dades actuals. Després es carregarà la demo inicial.
              </p>
            </div>
          </div>
          <div className="data-safety-delete-actions">
            <button className="secondary-action compact" onClick={handleDownloadBackup} type="button">
              <Download size={16} />
              Descarregar còpia abans
            </button>
            <button className="danger-action compact" onClick={() => setShowDeleteConfirm(true)} type="button">
              <Trash2 size={16} />
              Eliminar dades
            </button>
          </div>
          {showDeleteConfirm && (
            <div className="data-safety-delete-confirm">
              <AlertTriangle size={19} />
              <div>
                <strong>Confirmació abans d’esborrar</strong>
                <p>
                  S’eliminaran les dades locals actuals i es tornarà a carregar la demo. Si tens sessió iniciada, revisa
                  després si vols sincronitzar el nou estat amb el núvol.
                </p>
              </div>
              <button className="secondary-action compact" onClick={() => setShowDeleteConfirm(false)} type="button">
                Cancel·lar
              </button>
              <button className="danger-action compact" onClick={handleResetToSeed} type="button">
                Sí, eliminar dades
              </button>
            </div>
          )}
        </section>

        <section className="data-safety-cleanup-zone">
          <div>
            <Clock3 size={21} />
            <div>
              <h3>Eliminar tasques antigues</h3>
              <p>
                Neteja només tasques i registres de tasques anteriors a una data. És útil quan una classe acumula moltes
                tasques i vols conservar notes, comentaris, diagnòstics, tutoria i antecedents intactes.
              </p>
            </div>
          </div>
          <div className="data-safety-cleanup-controls">
            <label>
              Classe
              <select onChange={(event) => setCleanupClassId(event.target.value)} value={cleanupClass?.id || ''}>
                {state.classes
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Eliminar tasques abans de
              <input
                onChange={(event) => setCleanupBeforeDate(event.target.value)}
                type="date"
                value={cleanupBeforeDate}
              />
            </label>
            <span>
              {cleanupSummary.tasks} tasques · {cleanupSummary.taskRecords} registres
            </span>
            <button className="secondary-action compact" onClick={handleDownloadBackup} type="button">
              <Download size={16} />
              Còpia abans
            </button>
            <button
              className="danger-action compact"
              disabled={cleanupSummary.tasks === 0}
              onClick={handleDeleteOldTrackingData}
              type="button"
            >
              Eliminar antigues
            </button>
          </div>
          {cleanupStatus && <strong>{cleanupStatus}</strong>}
        </section>

        {state.backupMeta && (
          <section className="backup-loaded-card">
            <CheckCircle2 size={20} />
            <div>
              <strong>Última còpia importada</strong>
              <span>{state.backupMeta.filename || 'Còpia importada'}</span>
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

        <section className="antecedent-transfer-card" ref={antecedentSectionRef}>
          <div>
            <FileArchive size={20} />
            <div>
              <h3>Antecedents per al curs vinent</h3>
              <p>
                Exporta només el perfil inicial dels alumnes: última mirada, perfil de constància, valoració qualitativa i
                diagnòstics capturats. Quan el curs vinent tinguis una nova classe, carrega aquest JSON i Avaluapro
                l’associarà als alumnes pel nom.
              </p>
            </div>
          </div>
          <div className="antecedent-transfer-controls">
            <label>
              Classe
              <select onChange={(event) => setAntecedentClassId(event.target.value)} value={antecedentClass?.id || ''}>
                {state.classes
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
              </select>
            </label>
            <span>
              {antecedentsForClass.length} antecedents guardats · {antecedentStudents.length} alumnes a la classe
            </span>
            <button className="secondary-action compact" onClick={handleDownloadAntecedents} type="button">
              <Download size={16} />
              Exportar antecedents
            </button>
            <button className="secondary-action compact" onClick={() => antecedentFileInputRef.current?.click()} type="button">
              <Upload size={16} />
              Importar antecedents
            </button>
            <input
              ref={antecedentFileInputRef}
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportAntecedents}
              type="file"
            />
          </div>
          {antecedentStatus && <strong>{antecedentStatus}</strong>}
        </section>

        <section className="data-safety-actions">
          <div>
            <h3>Restaurar una còpia</h3>
            <p>
              Fes-ho només quan vulguis substituir l’estat actual per una còpia anterior. Abans de restaurar,
              és recomanable descarregar una còpia de l’estat actual.
            </p>
            {restoreStatus && <strong>{restoreStatus}</strong>}
          </div>
          <button className="secondary-action" onClick={() => fileInputRef.current?.click()} type="button">
            <Upload size={18} />
            Importar còpia manual
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
              <h3>Diagnosi de la còpia importada</h3>
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
                No s’han detectat avisos importants en l’estructura de la còpia.
              </p>
            )}
          </section>
        )}

        <section className="collection-summary">
          <h3>Què entra a la còpia de seguretat?</h3>
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
              Descarrega una còpia completa, elimina o arxiva tasques antigues i revisa si hi ha moltes fotos o imatges de llocs fixos.
              Si el problema continua, escriu a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  )
}
