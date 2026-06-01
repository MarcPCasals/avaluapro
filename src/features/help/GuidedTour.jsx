import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Maximize2, Minimize2, PlayCircle, X } from 'lucide-react'
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
    target: 'student-comments',
    title: '7. Anotacions i resum per reunió',
    text: 'La bombolla obre el resum per reunió: diagnòstics, notes de la UT, seguiment i entrades d’equip educatiu o tutoria. El nom de l’alumne queda reservat per al perfil personal.',
    action: 'Clica la bombolla del primer alumne per obrir el resum d’anotacions.',
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
    ensureTrackingTasks: true,
  },
  {
    target: 'tracking-table',
    title: '11. Marca hàbits de treball',
    text: 'Cada cel·la permet marcar feta, incompleta, no feta o exempt. També pots afegir notes i recordatoris.',
    action: 'Canvia l’estat d’una cel·la de tasca per veure com es desa el seguiment.',
    completeWhen: 'task-record-changed',
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
    title: '13. Nota a l’agenda amb 3 negatius',
    text: 'Quan un alumne arriba a tres tasques no fetes, Avaluapro et mostra la nota a l’agenda amb el motiu i les tasques que l’han generada.',
    action: 'Marca una altra tasca com a no feta en un alumne que ja tingui punts vermells per veure com s’obre la nota a l’agenda.',
    completeWhen: 'agenda-warning-open',
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
    action: 'Clica “Seguiment” per veure només constància, punts i notes a l’agenda.',
    completeWhen: 'stats-tracking-open',
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
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'tracking-toolbar',
    title: '14. Seguiment de tasques',
    text: 'A Seguiment treballes hàbits, tasques incompletes, no fetes, recordatoris i notes a l’agenda.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    requiresClassStudents: true,
  },
  {
    target: 'new-task-button',
    title: '15. Crea una tasca',
    text: 'Nova Tasca afegeix una activitat a la UT activa. També pots copiar-la a altres classes si treballen el mateix.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    requiresClassStudents: true,
  },
  {
    target: 'task-done-all',
    title: '16. Accions de tota la classe',
    text: 'El tic general marca com a feta la tasca per a tots els alumnes visibles. Si filtres un mig grup, només afecta aquell mig grup.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
    requiresClassStudents: true,
  },
  {
    target: 'task-reminder-all',
    title: '17. Recordatoris de tasca',
    text: 'La campana del títol programa un recordatori per a tota la tasca; la campana de cada cel·la és individual. El dia i hora indicats apareixerà una targeta i podràs ajornar-la 55 minuts.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
    requiresClassStudents: true,
  },
  {
    target: 'task-info-all',
    title: '18. Informació de la tasca',
    text: 'El botó d’informació guarda anotacions generals de la tasca. També pots afegir informació individual dins de cada cel·la.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'left',
    requiresClassStudents: true,
  },
  {
    target: 'tracking-student-actions',
    title: '19. Alumne, conducta i diari',
    text: 'A la fila de l’alumne veuràs punts vermells, negatius de comportament, entrades de diari i notes a l’agenda registrades.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    requiresClassStudents: true,
  },
  {
    target: 'tracking-table',
    title: '20. Estats de cada tasca',
    text: 'Dins de cada cel·la pots marcar feta, incompleta, no feta o exempt. Aquestes dades alimenten les estadístiques de seguiment.',
    mode: 'tracking',
    ensureTrackingTasks: true,
    requiresClassStudents: true,
  },
  {
    target: 'evaluation-table',
    title: '21. Perfil i anotacions',
    text: 'Clicant el nom obres la fitxa personal amb diagnòstics i anotacions. Clicant la bombolla obres el resum de la UT i l’evolució de l’alumne.',
    mode: 'evaluation',
    requiresClassStudents: true,
  },
  {
    target: 'main-navigation',
    title: '22. Ja pots començar',
    text: 'Ara tens el mapa bàsic: alumnes, notes, seguiment, estadístiques, còpies i sync. Pots tancar aquesta guia i començar a treballar amb les teves dades.',
    mode: 'evaluation',
    final: true,
    requiresClassStudents: true,
  },
]

