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
    target: 'tracking-toolbar',
    title: '7. Seguiment de tasques',
    text: 'Crea tasques, filtra per mig grup, mostra tasques passades i obre la intervenció setmanal quan necessitis decidir prioritats.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'demo-marti-missing-button',
    title: '8. Marca una tasca no feta',
    text: 'Ara farem un canvi real a la demo perquè vegis com una sola dada modifica la lectura de constància.',
    action: 'A MARTÍ VILA, Arnau, marca la primera tasca com a no feta. Mira com la constància passa a intervenció prioritària.',
    completeWhen: 'demo-marti-missing',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'above',
  },
  {
    target: 'tracking-student-actions',
    title: '9. Punts vermells, negres i diari',
    text: 'Els punts vermells venen de tasques no fetes. El triangle registra incidències i el llibre guarda observacions sense negatiu.',
    mode: 'tracking',
    ensureTrackingTasks: true,
  },
  {
    target: 'demo-joel-missing-button',
    title: '10. Nota a l’agenda amb 3 negatius',
    text: 'Quan un alumne arriba a tres tasques no fetes, Avaluapro et mostra la nota a l’agenda amb el motiu i les tasques que l’han generada.',
    action: 'A CASALS ORRI, Joel, marca una tasca més com a no feta perquè s’obri la nota a l’agenda.',
    completeWhen: 'agenda-warning-open',
    mode: 'tracking',
    ensureTrackingTasks: true,
    placement: 'above',
  },
  {
    target: 'agenda-warning-modal',
    title: '11. Registra la nota a l’agenda',
    text: 'El programa recorda quines tasques han generat la nota. Pots copiar el text, donar una darrera oportunitat o registrar que ja has posat la nota.',
    action: 'Prem “Registrar nota a l’agenda” perquè quedi marcat a la fila de l’alumne.',
    completeWhen: 'agenda-note-added',
    mode: 'tracking',
    placement: 'left',
  },
  {
    target: 'main-navigation',
    title: '12. Ves a Estadístiques',
    text: 'Ara toca veure què fa el programa amb les dades que acabes de modificar.',
    action: 'Clica “Estadístiques” a la navegació principal.',
    completeWhen: 'analytics-open',
    placement: 'below',
  },
  {
    target: 'stats-scope-tabs',
    title: '13. Filtra les estadístiques per tema',
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
    title: '14. Estadístiques d’avaluació',
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
    title: '15. Estadístiques de la UT activa',
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
    title: '16. Estadístiques de seguiment',
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
    title: '17. Anàlisi creuada',
    text: 'Aquesta vista és la més potent per detectar patrons: alumnes constants amb dificultat, alumnes bons però poc constants o risc combinat.',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
  },
  {
    target: 'stats-performance-detail',
    title: '18. Evolució individual des de la creuada',
    text: 'El botó de detall del rendiment obre les notes, la trajectòria temporal i el gràfic inici-final de l’alumne.',
    action: 'Clica el botó de gràfic d’un alumne per veure el detall de rendiment.',
    completeWhen: 'student-evolution-open',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'left',
  },
  {
    target: 'modal-close',
    title: '19. Torna a les estadístiques',
    text: 'Quan ja hagis vist les notes i la trajectòria de l’alumne, tanca el detall per continuar amb el menú de dades.',
    action: 'Tanca el detall d’evolució individual.',
    completeWhen: 'student-evolution-closed',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'left',
  },
  {
    target: 'data-menu',
    title: '20. Dades, còpies i Firebase',
    text: 'El menú Dades concentra còpies de seguretat, importació, exportació i sincronització. És el lloc clau abans de fer canvis importants.',
    action: 'Obre el menú “Dades i Compte” per veure on són les còpies i l’estat de sincronització.',
    completeWhen: 'data-menu-open',
    dashboardScope: 'cross',
    mode: 'analytics',
    insight: 'dashboard',
    placement: 'far-left',
  },
  {
    target: 'start-own-data',
    title: '21. Comença amb les teves dades',
    text: 'Abans de començar, xafardeja una mica la demo i mira sobretot les estadístiques: amb dades reals trigaran uns dies o setmanes a mostrar aquests fruits. Quan estiguis llest, clica el botó per començar amb les teves dades. Ara pots minimitzar aquesta finestra i tornar-la a obrir quan estiguis llest, o tancar-la amb la creu i prémer després el botó “Començar amb les meves dades”.',
    mode: 'analytics',
    insight: 'dashboard',
    final: true,
  },
]

