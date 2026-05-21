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
    text: 'Avaluació és per posar notes; Seguiment és per tasques i comportament; Stats et dona lectures i decisions docents.',
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
    text: 'Aquí pots editar quines competències treballes, filtrar migs grups, importar notes d’Excel, veure llocs fixos o gestionar alumnes.',
    mode: 'evaluation',
  },
  {
    target: 'evaluation-table',
    title: '6. Posa notes als criteris',
    text: 'Escrius A, B, C, D o NA als criteris. La nota de competència es calcula automàticament amb la combinació de criteris.',
    mode: 'evaluation',
  },
  {
    target: 'student-comments',
    title: '7. Anotacions i diagnòstics',
    text: 'La bombolla obre la fitxa d’anotacions: diagnòstics, informació personal, equips educatius i comentaris de tutoria.',
    action: 'Clica la bombolla del primer alumne per obrir la fitxa d’anotacions.',
    completeWhen: 'annotations-open',
    mode: 'evaluation',
  },
  {
    target: 'annotation-team',
    title: '8. Afegeix una entrada d’equip educatiu',
    text: 'Les entrades d’equip educatiu queden separades per data i marquen l’alumne en vermell perquè ho vegis durant la classe.',
    action: 'Escriu una entrada breu de prova i prem “+ Nova entrada”.',
    completeWhen: 'agenda-note-added',
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
  },
  {
    target: 'tracking-table',
    title: '11. Marca hàbits de treball',
    text: 'Cada cel·la permet marcar feta, incompleta, no feta o exempt. També pots afegir notes i recordatoris.',
    action: 'Canvia l’estat d’una cel·la de tasca per veure com es desa el seguiment.',
    completeWhen: 'task-record-changed',
    mode: 'tracking',
  },
  {
    target: 'tracking-student-actions',
    title: '12. Punts vermells, negres i diari',
    text: 'Els punts vermells venen de tasques no fetes. El triangle registra incidències i el llibre guarda observacions sense negatiu.',
    mode: 'tracking',
  },
  {
    target: 'tracking-student-actions',
    title: '13. Simula un tercer negatiu',
    text: 'Aquesta simulació marca tres tasques no fetes al primer alumne visible i obre el mateix avís que veuràs en ús real.',
    action: 'Prem “Simular 3r negatiu” i observa com apareix l’avís d’agenda amb les tasques pendents.',
    completeWhen: 'agenda-warning-open',
    helperAction: 'simulate-agenda-warning',
    helperLabel: 'Simular 3r negatiu',
    mode: 'tracking',
    placement: 'right',
  },
  {
    target: 'agenda-warning-modal',
    title: '14. Registra l’avís d’agenda',
    text: 'El programa recorda quines tasques han generat l’avís. Pots copiar el text, donar una darrera oportunitat o registrar que ja has posat la nota.',
    action: 'Prem “Registrar avís” perquè quedi marcat a la fila de l’alumne.',
    completeWhen: 'agenda-note-added',
    mode: 'tracking',
    placement: 'right',
  },
  {
    target: 'stats-global',
    title: '15. Stats Globals',
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
    dashboardScope: 'evaluation',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '18. Estadístiques de la UT activa',
    text: 'Aquest bloc serveix per decidir què reforçar en una unitat concreta: criteris prioritaris, alumnes a revisar i tasques associades.',
    action: 'Clica “Seguiment” per veure només constància, punts i avisos.',
    completeWhen: 'stats-tracking-open',
    dashboardScope: 'ut',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '19. Estadístiques de seguiment',
    text: 'Aquí no hi ha notes: només hàbits, tasques incompletes, punts vermells, punts negres i possibles avisos d’agenda.',
    action: 'Clica “Creuada” per veure com es relacionen rendiment, constància i comportament.',
    completeWhen: 'stats-cross-open',
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
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
  },
  {
    target: 'start-own-data',
    title: '22. Comença amb les teves dades',
    text: 'Quan ja hagis entès el funcionament, pots esborrar la demo i començar amb la teva matèria, classes i alumnes reals.',
    mode: 'analytics',
    insight: 'dashboard',
    final: true,
  },
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getPosition(rect, placement = 'auto') {
  const cardWidth = Math.min(390, window.innerWidth - 32)
  const cardHeight = 250

  if (placement === 'right') {
    const rightSide = rect.right + 14
    const leftSide = rect.left - cardWidth - 14
    const left = rightSide + cardWidth < window.innerWidth - 16 ? rightSide : Math.max(16, leftSide)
    const top = clamp(rect.top + rect.height / 2 - cardHeight / 2, 16, window.innerHeight - cardHeight - 16)
    return { left, top, width: cardWidth }
  }

  const left = clamp(rect.left + rect.width / 2 - cardWidth / 2, 16, window.innerWidth - cardWidth - 16)
  const below = rect.bottom + 14
  const above = rect.top - cardHeight - 14
  const top =
    placement === 'below'
      ? clamp(below, 16, window.innerHeight - cardHeight - 16)
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
  const { guideOpen } = useAvaluaproStore((state) => state.onboarding)
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
  const step = tourSteps[stepIndex]

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
      stepIndex: clamp(nextStepIndex, 0, tourSteps.length - 1),
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
    if (step.helperAction === 'simulate-agenda-warning') {
      window.dispatchEvent(new CustomEvent('avaluapro-demo-agenda-warning'))
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
          <span style={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }} />
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
            {stepIndex + 1}/{tourSteps.length}
          </small>
          {step.final ? (
            <button className="primary-action compact" onClick={handleStartOwnData} type="button">
              <CheckCircle2 size={15} />
              Començar
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
