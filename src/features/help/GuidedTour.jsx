import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, X } from 'lucide-react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const tourSteps = [
  {
    target: 'demo-banner',
    title: '1. Aquesta és una classe demo',
    text: 'Les dades són inventades i estan preparades perquè puguis veure notes, seguiment, comentaris i estadístiques sense configurar res.',
    mode: 'evaluation',
  },
  {
    target: 'class-tabs',
    title: '2. Canvia de classe',
    text: 'Les pestanyes de dalt serveixen per moure’t entre grups. En la demo, el grup principal és 2n Demo.',
    mode: 'evaluation',
  },
  {
    target: 'main-navigation',
    title: '3. Tria què vols fer',
    text: 'Avaluació és per posar notes; Seguiment és per tasques i comportament; Estadístiques et dona lectures i decisions docents.',
    mode: 'evaluation',
  },
  {
    target: 'time-tabs',
    title: '4. Semestres i UTs',
    text: 'Cada curs té UT1, UT2, UT3 i UT4. Pots treballar una UT concreta i veure només les seves competències i tasques.',
    mode: 'evaluation',
  },
  {
    target: 'evaluation-toolbar',
    title: '5. Eines de la taula',
    text: 'Aquí pots activar competències de la UT, filtrar migs grups, importar notes d’Excel, veure llocs fixos o gestionar alumnes.',
    mode: 'evaluation',
  },
  {
    target: 'evaluation-table',
    title: '6. Posa notes als criteris',
    text: 'Escrius A, B, C, D o NA als criteris. La nota de competència es calcula automàticament amb la combinació de criteris.',
    mode: 'evaluation',
  },
  {
    target: 'student-name-open',
    title: '7. Anotacions i diagnòstics',
    text: 'El nom de l’alumne obre la fitxa personal: foto, diagnòstics, informació personal, equips educatius i comentaris de tutoria.',
    action: 'Clica el nom del primer alumne per obrir la fitxa personal.',
    completeWhen: 'annotations-open',
    helperAction: 'open-first-annotations',
    helperLabel: 'Obrir fitxa demo',
    mode: 'evaluation',
  },
  {
    target: 'annotation-team',
    title: '8. Afegeix una entrada d’equip educatiu',
    text: 'Les entrades d’equip educatiu queden separades per data i marquen l’alumne en vermell perquè ho vegis durant la classe.',
    action: 'Escriu una entrada breu de prova i prem “+ Nova entrada”.',
    completeWhen: 'agenda-note-added',
    helperAction: 'add-demo-team-note',
    helperLabel: 'Afegir entrada demo',
    mode: 'evaluation',
  },
  {
    target: 'modal-close',
    title: '9. Torna a la taula',
    text: 'Després de revisar una fitxa, pots tancar-la i continuar treballant a la taula sense perdre el context.',
    action: 'Tanca la fitxa d’anotacions per continuar.',
    completeWhen: 'annotations-closed',
    mode: 'evaluation',
  },
  {
    target: 'tracking-toolbar',
    title: '10. Seguiment de tasques',
    text: 'Crea tasques, filtra per mig grup, mostra tasques passades i obre la intervenció setmanal quan necessitis decidir prioritats.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'tracking-table',
    title: '11. Marca hàbits de treball',
    text: 'Cada cel·la permet marcar feta, incompleta, no feta o exempt. També pots afegir notes i recordatoris.',
    action: 'Canvia l’estat d’una cel·la de tasca per veure com es desa el seguiment.',
    completeWhen: 'task-record-changed',
    helperAction: 'simulate-task-record',
    helperLabel: 'Simular canvi de tasca',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'tracking-student-actions',
    title: '12. Punts vermells, negres i diari',
    text: 'Els punts vermells venen de tasques no fetes. El triangle registra incidències i el llibre guarda observacions sense negatiu.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'tracking-student-actions',
    title: '13. Simula una nota a l’agenda',
    text: 'Aquesta simulació marca tres tasques no fetes al primer alumne visible i obre la mateixa nota a l’agenda que veuràs en ús real.',
    action: 'Prem “Simular 3r negatiu” i observa com apareix la nota a l’agenda amb les tasques pendents.',
    completeWhen: 'agenda-warning-open',
    helperAction: 'simulate-agenda-warning',
    helperLabel: 'Simular 3r negatiu',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'above',
  },
  {
    target: 'agenda-warning-modal',
    title: '14. Registra la nota a l’agenda',
    text: 'El programa recorda quines tasques han generat la nota. Pots copiar el text, donar una darrera oportunitat o registrar que ja has posat la nota.',
    action: 'Prem “Registrar nota a l’agenda” perquè quedi marcat a la fila de l’alumne.',
    completeWhen: 'agenda-note-added',
    mode: 'tracking',
    placement: 'left',
  },
  {
    target: 'stats-global',
    title: '15. Estadístiques globals',
    text: 'Aquí és on es creuen rendiment, constància i comportament per trobar alumnes en risc, reforç conceptual i hàbits fràgils.',
    dashboardScope: 'executive',
    mode: 'analytics',
    insight: 'dashboard',
  },
  {
    target: 'stats-scope-tabs',
    title: '16. Filtra les estadístiques per tema',
    text: 'Les pestanyes eviten que tot aparegui barrejat. Primer mires el resum i després entres a Avaluació, UT activa, Seguiment o Creuada.',
    action: 'Clica la pestanya “Avaluació” per veure només notes, evolució i criteris.',
    completeWhen: 'stats-evaluation-open',
    helperAction: 'set-dashboard-scope',
    helperLabel: 'Obrir Avaluació',
    helperScope: 'evaluation',
    dashboardScope: 'executive',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '17. Estadístiques d’avaluació',
    text: 'Aquí veus la comparativa de notes per UT, alumnes que pugen o baixen i la distribució per criteris sense barrejar-hi tasques.',
    action: 'Clica “UT activa” per passar al resum de la unitat que tens seleccionada.',
    completeWhen: 'stats-ut-open',
    helperAction: 'set-dashboard-scope',
    helperLabel: 'Obrir UT activa',
    helperScope: 'ut',
    dashboardScope: 'evaluation',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '18. Estadístiques de la UT activa',
    text: 'Aquest bloc serveix per decidir què reforçar en una unitat concreta: criteris prioritaris, alumnes a revisar i tasques associades.',
    action: 'Clica “Seguiment” per veure només constància, punts i notes a l’agenda.',
    completeWhen: 'stats-tracking-open',
    helperAction: 'set-dashboard-scope',
    helperLabel: 'Obrir Seguiment',
    helperScope: 'tracking',
    dashboardScope: 'ut',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '19. Estadístiques de seguiment',
    text: 'Aquí no hi ha notes: només hàbits, tasques incompletes, punts vermells, punts negres i possibles notes a l’agenda.',
    action: 'Clica “Creuada” per veure com es relacionen rendiment, constància i comportament.',
    completeWhen: 'stats-cross-open',
    helperAction: 'set-dashboard-scope',
    helperLabel: 'Obrir Creuada',
    helperScope: 'cross',
    dashboardScope: 'tracking',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-cross',
    title: '20. Anàlisi creuada',
    text: 'Aquesta vista és la més potent per detectar patrons: alumnes constants amb dificultat, alumnes bons però poc constants o risc combinat.',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
  },
  {
    target: 'data-menu',
    title: '21. Dades, còpies i Firebase',
    text: 'El menú Dades concentra còpies de seguretat, importació, exportació i sincronització. És el lloc clau abans de fer canvis importants.',
    action: 'Obre el menú “Dades i Compte” per veure on són les còpies i l’estat de sincronització.',
    completeWhen: 'data-menu-open',
    helperAction: 'open-data-menu',
    helperLabel: 'Obrir menú Dades',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'left',
  },
  {
    target: 'start-own-data',
    title: '22. Comença amb les teves dades',
    text: 'Abans de començar, xafardeja una mica la demo i mira sobretot les estadístiques: amb dades reals trigaran uns dies o setmanes a mostrar aquests fruits. Quan estiguis llest, clica el botó per començar amb les teves dades.',
    mode: 'analytics',
    insight: 'dashboard',
    final: true,
  },
]