const ownDataTourSteps = [
  {
    target: 'manage-students-button',
    title: '1. Afegeix la teva classe',
    text: 'El primer pas real és afegir alumnes. Enganxa una llista amb un alumne per línia en format “Cognom Cognom, Nom”. Quan hagis pujat els noms, prem el botó “Acció feta”.',
    action: 'Obre Gestió d’Alumnes, enganxa la llista i afegeix els alumnes.',
    completeWhen: 'class-students-loaded',
    mode: 'evaluation',
    placement: 'left',
  },
  {
    target: 'student-manager-bulk',
    title: '2. Mitjos grups ràpids',
    text: 'Selecciona diversos alumnes i aplica Grup A, Grup B o qualsevol mig grup que hagis configurat. També pots afegir fotos des d’aquí; més endavant les podràs canviar des de Gestió d’Alumnes o des del perfil.',
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
    target: 'student-name-open',
    title: '21. Perfil i anotacions',
    text: 'Quan passis el cursor per sobre d’un nom d’alumne, veuràs que es torna blau. Clicant-hi a sobre, obres el perfil: foto, diagnòstics i informació general.',
    action: 'Clica el nom d’un alumne per obrir el seu perfil.',
    completeWhen: 'student-profile-open',
    mode: 'evaluation',
    requiresClassStudents: true,
    placement: 'right',
  },
  {
    target: 'annotation-diagnosis',
    title: '22. Diagnòstics i color de fila',
    text: 'Els diagnòstics serveixen perquè la fila de l’alumne tingui un color visual. Si un alumne té més d’un diagnòstic, mana el que queda més a la dreta.',
    mode: 'evaluation',
    requiresClassStudents: true,
    placement: 'left',
  },
  {
    target: 'modal-close',
    title: '23. Torna a la taula',
    text: 'Tanca el perfil per veure ara la diferència entre perfil personal i resum d’anotacions.',
    action: 'Tanca el perfil de l’alumne.',
    completeWhen: 'student-profile-closed',
    mode: 'evaluation',
    requiresClassStudents: true,
    placement: 'left',
  },
  {
    target: 'student-comments',
    title: '24. Bombolla d’anotacions',
    text: 'La bombolla obre el resum per reunió: diagnòstics, nota de la UT, seguiment i entrades d’equip educatiu o tutoria.',
    action: 'Clica la bombolla d’un alumne per obrir el resum d’anotacions.',
    completeWhen: 'annotations-open',
    mode: 'evaluation',
    requiresClassStudents: true,
  },
  {
    target: 'annotation-team',
    title: '25. Entrada d’equip educatiu',
    text: 'Quan escrius una entrada d’equip educatiu, la bombolla queda marcada en vermell. Això t’avisa durant la classe que hi ha informació important.',
    action: 'Escriu una entrada breu i prem “+ Nova entrada”.',
    completeWhen: 'agenda-note-added',
    mode: 'evaluation',
    requiresClassStudents: true,
    placement: 'above',
  },
  {
    target: 'annotation-panel',
    title: '26. Resum ràpid per reunió',
    text: 'A dalt tens accessos ràpids a diagnòstics, equips educatius i comentaris de tutoria. Són dreceres per consultar i afegir informació sense perdre temps.',
    mode: 'evaluation',
    requiresClassStudents: true,
    placement: 'left',
  },
  {
    target: 'main-navigation',
    title: '27. Ja pots començar',
    text: 'Ara tens el mapa bàsic: alumnes, notes, seguiment, estadístiques, còpies i sync. Abans d’acabar, una pregunta: també ets tutor/a d’aquest grup?',
    mode: 'evaluation',
    tutorChoice: true,
    requiresClassStudents: true,
  },
  {
    target: 'class-settings',
    title: '28. Activa la tutoria si et cal',
    text: 'Si ets tutor/a, entra a la configuració de classe i marca el grup com a tutoria. Quan aparegui el botó “Mode tutoria”, s’activarà una guia específica només per aquesta part.',
    mode: 'evaluation',
    placement: 'left',
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
    action: 'Clica el botó “Mode tutoria” per entrar-hi.',
    completeWhen: 'tutoring-mode-open',
    placement: 'below',
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
    text: 'Aquí veus el percentatge de competències no assolides, cobertura de dades, àrees de dificultat i alumnes que convé mirar primer. Al principi pot haver-hi poca informació: les estadístiques apareixen a mesura que carregues notes.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '5. Seguiment tutorial',
    text: 'Obre aquesta pestanya per registrar notes a l’agenda, fulls d’incidència, expulsions d’aula o de centre. Són dades pròpies del tutor.',
    action: 'Clica “Seguiment tutorial” quan vulguis veure aquest apartat.',
    completeWhen: 'tutoring-tracking-open',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '6. Relacions i grups',
    text: 'Des d’aquí es construeix el sociograma, els grups cooperatius i la disposició d’aula. Les fotos venen del perfil de l’alumne.',
    action: 'Clica “Relacions i grups” per entrar a les eines socials del grup.',
    completeWhen: 'tutoring-relationships-open',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-relationship-tools',
    title: '7. Tres eines socials',
    text: 'Les targetes obren el sociograma, els grups cooperatius i la disposició d’aula en gran. Així la pestanya queda neta i cada eina té espai per treballar.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-relation-form',
    title: '8. Registra relacions',
    text: 'Aquí pots escriure el nom d’un alumne i triar ràpidament la relació: afinitat, treballa bé o evitar. El cercador és més ràpid que recórrer tota la llista.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-relation-search',
    title: '9. Consulta un alumne',
    text: 'El cercador per alumne resumeix les relacions registrades i et dona accés ràpid al sociograma amb aquell alumne al centre.',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-panel-tabs',
    title: '10. Perfil i PDF',
    text: 'Aquest apartat prepara el perfil individual de l’alumne i el resum descarregable per reunions o seguiment tutorial.',
    action: 'Clica “Perfil i PDF” quan vulguis revisar perfils individuals.',
    completeWhen: 'tutoring-profile-open',
    mode: 'tutoring',
  },
  {
    target: 'tutoring-profile-panel',
    title: '11. Final de la guia de tutoria',
    text: 'Ja tens situades les tres peces: diagnòstic global, seguiment tutorial i mapa social del grup. Pots recuperar aquesta guia des del botó “?” quan calgui.',
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

  if (placement === 'far-left') {
    const left = clamp(rect.left - cardWidth - 96, 16, window.innerWidth - cardWidth - 16)
    const top = clamp(rect.top + rect.height / 2 - cardHeight / 2, 16, window.innerHeight - cardHeight - 16)
    return { left, top, width: cardWidth }
  }

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

  if (step.completeWhen === 'analytics-open') {
    return Boolean(document.querySelector('[data-tour="stats-scope-tabs"]'))
  }

  if (step.completeWhen === 'annotations-open') {
    return Boolean(document.querySelector('.annotations-panel:not(.profile-personal-panel)'))
  }

  if (step.completeWhen === 'annotations-closed') {
    return !document.querySelector('.annotations-panel:not(.profile-personal-panel)')
  }

  if (step.completeWhen === 'student-profile-open') {
    return Boolean(document.querySelector('.profile-personal-panel'))
  }

  if (step.completeWhen === 'student-profile-closed') {
    return !document.querySelector('.profile-personal-panel')
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

  if (step.completeWhen === 'demo-marti-missing') {
    const state = useAvaluaproStore.getState()
    return state.taskRecords.some(
      (record) => record.studentId === 'student_6' && record.taskId === 'task_1' && record.status === 'MISSING',
    )
  }

  if (step.completeWhen === 'student-evolution-open') {
    return Boolean(document.querySelector('.student-evolution-detail'))
  }

  if (step.completeWhen === 'student-evolution-closed') {
    return !document.querySelector('.student-evolution-detail')
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

  if (step.completeWhen === 'tutoring-mode-open') {
    return Boolean(document.querySelector('.tutoring-view'))
  }

  if (step.completeWhen === 'tutoring-tracking-open') {
    return Boolean(document.querySelector('.tutorial-tracking-panel'))
  }

  if (step.completeWhen === 'tutoring-relationships-open') {
    return Boolean(document.querySelector('.tutorial-relationships-panel'))
  }

  if (step.completeWhen === 'tutoring-profile-open') {
    return Boolean(document.querySelector('.tutorial-profile-panel'))
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
              {step.tutorChoice ? (
                <>
                  <button className="secondary-action compact" onClick={closeTour} type="button">
                    No soc tutor/a
                  </button>
                  <button className="primary-action compact" onClick={() => goToStep(safeStepIndex + 1)} type="button">
                    Sí, soc tutor/a
                    <ArrowRight size={15} />
                  </button>
                </>
              ) : step.final ? (
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
