import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  CheckCircle2,
  Cloud,
  Download,
  FileSpreadsheet,
  HelpCircle,
  LogIn,
  LogOut,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAvaluaproStore } from '../store/useAvaluaproStore'
import { ClassSettingsModal } from '../features/classes/ClassSettingsModal'
import { NewClassModal } from '../features/classes/NewClassModal'
import { DataSafetyModal } from '../features/data/DataSafetyModal'
import { HelpCenterModal } from '../features/help/HelpCenterModal'
import { TeacherProfileModal } from '../features/profile/TeacherProfileModal'
import { buildBackupStatusMessage, summarizeBackup } from '../lib/backupDiagnostics'
import { downloadBlob, downloadJson, getTodaySlug } from '../lib/downloads'
import { calculateGrade } from '../lib/grades'

const colorClass = {
  blue: 'class-dot blue',
  green: 'class-dot green',
  yellow: 'class-dot yellow',
  red: 'class-dot red',
  purple: 'class-dot purple',
  orange: 'class-dot orange',
}

const classAccent = {
  blue: '#60a5fa',
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  purple: '#a78bfa',
  orange: '#fb923c',
}

const APP_ICON_URL = `${import.meta.env.BASE_URL}avaluapro-icon.png`

function getCriterionMark(marks, studentId, criterionId) {
  return marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function getBackupFilename(state) {
  const userLabel = state.cloud.user?.email?.split('@')[0] || 'local'
  return `avaluapro-${slugify(userLabel)}-${state.classes.length}classes-${state.students.length}alumnes-${getTodaySlug()}.json`
}

function formatSyncTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
}

function getSyncIndicator(cloud) {
  if (cloud.status === 'error') {
    return { className: 'error', icon: AlertCircle, label: 'Error', detail: 'Revisa l’avís' }
  }
  if (cloud.status === 'syncing') {
    return { className: 'syncing', icon: Loader2, label: 'Sincronitzant', detail: 'Pujant canvis' }
  }
  if (cloud.status === 'pending') {
    return {
      className: 'pending',
      icon: Cloud,
      label: 'Pendent',
      detail: `${cloud.pendingCollections?.length || 1} bloc pendent`,
    }
  }
  if (cloud.lastSyncedAt) {
    return { className: 'synced', icon: CheckCircle2, label: 'Sincronitzat', detail: formatSyncTime(cloud.lastSyncedAt) }
  }
  return { className: 'signed-in', icon: Cloud, label: 'Connectat', detail: 'Sense sync encara' }
}

function buildRestoreMessage({ currentSummary, incomingSummary, source }) {
  return [
    `Estàs a punt de substituir les dades actuals per ${source}.`,
    '',
    `Ara tens: ${currentSummary.counts.classes} classes, ${currentSummary.counts.students} alumnes, ${currentSummary.counts.marks} notes i ${currentSummary.counts.tasks} tasques.`,
    `Entraran: ${incomingSummary.counts.classes} classes, ${incomingSummary.counts.students} alumnes, ${incomingSummary.counts.marks} notes i ${incomingSummary.counts.tasks} tasques.`,
    '',
    'Recomanació: descarrega abans una còpia de seguretat de l’estat actual.',
    '',
    'Vols continuar?',
  ].join('\n')
}