const waitingForStudentsStep = {
  target: 'manage-students-button',
  title: '14. Carrega el grup classe',
  text: 'La resta de la guia necessita alumnes per assenyalar la taula, els botons de seguiment i el perfil. Quan afegeixis alumnes, Avaluapro també tindrà una tasca inicial “Coneixements previs” perquè puguis veure el seguiment de seguida.',
  action: 'Obre Gestió d’Alumnes i enganxa el grup classe per desbloquejar els passos de seguiment i perfil.',
  completeWhen: 'class-students-loaded',
  mode: 'evaluation',
  placement: 'left',
  final: true,
}

const tutoringTourSteps = [
  {
    target: 'tutoring-mode-button',
    title: '1. Mode tutoria',
    text: 'Aquest espai només apareix quan una classe s’ha marcat com a tutoria. Serveix per mirar el grup sencer, no només una assignatura.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-hero',
    title: '2. Grup vinculat',
    text: 'La tutoria queda connectada a una classe base: així aprofita alumnes, fotos i les notes que ja tens de la teva assignatura.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '3. Quatre mirades de tutor',
    text: 'Avaluació tutorial mira competències de totes les matèries; Seguiment tutorial recull agenda i incidències; Relacions prepara sociograma, grups i aula; Perfil i PDF genera resums individuals.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-group-diagnosis',
    title: '4. Diagnòstic del grup',
    text: 'Aquí veus el percentatge de competències no assolides, cobertura de dades, àrees de dificultat i alumnes que convé mirar primer.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '5. Seguiment tutorial',
    text: 'Obre aquesta pestanya per registrar notes a l’agenda, fulls d’incidència, expulsions d’aula o de centre. Són dades pròpies del tutor.',
    action: 'Clica “Seguiment tutorial” quan vulguis veure aquest apartat.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '6. Relacions i grups',
    text: 'Des d’aquí es construeix el sociograma, els grups cooperatius i la disposició d’aula. Les fotos venen del perfil de l’alumne.',
    action: 'Clica “Relacions i grups” per entrar a les eines socials del grup.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '7. Perfil i PDF',
    text: 'Aquest apartat prepara el perfil individual de l’alumne i el resum descarregable per reunions o seguiment tutorial.',
    action: 'Clica “Perfil i PDF” quan vulguis revisar perfils individuals.',
    mode: 'tutoring',
  },
  {
    target: 'guide-button',
    title: '8. Recupera la guia quan calgui',
    text: 'El botó Guia queda sempre visible. Si tanques aquesta ajuda, pots tornar-la a obrir sense reiniciar res.',
    mode: 'tutoring',
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

  if (step.completeWhen === 'class-students-loaded') {
    const state = useAvaluaproStore.getState()
    return state.students.some((student) => student.classId === state.ui.activeClassId)
  }

  return true
}

export function GuidedTour() {
  const { guideMode, guideOpen } = useAvaluaproStore((state) => state.onboarding)
  const setGuideOpen = useAvaluaproStore((state) => state.setGuideOpen)
  const setTutoringGuideSeen = useAvaluaproStore((state) => state.setTutoringGuideSeen)
  const startOwnData = useAvaluaproStore((state) => state.startOwnData)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveInsight = useAvaluaproStore((state) => state.setActiveInsight)
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const activeClassStudentCount = useAvaluaproStore(
    (state) => state.students.filter((student) => student.classId === state.ui.activeClassId).length,
  )
  const activeUtTaskCount = useAvaluaproStore(
    (state) =>
      state.tasks.filter((task) => task.classId === state.ui.activeClassId && task.utId === state.ui.activeUtId).length,
  )
  const agendaNotesCount = useAvaluaproStore((state) => state.agendaNotes.length)
  const taskSignature = useAvaluaproStore((state) => buildTaskSignature(state.taskRecords))
  const [tourState, setTourState] = useState(() => ({
    baseline: getGuideSnapshot(),
    stepIndex: 0,
  }))
  const [targetRect, setTargetRect] = useState(null)
  const [domPulse, setDomPulse] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const { baseline, stepIndex } = tourState
  const activeSteps = useMemo(() => {
    if (guideMode === 'demo') return tourSteps
    if (guideMode === 'tutoring') return tutoringTourSteps
    const hasClassStudents = activeClassStudentCount > 0
    const visibleSteps = ownDataTourSteps.filter((item) => !item.requiresClassStudents || hasClassStudents)
    return hasClassStudents ? visibleSteps : [...visibleSteps, waitingForStudentsStep]
  }, [activeClassStudentCount, guideMode])
  const safeStepIndex = clamp(stepIndex, 0, Math.max(0, activeSteps.length - 1))
  const step = activeSteps[safeStepIndex]

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
      if (
        guideMode === 'own' &&
        state.ui.activeClassId &&
        state.ui.activeUtId &&
        state.students.some((student) => student.classId === state.ui.activeClassId) &&
        !currentUtHasTasks
      ) {
        state.addTask({
          title: 'Coneixements previs',
          date: new Date().toISOString().slice(0, 10),
        })
      }
      const targetTask = currentUtHasTasks ? null : classTasks[0]
      if (targetTask) {
        const targetUt = state.uts.find((ut) => ut.id === targetTask.utId)
        if (targetUt) state.setActiveSemester(targetUt.semesterId)
        state.setActiveUt(targetTask.utId)
      }
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('avaluapro-show-demo-tasks')), 80)
    }
  }, [activeClassId, activeUtId, activeUtTaskCount, guideMode, guideOpen, setActiveInsight, setActiveMode, step])

  useEffect(() => {
    if (!guideOpen || !step?.completeWhen) return undefined
    const intervalId = window.setInterval(() => setDomPulse((value) => value + 1), 400)
    return () => window.clearInterval(intervalId)
  }, [guideOpen, step])

  useEffect(() => {
    if (!guideOpen || !step) return undefined

    let frameId = 0
    const measure = (shouldScroll = false) => {
      const target = document.querySelector(`[data-tour="${step.target}"]`)
      if (!target) {
        setTargetRect(null)
        return
      }
      if (shouldScroll) target.scrollIntoView({ block: 'center', inline: 'center' })
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
    const measureOnly = () => measure(false)

    frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => measure(true))
    })
    window.addEventListener('resize', measureOnly)
    window.addEventListener('scroll', measureOnly, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', measureOnly)
      window.removeEventListener('scroll', measureOnly, true)
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
    if (guideMode === 'tutoring') setTutoringGuideSeen(true)
    setGuideOpen(false)
  }

  const handleStartOwnData = async () => {
    const started = await startOwnData()
    if (started) closeTour()
  }

  return (
    <div className="guided-tour-layer" aria-live="polite">
      {targetRect && !minimized && (
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
      <article className={`guided-tour-card ${minimized ? 'minimized' : ''}`} style={minimized ? undefined : cardStyle}>
        <header>
          <span>
            <PlayCircle size={17} />
            Guia interactiva
          </span>
          <div className="guided-tour-window-actions">
            <button onClick={() => setMinimized((value) => !value)} title={minimized ? 'Restaurar guia' : 'Minimitzar guia'} type="button">
              {minimized ? <Maximize2 size={17} /> : <Minimize2 size={17} />}
            </button>
            <button onClick={closeTour} title="Tancar guia" type="button">
              <X size={17} />
            </button>
          </div>
        </header>
        {minimized ? (
          <>
            <strong>{step.title}</strong>
            <small>
              Pas {safeStepIndex + 1}/{activeSteps.length}. La guia està minimitzada; pots seguir navegant i fer scroll lliurement.
            </small>
          </>
        ) : (
          <>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
            {step.action && (
              <div className={`guided-tour-task ${stepComplete ? 'complete' : ''}`}>
                <CheckCircle2 size={16} />
                <span>{step.action}</span>
              </div>
            )}
            <div className="guided-tour-progress">
              <span style={{ width: `${((safeStepIndex + 1) / activeSteps.length) * 100}%` }} />
            </div>
            <footer>
              <button className="ghost-action compact guided-tour-skip" onClick={closeTour} type="button">
                Saltar guia
              </button>
              <button
                className="secondary-action compact"
                disabled={safeStepIndex === 0}
                onClick={() => goToStep(safeStepIndex - 1)}
                type="button"
              >
                <ArrowLeft size={15} />
                Anterior
              </button>
              <small>
                {safeStepIndex + 1}/{activeSteps.length}
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
                  onClick={() => goToStep(safeStepIndex + 1)}
                  type="button"
                >
                  {step.action ? 'Acció feta' : 'Següent'}
                  <ArrowRight size={15} />
                </button>
              )}
            </footer>
          </>
        )}
      </article>
    </div>
  )
}
