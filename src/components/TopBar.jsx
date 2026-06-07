import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  CheckCircle2,
  Cloud,
  Download,
  FileArchive,
  HelpCircle,
  LogIn,
  LogOut,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Settings,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal'
import { useAvaluaproStore } from '../store/useAvaluaproStore'
import { ClassSettingsModal } from '../features/classes/ClassSettingsModal'
import { NewClassModal } from '../features/classes/NewClassModal'
import { DataSafetyModal } from '../features/data/DataSafetyModal'
import { TeacherGradePackageModal } from '../features/data/TeacherGradePackageModal'
import { HelpCenterModal } from '../features/help/HelpCenterModal'
import { TeacherProfileModal } from '../features/profile/TeacherProfileModal'
import { buildBackupStatusMessage, summarizeBackup } from '../lib/backupDiagnostics'
import { downloadJson, getTodaySlug } from '../lib/downloads'

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
  return `avaluapro-copia-manual-${slugify(userLabel)}-${state.classes.length}classes-${state.students.length}alumnes-${getTodaySlug()}.json`
}

function formatSyncTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
}

function getSyncIndicator(cloud) {
  if (cloud.status === 'error') {
    return { className: 'error', icon: AlertCircle, label: 'Error', detail: 'Revisa l’error' }
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
  const [dataSafetyInitialSection, setDataSafetyInitialSection] = useState('')
  const [showTeacherPackages, setShowTeacherPackages] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
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
  const setActiveClass = useAvaluaproStore((state) => state.setActiveClass)
  const openGuide = useAvaluaproStore((state) => state.openGuide)
  const reorderClassToIndex = useAvaluaproStore((state) => state.reorderClassToIndex)
  const resetToSeed = useAvaluaproStore((state) => state.resetToSeed)
  const createBackup = useAvaluaproStore((state) => state.createBackup)
  const restoreBackup = useAvaluaproStore((state) => state.restoreBackup)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const signInWithGoogle = useAvaluaproStore((state) => state.signInWithGoogle)
  const signOutFromGoogle = useAvaluaproStore((state) => state.signOutFromGoogle)
  const loadReceivedTeacherGradePackages = useAvaluaproStore((state) => state.loadReceivedTeacherGradePackages)
  const loadSentTeacherGradePackages = useAvaluaproStore((state) => state.loadSentTeacherGradePackages)
  const syncIndicator = getSyncIndicator(cloud)
  const SyncIcon = syncIndicator.icon
  const pendingTeacherPackages = useMemo(
    () => (cloud.teacherPackages || []).filter((packageItem) => packageItem.status !== 'imported').length,
    [cloud.teacherPackages],
  )

  useEffect(() => {
    if (!showDataMenu) return undefined

    function handleOutsidePointerDown(event) {
      if (dataMenuRef.current?.contains(event.target)) return
      setShowDataMenu(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [showDataMenu])

  useEffect(() => {
    if ((showDataMenu || showTeacherPackages) && cloud.user?.email) {
      loadReceivedTeacherGradePackages()
    }
    if ((showDataMenu || showTeacherPackages) && cloud.user?.uid) {
      loadSentTeacherGradePackages()
    }
  }, [
    cloud.user?.email,
    cloud.user?.uid,
    loadReceivedTeacherGradePackages,
    loadSentTeacherGradePackages,
    showDataMenu,
    showTeacherPackages,
  ])

  function handleDownloadBackup() {
    const backup = createBackup()
    downloadJson(backup, getBackupFilename(state))
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

  async function handleResetToSeed() {
    setShowResetConfirm(true)
  }

  async function confirmResetToSeed() {
    await resetToSeed()
    setShowResetConfirm(false)
  }

  return (
    <header className="top-bar">
      <div className="brand-card">
        <img alt="" src={APP_ICON_URL} />
        <div>
          <strong>
            Avalua<span>Pro</span>
          </strong>
          <small>de Marc Pérez Casals</small>
        </div>
      </div>
      <nav
        className={`class-tabs ${orderedClasses.length > 6 ? 'many' : ''}`}
        aria-label="Classes"
        data-tour="class-tabs"
      >
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
        <button
          className="icon-button"
          data-tour="class-settings"
          onClick={() => setShowSettings(true)}
          title="Configuració del grup"
          type="button"
        >
          <Settings size={22} />
        </button>
        <button
          className="icon-button"
          data-tour="guide-button"
          onClick={() => setShowHelp(true)}
          title="Ajuda i primera configuració"
          type="button"
        >
          <HelpCircle size={22} />
        </button>
        <span className="top-divider" />
        {cloud.user && (
          <div className={`top-sync-status ${syncIndicator.className}`} data-tour="sync-status">
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
                  <div>
                    <strong title={cloud.user.email}>{cloud.user.email}</strong>
                    <small>Compte connectat</small>
                  </div>
                  <button
                    className="top-account-signout"
                    onClick={() => {
                      signOutFromGoogle()
                      setShowDataMenu(false)
                    }}
                    title="Tancar sessió"
                    type="button"
                  >
                    <LogOut size={16} />
                  </button>
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
                data-tour="teacher-profile-button"
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
                data-tour="data-safety-button"
                onClick={() => {
                  setDataSafetyInitialSection('')
                  setShowDataSafety(true)
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <Cloud size={18} />
                Còpies i estat
              </button>
              <button
                data-tour="antecedents-button"
                onClick={() => {
                  setDataSafetyInitialSection('antecedents')
                  setShowDataSafety(true)
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <FileArchive size={18} />
                Antecedents acadèmics
              </button>
              <span className="top-menu-separator" />
              <button
                data-tour="teacher-package-button"
                onClick={() => {
                  setShowTeacherPackages(true)
                  setShowDataMenu(false)
                }}
                type="button"
              >
                <Send size={18} />
                <span className="top-menu-button-label">Compartir notes</span>
                <em className={pendingTeacherPackages > 0 ? 'top-menu-badge active' : 'top-menu-badge'}>
                  {pendingTeacherPackages}
                </em>
              </button>
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
        <button className="icon-button disabled" data-tour="undo-button" title="Desfer, propera iteració" type="button">
          <RotateCcw size={22} />
        </button>
        <button className="icon-button disabled" data-tour="redo-button" title="Refer, propera iteració" type="button">
          <RotateCw size={22} />
        </button>
        <span className="top-divider" />
        <button className="icon-button red-action" data-tour="reset-button" onClick={handleResetToSeed} title="Reiniciar dades demo" type="button">
          <Trash2 size={22} />
        </button>
      </div>
      {showSettings && (
        <ClassSettingsModal classId={activeClassId} onClose={() => setShowSettings(false)} />
      )}
      {showNewClass && <NewClassModal onClose={() => setShowNewClass(false)} />}
      {showDataSafety && (
        <DataSafetyModal
          initialSection={dataSafetyInitialSection}
          onClose={() => setShowDataSafety(false)}
        />
      )}
      {showHelp && (
        <HelpCenterModal
          onClose={() => setShowHelp(false)}
          onOpenGuide={(guideMode) => {
            setShowHelp(false)
            window.setTimeout(() => openGuide(guideMode), 120)
          }}
        />
      )}
      {showProfile && <TeacherProfileModal onClose={() => setShowProfile(false)} />}
      {showTeacherPackages && <TeacherGradePackageModal onClose={() => setShowTeacherPackages(false)} />}
      {showResetConfirm && (
        <Modal onClose={() => setShowResetConfirm(false)} size="lg" title="Reiniciar el curs">
          <div className="reset-course-modal">
            <div className="reset-course-warning">
              <Trash2 size={24} />
              <div>
                <strong>Aquesta acció està pensada per reiniciar el curs.</strong>
                <p>
                  Esborrarà les dades actuals del dispositiu i tornarà a carregar la demo inicial. Si vols conservar
                  les dades del curs que estàs tancant, descarrega abans una còpia de seguretat.
                </p>
              </div>
            </div>
            <div className="modal-actions split">
              <button className="secondary-action" onClick={handleDownloadBackup} type="button">
                <Download size={17} />
                Descarregar còpia abans
              </button>
              <span />
              <button className="secondary-action" onClick={() => setShowResetConfirm(false)} type="button">
                Cancel·lar
              </button>
              <button className="danger-action" onClick={confirmResetToSeed} type="button">
                Esborrar i començar de nou
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  )
}