const ownDataTourSteps = [
  {
    target: 'manage-students-button',
    title: '1. Afegeix la teva classe',
    text: 'El primer pas real és afegir alumnes. Enganxa una llista amb un alumne per línia en format “Cognom Cognom, Nom”.',
    action: 'Obre Gestió d’Alumnes per veure on s’afegeixen i s’organitzen els alumnes.',
    completeWhen: 'students-open',
    helperAction: 'open-students',
    helperLabel: 'Obrir Gestió d’Alumnes',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'student-manager-bulk',
    title: '2. Mitjos grups ràpids',
    text: 'Selecciona diversos alumnes i aplica Grup A, Grup B o qualsevol mig grup que hagis configurat. Això evita editar-los un per un.',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'modal-close',
    title: '3. Torna a la taula',
    text: 'Quan ja hagis revisat la gestió d’alumnes, tanca la finestra per continuar veient la resta de botons del programa.',
    action: 'Tanca Gestió d’Alumnes per continuar.',
    completeWhen: 'students-closed',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'ut-competency-toggle',
    title: '4. Competències de la UT',
    text: 'Aquí actives o desactives quines competències es treballen a cada UT. Si una competència està inactiva, no embruta les estadístiques.',
    mode: 'evaluation',
  },
  {
    target: 'half-group-filter',
    title: '5. Filtra per mig grup',
    text: 'Aquest filtre és útil quan només tens mig grup a l’aula. En avaluació i seguiment treballes amb els alumnes visibles.',
    mode: 'evaluation',
  },
  {
    target: 'import-excel-button',
    title: '6. Importa notes d’Excel',
    text: 'Pots copiar notes d’un full de càlcul i enganxar-les directament a la graella d’importació, seguint l’ordre dels criteris actius.',
    mode: 'evaluation',
  },
  {
    target: 'urgent-button',
    title: '7. Botó Urgent',
    text: 'Sempre el tens a mà. Reuneix alumnes amb risc important per notes, constància o combinació de dades.',
    mode: 'evaluation',
    placement: 'below',
  },
  {
    target: 'class-settings',
    title: '8. Configura la classe',
    text: 'Des d’aquí pots modificar classe, matèria, color, competències i eliminar la classe si cal.',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'seating-button',
    title: '9. Llocs fixos',
    text: 'Carrega imatges de la disposició d’aula del grup sencer o dels mitjos grups. És una consulta ràpida per al dia a dia.',
    mode: 'evaluation',
  },
  {
    target: 'undo-button',
    title: '10. Desfer i refer',
    text: 'Aquests botons quedaran reservats per recuperar canvis recents. Són una capa de seguretat quan es treballa ràpid a classe.',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'reset-button',
    title: '11. Reiniciar el curs',
    text: 'La brossa serveix per tornar a començar. És una acció delicada: abans de fer-la, convé tenir una còpia de seguretat.',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'sync-status',
    title: '12. Sync i estat de núvol',
    text: 'Quan iniciïs sessió, veuràs si les dades estan sincronitzades, pendents o amb error. Això no substitueix les còpies manuals.',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'data-menu',
    title: '13. Dades i compte',
    text: 'Aquest menú concentra còpies de seguretat, restauració, exportació, sessió de Google i estat de dades.',
    action: 'Obre el menú Dades i Compte.',
    completeWhen: 'data-menu-open',
    helperAction: 'open-data-menu',
    helperLabel: 'Obrir menú',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'tracking-toolbar',
    title: '14. Seguiment de tasques',
    text: 'A Seguiment treballes hàbits, tasques incompletes, no fetes, recordatoris i notes a l’agenda.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'new-task-button',
    title: '15. Crea una tasca',
    text: 'Nova Tasca afegeix una activitat a la UT activa. També pots copiar-la a altres classes si treballen el mateix.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'task-done-all',
    title: '16. Accions de tota la classe',
    text: 'El tic general marca com a feta la tasca per a tots els alumnes visibles. Si filtres un mig grup, només afecta aquell mig grup.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
  },
  {
    target: 'task-reminder-all',
    title: '17. Recordatoris de tasca',
    text: 'La campana del títol programa un recordatori per a tota la tasca; la campana de cada cel·la és individual. El dia i hora indicats apareixerà una targeta i podràs ajornar-la 55 minuts.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
  },
  {
    target: 'task-info-all',
    title: '18. Informació de la tasca',
    text: 'El botó d’informació guarda anotacions generals de la tasca. També pots afegir informació individual dins de cada cel·la.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
  },
  {
    target: 'tracking-student-actions',
    title: '19. Alumne, conducta i diari',
    text: 'A la fila de l’alumne veuràs punts vermells, negatius de comportament, entrades de diari i notes a l’agenda registrades.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'tracking-table',
    title: '20. Estats de cada tasca',
    text: 'Dins de cada cel·la pots marcar feta, incompleta, no feta o exempt. Aquestes dades alimenten les estadístiques de seguiment.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'evaluation-table',
    title: '21. Perfil i anotacions',
    text: 'Clicant el nom obres la fitxa personal amb diagnòstics i anotacions. Clicant la bombolla obres el resum de la UT i l’evolució de l’alumne.',
    mode: 'evaluation',
  },
  {
    target: 'main-navigation',
    title: '22. Ja pots començar',
    text: 'Ara tens el mapa bàsic: alumnes, notes, seguiment, estadístiques, còpies i sync. Pots tancar aquesta guia i començar a treballar amb les teves dades.',
    mode: 'evaluation',
    final: true,
  },
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getPosition(rect, placement = 'auto') {
  const cardWidth = Math.min(390, window.innerWidth - 32)
  const cardHeight = Math.min(330, window.innerHeight - 32)

  if (placement === 'right' || placement === 'left') {
    const rightSide = rect.right + 14
    const leftSide = rect.left - cardWidth - 14
    const preferLeft = placement === 'left'
    const left = preferLeft
      ? leftSide > 16
        ? leftSide
        : Math.min(window.innerWidth - cardWidth - 16, rightSide)
      : rightSide + cardWidth < window.innerWidth - 16
        ? rightSide
        : Math.max(16, leftSide)
    const top = clamp(rect.top + rect.height / 2 - cardHeight / 2, 16, window.innerHeight - cardHeight - 16)
    return { left, top, width: cardWidth }
  }

  const left = clamp(rect.left + rect.width / 2 - cardWidth / 2, 16, window.innerWidth - cardWidth - 16)
  const below = rect.bottom + 14
  const above = rect.top - cardHeight - 14
  const top =
    placement === 'below'
      ? clamp(below, 16, window.innerHeight - cardHeight - 16)
      : placement === 'above'
        ? clamp(above, 16, window.innerHeight - cardHeight - 16)
      : below + cardHeight < window.innerHeight
        ? below
        : Math.max(16, above)

  return { left, top, width: cardWidth }
}

function buildTaskSignature(taskRecords) {
  return taskRecords
    .map((record) => `${record.id}:${record.status || ''}:${record.note || ''}:${record.reminder?.date || ''}`)
    .sort()
    .join('|')
}

function getGuideSnapshot() {
  const state = useAvaluaproStore.getState()
  return {
    agendaNotesCount: state.agendaNotes.length,
    taskSignature: buildTaskSignature(state.taskRecords),
  }
}

function getCompletionState(step, baseline, current) {
  if (!step?.completeWhen) return true

  if (step.completeWhen === 'annotations-open') {
    return Boolean(document.querySelector('.annotations-panel'))
  }

  if (step.completeWhen === 'annotations-closed') {
    return !document.querySelector('.annotations-panel')
  }

  if (step.completeWhen === 'students-open') {
    return Boolean(document.querySelector('.student-manager'))
  }

  if (step.completeWhen === 'students-closed') {
    return !document.querySelector('.student-manager')
  }

  if (step.completeWhen === 'agenda-note-added') {
    return current.agendaNotesCount > (baseline?.agendaNotesCount ?? current.agendaNotesCount)
  }

  if (step.completeWhen === 'agenda-warning-open') {
    return Boolean(document.querySelector('.agenda-warning-modal'))
  }

  if (step.completeWhen === 'task-record-changed') {
    return current.taskSignature !== (baseline?.taskSignature ?? current.taskSignature)
  }

  if (step.completeWhen === 'data-menu-open') {
    return Boolean(document.querySelector('.top-menu-panel'))
  }

  if (step.completeWhen === 'stats-evaluation-open') {
    return document.querySelector('.dashboard-scope-tabs button.active')?.innerText.includes('Avaluació')
  }

  if (step.completeWhen === 'stats-ut-open') {
    return document.querySelector('.dashboard-scope-tabs button.active')?.innerText.includes('UT activa')
  }

  if (step.completeWhen === 'stats-tracking-open') {
    return document.querySelector('.dashboard-scope-tabs button.active')?.innerText.includes('Seguiment')
  }

  if (step.completeWhen === 'stats-cross-open') {
    return document.querySelector('.dashboard-scope-tabs button.active')?.innerText.includes('Creuada')
  }

  return true
}

export function GuidedTour() {
  const { guideMode, guideOpen } = useAvaluaproStore((state) => state.onboarding)
  const setGuideOpen = useAvaluaproStore((state) => state.setGuideOpen)
  const startOwnData = useAvaluaproStore((state) => state.startOwnData)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveInsight = useAvaluaproStore((state) => state.setActiveInsight)
  const agendaNotesCount = useAvaluaproStore((state) => state.agendaNotes.length)
  const taskSignature = useAvaluaproStore((state) => buildTaskSignature(state.taskRecords))
  const [tourState, setTourState] = useState(() => ({
    baseline: getGuideSnapshot(),
    stepIndex: 0,
  }))
  const [targetRect, setTargetRect] = useState(null)
  const [domPulse, setDomPulse] = useState(0)
  const { baseline, stepIndex } = tourState
  const activeSteps = guideMode === 'own' ? ownDataTourSteps : tourSteps
  const step = activeSteps[stepIndex]

  useEffect(() => {
    if (!guideOpen || !step) return
    if (step.mode) setActiveMode(step.mode)
    if (step.insight) setActiveInsight(step.insight)
    if (step.dashboardScope) {
      const applyDashboardScope = () => window.__avaluaproSetDashboardScope?.(step.dashboardScope)
      applyDashboardScope()
      window.requestAnimationFrame(applyDashboardScope)
      window.setTimeout(applyDashboardScope, 100)
    }

    if (step.ensureTrackingTasks) {
      const state = useAvaluaproStore.getState()
      const classTasks = state.tasks.filter((task) => task.classId === state.ui.activeClassId)
      const currentUtHasTasks = classTasks.some((task) => task.utId === state.ui.activeUtId)
      const targetTask = currentUtHasTasks ? null : classTasks[0]
      if (targetTask) {
        const targetUt = state.uts.find((ut) => ut.id === targetTask.utId)
        if (targetUt) state.setActiveSemester(targetUt.semesterId)
        state.setActiveUt(targetTask.utId)
      }
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('avaluapro-show-demo-tasks')), 80)
    }
  }, [guideOpen, setActiveInsight, setActiveMode, step])

  useEffect(() => {
    if (!guideOpen || !step?.completeWhen) return undefined
    const intervalId = window.setInterval(() => setDomPulse((value) => value + 1), 400)
    return () => window.clearInterval(intervalId)
  }, [guideOpen, step])

  useEffect(() => {
    if (!guideOpen || !step) return undefined

    let frameId = 0
    const measure = () => {
      const target = document.querySelector(`[data-tour="${step.target}"]`)
      if (!target) {
        setTargetRect(null)
        return
      }
      target.scrollIntoView({ block: 'center', inline: 'center' })
      const rect = target.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      })
    }

    frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(measure)
    })
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [guideOpen, step])

  const cardStyle = useMemo(() => {
    if (!targetRect) return { left: 20, top: 120, width: Math.min(390, window.innerWidth - 32) }
    return getPosition(targetRect, step.placement)
  }, [step, targetRect])

  if (!guideOpen || !step) return null

  const currentCompletionState = { agendaNotesCount, domPulse, taskSignature }
  const stepComplete = getCompletionState(step, baseline, currentCompletionState)

  const goToStep = (nextStepIndex) => {
    setTourState({
      baseline: getGuideSnapshot(),
      stepIndex: clamp(nextStepIndex, 0, activeSteps.length - 1),
    })
  }

  const closeTour = () => {
    setTourState({ baseline: getGuideSnapshot(), stepIndex: 0 })
    setGuideOpen(false)
  }

  const handleStartOwnData = async () => {
    const started = await startOwnData()
    if (started) closeTour()
  }

  const handleHelperAction = () => {
    if (step.helperAction === 'open-first-annotations') {
      window.dispatchEvent(new CustomEvent('avaluapro-open-first-annotations'))
      return
    }

    if (step.helperAction === 'add-demo-team-note') {
      window.dispatchEvent(new CustomEvent('avaluapro-add-demo-team-note'))
      return
    }

    if (step.helperAction === 'simulate-task-record') {
      window.dispatchEvent(new CustomEvent('avaluapro-demo-task-record'))
      return
    }

    if (step.helperAction === 'simulate-agenda-warning') {
      window.dispatchEvent(new CustomEvent('avaluapro-demo-agenda-warning'))
      return
    }

    if (step.helperAction === 'set-dashboard-scope' && step.helperScope) {
      window.__avaluaproSetDashboardScope?.(step.helperScope)
      return
    }

    if (step.helperAction === 'open-data-menu') {
      document.querySelector('[data-tour="data-menu"] button')?.click()
      return
    }

    if (step.helperAction === 'open-students') {
      document.querySelector('[data-tour="manage-students-button"]')?.click()
      document.querySelector('[data-tour="tracking-manage-students-button"]')?.click()
    }
  }

  return (
    <div className="guided-tour-layer" aria-live="polite">
      {targetRect && (
        <div
          className="guided-tour-highlight"
          style={{
            height: targetRect.height + 12,
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
          }}
        />
      )}
      <article className="guided-tour-card" style={cardStyle}>
        <header>
          <span>
            <PlayCircle size={17} />
            Guia interactiva
          </span>
          <button onClick={closeTour} title="Tancar guia" type="button">
            <X size={17} />
          </button>
        </header>
        <strong>{step.title}</strong>
        <p>{step.text}</p>
        {step.action && (
          <div className={`guided-tour-task ${stepComplete ? 'complete' : ''}`}>
            <CheckCircle2 size={16} />
            <span>{step.action}</span>
          </div>
        )}
        {step.helperAction && (
          <button className="primary-action compact guided-tour-helper" onClick={handleHelperAction} type="button">
            <PlayCircle size={15} />
            {step.helperLabel || 'Fer simulació'}
          </button>
        )}
        <div className="guided-tour-progress">
          <span style={{ width: `${((stepIndex + 1) / activeSteps.length) * 100}%` }} />
        </div>
        <footer>
          <button className="ghost-action compact guided-tour-skip" onClick={closeTour} type="button">
            Saltar guia
          </button>
          <button
            className="secondary-action compact"
            disabled={stepIndex === 0}
            onClick={() => goToStep(stepIndex - 1)}
            type="button"
          >
            <ArrowLeft size={15} />
            Anterior
          </button>
          <small>
            {stepIndex + 1}/{activeSteps.length}
          </small>
          {step.final ? (
            <button className="primary-action compact" onClick={guideMode === 'demo' ? handleStartOwnData : closeTour} type="button">
              <CheckCircle2 size={15} />
              {guideMode === 'demo' ? 'Començar' : 'Tancar guia'}
            </button>
          ) : (
            <button
              className="primary-action compact"
              disabled={!stepComplete}
              onClick={() => goToStep(stepIndex + 1)}
              type="button"
            >
              {step.action ? 'Acció feta' : 'Següent'}
              <ArrowRight size={15} />
            </button>
          )}
        </footer>
      </article>
    </div>
  )
}