export function TopBar() {
  const [showSettings, setShowSettings] = useState(false)
  const [showNewClass, setShowNewClass] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showDataSafety, setShowDataSafety] = useState(false)
  const [showDataMenu, setShowDataMenu] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [draggedClassId, setDraggedClassId] = useState('')
  const fileInputRef = useRef(null)
  const dataMenuRef = useRef(null)
  const classes = useAvaluaproStore((state) => state.classes)
  const orderedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [classes],
  )
  const state = useAvaluaproStore()
  const activeClassId = state.ui.activeClassId
  const activeUtId = state.ui.activeUtId
  const setActiveClass = useAvaluaproStore((state) => state.setActiveClass)
  const reorderClassToIndex = useAvaluaproStore((state) => state.reorderClassToIndex)
  const resetToSeed = useAvaluaproStore((state) => state.resetToSeed)
  const createBackup = useAvaluaproStore((state) => state.createBackup)
  const restoreBackup = useAvaluaproStore((state) => state.restoreBackup)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const signInWithGoogle = useAvaluaproStore((state) => state.signInWithGoogle)
  const signOutFromGoogle = useAvaluaproStore((state) => state.signOutFromGoogle)
  const pushAllToCloud = useAvaluaproStore((state) => state.pushAllToCloud)
  const pullFromCloud = useAvaluaproStore((state) => state.pullFromCloud)
  const createCloudBackup = useAvaluaproStore((state) => state.createCloudBackup)
  const syncIndicator = getSyncIndicator(cloud)
  const SyncIcon = syncIndicator.icon

  useEffect(() => {
    if (!showDataMenu) return undefined

    function handleOutsidePointerDown(event) {
      if (dataMenuRef.current?.contains(event.target)) return
      setShowDataMenu(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [showDataMenu])

  function handleDownloadBackup() {
    const backup = createBackup()
    downloadJson(backup, getBackupFilename(state))
  }

  function handleExportActiveUtExcel() {
    const activeClass = state.classes.find((classItem) => classItem.id === activeClassId)
    const activeUt = state.uts.find((ut) => ut.id === activeUtId)
    const students = state.students
      .filter((student) => student.classId === activeClassId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const competencies = state.competencies
      .filter((competency) => competency.utId === activeUtId)
      .sort((a, b) => a.order - b.order)
      .map((competency) => ({
        ...competency,
        criteria: state.criteria
          .filter((criterion) => criterion.competencyId === competency.id)
          .sort((a, b) => a.order - b.order),
      }))

    if (!activeClass || !activeUt || competencies.length === 0) {
      window.alert('Aquesta UT encara no té competències actives per exportar.')
      return
    }

    const headerCells = [
      '<th>Alumne</th>',
      '<th>Mig grup</th>',
      ...competencies.flatMap((competency) => [
        ...competency.criteria.map((criterion) => `<th>${escapeCell(competency.name)} · ${escapeCell(criterion.name)}</th>`),
        `<th>${escapeCell(competency.name)} · Nota competència</th>`,
      ]),
    ].join('')

    const bodyRows = students
      .map((student) => {
        const cells = [
          `<td>${escapeCell(student.name)}</td>`,
          `<td>${escapeCell(student.halfGroup || '')}</td>`,
          ...competencies.flatMap((competency) => {
            const criterionGrades = competency.criteria.map((criterion) =>
              getCriterionMark(state.marks, student.id, criterion.id),
            )
            return [
              ...criterionGrades.map((grade) => `<td>${escapeCell(grade || '-')}</td>`),
              `<td><strong>${escapeCell(calculateGrade(criterionGrades) || '-')}</strong></td>`,
            ]
          }),
        ].join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: center; }
            th { background: #f3f4f6; font-weight: 700; }
            td:first-child, th:first-child { text-align: left; min-width: 240px; }
          </style>
        </head>
        <body>
          <h2>${escapeCell(activeClass.name)} · ${escapeCell(activeUt.name)}</h2>
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    downloadBlob(blob, `avaluapro-${activeClass.name}-${activeUt.name}-${getTodaySlug()}.xls`)
  }

  async function handleBackupFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const shouldRestore = window.confirm(
        buildRestoreMessage({
          currentSummary: summarizeBackup(createBackup()),
          incomingSummary: summarizeBackup(backup),
          source: `la còpia "${file.name}"`,
        }),
      )
      if (!shouldRestore) return
      await restoreBackup(backup, { filename: file.name })
      window.alert(`Còpia restaurada correctament.\n\n${buildBackupStatusMessage(backup, file.name)}`)
    } catch (error) {
      window.alert(error.message || 'No s’ha pogut restaurar aquesta còpia.')
    }
  }

  async function handlePullFromCloud() {
    const shouldPull = window.confirm(
      [
        'Aquesta acció substituirà les dades locals actuals per les dades guardades a Firebase.',
        '',
        'Abans de continuar, és recomanable descarregar una còpia local de l’estat actual.',
        '',
        'Vols continuar?',
      ].join('\n'),
    )
    if (!shouldPull) return
    await pullFromCloud()
  }

  async function handleResetToSeed() {
    const answer = window.prompt(
      [
        'Això esborrarà les dades actuals del dispositiu i tornarà a carregar les dades demo inicials.',
        '',
        'Descarrega una còpia de seguretat abans si vols conservar el que tens ara.',
        '',
        'Per confirmar, escriu ESBORRA.',
      ].join('\n'),
    )
    if (answer !== 'ESBORRA') return
    await resetToSeed()
  }

  return (
    <header className="top-bar">
      <div className="brand-card">
        <img alt="" src={APP_ICON_URL} />
        <strong>
          Avalua<span>Pro</span>
        </strong>
      </div>
      <div className="brand-separator" />
      <p className="author">Creat per Marc Pérez Casals</p>
      <nav className="class-tabs" aria-label="Classes" data-tour="class-tabs">
        {orderedClasses.map((item, index) => (
          <button
            className={`class-tab ${item.id === activeClassId ? 'active' : ''} ${
              draggedClassId === item.id ? 'dragging' : ''
            }`}
            draggable
            key={item.id}
            onDragEnd={() => setDraggedClassId('')}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedClassId(item.id)}
            onDrop={async () => {
              if (!draggedClassId || draggedClassId === item.id) return
              await reorderClassToIndex(draggedClassId, index)
              setDraggedClassId('')
            }}
            onClick={() => setActiveClass(item.id)}
            style={{ '--class-accent': classAccent[item.color] || classAccent.blue }}
            type="button"
          >
            <span className={colorClass[item.color] || colorClass.blue} />
            {item.name}
          </button>
        ))}
        <button className="icon-button class-add" onClick={() => setShowNewClass(true)} title="Nova classe" type="button">
          <Plus size={22} />
        </button>
      </nav>
      <div className="top-actions">
        <button className="icon-button" onClick={() => setShowSettings(true)} title="Configuració del grup" type="button">
          <Settings size={22} />
        </button>
        <button className="icon-button" onClick={() => setShowHelp(true)} title="Ajuda i primera configuració" type="button">
          <HelpCircle size={22} />
        </button>
        <span className="top-divider" />
        {cloud.user && (
          <div className={`top-sync-status ${syncIndicator.className}`}>
            <strong className="sync-pill" title={cloud.error || syncIndicator.label}>
              <SyncIcon size={15} />
              <span>
                {syncIndicator.label}
                <small>{syncIndicator.detail}</small>
              </span>
            </strong>
          </div>
        )}
        <div className="top-menu-wrapper" data-tour="data-menu" ref={dataMenuRef}>
          <button
            className={`top-menu-trigger ${showDataMenu ? 'open' : ''}`}
            onClick={() => setShowDataMenu((value) => !value)}
            type="button"
          >
            <Cloud size={20} />
            <span>Dades i Compte</span>
            <ChevronDown size={17} />
          </button>
          {showDataMenu && (
            <div className="top-menu-panel">
              {cloud.user ? (
                <div className="top-menu-account">
                  <strong title={cloud.user.email}>{cloud.user.email}</strong>
                  <small>Compte connectat</small>
                </div>
              ) : (
                <button
                  onClick={() => {
                    signInWithGoogle()
                    setShowDataMenu(false)
                  }}
                  type="button"
                >
                  <LogIn size={18} />
                  Inicia sessió amb Google
                </button>
              )}
              <button
                onClick={() => {
                  setShowProfile(true)
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <BarChart3 size={18} />
                Perfil docent
              </button>
              <span className="top-menu-separator" />
              <button
                onClick={() => {
                  setShowDataSafety(true)
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <Cloud size={18} />
                Còpies i estat
              </button>
              <button
                onClick={() => {
                  handleDownloadBackup()
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <Download size={18} />
                Còpia manual al dispositiu
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click()
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <Upload size={18} />
                Importar còpia manual
              </button>
              <button
                onClick={() => {
                  handleExportActiveUtExcel()
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <FileSpreadsheet size={18} />
                Exportar notes UT
              </button>
              {cloud.user && (
                <>
                  <span className="top-menu-separator" />
                  <button
                    onClick={async () => {
                      try {
                        await createCloudBackup('manual')
                      } catch (error) {
                        window.alert(error.message || 'No s’ha pogut crear la còpia al núvol.')
                      }
                      setShowDataMenu(false)
                    }}
                    type="button"
                  >
                    <Cloud size={18} />
                    Crear còpia al núvol
                  </button>
                  <button
                    onClick={() => {
                      pushAllToCloud()
                      setShowDataMenu(false)
                    }}
                    type="button"
                  >
                    <Upload size={18} />
                    Sincronitzar ara
                  </button>
                  <button
                    onClick={() => {
                      handlePullFromCloud()
                      setShowDataMenu(false)
                    }}
                    type="button"
                  >
                    <Download size={18} />
                    Recuperar estat del núvol
                  </button>
                  <button
                    onClick={() => {
                      signOutFromGoogle()
                      setShowDataMenu(false)
                    }}
                    type="button"
                  >
                    <LogOut size={18} />
                    Tancar sessió
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          accept="application/json,.json"
          className="sr-only"
          onChange={handleBackupFile}
          type="file"
        />
        <span className="top-divider" />
        <button className="icon-button disabled" title="Desfer, propera iteració" type="button">
          <RotateCcw size={22} />
        </button>
        <button className="icon-button disabled" title="Refer, propera iteració" type="button">
          <RotateCw size={22} />
        </button>
        <span className="top-divider" />
        <button className="icon-button red-action" onClick={handleResetToSeed} title="Reiniciar dades demo" type="button">
          <Trash2 size={22} />
        </button>
      </div>
      {showSettings && (
        <ClassSettingsModal classId={activeClassId} onClose={() => setShowSettings(false)} />
      )}
      {showNewClass && <NewClassModal onClose={() => setShowNewClass(false)} />}
      {showDataSafety && <DataSafetyModal onClose={() => setShowDataSafety(false)} />}
      {showHelp && <HelpCenterModal onClose={() => setShowHelp(false)} />}
      {showProfile && <TeacherProfileModal onClose={() => setShowProfile(false)} />}
    </header>
  )
}
