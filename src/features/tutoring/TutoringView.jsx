import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Eye,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartHandshake,
  History,
  Layers3,
  LayoutGrid,
  Loader2,
  Lock,
  MapPin,
  Move,
  Network,
  Plus,
  RotateCcw,
  RefreshCw,
  Redo2,
  Save,
  Search,
  ShieldAlert,
  Shuffle,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  UserX,
  UsersRound,
  X,
} from 'lucide-react'
import { EducandEmailInput } from '../../components/EducandEmailInput'
import { Modal } from '../../components/Modal'
import { SUBJECT_AREAS, SUBJECT_STRUCTURES } from '../../data/subjects'
import { downloadBlob, getTodaySlug } from '../../lib/downloads'
import { normalizeEducandEmail } from '../../lib/email'
import { listSociometricSurveyResponses } from '../../lib/firebase'
import { GRADE_OPTIONS, calculateGrade, getNumericFromGrade, gradeClassName, gradeTextClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { createCooperativeSociometricHelpers } from './cooperativeGroupSociometricUtils'
import { getCooperativeGroupSetOrigin } from './cooperativeGroupHistoryUtils'
import {
  canModifyCooperativeMember,
  createEmptyCooperativeGroup,
  removeEmptyCooperativeGroup,
  renameCooperativeGroup,
  toggleCooperativeGroupLock,
  toggleCooperativeStudentLock,
} from './cooperativeGroupEditingUtils'
import {
  buildStudentCooperativeGroupText,
  buildTeacherCooperativeGroupText,
  formatCooperativeStudentName,
} from './cooperativeGroupOutputUtils'
import { SociometricComparisonSelector } from './SociometricComparisonSelector'
import { SociometricStudentInsightCard } from './SociometricStudentInsightCard'
import {
  getSavedSeatingAssignments,
  getUnseatedStudentIds,
  normalizeSavedSeatingRestrictions,
} from './seatingPlanHistoryUtils'
import {
  getSeatingObjectiveWeights,
  getSeatingZoneIterationState,
  selectBestSeatingCandidate,
} from './seatingIterationUtils'
import { buildSociometricStudentReports } from './sociometricStudentProfileUtils'

const TUTORING_RECORD_TYPES = [
  { id: 'agenda', label: 'Notes a l’agenda', tone: 'amber' },
  { id: 'incident', label: 'Fulls d’incidents', tone: 'red' },
  { id: 'classroom-expulsion', label: 'Expulsions d’aula', tone: 'violet' },
  { id: 'center-expulsion', label: 'Expulsions de centre', tone: 'slate' },
  { id: 'doip', label: 'DOIPs equip educatiu', tone: 'blue' },
]
const TUTORING_AGENDA_NOTE_TYPES = [
  { id: 'work', label: 'Treball' },
  { id: 'behavior', label: 'Comportament' },
]
const MULTIPLE_INTELLIGENCE_OPTIONS = [
  { id: 'linguistic', label: 'Lingüística' },
  { id: 'logical', label: 'Logicomatemàtica' },
  { id: 'spatial', label: 'Visual-espacial' },
  { id: 'bodily', label: 'Corporal-cinestèsica' },
  { id: 'musical', label: 'Musical' },
  { id: 'interpersonal', label: 'Interpersonal' },
  { id: 'intrapersonal', label: 'Intrapersonal' },
  { id: 'naturalistic', label: 'Naturalista' },
]
const TUTORING_RELATION_TYPES = [
  { id: 'positive', label: 'Treballa bé amb', shortLabel: 'Positiva', tone: 'green' },
  { id: 'friendship', label: 'S’hi relaciona sovint', shortLabel: 'Afinitat', tone: 'blue' },
  { id: 'avoid', label: 'Evitar de moment', shortLabel: 'Incompatibilitat', tone: 'red' },
]
const COOPERATIVE_GROUP_STRATEGIES = [
  { id: 'balanced', label: 'Equilibrat', description: 'Barreja rendiment, seguiment i sociometria.' },
  { id: 'supportive', label: 'Suportiu', description: 'Prioritza integrar alumnes vulnerables amb vincles segurs.' },
  { id: 'calm', label: 'Treball eficient', description: 'Prioritza relacions positives de treball i evita tensions.' },
]
const EMPTY_COOPERATIVE_EDIT_DRAFT = {
  studentId: '',
  targetGroupId: '',
  targetStudentId: '',
  type: 'move',
}
const SEATING_ITERATION_OBJECTIVES = [
  { id: 'balanced', label: 'Equilibri general', description: 'Compensa tots els criteris pedagògics.' },
  { id: 'calm', label: 'Més calma', description: 'Separa tensions, conflictes i influències difícils.' },
  { id: 'support', label: 'Més suport', description: 'Acosta perfils vulnerables a referents útils.' },
  { id: 'work', label: 'Millor treball', description: 'Afavoreix vincles de treball fiables.' },
  { id: 'supervision', label: 'Més supervisió', description: 'Prioritza el seguiment docent dels alumnes delicats.' },
]
const SEATING_ZONE_OPTIONS = [
  { id: 'front', label: 'Zona davantera' },
  { id: 'center', label: 'Zona central' },
  { id: 'back', label: 'Zona posterior' },
]
const SOCIOGRAM_FILTERS = [
  { id: 'all', label: 'Tot' },
  { id: 'social', label: 'Social' },
  { id: 'work', label: 'Treball' },
  { id: 'avoid', label: 'Rebuig' },
]
const SOCIOMETRIC_STAT_DRILLDOWN_META = {
  avoidGiven: {
    emptyLabel: 'No ha registrat cap rebuig.',
    label: 'Rebuigs fets',
    relationType: 'avoid',
    tone: 'red',
  },
  avoidReceived: {
    emptyLabel: 'No ha rebut cap rebuig registrat.',
    label: 'Rebuigs rebuts',
    relationType: 'avoid',
    tone: 'red',
  },
  positiveGiven: {
    emptyLabel: 'No ha fet cap elecció social.',
    label: 'Eleccions fetes',
    relationType: 'friendship',
    tone: 'green',
  },
  positiveReceived: {
    emptyLabel: 'No ha rebut cap elecció social.',
    label: 'Eleccions rebudes',
    relationType: 'friendship',
    tone: 'green',
  },
}
const SOCIOMETRIC_REPORT_TYPES = [
  {
    id: 'quick',
    title: 'Informe ràpid del grup',
    description: 'Una pàgina per veure estat general, alumnes prioritaris i primeres accions.',
    icon: BarChart3,
    estimate: '1 pàgina',
    status: 'Fase 2',
  },
  {
    id: 'complete',
    title: 'Informe docent complet',
    description: 'Lectura més extensa del grup amb sociograma, alertes i pla d’intervenció.',
    icon: FileText,
    estimate: '3-5 pàgines',
    status: 'Fase 5',
  },
  {
    id: 'individual',
    title: 'Fitxes individuals',
    description: 'Una fitxa breu per alumne amb classificació, relacions i recomanacions.',
    icon: UsersRound,
    estimate: '1 pàgina/alumne',
    status: 'Fase 3',
  },
  {
    id: 'comparative',
    title: 'Informe comparatiu',
    description: 'Comparació entre dos moments sociomètrics per veure evolució i impacte.',
    icon: TrendingDown,
    estimate: '2-3 pàgines',
    status: 'Fase 7',
  },
]
const SOCIOMETRIC_REPORT_SECTIONS = [
  { id: 'summary', label: 'Resum del grup', required: true, pages: 1 },
  { id: 'sociogram', label: 'Sociograma visual', required: false, pages: 1 },
  { id: 'priority', label: 'Alumnes prioritaris', required: false, pages: 1 },
  { id: 'contexts', label: 'Social vs treball', required: false, pages: 1 },
  { id: 'alerts', label: 'Alertes pedagògiques', required: false, pages: 1 },
  { id: 'interventions', label: 'Propostes d’intervenció', required: false, pages: 1 },
  { id: 'individual', label: 'Fitxes individuals', required: false, pages: 1 },
  { id: 'technical', label: 'Annex tècnic', required: false, pages: 2 },
]
const DEFAULT_SOCIOMETRIC_REPORT_SECTIONS = {
  quick: {
    alerts: false,
    contexts: true,
    individual: false,
    interventions: true,
    priority: true,
    sociogram: false,
    summary: true,
    technical: false,
  },
  complete: {
    alerts: true,
    contexts: true,
    individual: false,
    interventions: true,
    priority: true,
    sociogram: true,
    summary: true,
    technical: false,
  },
  individual: {
    alerts: false,
    contexts: false,
    individual: true,
    interventions: true,
    priority: false,
    sociogram: false,
    summary: true,
    technical: false,
  },
  comparative: {
    alerts: false,
    contexts: true,
    individual: false,
    interventions: true,
    priority: true,
    sociogram: true,
    summary: true,
    technical: false,
  },
}
const SOCIOMETRIC_POSITIVE_LIMIT = 4
const SOCIOMETRIC_AVOID_LIMIT = 3
const TEACHER_OBSERVATION_RELATION_SOURCE = 'teacher-observation'
const SOCIOMETRIC_PUBLIC_FORM_SOURCE = 'sociometric-public-form'
const SOCIOMETRIC_TEMPLATE_HEADER = [
  'Alumne',
  'Elecció 1',
  'Elecció 2',
  'Elecció 3',
  'Elecció 4',
  'Rebuig 1',
  'Rebuig 2',
  'Rebuig 3',
].join('\t')
const SOCIOMETRIC_CATEGORY_META = {
  Líder: { id: 'leader', label: 'Líder', tone: 'green', description: 'Molta elecció positiva i poc rebuig.' },
  Promig: { id: 'average', label: 'Promig', tone: 'blue', description: 'Bona acceptació general i relació fluida amb el grup.' },
  Acceptat: { id: 'accepted', label: 'Acceptat', tone: 'cyan', description: 'Poca afinitat explícita, però sense rebuig significatiu.' },
  Controvertit: { id: 'controversial', label: 'Controvertit', tone: 'orange', description: 'Rep eleccions positives i també rebuigs; perfil polaritzat.' },
  Aïllat: { id: 'isolated', label: 'Aïllat', tone: 'gray', description: 'Poques connexions registrades.' },
  Rebutjat: { id: 'rejected', label: 'Rebutjat', tone: 'red', description: 'Rep rebuigs alts i el balanç social és clarament negatiu.' },
}
const VALID_IMPORT_GRADES = new Set(['A', 'B', 'C', 'D', 'NA'])
const EMPTY_IMPORT_MARKS = new Set(['', '-', '—', '.'])
const TUTORING_TEXT_LIMIT = 700
const RELATION_NOTE_LIMIT = 400
const SEATING_GRID_COLUMNS = 9
const SEATING_GRID_ROWS = 5
const DEFAULT_SEATING_BLOCKS = [2, 3, 1]
const SEATING_STRUCTURE_PRESETS = [
  { blocks: [2, 2, 2], id: '2-2-2', label: '2 · 2 · 2' },
  { blocks: [2, 3, 1], id: '2-3-1', label: '2 · 3 · 1' },
  { blocks: [3, 3], id: '3-3', label: '3 · 3' },
]
const DEFAULT_SEATING_ACTIVE_SEATS = [
  [0, 1, 3, 4, 5, 7, 8],
  [0, 1, 3, 4, 5, 7, 8],
  [0, 1, 4, 5, 7, 8],
  [0, 1, 4, 5, 8],
  [],
]

function countByType(records, type) {
  return records.filter((record) => record.type === type).length
}

function getRecordTypeMeta(type) {
  return TUTORING_RECORD_TYPES.find((item) => item.id === type) || TUTORING_RECORD_TYPES[0]
}

function getRelationTypeMeta(type) {
  return TUTORING_RELATION_TYPES.find((item) => item.id === type) || TUTORING_RELATION_TYPES[0]
}

function getRelationCategory(type) {
  return type === 'avoid' ? 'avoid' : 'supportive'
}

function getRelationPedagogicalWeight(relation) {
  if (relation?.source === SOCIOMETRIC_PUBLIC_FORM_SOURCE) return 1
  if (!relation?.source || relation?.source === TEACHER_OBSERVATION_RELATION_SOURCE) return 2
  return 1
}

function getRelationInfluence(relation) {
  const strength = Math.min(3, Math.max(1, Number(relation?.strength) || 2))
  return getRelationPedagogicalWeight(relation) * (strength / 2)
}

function getWeightedRelationCount(relations) {
  return relations.reduce((total, relation) => total + getRelationPedagogicalWeight(relation), 0)
}

function isSociometricSocialRelation(relation) {
  return (
    relation?.type === 'friendship' ||
    relation?.source === SOCIOMETRIC_PUBLIC_FORM_SOURCE ||
    relation?.source === 'sociometric-questionnaire'
  )
}

function buildSociometricStatDrilldownItems({ relationKey, relations, studentId }) {
  const meta = SOCIOMETRIC_STAT_DRILLDOWN_META[relationKey]
  if (!meta || !studentId) return []

  const isOutgoing = relationKey === 'positiveGiven' || relationKey === 'avoidGiven'
  const relevantRelations = (relations || []).filter((relation) => {
    if (meta.relationType === 'avoid' && !isSociometricSocialRelation(relation)) return false
    if (relation.type !== meta.relationType) return false
    return isOutgoing ? relation.sourceStudentId === studentId : relation.targetStudentId === studentId
  })

  const itemsByStudentId = new Map()

  relevantRelations.forEach((relation) => {
    const counterpart = isOutgoing ? relation.targetStudent : relation.sourceStudent
    const counterpartId = isOutgoing ? relation.targetStudentId : relation.sourceStudentId
    if (!counterpart || !counterpartId) return

    const current = itemsByStudentId.get(counterpartId) || {
      id: counterpartId,
      name: counterpart.name,
      relationCount: 0,
      sources: new Set(),
      weight: 0,
    }

    current.relationCount += 1
    current.weight += getRelationPedagogicalWeight(relation)
    current.sources.add(relation.source || TEACHER_OBSERVATION_RELATION_SOURCE)
    itemsByStudentId.set(counterpartId, current)
  })

  return [...itemsByStudentId.values()]
    .map((item) => ({
      ...item,
      sources: [...item.sources],
    }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'ca'))
}

function getSociometricCategory({
  avoidReceived,
  p15,
  p40,
  p60Avoid,
  p75Avoid,
  p85,
  positiveGiven,
  positiveReceived,
}) {
  const highPositive = positiveReceived >= Math.max(1, p40)
  const veryHighPositive = positiveReceived >= Math.max(1, p85)
  const moderateAvoid = avoidReceived >= Math.max(1, p60Avoid)
  const highAvoid = avoidReceived >= Math.max(1, p75Avoid)
  const lowPositive = positiveReceived <= p15
  const positiveBalance = positiveReceived - avoidReceived
  const clearlyRejected = highAvoid && (positiveReceived === 0 || positiveBalance <= -1 || (lowPositive && avoidReceived >= 2))

  if (veryHighPositive && avoidReceived <= p60Avoid) return 'Líder'
  if (highAvoid && highPositive && positiveBalance >= 0) return 'Controvertit'
  if (highAvoid && highPositive && positiveReceived >= Math.max(1, avoidReceived - 1)) return 'Controvertit'
  if (clearlyRejected) return 'Rebutjat'
  if (highPositive && moderateAvoid) return 'Controvertit'
  if (lowPositive && positiveGiven <= 1 && avoidReceived <= p60Avoid) return 'Aïllat'
  if (highPositive && avoidReceived <= p60Avoid) return 'Promig'
  return 'Acceptat'
}

function getSociometricCategoryExplanation(row) {
  if (!row) return ''

  const positiveReceived = row.positiveReceived || 0
  const avoidReceived = row.avoidReceived || 0
  const positiveGiven = row.positiveGiven || 0
  const balance = positiveReceived - avoidReceived

  if (row.category === 'Líder') {
    return `Té ${positiveReceived} elecció/ns rebuda/es i només ${avoidReceived} rebuig/s. És un perfil molt acceptat dins del grup.`
  }

  if (row.category === 'Promig') {
    return `Té ${positiveReceived} elecció/ns rebuda/es i ${avoidReceived} rebuig/s. El balanç és positiu i la seva integració general és bona.`
  }

  if (row.category === 'Acceptat') {
    return `Té ${positiveReceived} elecció/ns rebuda/es i ${avoidReceived} rebuig/s. No destaca molt per afinitat explícita, però tampoc per tensió social.`
  }

  if (row.category === 'Controvertit') {
    return `Té ${positiveReceived} elecció/ns rebuda/es i ${avoidReceived} rebuig/s. Hi ha suport social, però també tensió; per això és un perfil polaritzat i no un rebuig clar.`
  }

  if (row.category === 'Aïllat') {
    return `Té ${positiveReceived} elecció/ns rebuda/es, ${avoidReceived} rebuig/s i només ${positiveGiven} elecció/ns feta/es. Hi ha poques connexions visibles al mapa social.`
  }

  if (row.category === 'Rebutjat') {
    return `Té ${positiveReceived} elecció/ns rebuda/es i ${avoidReceived} rebuig/s. El balanç social és ${balance} i el pes del rebuig supera el suport positiu.`
  }

  return row.categoryMeta?.description || ''
}

function getSociogramRelationContext(relation) {
  if (relation?.type === 'avoid') return 'avoid'
  if (relation?.type === 'positive') return 'work'
  if (relation?.type === 'friendship') return 'social'
  return isSociometricSocialRelation(relation) ? 'social' : 'work'
}

function isSociogramReciprocalRelation(relation, relations) {
  return relations.some(
    (candidate) =>
      candidate.sourceStudentId === relation.targetStudentId &&
      candidate.targetStudentId === relation.sourceStudentId &&
      candidate.type === relation.type,
  )
}

function getStableUnitInterval(value) {
  const hash = String(value || '')
    .split('')
    .reduce((total, char, index) => (total + char.charCodeAt(0) * (index + 11)) % 1009, 17)
  return hash / 1009
}

function getPercentile(sortedValues, ratio) {
  if (!sortedValues.length) return 0
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1))
  return sortedValues[index]
}

function getSociogramInitials(name) {
  const [surnameBlock = '', firstNameBlock = ''] = String(name || '').split(',')
  const firstName = firstNameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const firstSurname = surnameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const fallback = String(name || '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return `${firstName?.[0] || ''}${firstSurname?.[0] || ''}`.toUpperCase() || fallback.toUpperCase() || '?'
}

function getSociogramShortCode(name) {
  const [surnameBlock = '', firstNameBlock = ''] = String(name || '').split(',')
  const fallbackParts = String(name || '').split(/\s+/).filter(Boolean)
  const firstName = (firstNameBlock.trim().split(/\s+/).filter(Boolean)[0] || fallbackParts[0] || '').trim()
  const firstSurname = (surnameBlock.trim().split(/\s+/).filter(Boolean)[0] || fallbackParts[1] || '').trim()
  const namePart = firstName.slice(0, 3)
  const surnamePart = firstSurname.slice(0, 1)
  const code = `${namePart}${surnamePart}`
  return code ? `${code.slice(0, 1).toUpperCase()}${code.slice(1)}` : getSociogramInitials(name)
}

function getSeatingShortName(name) {
  const [surnameBlock = '', firstNameBlock = ''] = String(name || '').split(',')
  const fallbackParts = String(name || '').split(/\s+/).filter(Boolean)
  const firstName = firstNameBlock.trim().split(/\s+/).filter(Boolean)[0] || fallbackParts[0] || ''
  const surnameInitials = surnameBlock
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return `${firstName} ${surnameInitials}`.trim() || String(name || '')
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function formatShortDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatLongDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function printTutorialProfile() {
  document.body.classList.add('tutorial-profile-printing')
  const clearPrintClass = () => document.body.classList.remove('tutorial-profile-printing')
  window.addEventListener('afterprint', clearPrintClass, { once: true })
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()))
  window.setTimeout(clearPrintClass, 1200)
}

function printSociometricReport(extraPrintClass = '') {
  const printModeClass = typeof extraPrintClass === 'string' ? extraPrintClass : ''
  document.body.classList.add('sociometric-report-printing')
  if (printModeClass) {
    document.body.classList.add(printModeClass)
  }
  const clearPrintClass = () => {
    document.body.classList.remove('sociometric-report-printing')
    if (printModeClass) {
      document.body.classList.remove(printModeClass)
    }
  }
  window.addEventListener('afterprint', clearPrintClass, { once: true })
  window.print()
  window.setTimeout(clearPrintClass, 1200)
}

function getSubjectArea(subjectName) {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subjectName))
}

function normalizeCompetencyLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getCompetencyCode(value) {
  const match = String(value || '').match(/\b(?:trans\s*)?c\s*(\d+)\b/i)
  return match ? `C${match[1]}` : ''
}

function isSameCompetencyName(a, b) {
  const normalizedA = normalizeCompetencyLabel(a)
  const normalizedB = normalizeCompetencyLabel(b)
  if (normalizedA && normalizedA === normalizedB) return true

  const codeA = getCompetencyCode(a)
  const codeB = getCompetencyCode(b)
  return Boolean(codeA && codeA === codeB)
}

function focusNextTutorialGradeSelect(currentElement) {
  const fields = Array.from(document.querySelectorAll('[data-tutorial-grade-select="true"]'))
  const currentIndex = fields.indexOf(currentElement)
  if (currentIndex < 0) return

  fields[currentIndex + 1]?.focus()
}

function getSubjectOptionsForArea(areaFilter) {
  const areas = SUBJECT_AREAS.filter((area) => area.id !== 'tutorial')
  return areas
    .filter((area) => areaFilter === 'all' || area.id === areaFilter)
    .flatMap((area) =>
      area.subjects
        .filter((subject) => SUBJECT_STRUCTURES[subject])
        .map((subject) => ({
          subject,
          areaId: area.id,
          areaName: area.name,
          structure: SUBJECT_STRUCTURES[subject],
        })),
    )
}

function getAllTutorialSubjectOptions() {
  return getSubjectOptionsForArea('all')
}

function buildTutorialCompetencies(subject) {
  const structure = SUBJECT_STRUCTURES[subject] || []
  return structure.map((competency, competencyIndex) => ({
    ...competency,
    key: `${subject}__c${competencyIndex + 1}`,
    subject,
    competencyIndex,
    criteria: competency.criteria.map((criterion, criterionIndex) => ({
      key: `${subject}__c${competencyIndex + 1}__ca${criterionIndex + 1}`,
      name: criterion,
      order: criterionIndex + 1,
    })),
  }))
}

function getStoredTutorialCompetencyGradeSource(tutorialMarks, classId, studentId, subject, competency) {
  const directMark = tutorialMarks.find(
    (mark) =>
      mark.classId === classId &&
      mark.studentId === studentId &&
      mark.subject === subject &&
      mark.competencyKey === competency.key,
  )
  if (directMark?.value) {
    return directMark.modified || directMark.source?.modified
      ? {
          source: 'modified',
          trackingSummary: directMark.source?.trackingSummary || null,
          value: directMark.value,
          modified: true,
        }
      : { source: 'manual', trackingSummary: directMark.source?.trackingSummary || null, value: directMark.value }
  }

  const legacyCriterionGrades = competency.criteria
    .map(
      (criterion) =>
        tutorialMarks.find(
          (mark) =>
            mark.classId === classId &&
            mark.studentId === studentId &&
            mark.subject === subject &&
            mark.criterionKey === criterion.key,
        )?.value,
    )
    .filter(Boolean)

  const legacyGrade = calculateGrade(legacyCriterionGrades)
  return legacyGrade ? { source: 'manual', value: legacyGrade } : null
}

function getLinkedEvaluationCompetencyGradeSource({ competency, evaluationContext, studentId, subject }) {
  if (!evaluationContext || subject !== evaluationContext.linkedSubject) return null

  const classSemesters = (evaluationContext.semesters || [])
    .filter((semester) => semester.classId === evaluationContext.linkedClassId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const semesterOrderById = new Map(classSemesters.map((semester, index) => [semester.id, semester.order || index + 1]))
  const classUts = evaluationContext.uts
    .filter((ut) => ut.classId === evaluationContext.linkedClassId)
    .sort(
      (a, b) =>
        (semesterOrderById.get(a.semesterId) || 0) - (semesterOrderById.get(b.semesterId) || 0) ||
        (a.order || 0) - (b.order || 0) ||
        a.name.localeCompare(b.name, 'ca'),
    )
  const utOrderById = new Map(classUts.map((ut, index) => [ut.id, index]))
  const utsById = new Map(classUts.map((ut) => [ut.id, ut]))
  const matchingCompetencies = evaluationContext.competencies
    .filter((item) => utOrderById.has(item.utId) && isSameCompetencyName(item.name, competency.name))
    .sort((a, b) => (utOrderById.get(b.utId) || 0) - (utOrderById.get(a.utId) || 0))

  for (const item of matchingCompetencies) {
    const modifiedMark = evaluationContext.marks.find(
      (mark) =>
        mark.type === 'competency-modification' &&
        mark.studentId === studentId &&
        mark.competencyId === item.id,
    )
    const competencyCriteria = evaluationContext.criteria.filter((criterion) => criterion.competencyId === item.id)
    const criterionGrades = competencyCriteria
      .map(
        (criterion) =>
          evaluationContext.marks.find(
            (mark) => mark.studentId === studentId && mark.criterionId === criterion.id,
          )?.value,
      )
      .filter(Boolean)
    const grade = calculateGrade(criterionGrades)
    if (grade || modifiedMark) {
      const sourceUt = utsById.get(item.utId)
      return {
        modified: Boolean(modifiedMark),
        source: modifiedMark ? 'modified' : 'linked',
        utName: sourceUt?.name || 'UT anterior',
        utOrder: utOrderById.get(item.utId) ?? 0,
        value: grade || 'D',
      }
    }
  }

  return null
}

function getTutorialCompetencyGradeSource({
  classId,
  competency,
  evaluationContext,
  student,
  studentId,
  subject,
  tutorialMarks,
}) {
  if (student?.tutorialExemptSubjects?.includes(subject)) {
    return { source: 'exempt', value: '' }
  }
  if (student?.tutorialModifiedCompetencies?.includes(competency.key)) {
    return { source: 'modified', value: 'D', modified: true }
  }

  const storedGrade = getStoredTutorialCompetencyGradeSource(tutorialMarks, classId, studentId, subject, competency)
  if (storedGrade) return storedGrade

  const linkedGrade = getLinkedEvaluationCompetencyGradeSource({ competency, evaluationContext, studentId, subject })
  if (linkedGrade) return linkedGrade

  return { source: 'empty', value: '' }
}

function getTutorialCompetencyGrade({
  classId,
  competency,
  evaluationContext,
  student,
  studentId,
  subject,
  tutorialMarks,
}) {
  return getTutorialCompetencyGradeSource({
    classId,
    competency,
    evaluationContext,
    student,
    studentId,
    subject,
    tutorialMarks,
  }).value
}

function getTutorialModifiedCompetencyRows({ allSubjectOptions, classId, evaluationContext, students, tutorialMarks }) {
  const totalCompetencies = allSubjectOptions.reduce(
    (total, item) => total + buildTutorialCompetencies(item.subject).length,
    0,
  )

  return students
    .map((student) => {
      const subjects = allSubjectOptions
        .map((item) => {
          const competencies = buildTutorialCompetencies(item.subject)
            .map((competency, index) => {
              const gradeSource = getTutorialCompetencyGradeSource({
                classId,
                competency,
                evaluationContext,
                student,
                studentId: student.id,
                subject: item.subject,
                tutorialMarks,
              })
              return gradeSource.modified
                ? {
                    code: `C${index + 1}`,
                    key: competency.key,
                    name: competency.name,
                  }
                : null
            })
            .filter(Boolean)

          return competencies.length > 0
            ? {
                areaName: item.areaName,
                competencies,
                subject: item.subject,
              }
            : null
        })
        .filter(Boolean)
      const modifiedCount = subjects.reduce((total, subject) => total + subject.competencies.length, 0)

      return {
        modifiedCount,
        percentage: totalCompetencies > 0 ? Math.round((modifiedCount / totalCompetencies) * 100) : 0,
        student,
        subjectCount: subjects.length,
        subjects,
      }
    })
    .filter((row) => row.modifiedCount > 0)
    .sort((a, b) => b.modifiedCount - a.modifiedCount || a.student.name.localeCompare(b.student.name, 'ca'))
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-'
  return `${Math.round(value)}%`
}

function isNotDeveloped(grade) {
  return grade === 'D' || grade === 'NA'
}

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (cleanValues.length === 0) return 0
  return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
}

const {
  analyzeCooperativeGroupSet,
  analyzeTutorialSeatingPlan,
  buildCooperativeGroups,
  buildStudentCooperativeProfile: getStudentCooperativeProfile,
  enrichCooperativeGroups,
  isInfluentialSeatingProfile,
  isSupportiveSeatingProfile,
  isVulnerableSeatingProfile,
  moveCooperativeMemberToGroup,
  relationBetween,
  summarizeCooperativePair,
  swapCooperativeMembers,
} = createCooperativeSociometricHelpers({
  getRelationInfluence,
  getRelationTypeMeta,
})

function getGradeFromAverageScore(score) {
  if (!score) return ''
  if (score >= 3.5) return 'A'
  if (score >= 2.5) return 'B'
  if (score >= 1.5) return 'C'
  return 'D'
}

function formatAverageGrade(score) {
  return getGradeFromAverageScore(score) || '-'
}

function summarizeTutorialData({
  areaFilter = 'all',
  classId,
  evaluationContext,
  students,
  subjectFilter = 'all',
  tutorialMarks,
}) {
  const subjectOptions = getAllTutorialSubjectOptions().filter(
    (option) =>
      (areaFilter === 'all' || option.areaId === areaFilter) &&
      (subjectFilter === 'all' || option.subject === subjectFilter),
  )
  const areaBuckets = new Map()
  const subjectBuckets = new Map()
  const trajectoryBuckets = new Map()
  const studentProfiles = students.map((student) => {
    const evaluatedCompetencies = []

    subjectOptions.forEach((subjectOption) => {
      buildTutorialCompetencies(subjectOption.subject).forEach((competency) => {
        const gradeSource = getTutorialCompetencyGradeSource({
          classId,
          competency,
          evaluationContext,
          student,
          studentId: student.id,
          subject: subjectOption.subject,
          tutorialMarks,
        })
        const grade = gradeSource.value
        if (!grade) return

        const score = getNumericFromGrade(grade)
        const row = {
          areaId: subjectOption.areaId,
          areaName: subjectOption.areaName,
          subject: subjectOption.subject,
          competencyName: competency.name,
          grade,
          score,
          sourceLabel: gradeSource.utName || 'Dades manuals',
          sourceOrder: Number.isFinite(gradeSource.utOrder) ? gradeSource.utOrder : 999,
          trackingSummary: gradeSource.trackingSummary || null,
          notDeveloped: isNotDeveloped(grade),
        }
        evaluatedCompetencies.push(row)

        const trajectoryKey = row.sourceLabel
        const trajectoryBucket = trajectoryBuckets.get(trajectoryKey) || {
          label: row.sourceLabel,
          order: row.sourceOrder,
          scores: [],
        }
        trajectoryBucket.scores.push(score)
        trajectoryBuckets.set(trajectoryKey, trajectoryBucket)

        const areaBucket = areaBuckets.get(subjectOption.areaId) || {
          id: subjectOption.areaId,
          name: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        areaBucket.scores.push(score)
        areaBucket.notDeveloped += row.notDeveloped ? 1 : 0
        areaBucket.evaluated += 1
        areaBuckets.set(subjectOption.areaId, areaBucket)

        const subjectBucket = subjectBuckets.get(subjectOption.subject) || {
          subject: subjectOption.subject,
          areaName: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        subjectBucket.scores.push(score)
        subjectBucket.notDeveloped += row.notDeveloped ? 1 : 0
        subjectBucket.evaluated += 1
        subjectBuckets.set(subjectOption.subject, subjectBucket)
      })
    })

    const notDevelopedCount = evaluatedCompetencies.filter((item) => item.notDeveloped).length
    const averageScore = average(evaluatedCompetencies.map((item) => item.score))
    const notDevelopedPercent =
      evaluatedCompetencies.length > 0 ? (notDevelopedCount / evaluatedCompetencies.length) * 100 : 0
    const weakestAreas = Object.values(
      evaluatedCompetencies.reduce((areas, item) => {
        const current = areas[item.areaId] || { name: item.areaName, scores: [], notDeveloped: 0, evaluated: 0 }
        current.scores.push(item.score)
        current.notDeveloped += item.notDeveloped ? 1 : 0
        current.evaluated += 1
        return { ...areas, [item.areaId]: current }
      }, {}),
    )
      .map((area) => ({ ...area, averageScore: average(area.scores) }))
      .sort((a, b) => a.averageScore - b.averageScore || b.notDeveloped - a.notDeveloped)

    return {
      student,
      evaluatedCompetencies,
      evaluatedCount: evaluatedCompetencies.length,
      notDevelopedCount,
      notDevelopedPercent,
      averageScore,
      weakestArea: weakestAreas[0] || null,
    }
  })

  const evaluatedCount = studentProfiles.reduce((total, profile) => total + profile.evaluatedCount, 0)
  const notDevelopedCount = studentProfiles.reduce((total, profile) => total + profile.notDevelopedCount, 0)
  const riskProfiles = studentProfiles
    .filter(
      (profile) =>
        profile.evaluatedCount > 0 &&
        (profile.notDevelopedPercent >= 30 || profile.notDevelopedCount >= 2 || profile.averageScore <= 2),
    )
    .sort(
      (a, b) =>
        b.notDevelopedPercent - a.notDevelopedPercent ||
        b.notDevelopedCount - a.notDevelopedCount ||
        a.student.name.localeCompare(b.student.name, 'ca'),
    )
  const areaSummaries = [...areaBuckets.values()]
    .map((area) => ({
      ...area,
      averageScore: average(area.scores),
      averageGrade: formatAverageGrade(average(area.scores)),
      notDevelopedPercent: area.evaluated > 0 ? (area.notDeveloped / area.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)
  const subjectSummaries = [...subjectBuckets.values()]
    .map((subject) => ({
      ...subject,
      averageScore: average(subject.scores),
      averageGrade: formatAverageGrade(average(subject.scores)),
      notDevelopedPercent: subject.evaluated > 0 ? (subject.notDeveloped / subject.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)

  const globalGradeCounts = { A: 0, B: 0, C: 0, D: 0, NA: 0 }
  studentProfiles.forEach((profile) => {
    profile.evaluatedCompetencies.forEach((item) => {
      if (globalGradeCounts[item.grade] !== undefined) globalGradeCounts[item.grade] += 1
    })
  })

  return {
    evaluatedCount,
    globalAverageGrade: formatAverageGrade(average(studentProfiles.map((profile) => profile.averageScore))),
    globalGradeCounts,
    notDevelopedCount,
    notDevelopedPercent: evaluatedCount > 0 ? (notDevelopedCount / evaluatedCount) * 100 : 0,
    studentProfiles,
    riskProfiles,
    areaSummaries,
    subjectSummaries,
    trajectory: [...trajectoryBuckets.values()]
      .map((bucket) => ({
        ...bucket,
        averageScore: average(bucket.scores),
        averageGrade: formatAverageGrade(average(bucket.scores)),
      }))
      .filter((bucket) => bucket.averageScore > 0)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ca'))
      .slice(-4),
    weakestArea: areaSummaries[0] || null,
    weakestSubject: subjectSummaries[0] || null,
  }
}

function summarizeTutorialRecords({ students, records }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const studentRows = students
    .map((student) => {
      const studentRecords = records.filter((record) => record.studentId === student.id)
      return {
        student,
        records: studentRecords,
        total: studentRecords.length,
        agenda: countByType(studentRecords, 'agenda'),
        incident: countByType(studentRecords, 'incident'),
        classroomExpulsion: countByType(studentRecords, 'classroom-expulsion'),
        centerExpulsion: countByType(studentRecords, 'center-expulsion'),
        doip: countByType(studentRecords, 'doip'),
      }
    })
    .sort((a, b) => b.total - a.total || a.student.name.localeCompare(b.student.name, 'ca'))

  const recentRecords = [...records]
    .sort((a, b) => {
      const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })
    .slice(0, 8)
    .map((record) => ({
      ...record,
      student: studentsById.get(record.studentId),
      typeMeta: getRecordTypeMeta(record.type),
    }))

  return {
    studentRows,
    recentRecords,
    studentsWithoutDoip: studentRows.filter((row) => row.doip === 0),
    studentsWithRecords: studentRows.filter((row) => row.total > 0),
  }
}

function summarizeTutorialRelations({ relations, students }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const studentRows = students
    .map((student) => {
      const outgoing = relations.filter((relation) => relation.sourceStudentId === student.id)
      const incoming = relations.filter((relation) => relation.targetStudentId === student.id)
      const supportiveCount = getWeightedRelationCount(
        [...outgoing, ...incoming].filter((relation) => relation.type === 'positive' || relation.type === 'friendship'),
      )
      const avoidCount = getWeightedRelationCount(
        [...outgoing, ...incoming].filter((relation) => relation.type === 'avoid'),
      )

      return {
        student,
        socialPositiveCount: getWeightedRelationCount(
          [...outgoing, ...incoming].filter((relation) => relation.type === 'friendship'),
        ),
        incoming,
        outgoing,
        supportiveCount,
        workPositiveCount: getWeightedRelationCount(
          [...outgoing, ...incoming].filter((relation) => relation.type === 'positive'),
        ),
        avoidCount,
        total: outgoing.length + incoming.length,
      }
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ca'))
  const reciprocalPairs = new Set()

  relations
    .filter((relation) => relation.type === 'positive' || relation.type === 'friendship')
    .forEach((relation) => {
      const hasReverse = relations.some(
        (candidate) =>
          candidate.sourceStudentId === relation.targetStudentId &&
          candidate.targetStudentId === relation.sourceStudentId &&
          (candidate.type === 'positive' || candidate.type === 'friendship'),
      )
      if (!hasReverse) return
      reciprocalPairs.add([relation.sourceStudentId, relation.targetStudentId].sort().join('__'))
    })

  const enrichedRelations = relations
    .map((relation) => ({
      ...relation,
      sourceStudent: studentsById.get(relation.sourceStudentId),
      targetStudent: studentsById.get(relation.targetStudentId),
      typeMeta: getRelationTypeMeta(relation.type),
    }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))

  return {
    avoidCount: relations.filter((relation) => relation.type === 'avoid').length,
    bridgeStudent: studentRows.find((row) => row.supportiveCount > 0)?.student || null,
    enrichedRelations,
    isolatedStudents: studentRows.filter((row) => row.total === 0).map((row) => row.student),
    positiveCount: relations.filter((relation) => relation.type === 'positive' || relation.type === 'friendship').length,
    reciprocalCount: reciprocalPairs.size,
    socialPositiveCount: relations.filter((relation) => relation.type === 'friendship').length,
    studentRows,
    workPositiveCount: relations.filter((relation) => relation.type === 'positive').length,
  }
}

function normalizeSociometricName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function splitSociometricRow(line) {
  const cleanLine = String(line || '').trim()
  if (!cleanLine) return []
  if (cleanLine.includes('\t')) return cleanLine.split('\t').map((cell) => cell.trim())
  if (cleanLine.includes(';')) return cleanLine.split(';').map((cell) => cell.trim())
  return [cleanLine]
}

function isSociometricHeader(cells) {
  const normalized = cells.map((cell) => normalizeSociometricName(cell))
  return normalized.some((cell) => ['alumne', 'alumna', 'nom', 'nom alumne', 'respondent'].includes(cell))
}

function getSociometricColumnIndexes(headerCells) {
  const normalizedHeaders = headerCells.map((cell) => normalizeSociometricName(cell))
  const respondentIndex = Math.max(
    0,
    normalizedHeaders.findIndex(
      (header) =>
        header === 'alumne' ||
        header === 'alumna' ||
        header === 'nom' ||
        header.includes('nom alumne') ||
        header.includes('responent') ||
        header.includes('respondent'),
    ),
  )
  const avoidIndexes = normalizedHeaders
    .map((header, index) => ({ header, index }))
    .filter(
      ({ header, index }) =>
        index !== respondentIndex &&
        (header.includes('rebuig') ||
          header.includes('rechaz') ||
          header.includes('evitar') ||
          header.includes('no anir') ||
          header.includes('no t agrad')),
    )
    .map(({ index }) => index)
  const positiveIndexes = normalizedHeaders
    .map((header, index) => ({ header, index }))
    .filter(
      ({ header, index }) =>
        index !== respondentIndex &&
        !avoidIndexes.includes(index) &&
        (header.includes('eleccio') ||
          header.includes('elegir') ||
          header.includes('tria') ||
          header.includes('agrad') ||
          header.includes('pati') ||
          header.includes('posit')),
    )
    .map(({ index }) => index)

  return {
    avoidIndexes:
      avoidIndexes.length > 0
        ? avoidIndexes.slice(0, SOCIOMETRIC_AVOID_LIMIT)
        : Array.from({ length: SOCIOMETRIC_AVOID_LIMIT }, (_, index) => respondentIndex + 1 + SOCIOMETRIC_POSITIVE_LIMIT + index),
    positiveIndexes:
      positiveIndexes.length > 0
        ? positiveIndexes.slice(0, SOCIOMETRIC_POSITIVE_LIMIT)
        : Array.from({ length: SOCIOMETRIC_POSITIVE_LIMIT }, (_, index) => respondentIndex + 1 + index),
    respondentIndex,
  }
}

function matchSociometricStudent(rawName, students) {
  const normalizedName = normalizeSociometricName(rawName)
  if (!normalizedName) return { issue: 'empty', student: null }

  const exactMatch = students.find((student) => normalizeSociometricName(student.name) === normalizedName)
  if (exactMatch) return { issue: '', student: exactMatch }

  const candidates = students.filter((student) => {
    const studentName = normalizeSociometricName(student.name)
    if (!studentName) return false
    return (
      studentName.includes(normalizedName) ||
      normalizedName.includes(studentName) ||
      normalizedName
        .split(' ')
        .filter((part) => part.length >= 3)
        .every((part) => studentName.includes(part))
    )
  })

  if (candidates.length === 1) return { issue: 'approximate', student: candidates[0] }
  if (candidates.length > 1) return { issue: 'ambiguous', student: null }

  return { issue: 'missing', student: null }
}

function parseSociometricResponseText(rawText, students) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return {
      avoidCount: 0,
      issues: [],
      matchedResponses: 0,
      positiveCount: 0,
      relations: [],
      responsesCount: 0,
    }
  }

  const firstCells = splitSociometricRow(lines[0])
  const hasHeader = isSociometricHeader(firstCells)
  const indexes = hasHeader
    ? getSociometricColumnIndexes(firstCells)
    : {
        avoidIndexes: Array.from({ length: SOCIOMETRIC_AVOID_LIMIT }, (_, index) => 1 + SOCIOMETRIC_POSITIVE_LIMIT + index),
        positiveIndexes: Array.from({ length: SOCIOMETRIC_POSITIVE_LIMIT }, (_, index) => 1 + index),
        respondentIndex: 0,
      }
  const dataLines = hasHeader ? lines.slice(1) : lines
  const now = new Date().toISOString()
  const importedLabel = `Qüestionari sociomètric · ${formatShortDate(getTodayDateInput())}`
  const issues = []
  const relationByKey = new Map()
  let matchedResponses = 0

  dataLines.forEach((line, lineIndex) => {
    const rowNumber = lineIndex + (hasHeader ? 2 : 1)
    const cells = splitSociometricRow(line)
    const sourceName = cells[indexes.respondentIndex] || ''
    const sourceMatch = matchSociometricStudent(sourceName, students)
    if (!sourceMatch.student) {
      issues.push({
        detail: sourceName || 'Fila sense nom',
        label:
          sourceMatch.issue === 'ambiguous'
            ? 'Nom ambigu'
            : sourceMatch.issue === 'empty'
              ? 'Fila sense alumne'
              : 'Alumne no trobat',
        rowNumber,
      })
      return
    }

    matchedResponses += 1
    if (sourceMatch.issue === 'approximate') {
      issues.push({
        detail: `${sourceName} → ${sourceMatch.student.name}`,
        label: 'Coincidència aproximada',
        rowNumber,
      })
    }

    const addChoice = (targetName, type) => {
      const cleanTargetName = String(targetName || '').trim()
      if (!cleanTargetName) return
      const targetMatch = matchSociometricStudent(cleanTargetName, students)
      if (!targetMatch.student) {
        issues.push({
          detail: cleanTargetName,
          label: targetMatch.issue === 'ambiguous' ? 'Destinatari ambigu' : 'Destinatari no trobat',
          rowNumber,
        })
        return
      }
      if (targetMatch.student.id === sourceMatch.student.id) {
        issues.push({
          detail: cleanTargetName,
          label: 'Un alumne no es pot triar a si mateix',
          rowNumber,
        })
        return
      }

      const pairKey = `${sourceMatch.student.id}__${targetMatch.student.id}`
      const relationKey = `${pairKey}__${type}`
      const oppositeKey = `${pairKey}__${type === 'avoid' ? 'friendship' : 'avoid'}`
      if (relationByKey.has(oppositeKey)) {
        if (type !== 'avoid') {
          issues.push({
            detail: `${sourceMatch.student.name} → ${targetMatch.student.name}`,
            label: 'Ja constava com a rebuig; no s’importa l’elecció',
            rowNumber,
          })
          return
        }
        relationByKey.delete(oppositeKey)
        issues.push({
          detail: `${sourceMatch.student.name} → ${targetMatch.student.name}`,
          label: 'Triat en positiu i en rebuig; es conserva el rebuig',
          rowNumber,
        })
      }
      relationByKey.set(relationKey, {
        classId: '',
        createdAt: now,
        importedAt: now,
        note: importedLabel,
        source: 'sociometric-questionnaire',
        sourceLabel: importedLabel,
        sourceStudentId: sourceMatch.student.id,
        strength: 2,
        targetStudentId: targetMatch.student.id,
        type,
      })
    }

    indexes.positiveIndexes.forEach((index) => addChoice(cells[index], 'friendship'))
    indexes.avoidIndexes.forEach((index) => addChoice(cells[index], 'avoid'))
  })

  const relations = [...relationByKey.values()]
  return {
    avoidCount: relations.filter((relation) => relation.type === 'avoid').length,
    issues,
    matchedResponses,
    positiveCount: relations.filter((relation) => relation.type === 'friendship').length,
    relations,
    responsesCount: dataLines.length,
  }
}

function summarizeSociometricMetrics({ relations, students }) {
  const positiveRelations = relations.filter((relation) => relation.type === 'friendship')
  const avoidRelations = relations.filter(
    (relation) => relation.type === 'avoid' && isSociometricSocialRelation(relation),
  )
  const workRelations = relations.filter((relation) => relation.type === 'positive')
  const possibleDirected = students.length * Math.max(0, students.length - 1)
  const reciprocalPairs = new Set()

  positiveRelations.forEach((relation) => {
    const hasReverse = positiveRelations.some(
      (candidate) =>
        candidate.sourceStudentId === relation.targetStudentId && candidate.targetStudentId === relation.sourceStudentId,
    )
    if (hasReverse) reciprocalPairs.add([relation.sourceStudentId, relation.targetStudentId].sort().join('__'))
  })

  const rows = students.map((student) => {
    const positiveReceived = getWeightedRelationCount(
      positiveRelations.filter((relation) => relation.targetStudentId === student.id),
    )
    const positiveGiven = getWeightedRelationCount(
      positiveRelations.filter((relation) => relation.sourceStudentId === student.id),
    )
    const avoidReceived = getWeightedRelationCount(
      avoidRelations.filter((relation) => relation.targetStudentId === student.id),
    )
    const avoidGiven = getWeightedRelationCount(
      avoidRelations.filter((relation) => relation.sourceStudentId === student.id),
    )
    return { avoidGiven, avoidReceived, positiveGiven, positiveReceived, student }
  })
  const positiveReceivedValues = rows.map((row) => row.positiveReceived).sort((a, b) => a - b)
  const avoidReceivedValues = rows.map((row) => row.avoidReceived).sort((a, b) => a - b)
  const p15 = getPercentile(positiveReceivedValues, 0.15)
  const p40 = getPercentile(positiveReceivedValues, 0.4)
  const p60Avoid = getPercentile(avoidReceivedValues, 0.6)
  const p75Avoid = getPercentile(avoidReceivedValues, 0.75)
  const p85 = getPercentile(positiveReceivedValues, 0.85)

  const classifiedRows = rows.map((row) => {
    const { avoidGiven, avoidReceived, positiveGiven, positiveReceived, student } = row
    const category = getSociometricCategory({
      avoidReceived,
      p15,
      p40,
      p60Avoid,
      p75Avoid,
      p85,
      positiveGiven,
      positiveReceived,
    })

    const categoryMeta = SOCIOMETRIC_CATEGORY_META[category] || SOCIOMETRIC_CATEGORY_META.Promig
    const nodeSizeClass = positiveReceived >= Math.max(1, p85) ? 'node-large' : positiveReceived >= Math.max(1, p40) ? 'node-medium' : 'node-small'
    return { avoidGiven, avoidReceived, category, categoryMeta, nodeSizeClass, positiveGiven, positiveReceived, student }
  })
  const categoryCounts = ['Líder', 'Acceptat', 'Promig', 'Controvertit', 'Aïllat', 'Rebutjat'].map((category) => ({
    category,
    count: classifiedRows.filter((row) => row.category === category).length,
  }))
  const socialComponentMap = getPositiveComponentMap(students, positiveRelations)
  const subgroupCount = new Set(socialComponentMap.values()).size
  const meaningfulSubgroupCount = Math.max(
    0,
    [...new Set(socialComponentMap.values())].filter(
      (componentKey) => componentKey.split('__').filter(Boolean).length >= 2,
    ).length,
  )

  return {
    categoryCounts,
    density:
      possibleDirected > 0
        ? Math.round(((getWeightedRelationCount(positiveRelations) + getWeightedRelationCount(avoidRelations)) / possibleDirected) * 100)
        : 0,
    inclusion:
      students.length > 0
        ? Math.round((classifiedRows.filter((row) => row.positiveGiven + row.positiveReceived > 0).length / students.length) * 100)
        : 0,
    moreno: students.length > 1 ? Math.round((reciprocalPairs.size / (students.length * (students.length - 1) / 2)) * 100) : 0,
    reciprocalPairCount: reciprocalPairs.size,
    rejectionDensity: possibleDirected > 0 ? Math.round((getWeightedRelationCount(avoidRelations) / possibleDirected) * 100) : 0,
    socialRelationCount: positiveRelations.length,
    subgroupCount,
    meaningfulSubgroupCount,
    workRelationCount: workRelations.length,
    positivity:
      positiveRelations.length + avoidRelations.length > 0
        ? Math.round(
            (getWeightedRelationCount(positiveRelations) /
              (getWeightedRelationCount(positiveRelations) + getWeightedRelationCount(avoidRelations))) *
              100,
          )
        : 0,
    rows: classifiedRows,
  }
}

function getSociometricRelationTimestamp(relation) {
  return relation?.importedAt || relation?.createdAt || relation?.updatedAt || ''
}

function getSociometricRelationsUntil(relations, cutoffValue) {
  if (!cutoffValue || cutoffValue === 'current') return relations
  return relations.filter((relation) => {
    const timestamp = getSociometricRelationTimestamp(relation)
    return timestamp && timestamp <= cutoffValue
  })
}

function getSociometricComparisonOptionTimestamp(value, momentsById) {
  if (!value || value === 'current') return 'current'
  if (String(value).startsWith('moment:')) {
    const moment = momentsById.get(String(value).slice('moment:'.length))
    return moment?.capturedAt || ''
  }
  if (String(value).startsWith('legacy:')) return String(value).slice('legacy:'.length)
  return String(value)
}

function getSociometricComparisonRelations({ currentRelations, momentsById, value }) {
  if (!value || value === 'current') return currentRelations
  if (String(value).startsWith('moment:')) {
    const moment = momentsById.get(String(value).slice('moment:'.length))
    return moment?.relationsSnapshot || []
  }
  if (String(value).startsWith('legacy:')) {
    return getSociometricRelationsUntil(currentRelations, String(value).slice('legacy:'.length))
  }
  return getSociometricRelationsUntil(currentRelations, value)
}

function getSociometricComparisonTone(delta, inverse = false) {
  if (delta === 0) return 'neutral'
  const isPositive = inverse ? delta < 0 : delta > 0
  return isPositive ? 'positive' : 'danger'
}

function getSociometricCategoryRisk(category) {
  if (category === 'Rebutjat') return 3
  if (category === 'Aïllat') return 2
  if (category === 'Controvertit') return 1
  return 0
}

function buildSociometricComparisonReport({ endMetrics, startMetrics, students }) {
  const startRowsByStudentId = new Map((startMetrics.rows || []).map((row) => [row.student.id, row]))
  const endRowsByStudentId = new Map((endMetrics.rows || []).map((row) => [row.student.id, row]))
  const metricRows = [
    {
      description: 'Relacions registrades respecte al màxim possible.',
      end: endMetrics.density,
      inverse: false,
      label: 'Cohesió',
      start: startMetrics.density,
      suffix: '%',
    },
    {
      description: 'Alumnes amb almenys una relació positiva.',
      end: endMetrics.inclusion,
      inverse: false,
      label: 'Inclusió',
      start: startMetrics.inclusion,
      suffix: '%',
    },
    {
      description: 'Pes de les positives respecte als rebuigs.',
      end: endMetrics.positivity,
      inverse: false,
      label: 'Positivitat',
      start: startMetrics.positivity,
      suffix: '%',
    },
    {
      description: 'Vincles de rebuig o a evitar.',
      end: endMetrics.rejectionDensity,
      inverse: true,
      label: 'Rebuig',
      start: startMetrics.rejectionDensity,
      suffix: '%',
    },
    {
      description: 'Parelles positives mútues.',
      end: endMetrics.reciprocalPairCount,
      inverse: false,
      label: 'Reciprocitat',
      start: startMetrics.reciprocalPairCount,
      suffix: '',
    },
    {
      description: 'Relacions de treball registrades pel docent.',
      end: endMetrics.workRelationCount,
      inverse: false,
      label: 'Treball',
      start: startMetrics.workRelationCount,
      suffix: '',
    },
  ].map((metric) => {
    const delta = metric.end - metric.start
    return {
      ...metric,
      delta,
      tone: getSociometricComparisonTone(delta, metric.inverse),
    }
  })

  const studentChanges = students
    .map((student) => {
      const startRow = startRowsByStudentId.get(student.id)
      const endRow = endRowsByStudentId.get(student.id)
      const startRisk = getSociometricCategoryRisk(startRow?.category)
      const endRisk = getSociometricCategoryRisk(endRow?.category)
      const positiveDelta = (endRow?.positiveReceived || 0) - (startRow?.positiveReceived || 0)
      const rejectionDelta = (endRow?.avoidReceived || 0) - (startRow?.avoidReceived || 0)
      const riskDelta = endRisk - startRisk

      return {
        endCategory: endRow?.category || 'Sense dades',
        positiveDelta,
        rejectionDelta,
        riskDelta,
        startCategory: startRow?.category || 'Sense dades',
        student,
      }
    })
    .filter((item) => item.riskDelta !== 0 || item.positiveDelta !== 0 || item.rejectionDelta !== 0)

  const improvedStudents = studentChanges
    .filter((item) => item.riskDelta < 0 || item.positiveDelta > 0 || item.rejectionDelta < 0)
    .sort((a, b) => a.riskDelta - b.riskDelta || b.positiveDelta - a.positiveDelta || a.rejectionDelta - b.rejectionDelta)
  const worsenedStudents = studentChanges
    .filter((item) => item.riskDelta > 0 || item.rejectionDelta > 0)
    .sort((a, b) => b.riskDelta - a.riskDelta || b.rejectionDelta - a.rejectionDelta || a.positiveDelta - b.positiveDelta)
  const newLeaders = students
    .map((student) => ({
      endCategory: endRowsByStudentId.get(student.id)?.category,
      startCategory: startRowsByStudentId.get(student.id)?.category,
      student,
    }))
    .filter((item) => item.endCategory === 'Líder' && item.startCategory !== 'Líder')
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ca'))
  const resolvedPriorityStudents = students
    .map((student) => ({
      endCategory: endRowsByStudentId.get(student.id)?.category,
      startCategory: startRowsByStudentId.get(student.id)?.category,
      student,
    }))
    .filter(
      (item) =>
        ['Rebutjat', 'Aïllat', 'Controvertit'].includes(item.startCategory) &&
        !['Rebutjat', 'Aïllat', 'Controvertit'].includes(item.endCategory),
    )
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ca'))
  const densityDelta = endMetrics.density - startMetrics.density
  const rejectionDelta = endMetrics.rejectionDensity - startMetrics.rejectionDensity
  const inclusionDelta = endMetrics.inclusion - startMetrics.inclusion

  let summary = 'El grup no mostra canvis sociomètrics rellevants entre els dos moments seleccionats.'
  if (densityDelta > 0 && rejectionDelta <= 0) {
    summary = 'El grup mostra una evolució positiva: augmenta la connexió i el rebuig no creix.'
  } else if (inclusionDelta > 0) {
    summary = 'La millora principal és la inclusió: més alumnes entren dins la xarxa positiva.'
  } else if (rejectionDelta > 0) {
    summary = 'La comparativa alerta d’un augment del rebuig; convé revisar contextos i agrupaments.'
  } else if (densityDelta < 0) {
    summary = 'La xarxa sembla més feble que al moment inicial; cal reforçar vincles segurs i activitats cooperatives.'
  }

  const actions = [
    rejectionDelta > 0
      ? 'Revisar quins agrupaments o situacions han coincidit amb l’augment de rebuig.'
      : 'Mantenir les mesures que han evitat que el rebuig augmenti.',
    inclusionDelta > 0
      ? 'Identificar quines activitats han ajudat a incloure més alumnes i repetir-ne l’estructura.'
      : 'Planificar una activitat pont per als alumnes que encara no guanyen connexions positives.',
    resolvedPriorityStudents.length > 0
      ? `Consolidar la millora de ${resolvedPriorityStudents[0].student.name} sense exposar-lo com a cas especial.`
      : 'Fer una nova presa de dades després de dues o tres setmanes d’intervenció.',
  ]

  return {
    actions,
    improvedStudents,
    metricRows,
    newLeaders,
    resolvedPriorityStudents,
    summary,
    worsenedStudents,
  }
}

function normalizeImpactTimestamp(value) {
  if (!value || value === 'current') return new Date().toISOString()
  return String(value)
}

function isTimestampWithinImpactWindow(timestamp, startTimestamp, endTimestamp) {
  if (!timestamp) return false
  const start = normalizeImpactTimestamp(startTimestamp)
  const end = normalizeImpactTimestamp(endTimestamp)
  return String(timestamp) > start && String(timestamp) <= end
}

function buildSociometricImpactReport({
  comparisonReport,
  endTimestamp,
  groupSets,
  relations,
  seatingPlans,
  startTimestamp,
  tutorialRecords,
}) {
  const interventions = [
    ...(groupSets || [])
      .filter((groupSet) => isTimestampWithinImpactWindow(groupSet.updatedAt || groupSet.createdAt, startTimestamp, endTimestamp))
      .map((groupSet) => ({
        date: groupSet.updatedAt || groupSet.createdAt,
        detail: `${groupSet.groups?.length || 0} grups · ${groupSet.strategy || 'balanced'}`,
        title: groupSet.name || 'Grups cooperatius guardats',
        type: 'groups',
      })),
    ...(seatingPlans || [])
      .filter((plan) => isTimestampWithinImpactWindow(plan.updatedAt || plan.createdAt, startTimestamp, endTimestamp))
      .map((plan) => ({
        date: plan.updatedAt || plan.createdAt,
        detail: `${plan.seats?.length || 0} llocs assignats`,
        title: plan.title || 'Disposició d’aula guardada',
        type: 'seating',
      })),
  ]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 6)

  const teacherObservationRelations = (relations || []).filter(
    (relation) =>
      relation.source === TEACHER_OBSERVATION_RELATION_SOURCE &&
      isTimestampWithinImpactWindow(relation.updatedAt || relation.createdAt, startTimestamp, endTimestamp),
  )
  const tutorialRecordsInWindow = (tutorialRecords || []).filter((record) =>
    isTimestampWithinImpactWindow(record.updatedAt || record.createdAt || record.date, startTimestamp, endTimestamp),
  )

  const metricByLabel = new Map((comparisonReport.metricRows || []).map((metric) => [metric.label, metric]))
  const inclusionDelta = metricByLabel.get('Inclusió')?.delta || 0
  const rejectionDelta = metricByLabel.get('Rebuig')?.delta || 0
  const workDelta = metricByLabel.get('Treball')?.delta || 0

  const signals = []

  if (interventions.length === 0 && teacherObservationRelations.length === 0 && tutorialRecordsInWindow.length === 0) {
    signals.push({
      tone: 'neutral',
      title: 'No hi ha intervencions guardades entre els dos moments',
      text: 'La comparativa mostra el canvi del grup, però encara no pot relacionar-lo amb una acció registrada a Avaluapro.',
    })
  }

  if (interventions.some((item) => item.type === 'groups')) {
    signals.push({
      tone: inclusionDelta > 0 ? 'positive' : inclusionDelta < 0 ? 'warning' : 'neutral',
      title: 'Agrupaments cooperatius i inclusió',
      text:
        inclusionDelta > 0
          ? 'Després de guardar nous grups cooperatius, la inclusió puja. Val la pena revisar què ha funcionat i repetir l’estructura.'
          : inclusionDelta < 0
            ? 'Tot i haver guardat agrupaments, la inclusió no millora. Potser cal ajustar parelles pont o repartir millor els suports.'
            : 'Hi ha hagut agrupaments nous, però la inclusió global es manté força estable.',
    })
  }

  if (interventions.some((item) => item.type === 'seating')) {
    signals.push({
      tone: rejectionDelta < 0 ? 'positive' : rejectionDelta > 0 ? 'warning' : 'neutral',
      title: 'Disposició d’aula i rebuig',
      text:
        rejectionDelta < 0
          ? 'La disposició d’aula coincideix amb una baixada del rebuig. Sembla una línia prometedora per consolidar.'
          : rejectionDelta > 0
            ? 'Hi ha una disposició guardada, però el rebuig puja. Convé revisar proximitats i incompatibilitats.'
            : 'La disposició d’aula no sembla haver mogut el nivell de rebuig de manera clara.',
    })
  }

  if (teacherObservationRelations.length > 0) {
    signals.push({
      tone: workDelta > 0 ? 'positive' : 'neutral',
      title: 'Observacions docents i mapa de treball',
      text:
        workDelta > 0
          ? `S’han registrat ${teacherObservationRelations.length} observació/ns docents i també creixen les relacions de treball útils.`
          : `S’han registrat ${teacherObservationRelations.length} observació/ns docents. Encara cal més recorregut per veure impacte clar al mapa de treball.`,
    })
  }

  if (tutorialRecordsInWindow.length > 0 && comparisonReport.worsenedStudents.length > 0) {
    signals.push({
      tone: 'warning',
      title: 'Canvis socials a contrastar amb el seguiment tutorial',
      text: `Hi ha ${tutorialRecordsInWindow.length} registre/s tutorials en aquest període i també alumnes que empitjoren. Val la pena mirar si coincideixen contextos o moments d’aula.`,
    })
  }

  if (comparisonReport.resolvedPriorityStudents.length > 0) {
    signals.push({
      tone: 'positive',
      title: 'Hi ha prioritats que surten de zona sensible',
      text: `${comparisonReport.resolvedPriorityStudents.length} alumne/s deixen categories de més risc. Convindria mantenir les condicions que han ajudat aquesta millora.`,
    })
  }

  return {
    interventions,
    observationCount: teacherObservationRelations.length,
    recordCount: tutorialRecordsInWindow.length,
    signals: signals.slice(0, 5),
  }
}

function clampSociogramPosition(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(max, Math.max(min, numericValue))
}

function getSociogramPosition(studentId, fallback, positionsByStudentId) {
  const customPosition = positionsByStudentId?.get(studentId)
  if (!customPosition) return fallback

  return {
    x: clampSociogramPosition(customPosition.x, 6, 94, fallback.x),
    y: clampSociogramPosition(customPosition.y, 8, 92, fallback.y),
  }
}

function getSociogramRingDefinitions(sociometricRows) {
  const order = ['leader', 'average', 'accepted', 'controversial', 'isolated', 'rejected']
  const labels = {
    accepted: 'Acceptats',
    average: 'Promig',
    controversial: 'Controvertits',
    isolated: 'Aïllats',
    leader: 'Líders',
    rejected: 'Rebutjats',
  }
  const occupied = order.filter((categoryId) =>
    sociometricRows.some((row) => (row.categoryMeta?.id || 'average') === categoryId),
  )
  const radiusByCategory = {
    accepted: { x: 31, y: 22 },
    average: { x: 20, y: 14 },
    controversial: { x: 39, y: 29 },
    isolated: { x: 46, y: 34 },
    leader: { x: 10, y: 7 },
    rejected: { x: 49, y: 38 },
  }

  return occupied.map((categoryId) => ({
    categoryId,
    label: labels[categoryId] || categoryId,
    xRadius: occupied.length <= 1 ? 0 : radiusByCategory[categoryId]?.x || 36,
    yRadius: occupied.length <= 1 ? 0 : radiusByCategory[categoryId]?.y || 26,
  }))
}

function getSociogramNodeRadiusPercent(node) {
  if (node?.nodeSizeClass === 'node-large') return 2.6
  if (node?.nodeSizeClass === 'node-small') return 1.75
  return 2.1
}

function getSociogramLinkEndpoint(source, target) {
  const deltaX = target.x - source.x
  const deltaY = target.y - source.y
  const distance = Math.hypot(deltaX, deltaY)
  if (!distance) return { x: target.x, y: target.y }
  const offset = getSociogramNodeRadiusPercent(target) + 0.8
  return {
    x: target.x - (deltaX / distance) * offset,
    y: target.y - (deltaY / distance) * offset,
  }
}

function getPositiveComponentMap(students, relations) {
  const adjacency = new Map(students.map((student) => [student.id, new Set()]))
  relations
    .filter((relation) => relation.type === 'friendship' || relation.type === 'positive')
    .forEach((relation) => {
      adjacency.get(relation.sourceStudentId)?.add(relation.targetStudentId)
      adjacency.get(relation.targetStudentId)?.add(relation.sourceStudentId)
    })

  const componentByStudentId = new Map()
  const visited = new Set()
  students.forEach((student) => {
    if (visited.has(student.id)) return
    const stack = [student.id]
    const members = []
    visited.add(student.id)
    while (stack.length > 0) {
      const currentId = stack.pop()
      members.push(currentId)
      adjacency.get(currentId)?.forEach((nextId) => {
        if (visited.has(nextId)) return
        visited.add(nextId)
        stack.push(nextId)
      })
    }
    const componentKey = members.sort().join('__') || student.id
    members.forEach((memberId) => componentByStudentId.set(memberId, componentKey))
  })
  return componentByStudentId
}

function buildRadialSociogramNodes({ positionsByStudentId, relations, roleRowsByStudent, sociometricRows, studentRows, students }) {
  const rowsByStudentId = new Map(studentRows.map((row) => [row.student.id, row]))
  const sociometricRowsByStudentId = new Map(sociometricRows.map((row) => [row.student.id, row]))
  const componentByStudentId = getPositiveComponentMap(students, relations)
  const codeByStudentId = new Map(students.map((student) => [student.id, getSociogramShortCode(student.name)]))
  const rings = getSociogramRingDefinitions(sociometricRows)
  const nodes = []

  rings.forEach((ring) => {
    const ringStudents = students
      .filter((student) => (sociometricRowsByStudentId.get(student.id)?.categoryMeta?.id || 'average') === ring.categoryId)
      .sort((a, b) => {
        const componentCompare = String(componentByStudentId.get(a.id) || '').localeCompare(
          String(componentByStudentId.get(b.id) || ''),
          'ca',
        )
        if (componentCompare !== 0) return componentCompare
        const rowA = sociometricRowsByStudentId.get(a.id)
        const rowB = sociometricRowsByStudentId.get(b.id)
        const scoreA = (rowA?.positiveReceived || 0) - (rowA?.avoidReceived || 0)
        const scoreB = (rowB?.positiveReceived || 0) - (rowB?.avoidReceived || 0)
        if (scoreA !== scoreB) return scoreB - scoreA
        return a.name.localeCompare(b.name, 'ca')
      })

    ringStudents.forEach((student, index) => {
      const sociometricRow = sociometricRowsByStudentId.get(student.id)
      const total = ringStudents.length
      const isFullyIsolated =
        ring.categoryId === 'isolated' &&
        (sociometricRow?.positiveReceived || 0) === 0 &&
        (sociometricRow?.positiveGiven || 0) === 0 &&
        (sociometricRow?.avoidReceived || 0) === 0 &&
        (sociometricRow?.avoidGiven || 0) === 0
      const reservedOffset = isFullyIsolated ? 0.68 : 0
      const ringPhase = getStableUnitInterval(`${ring.categoryId}_${total}`) * 0.38
      const laneSpread =
        total >= 10 ? 3.2 : total >= 7 ? 2.4 : total >= 5 ? 1.6 : total >= 3 ? 0.9 : 0
      const laneDirection = total > 1 ? (index % 2 === 0 ? -1 : 1) : 0
      const laneOffsetX = laneDirection * laneSpread
      const laneOffsetY = laneDirection * Math.max(0.6, laneSpread * 0.72)
      const angle =
        -Math.PI / 2 +
        reservedOffset * Math.PI +
        ringPhase +
        ((index + getStableUnitInterval(student.id) * 0.2) / Math.max(1, total)) * Math.PI * 2
      const fallback = {
        x: 50 + Math.cos(angle) * (ring.xRadius + laneOffsetX),
        y: 50 + Math.sin(angle) * (ring.yRadius + laneOffsetY),
      }

      nodes.push({
        ...rowsByStudentId.get(student.id),
        id: student.id,
        code: codeByStudentId.get(student.id),
        initials: getSociogramInitials(student.name),
        isConflict: Boolean(roleRowsByStudent?.get(student.id)?.conflict),
        isStar: Boolean(roleRowsByStudent?.get(student.id)?.star),
        ring,
        student,
        ...getSociogramPosition(student.id, fallback, positionsByStudentId),
      })
    })
  })

  return { nodes, rings }
}

function buildTutorialSociogramMap({
  filter,
  onlyReciprocal,
  positionsByStudentId,
  relations,
  roleRowsByStudent,
  selectedStudentId,
  sociometricRows,
  studentRows,
  students,
}) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const selectedId = selectedStudentId || studentRows[0]?.student.id || students[0]?.id || ''
  const validRelations = relations.filter(
    (relation) => studentsById.has(relation.sourceStudentId) && studentsById.has(relation.targetStudentId),
  )
  const filteredRelations = validRelations.filter((relation) => {
    if (!studentsById.has(relation.sourceStudentId) || !studentsById.has(relation.targetStudentId)) return false
    if (onlyReciprocal && !isSociogramReciprocalRelation(relation, validRelations)) return false
    if (filter === 'social') return getSociogramRelationContext(relation) === 'social'
    if (filter === 'work') return getSociogramRelationContext(relation) === 'work'
    if (filter === 'avoid') return getRelationCategory(relation.type) === 'avoid'
    return true
  })
  const selectedRelationMetaByStudentId = new Map()
  filteredRelations.forEach((relation) => {
    if (relation.sourceStudentId !== selectedId && relation.targetStudentId !== selectedId) return
    const counterpartId = relation.sourceStudentId === selectedId ? relation.targetStudentId : relation.sourceStudentId
    const current = selectedRelationMetaByStudentId.get(counterpartId) || {
      avoid: false,
      incoming: 0,
      outgoing: 0,
      support: false,
    }
    if (relation.sourceStudentId === selectedId) current.outgoing += 1
    if (relation.targetStudentId === selectedId) current.incoming += 1
    if (relation.type === 'avoid') current.avoid = true
    if (relation.type === 'friendship' || relation.type === 'positive') current.support = true
    selectedRelationMetaByStudentId.set(counterpartId, current)
  })
  const selectedRelationStudentIds = new Set(
    filteredRelations
      .filter((relation) => relation.sourceStudentId === selectedId || relation.targetStudentId === selectedId)
      .flatMap((relation) => [relation.sourceStudentId, relation.targetStudentId]),
  )
  selectedRelationStudentIds.delete(selectedId)
  const { nodes, rings } = buildRadialSociogramNodes({
    positionsByStudentId,
    relations: validRelations,
    roleRowsByStudent,
    sociometricRows,
    studentRows,
    students,
  })
  const normalizedNodes = nodes.map((node) => ({
    ...node,
    isDimmed: Boolean(selectedId) && node.id !== selectedId && !selectedRelationStudentIds.has(node.id),
    isDirectAvoid: Boolean(selectedRelationMetaByStudentId.get(node.id)?.avoid),
    isDirectSupport: Boolean(selectedRelationMetaByStudentId.get(node.id)?.support),
    isRelated: selectedRelationStudentIds.has(node.id),
    isSelected: node.id === selectedId,
  }))

  const nodesByStudentId = new Map(normalizedNodes.map((node) => [node.id, node]))
  const links = filteredRelations
    .map((relation) => {
      const source = nodesByStudentId.get(relation.sourceStudentId)
      const target = nodesByStudentId.get(relation.targetStudentId)
      if (!source || !target) return null
      const typeMeta = getRelationTypeMeta(relation.type)
      const targetEndpoint = getSociogramLinkEndpoint(source, target)
      return {
        ...relation,
        category: getRelationCategory(relation.type),
        context: getSociogramRelationContext(relation),
        direction:
          relation.sourceStudentId === selectedId
            ? 'outgoing'
            : relation.targetStudentId === selectedId
              ? 'incoming'
              : 'neutral',
        isSelectedLink: relation.sourceStudentId === selectedId || relation.targetStudentId === selectedId,
        reciprocal: isSociogramReciprocalRelation(relation, validRelations),
        source,
        target,
        targetEndpoint,
        typeMeta,
      }
    })
    .filter(Boolean)

  return {
    filteredCount: filteredRelations.length,
    links,
    nodes: normalizedNodes,
    relatedCount: selectedRelationStudentIds.size,
    rings,
    selectedNode: nodesByStudentId.get(selectedId) || null,
  }
}

function summarizeTutorialGroup({ recordRowsByStudent, tutorialRecordSummary, tutorialSummary }) {
  const academicProfiles = tutorialSummary.studentProfiles.filter((profile) => profile.evaluatedCount > 0)
  const priorityStudents = tutorialSummary.studentProfiles
    .map((profile) => {
      const recordRow = recordRowsByStudent.get(profile.student.id)
      const recordSeverity =
        (recordRow?.agenda || 0) +
        (recordRow?.incident || 0) * 2 +
        (recordRow?.classroomExpulsion || 0) * 3 +
        (recordRow?.centerExpulsion || 0) * 4
      const academicSeverity =
        profile.notDevelopedCount * 2 +
        (profile.notDevelopedPercent >= 30 ? 2 : 0) +
        (profile.evaluatedCount > 0 && profile.averageScore <= 2 ? 2 : 0)
      const score = academicSeverity + recordSeverity
      const reasons = []
      if (profile.notDevelopedCount > 0) reasons.push(`${profile.notDevelopedCount} competència/es no assolides`)
      if (profile.notDevelopedPercent >= 30) reasons.push(`${formatPercent(profile.notDevelopedPercent)} no assolides`)
      if (recordRow?.agenda) reasons.push(`${recordRow.agenda} nota/es a l’agenda`)
      if (recordRow?.incident) reasons.push(`${recordRow.incident} incident/s`)
      if ((recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0) > 0) {
        reasons.push(`${(recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0)} expulsió/ns`)
      }

      return {
        academicSeverity,
        profile,
        reasons,
        recordRow,
        recordSeverity,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.academicSeverity - a.academicSeverity ||
        b.recordSeverity - a.recordSeverity ||
        a.profile.student.name.localeCompare(b.profile.student.name, 'ca'),
    )

  const totalRecords = tutorialRecordSummary.studentRows.reduce((total, row) => total + row.total, 0)
  const studentsWithData = new Set([
    ...academicProfiles.map((profile) => profile.student.id),
    ...tutorialRecordSummary.studentsWithRecords.map((row) => row.student.id),
  ])

  return {
    academicCoveragePercent:
      tutorialSummary.studentProfiles.length > 0
        ? (academicProfiles.length / tutorialSummary.studentProfiles.length) * 100
        : 0,
    priorityStudents,
    studentsWithData: studentsWithData.size,
    totalRecords,
  }
}

function buildTutorialRoleRows(students, roles) {
  const rolesByStudentId = new Map(students.map((student) => [student.id, { conflict: false, star: false }]))
  roles.forEach((role) => {
    const row = rolesByStudentId.get(role.studentId)
    if (!row) return
    if (role.role === 'star') row.star = true
    if (role.role === 'conflict') row.conflict = true
  })
  return rolesByStudentId
}

function buildEffectiveTutorialRelations({ relations, rolesByStudentId, students }) {
  const explicitPairKeys = new Set(
    relations.map((relation) => [relation.sourceStudentId, relation.targetStudentId].sort().join('__')),
  )
  const syntheticRelations = []

  students.forEach((student) => {
    if (!rolesByStudentId.get(student.id)?.star) return
    students.forEach((otherStudent) => {
      if (otherStudent.id === student.id) return
      const pairKey = [student.id, otherStudent.id].sort().join('__')
      if (explicitPairKeys.has(pairKey)) return
      syntheticRelations.push({
        id: `synthetic_star_${student.id}_${otherStudent.id}`,
        isSynthetic: true,
        note: 'Alumne estrella: pot oferir ajuda acadèmica sense indicar amistat.',
        sourceStudentId: student.id,
        strength: 2,
        targetStudentId: otherStudent.id,
        type: 'positive',
      })
    })
  })

  return [...relations, ...syntheticRelations]
}

function findStudentBySearch(students, searchValue) {
  const cleanValue = String(searchValue || '').trim().toLocaleLowerCase('ca')
  if (!cleanValue) return null
  return (
    students.find((student) => student.name.toLocaleLowerCase('ca') === cleanValue) ||
    students.find((student) => student.name.toLocaleLowerCase('ca').includes(cleanValue))
  )
}

function getGridSeatId(x, y) {
  return `seat_${x}_${y}`
}

function getDefaultSeatingActiveSeatIds() {
  return DEFAULT_SEATING_ACTIVE_SEATS.flatMap((columns, rowIndex) =>
    columns.map((columnIndex) => getGridSeatId(columnIndex, rowIndex)),
  )
}

function normalizeSeatingBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .map((value) => Math.min(5, Math.max(1, Number.parseInt(value, 10) || 0)))
    .filter(Boolean)
    .slice(0, 5)
}

function getSeatingBlockStartColumns(layout) {
  const blocks = normalizeSeatingBlocks(layout?.blocks)
  if (blocks.length === 0) return []
  let cursor = 0
  return blocks.map((size) => {
    const start = cursor
    cursor += size
    return start
  })
}

function getSeatingBlockPosition(layout, x) {
  const blocks = normalizeSeatingBlocks(layout?.blocks)
  if (blocks.length === 0) {
    return {
      block: Math.min(2, Math.max(0, Math.floor(Number(x || 0) / 3))),
      column: Number(x || 0),
    }
  }

  let cursor = 0
  const blockIndex = blocks.findIndex((size) => {
    const includesColumn = x >= cursor && x < cursor + size
    cursor += size
    return includesColumn
  })
  const start = blocks.slice(0, Math.max(0, blockIndex)).reduce((sum, size) => sum + size, 0)
  return {
    block: Math.max(0, blockIndex),
    column: Math.max(0, x - start),
  }
}

function getSeatZone(seat, layout) {
  if (normalizeSeatingBlocks(layout?.blocks).length > 0) {
    const { block } = getSeatingBlockPosition(layout, Number(seat?.x || 0))
    return block
  }
  const x = Number(seat?.x ?? seat?.block ?? 0)
  if (x <= 2) return 0
  if (x <= 5) return 1
  return 2
}

function getStableStudentNumber(value, variant = 0) {
  return String(value || '')
    .split('')
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3 + Number(variant || 0)), Number(variant || 0) * 97)
}

function normalizeSeatingLayout(layout) {
  const blocks = normalizeSeatingBlocks(layout?.blocks)
  const rows = Math.min(7, Math.max(3, Number.parseInt(layout?.rows, 10) || SEATING_GRID_ROWS))
  const columns =
    blocks.length > 0
      ? blocks.reduce((sum, size) => sum + size, 0)
      : Math.min(12, Math.max(1, Number.parseInt(layout?.columns, 10) || SEATING_GRID_COLUMNS))
  const validSeatIds = new Set()
  Array.from({ length: rows }).forEach((_, y) => {
    Array.from({ length: columns }).forEach((__, x) => validSeatIds.add(getGridSeatId(x, y)))
  })
  const structuredDefaultSeatIds = [...validSeatIds]
  const activeSeatIds =
    Array.isArray(layout?.activeSeatIds) && layout.activeSeatIds.length > 0
      ? layout.activeSeatIds
      : blocks.length > 0
        ? structuredDefaultSeatIds
        : getDefaultSeatingActiveSeatIds()

  return {
    activeSeatIds: activeSeatIds.filter((seatId) => validSeatIds.has(seatId)),
    ...(blocks.length > 0 ? { blocks } : {}),
    columns,
    rows,
  }
}

function getSeatingCapacity(layout) {
  const cleanLayout = normalizeSeatingLayout(layout)
  return cleanLayout.activeSeatIds.length
}

function getHalfGroupClassName(halfGroup) {
  const cleanValue = String(halfGroup || '').toLocaleLowerCase('ca')
  if (cleanValue.includes('a')) return 'half-a'
  if (cleanValue.includes('b')) return 'half-b'
  return 'half-none'
}

function getSeatDistance(seatA, seatB) {
  if (!seatA || !seatB) return Number.POSITIVE_INFINITY
  return Math.abs((seatA.x ?? 0) - (seatB.x ?? 0)) + Math.abs((seatA.y ?? 0) - (seatB.y ?? 0))
}

function getSeatingZoneLabel(seat, rows = SEATING_GRID_ROWS) {
  if (!seat) return 'sense lloc'
  if (seat.y <= Math.max(1, Math.floor(rows / 3) - 1)) return 'zona davantera'
  if (seat.y >= Math.max(2, rows - Math.ceil(rows / 3))) return 'zona posterior'
  return 'zona central'
}

function getSeatingZoneId(seat, rows = SEATING_GRID_ROWS) {
  const label = getSeatingZoneLabel(seat, rows)
  if (label === 'zona davantera') return 'front'
  if (label === 'zona posterior') return 'back'
  return 'center'
}

function hasSeatingPair(pairs, studentIdA, studentIdB) {
  return (pairs || []).some(
    (pair) =>
      (pair.studentId === studentIdA && pair.targetStudentId === studentIdB) ||
      (pair.studentId === studentIdB && pair.targetStudentId === studentIdA),
  )
}

function getEmptySeatingRestrictions() {
  return {
    avoidedZoneByStudentId: {},
    blockedSeatIds: [],
    neverNearPairs: [],
    preferredZoneByStudentId: {},
    preferNearPairs: [],
  }
}

function getSeatingPlacementContext({ placement, plan, prioritizeHalfGroups, relations }) {
  if (!placement) {
    return {
      alerts: [],
      nearby: [],
      reasons: ['Aquest alumne està pendent de col·locar. Activa “Moure alumne” i tria una taula lliure.'],
      zoneLabel: 'Pendent de col·locar',
    }
  }

  const profile = placement.student
  const nearby = (plan?.placements || [])
    .filter((candidate) => candidate.studentId !== placement.studentId)
    .map((candidate) => ({
      distance: getSeatDistance(placement.seat, candidate.seat),
      pair: summarizeCooperativePair(relations, placement.studentId, candidate.studentId),
      placement: candidate,
    }))
    .filter((item) => item.distance <= 2)
    .sort((a, b) => a.distance - b.distance || a.placement.student.student.name.localeCompare(b.placement.student.student.name, 'ca'))

  const reasons = []
  const alerts = []
  const zoneLabel = getSeatingZoneLabel(placement.seat, plan?.rows)
  if (prioritizeHalfGroups) reasons.push(`Manté el bloc de ${placement.halfGroup || 'mig grup'}.`)
  if (profile.priorityScore >= 4 && placement.seat.y <= 1) {
    reasons.push('Està davant perquè és un perfil prioritari i facilita el seguiment docent.')
  } else if (profile.academicRisk && placement.seat.y <= 2) {
    reasons.push('La posició facilita supervisió i suport acadèmic.')
  }
  if (placement.isStar) reasons.push('La zona central aprofita el seu potencial de suport i influència positiva.')
  if (profile.supportLabel) reasons.push(`Perfil que demana ${profile.supportLabel.toLocaleLowerCase('ca')}.`)

  const workNearby = nearby.filter((item) => item.pair.workInfluence > 0)
  const supportiveNearby = nearby.filter((item) => item.pair.supportiveInfluence > 0)
  if (workNearby.length > 0) reasons.push(`Té ${workNearby.length} vincle/s de treball útil/s a prop.`)
  if (supportiveNearby.length > 0) reasons.push(`Té ${supportiveNearby.length} suport/s relacional/s proper/s.`)

  nearby.forEach((item) => {
    if (item.distance <= 1 && item.pair.hasAvoid) {
      alerts.push(`Massa a prop de ${item.placement.student.student.name}, amb una relació a evitar.`)
    }
    if (item.distance <= 2 && placement.isConflict && item.placement.isConflict) {
      alerts.push(`Proximitat amb ${item.placement.student.student.name}, també marcat per control de conducta.`)
    }
  })

  if (reasons.length === 0) reasons.push(`Posició equilibrada a la ${zoneLabel}.`)

  return {
    alerts: [...new Set(alerts)],
    nearby: nearby.slice(0, 4),
    reasons: [...new Set(reasons)].slice(0, 4),
    zoneLabel,
  }
}

function buildTutorialSeatingPlan({
  blockedSeatIds = [],
  layout,
  lockedStudentIds = [],
  manualEmptySeatIds = [],
  manualSeatByStudentId = {},
  objective = 'balanced',
  problemSeatsByStudentId = {},
  prioritizeHalfGroups,
  profilesByStudentId,
  relations,
  restrictions = {},
  students,
  unseatedStudentIds = [],
  variant,
}) {
  const cleanLayout = normalizeSeatingLayout(layout)
  const activeSeatIds = new Set(cleanLayout.activeSeatIds)
  const manualEmptySeats = new Set(manualEmptySeatIds)
  const blockedSeats = new Set(blockedSeatIds)
  const forcedUnseated = new Set(unseatedStudentIds)
  const lockedStudents = new Set(lockedStudentIds)
  const seats = []
  Array.from({ length: cleanLayout.rows }).forEach((_, y) => {
    Array.from({ length: cleanLayout.columns }).forEach((__, x) => {
      const seatId = getGridSeatId(x, y)
      seats.push({
        enabled: activeSeatIds.has(seatId),
        id: seatId,
        x,
        y,
        zone: getSeatZone({ x }, cleanLayout),
      })
    })
  })

  const variantOffset = Number(variant || 0)
  const objectiveWeights = getSeatingObjectiveWeights(objective)
  const studentsToPlace = students
    .map((student) => profilesByStudentId.get(student.id))
    .filter(Boolean)
    .sort((a, b) => {
      if ((b.isConflict ? 1 : 0) !== (a.isConflict ? 1 : 0)) return (b.isConflict ? 1 : 0) - (a.isConflict ? 1 : 0)
      const problemA = problemSeatsByStudentId[a.student.id] ? 1 : 0
      const problemB = problemSeatsByStudentId[b.student.id] ? 1 : 0
      if (problemB !== problemA) return problemB - problemA
      if ((b.priorityScore || 0) !== (a.priorityScore || 0)) return (b.priorityScore || 0) - (a.priorityScore || 0)
      const variantTieBreak =
        (getStableStudentNumber(a.student.id, variantOffset) % 37) -
        (getStableStudentNumber(b.student.id, variantOffset) % 37)
      if (variantTieBreak !== 0) return variantTieBreak
      return a.student.name.localeCompare(b.student.name, 'ca')
    })

  const halfGroups = [...new Set(studentsToPlace.map((student) => student.halfGroup || 'Sense mig grup'))]
  const halfGroupZone = new Map(halfGroups.map((halfGroup, index) => [halfGroup, index % 3]))
  const placed = []
  const activeSeatMap = new Map(seats.filter((seat) => seat.enabled).map((seat) => [seat.id, seat]))
  const placedStudentIds = new Set()

  Object.entries(manualSeatByStudentId || {}).forEach(([studentId, seatId]) => {
    if (forcedUnseated.has(studentId)) return
    const student = profilesByStudentId.get(studentId)
    const seat = activeSeatMap.get(seatId)
    if (!student || !seat || blockedSeats.has(seat.id) || placed.some((placement) => placement.seat.id === seat.id)) return
    placed.push({
      halfGroup: student.halfGroup,
      isConflict: student.isConflict,
      isLocked: lockedStudents.has(student.student.id),
      isStar: student.isStar,
      seat,
      student,
      studentId: student.student.id,
    })
    placedStudentIds.add(student.student.id)
  })

  studentsToPlace.forEach((student, studentIndex) => {
    if (forcedUnseated.has(student.student.id) || placedStudentIds.has(student.student.id)) return
    const availableSeats = seats.filter(
      (seat) =>
        seat.enabled &&
        !blockedSeats.has(seat.id) &&
        !manualEmptySeats.has(seat.id) &&
        !placed.some((placement) => placement.seat.id === seat.id),
    )
    const bestSeat = availableSeats
      .map((seat) => {
        let score =
          Math.abs(seat.zone - ((studentIndex + variantOffset) % 3)) * 2 +
          seat.y * 0.9 +
          ((seat.x + variantOffset * 2) % 5) * 0.3
        if (problemSeatsByStudentId[student.student.id] === seat.id) score += 1500
        const preferredZone = restrictions.preferredZoneByStudentId?.[student.student.id]
        const avoidedZone = restrictions.avoidedZoneByStudentId?.[student.student.id]
        const seatZoneId = getSeatingZoneId(seat, cleanLayout.rows)
        if (preferredZone) score += preferredZone === seatZoneId ? -90 : 65
        if (avoidedZone === seatZoneId) score += 240
        if (prioritizeHalfGroups) {
          score += seat.zone === halfGroupZone.get(student.halfGroup || 'Sense mig grup') ? -35 : 80
        }
        if (student.academicRisk && !student.isStar) score += seat.y * 1.1
        if (student.priorityScore >= 4 || ['Aïllat', 'Rebutjat'].includes(student.sociometricCategory)) {
          score += seat.y * 1.8
        }
        if (student.isStar) score += Math.abs(seat.x - 4) * 0.55
        if (student.sociometricCategory === 'Líder') score += Math.abs(seat.x - 4) * 0.35
        placed.forEach((placement) => {
          const distance = getSeatDistance(seat, placement.seat)
          const adjacent = distance <= 1
          const near = distance <= 2
          const pairSummary = summarizeCooperativePair(relations, student.student.id, placement.student.student.id)
          const mustSeparate = hasSeatingPair(
            restrictions.neverNearPairs,
            student.student.id,
            placement.student.student.id,
          )
          const shouldBeNear = hasSeatingPair(
            restrictions.preferNearPairs,
            student.student.id,
            placement.student.student.id,
          )
          const isAcademicSupportPair =
            (student.isStar && placement.student.academicRisk) ||
            (placement.student.isStar && student.academicRisk)
          const isVulnerablePair = isVulnerableSeatingProfile(student) || isVulnerableSeatingProfile(placement.student)
          const isSupportPair = isSupportiveSeatingProfile(student) || isSupportiveSeatingProfile(placement.student)
          if (student.isConflict && placement.student.isConflict && near) {
            score += 10000 * objectiveWeights.conflict
          }
          if (mustSeparate && near) score += 20000 * objectiveWeights.conflict
          if (shouldBeNear) score += adjacent ? -150 : near ? -90 : 55
          if (pairSummary.hasAvoid) {
            score += near
              ? (700 + pairSummary.avoidInfluence * 90) * objectiveWeights.avoid
              : 90 * objectiveWeights.avoid
          }
          if (adjacent && pairSummary.socialInfluence > 0 && pairSummary.workInfluence === 0) score += 10
          if (near && pairSummary.workInfluence > 0) {
            score -= (isAcademicSupportPair ? 28 : 14) * objectiveWeights.work
          }
          if (near && pairSummary.supportiveInfluence > 0 && isVulnerablePair && isSupportPair) {
            score -= (adjacent ? 42 : 24) * objectiveWeights.support
          }
          if (isAcademicSupportPair) {
            score -= (adjacent ? 58 : near ? 28 : 8) * objectiveWeights.support
          }
          if (adjacent && isInfluentialSeatingProfile(student) && isInfluentialSeatingProfile(placement.student)) {
            score += 26
          }
        })
        if (
          objectiveWeights.supervision > 0 &&
          (student.priorityScore >= 4 || student.academicRisk || ['Aïllat', 'Rebutjat'].includes(student.sociometricCategory))
        ) {
          score += seat.y * objectiveWeights.supervision
        }
        score += (getStableStudentNumber(`${student.student.id}_${seat.id}`, variantOffset) % 11) * 0.08
        return { score, seat }
      })
      .sort((a, b) => a.score - b.score || a.seat.y - b.seat.y || a.seat.x - b.seat.x)[0]?.seat

    if (bestSeat) {
      placed.push({
        halfGroup: student.halfGroup,
        isConflict: student.isConflict,
        isLocked: lockedStudents.has(student.student.id),
        isStar: student.isStar,
        seat: bestSeat,
        student,
        studentId: student.student.id,
      })
      placedStudentIds.add(student.student.id)
    }
  })

  const unplacedProfiles = studentsToPlace.filter((student) => !placedStudentIds.has(student.student.id))
  const warnings = []
  if (placed.length < studentsToPlace.length) {
    warnings.push(`Falten ${studentsToPlace.length - placed.length} alumne/s per falta de llocs actius.`)
  }
  if (
    prioritizeHalfGroups &&
    placed.some((placement) => placement.seat.zone !== halfGroupZone.get(placement.halfGroup || 'Sense mig grup'))
  ) {
    warnings.push('No s’ha pogut mantenir algun alumne dins del bloc del seu mig grup.')
  }
  placed.forEach((placement, index) => {
    const preferredZone = restrictions.preferredZoneByStudentId?.[placement.studentId]
    const avoidedZone = restrictions.avoidedZoneByStudentId?.[placement.studentId]
    const actualZone = getSeatingZoneId(placement.seat, cleanLayout.rows)
    if (preferredZone && preferredZone !== actualZone) {
      warnings.push(`${placement.student.student.name} no ha quedat a la seva zona preferent.`)
    }
    if (avoidedZone && avoidedZone === actualZone) {
      warnings.push(`${placement.student.student.name} ha quedat en una zona que cal evitar.`)
    }
    placed.slice(index + 1).forEach((otherPlacement) => {
      const distance = getSeatDistance(placement.seat, otherPlacement.seat)
      if (
        hasSeatingPair(restrictions.neverNearPairs, placement.studentId, otherPlacement.studentId) &&
        distance <= 2
      ) {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} tenen una restricció de “mai a prop”.`,
        )
      }
      if (
        hasSeatingPair(restrictions.preferNearPairs, placement.studentId, otherPlacement.studentId) &&
        distance > 2
      ) {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} haurien d’estar més a prop.`,
        )
      }
      if (distance > 1) return
      const relation = relationBetween(relations, placement.student.student.id, otherPlacement.student.student.id)
      if (relation?.type === 'avoid') {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} tenen una relació a evitar i queden massa a prop.`,
        )
      }
      if (placement.isConflict && otherPlacement.isConflict) {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} estan marcats com a conflictius i queden massa a prop.`,
        )
      }
    })
  })

  return {
    canRespectCriteria: warnings.length === 0,
    columns: cleanLayout.columns,
    layout: cleanLayout,
    placements: placed,
    rows: cleanLayout.rows,
    seats,
    unplacedProfiles,
    warnings: [...new Set(warnings)],
  }
}

function materializeSavedSeatingPlan({ plan, profilesByStudentId }) {
  const cleanLayout = normalizeSeatingLayout(plan?.layout)
  const lockedStudents = new Set(plan?.layout?.lockedStudentIds || [])
  const activeSeatIds = new Set(cleanLayout.activeSeatIds)
  const seats = []
  Array.from({ length: cleanLayout.rows }).forEach((_, row) => {
    Array.from({ length: cleanLayout.columns }).forEach((__, column) => {
      const seatId = getGridSeatId(column, row)
      seats.push({
        enabled: activeSeatIds.has(seatId),
        id: seatId,
        x: column,
        y: row,
        zone: getSeatZone({ x: column }, cleanLayout),
      })
    })
  })
  const placements = (plan?.seats || [])
    .map((seat) => {
      const profile = profilesByStudentId.get(seat.studentId)
      if (!profile) return null
      const x = Number.isFinite(Number(seat.x)) ? Number(seat.x) : Number(seat.block || 0) * 3 + Number(seat.place || 0)
      const y = Number.isFinite(Number(seat.y)) ? Number(seat.y) : Number(seat.row || 0)
      return {
        halfGroup: profile.halfGroup,
        isConflict: profile.isConflict,
        isLocked: Boolean(seat.isLocked || lockedStudents.has(profile.student.id)),
        isStar: profile.isStar,
        seat: {
          enabled: true,
          id: getGridSeatId(x, y),
          x,
          y,
          zone: getSeatZone({ x }, cleanLayout),
        },
        student: profile,
        studentId: profile.student.id,
      }
    })
    .filter(Boolean)

  return {
    canRespectCriteria: true,
    columns: cleanLayout.columns,
    layout: cleanLayout,
    placements,
    rows: cleanLayout.rows,
    seats,
    unplacedProfiles: [],
    warnings: [],
  }
}

function materializeSavedCooperativeGroups({ profilesByStudentId, relations, savedGroupSet }) {
  if (!savedGroupSet) return []

  const groups = (savedGroupSet.groups || []).map((group, index) => ({
    id: group.id || `saved_group_${index + 1}`,
    locked: Boolean(group.locked),
    members: (group.memberIds || []).map((studentId) => profilesByStudentId.get(studentId)).filter(Boolean),
    name: group.name || `Grup ${index + 1}`,
    targetGroupSize: Number(savedGroupSet.groupSize) || 4,
  }))

  return enrichCooperativeGroups(groups, relations)
}

function getTutorialProfilePriority(profile, recordRow) {
  return (
    profile.notDevelopedCount * 3 +
    (profile.notDevelopedPercent >= 30 ? 2 : 0) +
    (profile.averageScore > 0 && profile.averageScore <= 2 ? 2 : 0) +
    (recordRow?.agenda || 0) +
    (recordRow?.incident || 0) * 2 +
    (recordRow?.classroomExpulsion || 0) * 3 +
    (recordRow?.centerExpulsion || 0) * 4
  )
}

function getProfileExecutiveSummary(profile, records) {
  const subjectSummaries = getProfileSubjectSummaries(profile)
  const weakestSubject = subjectSummaries[0]
  const notDevelopedText =
    profile.notDevelopedCount > 0
      ? `${profile.notDevelopedCount} competència/es no assolides (${formatPercent(profile.notDevelopedPercent)}).`
      : 'No hi ha competències no assolides registrades.'
  const recordCounts = TUTORING_RECORD_TYPES.map((type) => ({
    ...type,
    count: countByType(records, type.id),
  }))
  const relevantRecords = recordCounts.filter((item) => item.count > 0)
  const weakestEvidence = profile.weakestArea
    ? `L’àrea més delicada és ${profile.weakestArea.name}${
        weakestSubject ? `, sobretot a ${weakestSubject.subject}` : ''
      }.`
    : 'Encara no hi ha una àrea delicada clara.'
  const trackingEvidence =
    relevantRecords.length > 0
      ? relevantRecords.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(' · ')
      : 'Sense registres tutorials específics.'

  let title = 'Seguiment ordinari'
  let tone = 'ok'
  let action = 'Mantenir observació ordinària i actualitzar el perfil quan entrin noves dades.'

  if (profile.notDevelopedCount >= 2 || profile.notDevelopedPercent >= 30) {
    title = 'Prioritat acadèmica'
    tone = 'warning'
    action = 'Revisar amb l’alumne quines competències pesen més i pactar una acció concreta de millora.'
  }
  if (relevantRecords.some((item) => ['incident', 'classroom-expulsion', 'center-expulsion'].includes(item.id))) {
    title = 'Prioritat tutorial'
    tone = 'risk'
    action = 'Contrastar amb l’equip educatiu si els registres tutorial expliquen o agreugen el rendiment.'
  }
  if ((profile.notDevelopedCount >= 2 || profile.averageScore <= 2) && relevantRecords.length > 0) {
    title = 'Prioritat combinada'
    tone = 'risk'
    action = 'Preparar una intervenció conjunta: tutor, docent de referència i família si escau.'
  }

  return {
    action,
    bullets: [notDevelopedText, weakestEvidence, trackingEvidence],
    title,
    tone,
  }
}

function getProfileSubjectSummaries(profile) {
  return Object.values(
    profile.evaluatedCompetencies.reduce((subjects, item) => {
      const subject = subjects[item.subject] || {
        areaName: item.areaName,
        evaluated: 0,
        notDeveloped: 0,
        scores: [],
        subject: item.subject,
      }
      subject.evaluated += 1
      subject.notDeveloped += item.notDeveloped ? 1 : 0
      subject.scores.push(item.score)
      return { ...subjects, [item.subject]: subject }
    }, {}),
  )
    .map((subject) => ({
      ...subject,
      averageScore: average(subject.scores),
      averageGrade: formatAverageGrade(average(subject.scores)),
      notDevelopedPercent: subject.evaluated > 0 ? (subject.notDeveloped / subject.evaluated) * 100 : 0,
    }))
    .sort((a, b) => b.notDevelopedPercent - a.notDevelopedPercent || a.averageScore - b.averageScore)
}

function getProfileAreaSummaries(profile) {
  return Object.values(
    profile.evaluatedCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || {
        evaluated: 0,
        id: item.areaId,
        name: item.areaName,
        notDeveloped: 0,
        scores: [],
      }
      area.evaluated += 1
      area.notDeveloped += item.notDeveloped ? 1 : 0
      area.scores.push(item.score)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )
    .map((area) => ({
      ...area,
      averageScore: average(area.scores),
      averageGrade: formatAverageGrade(average(area.scores)),
      notDevelopedPercent: area.evaluated > 0 ? (area.notDeveloped / area.evaluated) * 100 : 0,
    }))
    .sort((a, b) => b.notDevelopedPercent - a.notDevelopedPercent || a.averageScore - b.averageScore)
}

function getProfileSubjectTrackingSummaries(profile) {
  const summaries = new Map()
  profile.evaluatedCompetencies.forEach((item) => {
    if (!item.trackingSummary?.hasTrackingData) return
    if (summaries.has(item.subject)) return
    summaries.set(item.subject, {
      consistency: item.trackingSummary.consistency,
      done: item.trackingSummary.done,
      late: item.trackingSummary.late,
      missing: item.trackingSummary.missing,
      profile: item.trackingSummary.profile,
      profileLevel: item.trackingSummary.profileLevel,
      subject: item.subject,
      total: item.trackingSummary.total,
    })
  })
  return [...summaries.values()].sort((a, b) => a.subject.localeCompare(b.subject, 'ca'))
}

function getAreaRadarLabel(name = '') {
  const normalizedName = name.toLocaleLowerCase('ca')
  if (normalizedName.includes('cient')) return 'C-T'
  if (normalizedName.includes('lleng')) return 'Lleng.'
  if (normalizedName.includes('educ')) return 'EF'
  if (normalizedName.includes('art')) return 'Art.'
  if (normalizedName.includes('inter')) return 'Inter.'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 4))
    .join(' ')
    .slice(0, 10)
}

function AreaRadarChart({ areas }) {
  if (!areas?.length) {
    return <div className="empty-state compact">Encara no hi ha prou dades d’àrees per dibuixar el diagrama.</div>
  }

  const center = 90
  const radius = 62
  const safeAreas = areas.slice(0, 8)
  const points = safeAreas.map((area, index) => {
    const angle = (Math.PI * 2 * index) / safeAreas.length - Math.PI / 2
    const scoreRadius = (Math.max(1, Math.min(4, area.averageScore || 1)) / 4) * radius
    return {
      ...area,
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 18),
      labelY: center + Math.sin(angle) * (radius + 18),
      x: center + Math.cos(angle) * scoreRadius,
      y: center + Math.sin(angle) * scoreRadius,
    }
  })
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ')
  const maxPolygon = points.map((point) => `${point.axisX},${point.axisY}`).join(' ')

  return (
    <div className="tutorial-area-radar">
      <svg aria-label="Diagrama d’estrella per àrees" role="img" viewBox="0 0 180 180">
        <polygon className="radar-grid outer" points={maxPolygon} />
        {[0.25, 0.5, 0.75].map((scale) => (
          <polygon
            className="radar-grid"
            key={scale}
            points={points
              .map((point) => `${center + (point.axisX - center) * scale},${center + (point.axisY - center) * scale}`)
              .join(' ')}
          />
        ))}
        {points.map((point) => (
          <line className="radar-axis" key={point.id} x1={center} x2={point.axisX} y1={center} y2={point.axisY} />
        ))}
        <polygon className="radar-shape" points={polygon} />
        {points.map((point) => (
          <g key={point.id}>
            <circle className="radar-dot" cx={point.x} cy={point.y} r="3.6" />
            <text className="radar-label" textAnchor="middle" x={point.labelX} y={point.labelY}>
              {getAreaRadarLabel(point.name)}
            </text>
          </g>
        ))}
      </svg>
      <div>
        {safeAreas.map((area) => (
          <span key={area.id}>
            <strong>{area.name}</strong>
            {area.averageGrade}
          </span>
        ))}
      </div>
    </div>
  )
}

function SubjectCatalogCard({ completion, item, onSelect }) {
  const isComplete = completion?.total > 0 && completion.completed === completion.total

  return (
    <article className={`tutorial-subject-card ${isComplete ? 'complete' : ''}`}>
      <div>
        <strong>{item.subject}</strong>
        <small>{item.areaName}</small>
      </div>
      <span>
        {item.structure.length} competències
        {completion?.total ? ` · ${completion.completed}/${completion.total}` : ''}
      </span>
      <button className="secondary-action compact" onClick={() => onSelect(item.subject)} type="button">
        {isComplete ? 'Omplert' : 'Omplir'}
      </button>
    </article>
  )
}

function normalizeImportGrade(value) {
  const cleanValue = String(value || '').trim().toUpperCase()
  if (EMPTY_IMPORT_MARKS.has(cleanValue)) return { invalid: false, raw: String(value || '').trim(), value: '' }
  if (VALID_IMPORT_GRADES.has(cleanValue)) return { invalid: false, raw: cleanValue, value: cleanValue }
  return { invalid: Boolean(cleanValue), raw: String(value || '').trim(), value: '' }
}

function buildTutorialImportColumns(subjectOptions) {
  return subjectOptions.flatMap((subjectOption) =>
    buildTutorialCompetencies(subjectOption.subject).map((competency) => ({
      areaName: subjectOption.areaName,
      competency,
      id: `${subjectOption.subject}_${competency.key}`,
      label: competency.name,
      subject: subjectOption.subject,
    })),
  )
}

function groupImportColumnsBySubject(columns) {
  return columns.reduce((groups, column) => {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.subject === column.subject) {
      lastGroup.columns.push(column)
      return groups
    }
    return [...groups, { areaName: column.areaName, columns: [column], subject: column.subject }]
  }, [])
}

function filterImportColumns(columns, areaFilter, subjectFilter) {
  return columns.filter(
    (column) =>
      (areaFilter === 'all' || column.areaName === areaFilter) &&
      (subjectFilter === 'all' || column.subject === subjectFilter),
  )
}

function createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }) {
  return students.map((student) =>
    columns.map((column) => {
      const value = getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        student,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      })

      return { invalid: false, raw: value, touched: false, value }
    }),
  )
}

function detectImportSeparator(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || ''
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(';')) return ';'
  return ','
}

function splitImportRows(rawText) {
  const separator = detectImportSeparator(rawText)
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((row) => row.trim())
    .map((row) => row.split(separator).map((cell) => cell.trim()))
}

function rowLooksLikeTutorialHeader(row) {
  const firstCell = String(row[0] || '').toLowerCase()
  return (
    firstCell.includes('alumne') ||
    firstCell.includes('competència') ||
    firstCell.includes('materia') ||
    firstCell.includes('matèria') ||
    row.some((cell) => String(cell || '').includes(' · C'))
  )
}

function removeLeadingStudentName(row, columnCount) {
  if (row.length !== columnCount + 1) return row
  return normalizeImportGrade(row[0]).invalid ? row.slice(1) : row
}

function buildTutorialMatrixFromText(rawText, currentMatrix, columns, students) {
  const matrix = currentMatrix.map((row) => row.map((cell) => ({ ...cell, raw: '', touched: false, value: '' })))
  const rawRows = splitImportRows(rawText)
  let rows = rawRows
  while (rows[0] && rowLooksLikeTutorialHeader(rows[0])) {
    rows = rows.slice(1)
  }

  rows.slice(0, students.length).forEach((row, rowIndex) => {
    const cells = removeLeadingStudentName(row, columns.length)
    cells.slice(0, columns.length).forEach((cell, columnIndex) => {
      matrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(cell),
        touched: Boolean(String(cell || '').trim()),
      }
    })
  })

  return { ignoredRows: Math.max(0, rows.length - students.length), matrix }
}

function buildTutorialTemplateText({ classId, columns, evaluationContext, students, tutorialMarks }) {
  const subjectHeader = ['Alumne', ...columns.map((column) => column.subject)]
  const competencyHeader = ['Competència', ...columns.map((column) => column.label)]
  const rows = students.map((student) => [
    student.name,
    ...columns.map((column) =>
      getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        student,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      }),
    ),
  ])

  return [subjectHeader, competencyHeader, ...rows].map((row) => row.join('\t')).join('\n')
}

function countImportValues(matrix) {
  return matrix.flat().filter((cell) => cell.value).length
}

function countImportInvalids(matrix) {
  return matrix.flat().filter((cell) => cell.invalid).length
}

function TutoringBulkImportModal({
  activeClass,
  classId,
  columns,
  evaluationContext,
  onClose,
  onSave,
  students,
  tutorialMarks,
}) {
  const [importAreaFilter, setImportAreaFilter] = useState('all')
  const [importSubjectFilter, setImportSubjectFilter] = useState('all')
  const importAreaOptions = useMemo(
    () =>
      Object.values(
        columns.reduce((areas, column) => ({ ...areas, [column.areaName]: column.areaName }), {}),
      ).sort((a, b) => a.localeCompare(b, 'ca')),
    [columns],
  )
  const importSubjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          columns
            .filter((column) => importAreaFilter === 'all' || column.areaName === importAreaFilter)
            .map((column) => column.subject),
        ),
      ).sort((a, b) => a.localeCompare(b, 'ca')),
    [columns, importAreaFilter],
  )
  const scopedColumns = useMemo(
    () => filterImportColumns(columns, importAreaFilter, importSubjectFilter),
    [columns, importAreaFilter, importSubjectFilter],
  )
  const groupedColumns = useMemo(() => groupImportColumnsBySubject(scopedColumns), [scopedColumns])
  const [{ ignoredRows, matrix }, setImportState] = useState(() => ({
    ignoredRows: 0,
    matrix: createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }),
  }))
  const resetImportMatrix = (nextAreaFilter, nextSubjectFilter) => {
    const nextColumns = filterImportColumns(columns, nextAreaFilter, nextSubjectFilter)
    setImportState({
      ignoredRows: 0,
      matrix: createTutorialImportMatrix({
        classId,
        columns: nextColumns,
        evaluationContext,
        students,
        tutorialMarks,
      }),
    })
  }
  const importedValues = useMemo(() => countImportValues(matrix), [matrix])
  const invalidValues = useMemo(() => countImportInvalids(matrix), [matrix])
  const updates = useMemo(
    () =>
      students.flatMap((student, rowIndex) =>
        scopedColumns
          .map((column, columnIndex) => ({
            classId,
            competencyKey: column.competency.key,
            studentId: student.id,
            subject: column.subject,
            touched: matrix[rowIndex]?.[columnIndex]?.touched,
            value: matrix[rowIndex]?.[columnIndex]?.value || '',
          }))
          .filter((update) => update.touched),
      ),
    [classId, matrix, scopedColumns, students],
  )

  const applyText = (text) => {
    setImportState((current) => buildTutorialMatrixFromText(text, current.matrix, scopedColumns, students))
  }

  const updateCell = (rowIndex, columnIndex, value) => {
    setImportState((current) => {
      const nextMatrix = current.matrix.map((row) => row.map((cell) => ({ ...cell })))
      nextMatrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(value),
        touched: Boolean(String(value || '').trim()),
      }
      return { ...current, matrix: nextMatrix }
    })
  }

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n') && !text.includes(';')) return

    event.preventDefault()
    applyText(text)
  }

  const downloadTemplate = () => {
    const templateText = buildTutorialTemplateText({
      classId,
      columns: scopedColumns,
      evaluationContext,
      students,
      tutorialMarks,
    })
    const blob = new Blob([templateText], { type: 'text/tab-separated-values;charset=utf-8' })
    downloadBlob(blob, `avaluapro-tutoria-${activeClass?.name || 'classe'}-${getTodaySlug()}.tsv`)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    applyText(await file.text())
    event.target.value = ''
  }

  const handleSave = async () => {
    await onSave(updates)
    onClose()
  }
  const copyTemplate = async () => {
    await navigator.clipboard.writeText(
      buildTutorialTemplateText({
        classId,
        columns: scopedColumns,
        evaluationContext,
        students,
        tutorialMarks,
      }),
    )
  }

  return (
    <Modal onClose={onClose} size="xl" title="Importació massiva de tutoria">
      <div className="tutorial-bulk-import-panel">
        <section className="excel-import-help">
          <FileSpreadsheet size={22} />
          <div>
            <strong>Una plantilla per a totes les matèries</strong>
            <p>
              Descarrega la plantilla, omple les notes A/B/C/D/NA a Excel i torna-la a carregar. La primera fila
              agrupa les columnes per matèria i la segona indica la competència exacta.
            </p>
          </div>
        </section>

        <div className="tutorial-bulk-filter-grid">
          <label>
            Àrea de la plantilla
            <select
              onChange={(event) => {
                const nextAreaFilter = event.target.value
                setImportAreaFilter(nextAreaFilter)
                setImportSubjectFilter('all')
                resetImportMatrix(nextAreaFilter, 'all')
              }}
              value={importAreaFilter}
            >
              <option value="all">Totes les àrees</option>
              {importAreaOptions.map((areaName) => (
                <option key={areaName} value={areaName}>
                  {areaName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Matèria de la plantilla
            <select
              onChange={(event) => {
                const nextSubjectFilter = event.target.value
                setImportSubjectFilter(nextSubjectFilter)
                resetImportMatrix(importAreaFilter, nextSubjectFilter)
              }}
              value={importSubjectFilter}
            >
              <option value="all">Totes les matèries</option>
              {importSubjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <article>
            <strong>{scopedColumns.length}</strong>
            <span>competències incloses</span>
            <small>{columns.length - scopedColumns.length} ocultes pel filtre</small>
          </article>
        </div>

        <div className="tutorial-bulk-import-actions">
          <button className="secondary-action" onClick={downloadTemplate} type="button">
            <FileDown size={17} />
            Descarregar plantilla Excel
          </button>
          <label className="secondary-action file-action">
            <FileSpreadsheet size={17} />
            Carregar plantilla omplerta
            <input accept=".csv,.tsv,.txt" onChange={handleFileUpload} type="file" />
          </label>
          <button
            className="secondary-action"
            onClick={copyTemplate}
            type="button"
          >
            <Clipboard size={17} />
            Copiar plantilla
          </button>
        </div>

        <div className="excel-import-status">
          <span className="ok">
            <CheckCircle2 size={16} />
            {importedValues} notes vàlides
          </span>
          {invalidValues > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {invalidValues} cel·les ignorades perquè no són A/B/C/D/NA
            </span>
          )}
          {ignoredRows > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {ignoredRows} files sobrants ignorades
            </span>
          )}
        </div>

        <div className="tutorial-bulk-preview-wrap">
          <table className="tutorial-bulk-preview-table">
            <thead>
              <tr>
                <th rowSpan="2">Alumne</th>
                {groupedColumns.map((group) => (
                  <th className="subject-header" colSpan={group.columns.length} key={`${group.subject}_subject`}>
                    <span>{group.areaName}</span>
                    <strong>{group.subject}</strong>
                  </th>
                ))}
              </tr>
              <tr>
                {scopedColumns.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIndex) => (
                <tr key={student.id}>
                  <th>{student.name}</th>
                  {scopedColumns.map((column, columnIndex) => {
                    const cell = matrix[rowIndex]?.[columnIndex] || { invalid: false, raw: '', value: '' }
                    return (
                      <td className={cell.invalid ? 'invalid-import-cell' : gradeTextClassName(cell.value)} key={column.id}>
                        <input
                          aria-label={`${student.name} ${column.subject} ${column.label}`}
                          className={cell.invalid ? 'invalid' : gradeTextClassName(cell.value)}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          onPaste={rowIndex === 0 && columnIndex === 0 ? handlePaste : undefined}
                          placeholder="-"
                          value={cell.raw || cell.value}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="excel-import-actions">
          <span>{updates.length} canvis preparats</span>
          <button className="primary-action" disabled={updates.length === 0 || invalidValues > 0} onClick={handleSave} type="button">
            <CheckCircle2 size={17} />
            Importar totes les notes
          </button>
        </footer>
      </div>
    </Modal>
  )
}

function TutorialStatsCard({ icon: Icon, label, value, detail, tone = 'neutral', onClick }) {
  const Component = onClick ? 'button' : 'article'
  return (
    <Component className={`tutorial-stat-card ${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {onClick && <em>Consultar</em>}
    </Component>
  )
}

function TutorialGroupGradeChart({ summary }) {
  const points = summary.trajectory || []
  const hasTrend = points.length > 0
  const width = 520
  const height = 250
  const padding = { top: 24, right: 34, bottom: 54, left: 86 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const getX = (index) => padding.left + (points.length <= 1 ? plotWidth : (index / (points.length - 1)) * plotWidth)
  const getY = (score) => padding.top + ((4 - Math.min(4, Math.max(1, score))) / 3) * plotHeight
  const linePoints = points.map((point, index) => `${getX(index)},${getY(point.averageScore)}`).join(' ')
  const areaPoints = hasTrend ? `${padding.left},${getY(1)} ${linePoints} ${getX(points.length - 1)},${getY(1)}` : ''

  return (
    <article className="tutorial-chart-card tutorial-line-chart-card">
      <header>
        <div>
          <span>Trajectòria temporal</span>
          <strong>{summary.globalAverageGrade}</strong>
        </div>
        <small>Mitjana global de totes les assignatures amb dades</small>
      </header>
      {hasTrend ? (
        <svg className="tutorial-line-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[4, 3, 2, 1].map((score) => (
            <g key={score}>
              <line x1={padding.left} x2={width - padding.right} y1={getY(score)} y2={getY(score)} />
              <text className="axis-number" x={padding.left - 52} y={getY(score) + 7}>
                {score.toFixed(1).replace('.', ',')}
              </text>
              <text className={`axis-grade grade-${formatAverageGrade(score)}`} x={padding.left - 16} y={getY(score) + 7}>
                {formatAverageGrade(score)}
              </text>
            </g>
          ))}
          <polygon className="line-area" points={areaPoints} />
          <polyline className="line-stroke" points={linePoints} />
          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={getX(index)} cy={getY(point.averageScore)} r="7" />
              <text className="x-label" x={getX(index)} y={height - 18}>
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="empty-state compact">Encara no hi ha prou dades per veure una trajectòria del grup.</div>
      )}
    </article>
  )
}

function TutorialSubjectAverageChart({ subjects }) {
  const visibleSubjects = [...subjects]
    .filter((subject) => subject.evaluated > 0)
    .sort((a, b) => b.averageScore - a.averageScore || a.subject.localeCompare(b.subject, 'ca'))
  const maxScore = 4

  return (
    <article className="tutorial-chart-card wide">
      <header>
        <div>
          <span>Comparativa per assignatura</span>
          <strong>{visibleSubjects.length ? 'Millor / pitjor' : '-'}</strong>
        </div>
        <small>Mitjana de les competències de cada matèria</small>
      </header>
      {visibleSubjects.length === 0 ? (
        <div className="empty-state compact">Encara no hi ha notes suficients per comparar assignatures.</div>
      ) : (
        <div className="tutorial-subject-bar-chart">
          {visibleSubjects.map((subject) => {
            const grade = subject.averageGrade || formatAverageGrade(subject.averageScore)
            return (
              <div className="tutorial-subject-bar-row" key={subject.subject}>
                <strong>{subject.subject}</strong>
                <div>
                  <i className={`grade-${grade || 'empty'}`} style={{ width: `${(subject.averageScore / maxScore) * 100}%` }} />
                </div>
                <span className={gradeClassName(grade)}>{grade || '-'}</span>
                <small>{formatPercent(subject.notDevelopedPercent)} no assolides</small>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function TutorialReportDocument({
  classLabel,
  executiveSummary,
  filteredCompetencies,
  groupedByArea,
  hasTracking,
  printSections,
  profile,
  profileAreaSummaries,
  profileSubjectTrackingSummaries,
  records,
  reportDate,
  sociometricReport,
  strongestSubjects,
  tutorComment,
  weakestSubjects,
}) {
  return (
    <article className="tutorial-report-document">
      <header className="tutorial-print-header">
        <span>AvaluaPro · Informe tutorial</span>
        <h2>{profile.student.name}</h2>
        <p>
          {classLabel || 'Classe sense nom'} · {formatLongDate(reportDate)}
        </p>
      </header>

      {printSections.executiveSummary && (
        <section className={`tutorial-executive-summary ${executiveSummary.tone}`}>
          <h3 className="tutorial-profile-section-title">Síntesi tutorial</h3>
          <strong>{executiveSummary.title}</strong>
          <ul>
            {executiveSummary.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p>{executiveSummary.action}</p>
        </section>
      )}

      {printSections.tutorComment && (
        <section className="tutorial-tutor-comment-section report">
          <h3 className="tutorial-profile-section-title">Comentari del tutor</h3>
          <div className={`tutorial-tutor-comment-print ${tutorComment.trim() ? '' : 'empty'}`}>
            {tutorComment.trim() || 'Sense comentari del tutor afegit.'}
          </div>
        </section>
      )}

      {printSections.performanceSummary && (
        <section className="tutorial-report-section">
          <h3 className="tutorial-profile-section-title">Resum acadèmic</h3>
          <div className="tutorial-profile-summary">
            <article>
              <span>Competències avaluades</span>
              <strong>{profile.evaluatedCount}</strong>
            </article>
            <article className={profile.notDevelopedCount > 0 ? 'warning' : 'ok'}>
              <span>No assolides</span>
              <strong>{profile.notDevelopedCount}</strong>
            </article>
            <article>
              <span>% no assolides</span>
              <strong>{formatPercent(profile.notDevelopedPercent)}</strong>
            </article>
            <article>
              <span>Àrea més delicada</span>
              <strong>{profile.weakestArea?.name || '-'}</strong>
            </article>
          </div>
          {profileAreaSummaries.length > 0 && (
            <div className="tutorial-profile-insight-grid report-compact">
              <article className="wide">
                <h4>Lectura per àrees</h4>
                <AreaRadarChart areas={profileAreaSummaries} />
              </article>
              <article>
                <h4>Matèries a prioritzar</h4>
                {weakestSubjects.length === 0 ? (
                  <p>No hi ha matèries amb competències no assolides.</p>
                ) : (
                  weakestSubjects.map((subject) => (
                    <div className="tutorial-profile-insight-row risk" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>
                        {subject.notDeveloped}/{subject.evaluated} no assolides
                      </span>
                    </div>
                  ))
                )}
              </article>
              <article>
                <h4>Punts forts</h4>
                {strongestSubjects.length === 0 ? (
                  <p>Encara no hi ha prou dades per destacar punts forts.</p>
                ) : (
                  strongestSubjects.map((subject) => (
                    <div className="tutorial-profile-insight-row ok" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>Mitjana {subject.averageGrade}</span>
                    </div>
                  ))
                )}
              </article>
            </div>
          )}
          {profileAreaSummaries.length === 0 && (
            <p className="tutorial-report-empty-line">Encara no hi ha prou dades acadèmiques per ampliar el resum.</p>
          )}
        </section>
      )}

      {printSections.trackingSummary && (
        <section className="tutorial-report-section">
          <h3 className="tutorial-profile-section-title">Resum de seguiment</h3>
          {hasTracking ? (
            <>
              <div className="tutorial-profile-summary tracking">
                {TUTORING_RECORD_TYPES.map((type) => (
                  <article className={type.tone} key={type.id}>
                    <span>{type.label}</span>
                    <strong>{countByType(records, type.id)}</strong>
                  </article>
                ))}
              </div>
              {profileSubjectTrackingSummaries.length > 0 && (
                <div className="tutorial-subject-tracking-summary">
                  <h4>Constància rebuda per assignatura</h4>
                  <div>
                    {profileSubjectTrackingSummaries.map((summary) => (
                      <article key={summary.subject}>
                        <strong>{summary.subject}</strong>
                        <span>{summary.consistency}%</span>
                        <small>
                          {summary.profile} · {summary.done} fetes · {summary.late} incompletes · {summary.missing} no fetes
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="tutorial-report-empty-line">Encara no hi ha registres tutorials vinculats.</p>
          )}
        </section>
      )}

      {printSections.sociometric && (
        <section className="tutorial-profile-sociometric-section">
          <h3 className="tutorial-profile-section-title">Lectura sociomètrica</h3>
          <SociometricStudentInsightCard report={sociometricReport} />
        </section>
      )}

      {printSections.competencyDetail && (
        <section className="tutorial-report-section tutorial-report-annex">
          <h3 className="tutorial-profile-section-title">Annex · Detall de competències</h3>
          {profile.evaluatedCount === 0 ? (
            <p className="tutorial-report-empty-line">Encara no hi ha notes tutorials per aquest alumne.</p>
          ) : (
            <div className="tutorial-profile-area-list">
              {groupedByArea.map((area) => (
                <section key={area.name}>
                  <h3>{area.name}</h3>
                  {area.rows.map((row) => (
                    <div
                      className={`tutorial-profile-row ${row.notDeveloped ? 'risk' : ''}`}
                      key={`${row.subject}_${row.competencyName}`}
                    >
                      <div>
                        <strong>{row.subject}</strong>
                        <span>{row.competencyName}</span>
                      </div>
                      <span className={gradeClassName(row.grade)}>{row.grade}</span>
                    </div>
                  ))}
                </section>
              ))}
              {filteredCompetencies.length === 0 && (
                <p className="tutorial-report-empty-line">El filtre seleccionat no conté competències.</p>
              )}
            </div>
          )}
        </section>
      )}

      {printSections.trackingEvidence && (
        <section className="tutorial-profile-record-section tutorial-report-annex">
          <h3 className="tutorial-profile-section-title">Annex · Evidències de seguiment</h3>
          {!hasTracking ? (
            <p className="tutorial-report-empty-line">Encara no hi ha evidències de seguiment.</p>
          ) : (
            <div className="tutorial-record-history compact">
              {records
                .slice()
                .sort((a, b) => {
                  const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
                  if (dateCompare !== 0) return dateCompare
                  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
                })
                .map((record) => {
                  const typeMeta = getRecordTypeMeta(record.type)
                  return (
                    <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                      <div>
                        <strong>{typeMeta.label}</strong>
                        <span>{formatShortDate(record.date)}</span>
                        <p>{record.note || 'Sense comentari afegit.'}</p>
                      </div>
                    </article>
                  )
                })}
            </div>
          )}
        </section>
      )}

      <footer className="tutorial-print-footer">
        Informe orientatiu generat amb AvaluaPro. Les dades s’han d’interpretar dins del context educatiu de l’alumne.
      </footer>
    </article>
  )
}

function TutorialStudentProfileModal({
  classLabel,
  onClose,
  onSaveReport,
  profile,
  recordRow,
  sociometricReport,
}) {
  const [activeReportStep, setActiveReportStep] = useState('prepare')
  const [saveStatus, setSaveStatus] = useState('')
  const [tutorComment, setTutorComment] = useState(profile?.student?.tutorialReportComment || '')
  const [reportAreaFilter, setReportAreaFilter] = useState('all')
  const [reportSubjectFilter, setReportSubjectFilter] = useState('all')
  const [printSections, setPrintSections] = useState(
    profile?.student?.tutorialReportSections || {
      executiveSummary: true,
      performanceSummary: true,
      competencyDetail: false,
      trackingSummary: true,
      trackingEvidence: false,
      tutorComment: true,
      sociometric: true,
    },
  )
  const records = recordRow?.records || []
  const hasTracking = records.length > 0
  const reportDate = getTodayDateInput()
  const executiveSummary = getProfileExecutiveSummary(profile, records)
  const reportAreaOptions = Object.values(
    profile.evaluatedCompetencies.reduce(
      (areas, item) => ({ ...areas, [item.areaId]: { id: item.areaId, name: item.areaName } }),
      {},
    ),
  ).sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const reportSubjectOptions = Array.from(new Set(profile.evaluatedCompetencies.map((item) => item.subject))).sort(
    (a, b) => a.localeCompare(b, 'ca'),
  )
  const filteredCompetencies = profile.evaluatedCompetencies.filter(
    (item) =>
      (reportAreaFilter === 'all' || item.areaId === reportAreaFilter) &&
      (reportSubjectFilter === 'all' || item.subject === reportSubjectFilter),
  )
  const profileAreaSummaries = getProfileAreaSummaries(profile)
  const profileSubjectSummaries = getProfileSubjectSummaries(profile)
  const profileSubjectTrackingSummaries = getProfileSubjectTrackingSummaries(profile)
  const weakestSubjects = profileSubjectSummaries.filter((subject) => subject.notDeveloped > 0).slice(0, 4)
  const strongestSubjects = profileSubjectSummaries
    .filter((subject) => subject.evaluated > 0 && subject.notDeveloped === 0)
    .sort((a, b) => b.averageScore - a.averageScore || a.subject.localeCompare(b.subject, 'ca'))
    .slice(0, 4)
  const groupedByArea = Object.values(
    filteredCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || { name: item.areaName, rows: [] }
      area.rows.push(item)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )
  const selectedPrintSections = Object.values(printSections).filter(Boolean).length
  const togglePrintSection = (section) => {
    setPrintSections((current) => ({ ...current, [section]: !current[section] }))
  }
  const saveReportDraft = async () => {
    setSaveStatus('saving')
    await onSaveReport({
      tutorialReportComment: tutorComment,
      tutorialReportSections: printSections,
      tutorialReportUpdatedAt: new Date().toISOString(),
    })
    setSaveStatus('saved')
  }
  const generatePdf = async () => {
    if (selectedPrintSections === 0) return
    await saveReportDraft()
    setActiveReportStep('preview')
    window.setTimeout(printTutorialProfile, 80)
  }

  return (
    <Modal
      onClose={onClose}
      panelClassName="tutorial-print-panel"
      size="xl"
      title={`Informe tutorial · ${profile.student.name}`}
    >
      <div className="tutorial-profile-modal">
        <div className="tutorial-report-workflow-header">
          <div className="tutorial-report-step-tabs" aria-label="Passos de l’informe">
            <button
              className={activeReportStep === 'prepare' ? 'active' : ''}
              onClick={() => setActiveReportStep('prepare')}
              type="button"
            >
              1. Preparar
            </button>
            <button
              className={activeReportStep === 'config' ? 'active' : ''}
              onClick={() => setActiveReportStep('config')}
              type="button"
            >
              2. Configurar
            </button>
            <button
              className={activeReportStep === 'preview' ? 'active' : ''}
              onClick={() => setActiveReportStep('preview')}
              type="button"
            >
              3. Previsualitzar
            </button>
          </div>
          <div className="tutorial-report-workflow-actions">
            <span className={saveStatus === 'saved' ? 'saved' : ''}>
              {saveStatus === 'saving' ? 'Desant…' : saveStatus === 'saved' ? 'Esborrany desat' : 'En preparació'}
            </span>
            <button className="secondary-action compact" onClick={saveReportDraft} type="button">
              <Save size={16} />
              Desar
            </button>
            <button
              className="primary-action compact"
              disabled={selectedPrintSections === 0}
              onClick={generatePdf}
              type="button"
            >
              <FileDown size={16} />
              Generar PDF
            </button>
          </div>
        </div>

        {activeReportStep === 'prepare' && (
          <div className="tutorial-report-prepare">
            <section className={`tutorial-executive-summary ${executiveSummary.tone}`}>
              <div className="tutorial-report-section-heading">
                <div>
                  <span>Síntesi automàtica</span>
                  <strong>{executiveSummary.title}</strong>
                </div>
                <small>{profile.notDevelopedCount} no assolides · {records.length} registres</small>
              </div>
              <ul>
                {executiveSummary.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <p>{executiveSummary.action}</p>
            </section>

            <section className="tutorial-tutor-comment-section">
              <div className="tutorial-report-section-heading">
                <div>
                  <span>Peça principal de l’informe</span>
                  <strong>Comentari del tutor</strong>
                </div>
                <small>{tutorComment.length}/{TUTORING_TEXT_LIMIT}</small>
              </div>
              <textarea
                className="tutorial-tutor-comment-editor"
                maxLength={TUTORING_TEXT_LIMIT}
                onChange={(event) => {
                  setTutorComment(event.target.value)
                  setSaveStatus('')
                }}
                placeholder="Què preocupa? Què ha millorat? Quin acord o seguiment proposem?"
                value={tutorComment}
              />
            </section>

            <div className="tutorial-report-quick-facts">
              <article>
                <span>Focus acadèmic</span>
                <strong>{profile.weakestArea?.name || 'Sense focus delicat'}</strong>
                <small>{profile.notDevelopedCount} competències no assolides</small>
              </article>
              <article>
                <span>Seguiment</span>
                <strong>{records.length}</strong>
                <small>{hasTracking ? 'registres disponibles' : 'sense registres tutorials'}</small>
              </article>
              <article>
                <span>Situació social</span>
                <strong>{sociometricReport?.category || 'Sense lectura'}</strong>
                <small>{sociometricReport ? 'lectura sociomètrica disponible' : 'encara sense dades'}</small>
              </article>
            </div>

            <div className="tutorial-report-accordions">
              <details>
                <summary>
                  <span>Rendiment acadèmic</span>
                  <small>{profile.evaluatedCount} avaluades · {profile.notDevelopedCount} no assolides</small>
                </summary>
                <div className="tutorial-profile-summary">
                  <article><span>Avaluades</span><strong>{profile.evaluatedCount}</strong></article>
                  <article><span>No assolides</span><strong>{profile.notDevelopedCount}</strong></article>
                  <article><span>Percentatge</span><strong>{formatPercent(profile.notDevelopedPercent)}</strong></article>
                  <article><span>Àrea delicada</span><strong>{profile.weakestArea?.name || '-'}</strong></article>
                </div>
              </details>
              <details>
                <summary>
                  <span>Seguiment tutorial</span>
                  <small>{records.length} registres</small>
                </summary>
                <div className="tutorial-profile-summary tracking">
                  {TUTORING_RECORD_TYPES.map((type) => (
                    <article className={type.tone} key={type.id}>
                      <span>{type.label}</span>
                      <strong>{countByType(records, type.id)}</strong>
                    </article>
                  ))}
                </div>
              </details>
              <details>
                <summary>
                  <span>Lectura sociomètrica</span>
                  <small>{sociometricReport ? 'Disponible' : 'Sense dades'}</small>
                </summary>
                <SociometricStudentInsightCard report={sociometricReport} />
              </details>
            </div>

            <button className="tutorial-report-config-summary" onClick={() => setActiveReportStep('config')} type="button">
              <div>
                <SlidersHorizontal size={19} />
                <span>
                  <strong>{selectedPrintSections} seccions incloses</strong>
                  <small>Tria l’informe breu o afegeix annexos</small>
                </span>
              </div>
              <ArrowRightLeft size={18} />
            </button>
          </div>
        )}

        {activeReportStep === 'config' && (
          <section className="tutorial-print-options">
            <div className="tutorial-report-config-intro">
              <span>Configuració del document</span>
              <h3>Què vols incloure?</h3>
              <p>L’informe breu és la millor opció per a reunions. Els annexos afegeixen el detall complet.</p>
            </div>
            <div className="tutorial-print-option-groups">
              <section>
                <h4>Informe breu · recomanat</h4>
                <div className="tutorial-print-option-grid">
                  {[
                    ['executiveSummary', 'Síntesi tutorial'],
                    ['tutorComment', 'Comentari del tutor'],
                    ['performanceSummary', 'Resum acadèmic'],
                    ['trackingSummary', 'Resum de seguiment'],
                    ['sociometric', 'Lectura sociomètrica'],
                  ].map(([id, label]) => (
                    <label key={id}>
                      <input checked={printSections[id]} onChange={() => togglePrintSection(id)} type="checkbox" />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h4>Annexos opcionals</h4>
                <div className="tutorial-print-option-grid">
                  <label>
                    <input
                      checked={printSections.competencyDetail}
                      onChange={() => togglePrintSection('competencyDetail')}
                      type="checkbox"
                    />
                    Detall de competències
                  </label>
                  <label>
                    <input
                      checked={printSections.trackingEvidence}
                      onChange={() => togglePrintSection('trackingEvidence')}
                      type="checkbox"
                    />
                    Evidències completes
                  </label>
                </div>
              </section>
            </div>
            {(printSections.competencyDetail || printSections.trackingEvidence) && (
              <div className="tutorial-report-filter-grid">
                <label>
                  Àrea del detall
                  <select
                    onChange={(event) => {
                      setReportAreaFilter(event.target.value)
                      setReportSubjectFilter('all')
                    }}
                    value={reportAreaFilter}
                  >
                    <option value="all">Totes les àrees</option>
                    {reportAreaOptions.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Assignatura del detall
                  <select onChange={(event) => setReportSubjectFilter(event.target.value)} value={reportSubjectFilter}>
                    <option value="all">Totes les assignatures</option>
                    {reportSubjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {selectedPrintSections === 0 && (
              <strong className="tutorial-print-warning">Selecciona almenys una secció.</strong>
            )}
          </section>
        )}

        {activeReportStep === 'preview' && (
          <div className="tutorial-report-preview">
            <div className="tutorial-report-preview-note">
              <Eye size={18} />
              <p>Aquesta és la composició que s’enviarà a la impressió. Revisa-la abans de generar el PDF.</p>
              <button className="secondary-action compact" onClick={() => setActiveReportStep('prepare')} type="button">
                Tornar a editar
              </button>
            </div>
            <TutorialReportDocument
              classLabel={classLabel}
              executiveSummary={executiveSummary}
              filteredCompetencies={filteredCompetencies}
              groupedByArea={groupedByArea}
              hasTracking={hasTracking}
              printSections={printSections}
              profile={profile}
              profileAreaSummaries={profileAreaSummaries}
              profileSubjectTrackingSummaries={profileSubjectTrackingSummaries}
              records={records}
              reportDate={reportDate}
              sociometricReport={sociometricReport}
              strongestSubjects={strongestSubjects}
              tutorComment={tutorComment}
              weakestSubjects={weakestSubjects}
            />
          </div>
        )}

        <div className="tutorial-report-print-source" aria-hidden="true">
          <TutorialReportDocument
            classLabel={classLabel}
            executiveSummary={executiveSummary}
            filteredCompetencies={filteredCompetencies}
            groupedByArea={groupedByArea}
            hasTracking={hasTracking}
            printSections={printSections}
            profile={profile}
            profileAreaSummaries={profileAreaSummaries}
            profileSubjectTrackingSummaries={profileSubjectTrackingSummaries}
            records={records}
            reportDate={reportDate}
            sociometricReport={sociometricReport}
            strongestSubjects={strongestSubjects}
            tutorComment={tutorComment}
            weakestSubjects={weakestSubjects}
          />
        </div>
      </div>
    </Modal>
  )
}

function TutorialRecordStudentModal({ onClose, onDelete, row }) {
  if (!row) return null

  return (
    <Modal onClose={onClose} size="lg" title={`Seguiment tutorial: ${row.student.name}`}>
      <div className="tutorial-record-modal">
        <section className="tutorial-record-modal-summary">
          {TUTORING_RECORD_TYPES.map((type) => (
            <article className={type.tone} key={type.id}>
              <span>{type.label}</span>
              <strong>{countByType(row.records, type.id)}</strong>
            </article>
          ))}
        </section>

        {row.records.length === 0 ? (
          <div className="empty-state compact">Aquest alumne encara no té registres tutorials.</div>
        ) : (
          <div className="tutorial-record-history">
            {row.records
              .slice()
              .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
              .map((record) => {
                const typeMeta = getRecordTypeMeta(record.type)
                return (
                  <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                    <div>
                      <strong>{typeMeta.label}</strong>
                      <span>{formatShortDate(record.date)}</span>
                      <p>{record.note || 'Sense comentari afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => onDelete(record.id)}
                      title="Eliminar registre"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                )
              })}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function TutoringView() {
  const sociogramCanvasRef = useRef(null)
  const sociogramDragRef = useRef(null)
  const [activePanel, setActivePanel] = useState('evaluation')
  const [areaFilter, setAreaFilter] = useState('all')
  const [diagnosisAreaFilter, setDiagnosisAreaFilter] = useState('all')
  const [diagnosisSubjectFilter, setDiagnosisSubjectFilter] = useState('all')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [profileFilter, setProfileFilter] = useState('priority')
  const [profileSearch, setProfileSearch] = useState('')
  const [profileAreaFilter, setProfileAreaFilter] = useState('all')
  const [profileSubjectFilter, setProfileSubjectFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('auto')
  const [selectedTutorialProfileId, setSelectedTutorialProfileId] = useState('')
  const [selectedTutorialRecordStudentId, setSelectedTutorialRecordStudentId] = useState('')
  const [selectedModifiedStudentId, setSelectedModifiedStudentId] = useState('')
  const [selectedExemptionStudentId, setSelectedExemptionStudentId] = useState('')
  const [selectedDoipStudentId, setSelectedDoipStudentId] = useState('')
  const [doipDraft, setDoipDraft] = useState('')
  const [showExemptionConfig, setShowExemptionConfig] = useState(false)
  const [showModifiedCompetencyConfig, setShowModifiedCompetencyConfig] = useState(false)
  const [exemptionForm, setExemptionForm] = useState({ studentId: '', subject: '' })
  const [modifiedCompetencyForm, setModifiedCompetencyForm] = useState({ studentId: '', subject: '' })
  const [recordForm, setRecordForm] = useState({
    agendaKind: 'work',
    studentId: '',
    type: 'agenda',
    date: getTodayDateInput(),
    note: '',
  })
  const [relationForm, setRelationForm] = useState({
    sourceStudentId: '',
    targetStudentId: '',
    type: 'positive',
    strength: '3',
    note: '',
  })
  const [relationSearch, setRelationSearch] = useState({ source: '', target: '' })
  const [selectedRelationStudentId, setSelectedRelationStudentId] = useState('')
  const [activeRelationshipTool, setActiveRelationshipTool] = useState('')
  const [selectedSociometricStatKey, setSelectedSociometricStatKey] = useState('')
  const [sociometricPasteText, setSociometricPasteText] = useState('')
  const [sociometricImportMessage, setSociometricImportMessage] = useState('')
  const [sociometricSurveyMessage, setSociometricSurveyMessage] = useState('')
  const [sociometricSurveyBusy, setSociometricSurveyBusy] = useState('')
  const [sociometricResponseCounts, setSociometricResponseCounts] = useState({})
  const [selectedSociometricReportType, setSelectedSociometricReportType] = useState('quick')
  const [selectedSociometricReportStudentId, setSelectedSociometricReportStudentId] = useState('')
  const [selectedSociometricComparisonEnd, setSelectedSociometricComparisonEnd] = useState('current')
  const [selectedSociometricComparisonStart, setSelectedSociometricComparisonStart] = useState('')
  const [sociometricReportSections, setSociometricReportSections] = useState(DEFAULT_SOCIOMETRIC_REPORT_SECTIONS.quick)
  const [selectedSociometricReportStudentIds, setSelectedSociometricReportStudentIds] = useState([])
  const [sociogramFilter, setSociogramFilter] = useState('all')
  const [sociogramOnlyReciprocal, setSociogramOnlyReciprocal] = useState(false)
  const [sociogramDraftPositions, setSociogramDraftPositions] = useState({})
  const [cooperativeGroupSize, setCooperativeGroupSize] = useState('4')
  const [cooperativeStrategy, setCooperativeStrategy] = useState('balanced')
  const [prioritizeHalfGroups, setPrioritizeHalfGroups] = useState(true)
  const [cooperativeGroupSetName, setCooperativeGroupSetName] = useState('')
  const [cooperativeGroupSetObservation, setCooperativeGroupSetObservation] = useState('')
  const [cooperativeSourceGroupSetId, setCooperativeSourceGroupSetId] = useState('')
  const [manualCooperativeGroups, setManualCooperativeGroups] = useState([])
  const [selectedCooperativeGroupSetId, setSelectedCooperativeGroupSetId] = useState('')
  const [selectedCooperativeGroupId, setSelectedCooperativeGroupId] = useState('')
  const [cooperativeEditDraft, setCooperativeEditDraft] = useState(EMPTY_COOPERATIVE_EDIT_DRAFT)
  const [cooperativeEditHistory, setCooperativeEditHistory] = useState({ future: [], past: [] })
  const [cooperativeLockedStudentIds, setCooperativeLockedStudentIds] = useState([])
  const [cooperativeRenameDraft, setCooperativeRenameDraft] = useState('')
  const [cooperativeCopyMessage, setCooperativeCopyMessage] = useState('')
  const [showCooperativeProjection, setShowCooperativeProjection] = useState(false)
  const [cooperativeWorkspacePanel, setCooperativeWorkspacePanel] = useState('')
  const [seatingLayout, setSeatingLayout] = useState(() =>
    normalizeSeatingLayout({ blocks: DEFAULT_SEATING_BLOCKS, rows: SEATING_GRID_ROWS }),
  )
  const [seatingStructureDraft, setSeatingStructureDraft] = useState({
    blocks: DEFAULT_SEATING_BLOCKS,
    rows: SEATING_GRID_ROWS,
  })
  const [seatingWorkspacePanel, setSeatingWorkspacePanel] = useState('structure')
  const [seatingManualSeatByStudentId, setSeatingManualSeatByStudentId] = useState({})
  const [seatingManualEmptySeatIds, setSeatingManualEmptySeatIds] = useState([])
  const [seatingLockedStudentIds, setSeatingLockedStudentIds] = useState([])
  const [seatingVariant, setSeatingVariant] = useState(0)
  const [seatingIterationObjective, setSeatingIterationObjective] = useState('balanced')
  const [seatingIterationZone, setSeatingIterationZone] = useState('front')
  const [seatingIterationMessage, setSeatingIterationMessage] = useState('')
  const [seatingPrioritizeHalfGroups, setSeatingPrioritizeHalfGroups] = useState(true)
  const [seatingProblemSeats, setSeatingProblemSeats] = useState({})
  const [seatingAppliedProblemSeats, setSeatingAppliedProblemSeats] = useState({})
  const [seatingUnseatedStudentIds, setSeatingUnseatedStudentIds] = useState([])
  const [seatingPlanName, setSeatingPlanName] = useState('')
  const [seatingPlanObservation, setSeatingPlanObservation] = useState('')
  const [seatingSaveAsActive, setSeatingSaveAsActive] = useState(false)
  const [draggingSeatingStudentId, setDraggingSeatingStudentId] = useState('')
  const [selectedSeatingPlanId, setSelectedSeatingPlanId] = useState('')
  const [loadedSeatingPlanId, setLoadedSeatingPlanId] = useState('')
  const [comparisonSeatingPlanId, setComparisonSeatingPlanId] = useState('')
  const [selectedSeatingStudentId, setSelectedSeatingStudentId] = useState('')
  const [seatingMoveStudentId, setSeatingMoveStudentId] = useState('')
  const [seatingBlockSeatMode, setSeatingBlockSeatMode] = useState(false)
  const [seatingRestrictionTargetId, setSeatingRestrictionTargetId] = useState('')
  const [seatingQualityBaseline, setSeatingQualityBaseline] = useState(null)
  const [seatingRestrictions, setSeatingRestrictions] = useState(getEmptySeatingRestrictions)
  const [shareTutoringEmail, setShareTutoringEmail] = useState('')
  const [shareTutoringMessage, setShareTutoringMessage] = useState('')
  const [shareTutoringBusy, setShareTutoringBusy] = useState('')
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const students = useAvaluaproStore((state) => state.students)
  const marks = useAvaluaproStore((state) => state.marks)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const semesters = useAvaluaproStore((state) => state.semesters)
  const uts = useAvaluaproStore((state) => state.uts)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const tutorialRelations = useAvaluaproStore((state) => state.tutorialRelations)
  const sociometricSurveys = useAvaluaproStore((state) => state.sociometricSurveys)
  const tutorialGroupSets = useAvaluaproStore((state) => state.tutorialGroupSets)
  const tutorialSociometricMoments = useAvaluaproStore((state) => state.tutorialSociometricMoments)
  const tutorialSociogramLayouts = useAvaluaproStore((state) => state.tutorialSociogramLayouts)
  const tutorialStudentRoles = useAvaluaproStore((state) => state.tutorialStudentRoles)
  const tutorialSeatingPlans = useAvaluaproStore((state) => state.tutorialSeatingPlans)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const updateStudent = useAvaluaproStore((state) => state.updateStudent)
  const importTutorialMarks = useAvaluaproStore((state) => state.importTutorialMarks)
  const addTutorialRecord = useAvaluaproStore((state) => state.addTutorialRecord)
  const deleteTutorialRecord = useAvaluaproStore((state) => state.deleteTutorialRecord)
  const upsertTutorialRelation = useAvaluaproStore((state) => state.upsertTutorialRelation)
  const importTutorialRelations = useAvaluaproStore((state) => state.importTutorialRelations)
  const createSociometricSurvey = useAvaluaproStore((state) => state.createSociometricSurvey)
  const deleteSociometricSurvey = useAvaluaproStore((state) => state.deleteSociometricSurvey)
  const setSociometricSurveyStatus = useAvaluaproStore((state) => state.setSociometricSurveyStatus)
  const syncSociometricSurveyResponses = useAvaluaproStore((state) => state.syncSociometricSurveyResponses)
  const captureTutorialSociometricMoment = useAvaluaproStore((state) => state.captureTutorialSociometricMoment)
  const saveTutorialGroupSet = useAvaluaproStore((state) => state.saveTutorialGroupSet)
  const deleteTutorialGroupSet = useAvaluaproStore((state) => state.deleteTutorialGroupSet)
  const upsertTutorialSociogramLayout = useAvaluaproStore((state) => state.upsertTutorialSociogramLayout)
  const resetTutorialSociogramLayout = useAvaluaproStore((state) => state.resetTutorialSociogramLayout)
  const toggleTutorialStudentRole = useAvaluaproStore((state) => state.toggleTutorialStudentRole)
  const saveTutorialSeatingPlan = useAvaluaproStore((state) => state.saveTutorialSeatingPlan)
  const updateTutorialSeatingPlan = useAvaluaproStore((state) => state.updateTutorialSeatingPlan)
  const deleteTutorialSeatingPlan = useAvaluaproStore((state) => state.deleteTutorialSeatingPlan)
  const shareTutoringClass = useAvaluaproStore((state) => state.shareTutoringClass)
  const syncSharedTutoringClass = useAvaluaproStore((state) => state.syncSharedTutoringClass)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = useMemo(
    () => students.filter((student) => student.classId === linkedClassId).sort((a, b) => a.name.localeCompare(b.name, 'ca')),
    [linkedClassId, students],
  )
  const classTutorialRecords = useMemo(
    () => tutorialRecords.filter((record) => record.classId === activeClassId),
    [activeClassId, tutorialRecords],
  )
  const classTutorialRelations = useMemo(
    () => tutorialRelations.filter((relation) => relation.classId === activeClassId),
    [activeClassId, tutorialRelations],
  )
  const classSociometricSurveys = useMemo(
    () =>
      (sociometricSurveys || [])
        .filter((survey) => survey.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    [activeClassId, sociometricSurveys],
  )
  const classTutorialSociometricMoments = useMemo(
    () =>
      (tutorialSociometricMoments || [])
        .filter((moment) => moment.classId === activeClassId)
        .sort((a, b) => String(a.capturedAt || a.createdAt || '').localeCompare(String(b.capturedAt || b.createdAt || ''))),
    [activeClassId, tutorialSociometricMoments],
  )
  const activeSociometricSurvey =
    classSociometricSurveys.find((survey) => survey.status === 'active') || classSociometricSurveys[0] || null
  const activeSociometricSurveyLinks = useMemo(
    () =>
      (activeSociometricSurvey?.accessTokens || []).map((access) => ({
        ...access,
        url: `${window.location.origin}${import.meta.env.BASE_URL}?sociometric=${activeSociometricSurvey.id}&token=${access.token}`,
      })),
    [activeSociometricSurvey],
  )
  const activeSociometricSurveyUrl = activeSociometricSurveyLinks[0]?.url || ''
  const activeSociometricSurveyLinksText = activeSociometricSurveyLinks
    .map((access) => `${access.studentName}\t${access.url}`)
    .join('\n')
  const activeSociometricResponseCount =
    activeSociometricSurvey?.id && Object.prototype.hasOwnProperty.call(sociometricResponseCounts, activeSociometricSurvey.id)
      ? sociometricResponseCounts[activeSociometricSurvey.id]
      : activeSociometricSurvey?.responseCount || 0
  const classTutorialStudentRoles = useMemo(
    () => (tutorialStudentRoles || []).filter((role) => role.classId === activeClassId),
    [activeClassId, tutorialStudentRoles],
  )
  const tutorialRoleRowsByStudent = useMemo(
    () => buildTutorialRoleRows(classStudents, classTutorialStudentRoles),
    [classStudents, classTutorialStudentRoles],
  )
  const effectiveTutorialRelations = useMemo(
    () =>
      buildEffectiveTutorialRelations({
        relations: classTutorialRelations,
        rolesByStudentId: tutorialRoleRowsByStudent,
        students: classStudents,
      }),
    [classStudents, classTutorialRelations, tutorialRoleRowsByStudent],
  )
  const classTutorialGroupSets = useMemo(
    () =>
      (tutorialGroupSets || [])
        .filter((groupSet) => groupSet.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    [activeClassId, tutorialGroupSets],
  )
  const classTutorialSociogramLayout = useMemo(
    () => (tutorialSociogramLayouts || []).find((layout) => layout.classId === activeClassId) || null,
    [activeClassId, tutorialSociogramLayouts],
  )
  const classTutorialSeatingPlan = useMemo(
    () => {
      const sortedPlans = (tutorialSeatingPlans || [])
        .filter((plan) => plan.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      return sortedPlans.find((plan) => plan.isActive) || sortedPlans[0] || null
    },
    [activeClassId, tutorialSeatingPlans],
  )
  const classTutorialSeatingPlans = useMemo(
    () =>
      (tutorialSeatingPlans || [])
        .filter((plan) => plan.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    [activeClassId, tutorialSeatingPlans],
  )
  const savedSociogramPositionsByStudentId = useMemo(
    () =>
      new Map(
        (classTutorialSociogramLayout?.positions || []).map((position) => [
          position.studentId,
          { x: position.x, y: position.y },
        ]),
      ),
    [classTutorialSociogramLayout],
  )
  const sociogramPositionsByStudentId = useMemo(
    () =>
      new Map([
        ...savedSociogramPositionsByStudentId,
        ...Object.entries(sociogramDraftPositions).map(([studentId, position]) => [
          studentId,
          { x: position.x, y: position.y },
        ]),
      ]),
    [savedSociogramPositionsByStudentId, sociogramDraftPositions],
  )
  const sociogramManualPositionCount = sociogramPositionsByStudentId.size
  const hasManualSociogramLayout = sociogramManualPositionCount > 0
  const subjectOptions = useMemo(() => getSubjectOptionsForArea(areaFilter), [areaFilter])
  const allSubjectOptions = useMemo(() => getAllTutorialSubjectOptions(), [])
  const diagnosisSubjectOptions = useMemo(() => getSubjectOptionsForArea(diagnosisAreaFilter), [diagnosisAreaFilter])
  const profileSubjectOptions = useMemo(() => getSubjectOptionsForArea(profileAreaFilter), [profileAreaFilter])
  const bulkImportColumns = useMemo(() => buildTutorialImportColumns(allSubjectOptions), [allSubjectOptions])
  const autoSubject =
    linkedClass?.subject && SUBJECT_STRUCTURES[linkedClass.subject] ? linkedClass.subject : subjectOptions[0]?.subject
  const selectedSubject = subjectFilter === 'auto' ? autoSubject : subjectFilter
  const selectedSubjectArea = getSubjectArea(selectedSubject)
  const selectedCompetencies = useMemo(() => buildTutorialCompetencies(selectedSubject), [selectedSubject])
  const exemptionRows = useMemo(
    () =>
      classStudents
        .map((student) => ({
          student,
          subjects: (student.tutorialExemptSubjects || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ca')),
        }))
        .filter((row) => row.subjects.length > 0),
    [classStudents],
  )
  const intelligenceSummary = useMemo(
    () =>
      MULTIPLE_INTELLIGENCE_OPTIONS.map((option) => ({
        ...option,
        count: classStudents.filter((student) => student.multipleIntelligences?.includes(option.id)).length,
      })).filter((option) => option.count > 0),
    [classStudents],
  )
  const evaluationContext = useMemo(
    () => ({
      criteria,
      competencies,
      linkedClassId,
      linkedSubject: linkedClass?.subject,
      marks,
      semesters,
      uts,
    }),
    [criteria, competencies, linkedClass?.subject, linkedClassId, marks, semesters, uts],
  )
  const modifiedCompetencyRows = useMemo(
    () =>
      getTutorialModifiedCompetencyRows({
        allSubjectOptions,
        classId: activeClassId,
        evaluationContext,
        students: classStudents,
        tutorialMarks,
      }),
    [activeClassId, allSubjectOptions, classStudents, evaluationContext, tutorialMarks],
  )
  const selectedModifiedRow = modifiedCompetencyRows.find((row) => row.student.id === selectedModifiedStudentId)
  const modifiedConfigStudent =
    classStudents.find((student) => student.id === modifiedCompetencyForm.studentId) || classStudents[0]
  const modifiedConfigSubject =
    modifiedCompetencyForm.subject || selectedSubject || linkedClass?.subject || allSubjectOptions[0]?.subject || ''
  const modifiedConfigCompetencies = useMemo(
    () => buildTutorialCompetencies(modifiedConfigSubject),
    [modifiedConfigSubject],
  )
  const selectedExemptionRow = exemptionRows.find((row) => row.student.id === selectedExemptionStudentId)
  const exemptionConfigStudent = classStudents.find((student) => student.id === exemptionForm.studentId) || classStudents[0]
  const exemptionConfigSubject =
    exemptionForm.subject || selectedSubject || linkedClass?.subject || allSubjectOptions[0]?.subject || ''

  const isSelectedSubjectLinked = Boolean(selectedSubject && selectedSubject === linkedClass?.subject)
  const toggleStudentArrayValue = async (student, field, value) => {
    const currentValues = Array.isArray(student[field]) ? student[field] : []
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value]
    await updateStudent(student.id, { [field]: nextValues })
  }
  const openModifiedCompetencyConfig = (studentId = '', subject = '') => {
    setModifiedCompetencyForm({
      studentId: studentId || classStudents[0]?.id || '',
      subject: subject || selectedSubject || linkedClass?.subject || allSubjectOptions[0]?.subject || '',
    })
    setShowModifiedCompetencyConfig(true)
  }
  const openExemptionConfig = (studentId = '', subject = '') => {
    setExemptionForm({
      studentId: studentId || classStudents[0]?.id || '',
      subject: subject || selectedSubject || linkedClass?.subject || allSubjectOptions[0]?.subject || '',
    })
    setShowExemptionConfig(true)
  }
  const linkedGradeCount = useMemo(() => {
    if (!isSelectedSubjectLinked || classStudents.length === 0 || selectedCompetencies.length === 0) return 0

    return classStudents.reduce(
      (studentTotal, student) =>
        studentTotal +
        selectedCompetencies.filter((competency) => {
          const gradeSource = getTutorialCompetencyGradeSource({
            classId: activeClassId,
            competency,
            evaluationContext,
            student,
            studentId: student.id,
            subject: selectedSubject,
            tutorialMarks,
          })
          return gradeSource.source === 'linked'
        }).length,
      0,
    )
  }, [
    activeClassId,
    classStudents,
    evaluationContext,
    isSelectedSubjectLinked,
    selectedCompetencies,
    selectedSubject,
    tutorialMarks,
  ])
  const tutorialSummary = useMemo(
    () =>
      summarizeTutorialData({
        classId: activeClassId,
        evaluationContext,
        students: classStudents,
        tutorialMarks,
      }),
    [activeClassId, classStudents, evaluationContext, tutorialMarks],
  )
  const diagnosisSummary = useMemo(
    () =>
      summarizeTutorialData({
        areaFilter: diagnosisAreaFilter,
        classId: activeClassId,
        evaluationContext,
        students: classStudents,
        subjectFilter: diagnosisSubjectFilter,
        tutorialMarks,
      }),
    [activeClassId, classStudents, diagnosisAreaFilter, diagnosisSubjectFilter, evaluationContext, tutorialMarks],
  )
  const subjectCompletion = useMemo(() => {
    const entries = subjectOptions.map((item) => {
      const subjectCompetencies = buildTutorialCompetencies(item.subject)
      const eligibleStudents = classStudents.filter(
        (student) => !student.tutorialExemptSubjects?.includes(item.subject),
      )
      const total = eligibleStudents.length * subjectCompetencies.length
      const completed = eligibleStudents.reduce(
        (studentTotal, student) =>
          studentTotal +
          subjectCompetencies.filter((competency) =>
            getTutorialCompetencyGrade({
              classId: activeClassId,
              competency,
              evaluationContext,
              student,
              studentId: student.id,
              subject: item.subject,
              tutorialMarks,
            }),
          ).length,
        0,
      )

      return [item.subject, { completed, total }]
    })

    return new Map(entries)
  }, [activeClassId, classStudents, evaluationContext, subjectOptions, tutorialMarks])
  const tutorialRecordSummary = useMemo(
    () => summarizeTutorialRecords({ students: classStudents, records: classTutorialRecords }),
    [classStudents, classTutorialRecords],
  )
  const tutorialRelationSummary = useMemo(
    () => summarizeTutorialRelations({ students: classStudents, relations: classTutorialRelations }),
    [classStudents, classTutorialRelations],
  )
  const sociometricPreview = useMemo(
    () => parseSociometricResponseText(sociometricPasteText, classStudents),
    [classStudents, sociometricPasteText],
  )
  const sociometricTemplateText = useMemo(
    () =>
      [
        SOCIOMETRIC_TEMPLATE_HEADER,
        ...classStudents.map((student) => [student.name, '', '', '', '', '', '', ''].join('\t')),
      ].join('\n'),
    [classStudents],
  )
  const sociometricMetrics = useMemo(
    () => summarizeSociometricMetrics({ students: classStudents, relations: classTutorialRelations }),
    [classStudents, classTutorialRelations],
  )
  const sociometricComparisonMomentsById = useMemo(
    () => new Map(classTutorialSociometricMoments.map((moment) => [moment.id, moment])),
    [classTutorialSociometricMoments],
  )
  const sociometricComparisonOptions = useMemo(() => {
    if (classTutorialSociometricMoments.length > 0) {
      return classTutorialSociometricMoments.map((moment, index) => ({
        count: moment.relationCount || moment.relationsSnapshot?.length || 0,
        label: `${index === 0 ? 'Primer moment' : `Moment ${index + 1}`} · ${formatShortDate(
          String(moment.capturedAt || moment.createdAt || '').slice(0, 10),
        )} · ${moment.label || 'Moment guardat'} · ${moment.relationCount || moment.relationsSnapshot?.length || 0} rel.`,
        source: moment.source || 'manual',
        timestamp: moment.capturedAt || moment.createdAt || '',
        value: `moment:${moment.id}`,
      }))
    }

    const timestampMap = new Map()
    classTutorialRelations.forEach((relation) => {
      const timestamp = getSociometricRelationTimestamp(relation)
      if (!timestamp) return
      const current = timestampMap.get(timestamp) || {
        count: 0,
        label: formatShortDate(timestamp.slice(0, 10)),
        timestamp,
        value: timestamp,
      }
      current.count += 1
      timestampMap.set(timestamp, current)
    })

    return [...timestampMap.values()]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((item, index) => ({
        ...item,
        isLegacy: true,
        label: `${index === 0 ? 'Primer moment' : `Moment ${index + 1}`} · ${item.label} · ${item.count} rel.`,
        value: `legacy:${item.value}`,
      }))
  }, [classTutorialRelations, classTutorialSociometricMoments])
  const effectiveSociometricComparisonStart =
    selectedSociometricComparisonStart || sociometricComparisonOptions[0]?.value || 'current'
  const effectiveSociometricComparisonEnd =
    selectedSociometricComparisonEnd === 'current'
      ? 'current'
      : selectedSociometricComparisonEnd || sociometricComparisonOptions.at(-1)?.value || 'current'
  const sociometricComparisonStartRelations = useMemo(
    () =>
      getSociometricComparisonRelations({
        currentRelations: classTutorialRelations,
        momentsById: sociometricComparisonMomentsById,
        value: effectiveSociometricComparisonStart,
      }),
    [classTutorialRelations, effectiveSociometricComparisonStart, sociometricComparisonMomentsById],
  )
  const sociometricComparisonEndRelations = useMemo(
    () =>
      getSociometricComparisonRelations({
        currentRelations: classTutorialRelations,
        momentsById: sociometricComparisonMomentsById,
        value: effectiveSociometricComparisonEnd,
      }),
    [classTutorialRelations, effectiveSociometricComparisonEnd, sociometricComparisonMomentsById],
  )
  const sociometricComparisonStartMetrics = useMemo(
    () => summarizeSociometricMetrics({ students: classStudents, relations: sociometricComparisonStartRelations }),
    [classStudents, sociometricComparisonStartRelations],
  )
  const sociometricComparisonEndMetrics = useMemo(
    () => summarizeSociometricMetrics({ students: classStudents, relations: sociometricComparisonEndRelations }),
    [classStudents, sociometricComparisonEndRelations],
  )
  const sociometricComparativeReport = useMemo(
    () =>
      buildSociometricComparisonReport({
        endMetrics: sociometricComparisonEndMetrics,
        startMetrics: sociometricComparisonStartMetrics,
        students: classStudents,
      }),
    [classStudents, sociometricComparisonEndMetrics, sociometricComparisonStartMetrics],
  )
  const sociometricImpactReport = useMemo(
    () =>
      buildSociometricImpactReport({
        comparisonReport: sociometricComparativeReport,
        endTimestamp: getSociometricComparisonOptionTimestamp(
          effectiveSociometricComparisonEnd,
          sociometricComparisonMomentsById,
        ),
        groupSets: classTutorialGroupSets,
        relations: classTutorialRelations,
        seatingPlans: classTutorialSeatingPlans,
        startTimestamp: getSociometricComparisonOptionTimestamp(
          effectiveSociometricComparisonStart,
          sociometricComparisonMomentsById,
        ),
        tutorialRecords: classTutorialRecords,
      }),
    [
      classTutorialGroupSets,
      classTutorialRecords,
      classTutorialRelations,
      classTutorialSeatingPlans,
      effectiveSociometricComparisonEnd,
      effectiveSociometricComparisonStart,
      sociometricComparisonMomentsById,
      sociometricComparativeReport,
    ],
  )
  const tutorialRecordRowsByStudent = useMemo(
    () => new Map(tutorialRecordSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRecordSummary.studentRows],
  )
  const tutorialRelationRowsByStudent = useMemo(
    () => new Map(tutorialRelationSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRelationSummary.studentRows],
  )
  const diagnosisGroupSummary = useMemo(
    () =>
      summarizeTutorialGroup({
        recordRowsByStudent: tutorialRecordRowsByStudent,
        tutorialRecordSummary,
        tutorialSummary: diagnosisSummary,
      }),
    [diagnosisSummary, tutorialRecordRowsByStudent, tutorialRecordSummary],
  )
  const sociometricRowsByStudentId = useMemo(
    () => new Map(sociometricMetrics.rows.map((row) => [row.student.id, row])),
    [sociometricMetrics.rows],
  )
  const cooperativeProfilesByStudentId = useMemo(
    () =>
      new Map(
        tutorialSummary.studentProfiles.map((profile) => [
          profile.student.id,
          getStudentCooperativeProfile({
            profile,
            recordRow: tutorialRecordRowsByStudent.get(profile.student.id),
            relationRow: tutorialRelationRowsByStudent.get(profile.student.id),
            roleRow: tutorialRoleRowsByStudent.get(profile.student.id),
            sociometricRow: sociometricRowsByStudentId.get(profile.student.id),
          }),
        ]),
      ),
    [
      sociometricRowsByStudentId,
      tutorialRecordRowsByStudent,
      tutorialRelationRowsByStudent,
      tutorialRoleRowsByStudent,
      tutorialSummary.studentProfiles,
    ],
  )
  const selectedTutorialProfile = tutorialSummary.studentProfiles.find(
    (profile) => profile.student.id === selectedTutorialProfileId,
  )
  const selectedTutorialRecordRow = tutorialRecordSummary.studentRows.find(
    (row) => row.student.id === selectedTutorialRecordStudentId,
  )
  const selectedDoipStudent = classStudents.find((student) => student.id === selectedDoipStudentId)
  const selectedDoipRecords = selectedDoipStudent
    ? classTutorialRecords
        .filter((record) => record.studentId === selectedDoipStudent.id && record.type === 'doip')
        .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
    : []
  const selectedRelationRow =
    tutorialRelationSummary.studentRows.find((row) => row.student.id === selectedRelationStudentId) ||
    tutorialRelationSummary.studentRows[0]
  const selectedSociometricReportTypeMeta =
    SOCIOMETRIC_REPORT_TYPES.find((reportType) => reportType.id === selectedSociometricReportType) ||
    SOCIOMETRIC_REPORT_TYPES[0]
  const SelectedSociometricReportIcon = selectedSociometricReportTypeMeta.icon
  const sociometricReportDate = getTodayDateInput()
  const sociometricReportSnapshot = useMemo(() => {
    const rows = sociometricMetrics.rows || []
    const rejectedRows = rows
      .filter((row) => row.category === 'Rebutjat')
      .sort((a, b) => b.avoidReceived - a.avoidReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const isolatedRows = rows
      .filter((row) => row.category === 'Aïllat')
      .sort((a, b) => a.positiveReceived - b.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const leaderRows = rows
      .filter((row) => row.category === 'Líder')
      .sort((a, b) => b.positiveReceived - a.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const priorityNames = [...rejectedRows, ...isolatedRows].slice(0, 4).map((row) => row.student.name)

    return {
      leaderCount: leaderRows.length,
      priorityCount: rejectedRows.length + isolatedRows.length,
      priorityNames,
      relationCount: classTutorialRelations.length,
    }
  }, [classTutorialRelations.length, sociometricMetrics.rows])
  const sociometricQuickReport = useMemo(() => {
    const rows = sociometricMetrics.rows || []
    const rejectedRows = rows
      .filter((row) => row.category === 'Rebutjat')
      .sort((a, b) => b.avoidReceived - a.avoidReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const isolatedRows = rows
      .filter((row) => row.category === 'Aïllat')
      .sort((a, b) => a.positiveReceived - b.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const leaderRows = rows
      .filter((row) => row.category === 'Líder')
      .sort((a, b) => b.positiveReceived - a.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const riskLeaderRows = rows
      .filter(
        (row) =>
          row.category === 'Controvertit' ||
          (row.positiveReceived >= 2 && row.avoidReceived > 0 && row.category !== 'Rebutjat'),
      )
      .sort((a, b) => b.avoidReceived - a.avoidReceived || b.positiveReceived - a.positiveReceived)
    const hasData = classTutorialRelations.length > 0
    const healthScore = Math.round(
      sociometricMetrics.inclusion * 0.35 +
        sociometricMetrics.positivity * 0.25 +
        sociometricMetrics.moreno * 0.2 +
        Math.max(0, 100 - sociometricMetrics.rejectionDensity * 4) * 0.2,
    )
    const healthTone = !hasData ? 'neutral' : healthScore >= 70 ? 'positive' : healthScore >= 45 ? 'warning' : 'danger'
    const healthLabel = !hasData
      ? 'Pendent de dades'
      : healthTone === 'positive'
        ? 'Estable'
        : healthTone === 'warning'
          ? 'A revisar'
          : 'Prioritari'
    const actions = []

    if (!hasData) {
      actions.push('Envia el qüestionari sociomètric i sincronitza respostes abans de prendre decisions de grup.')
    }
    if (rejectedRows.length > 0) {
      actions.push(`Contrasta el cas de ${rejectedRows[0].student.name} abans de fer grups o canvis de lloc.`)
    }
    if (isolatedRows.length > 0) {
      actions.push(`Assigna una parella pont a ${isolatedRows[0].student.name} en una activitat curta i observada.`)
    }
    if (riskLeaderRows.length > 0) {
      actions.push(`Canalitza el lideratge de ${riskLeaderRows[0].student.name} amb una responsabilitat constructiva.`)
    }
    if (leaderRows.length > 0) {
      actions.push(`Fes servir ${leaderRows[0].student.name} com a suport positiu sense exposar-lo com a “ajudant oficial”.`)
    }
    if (sociometricMetrics.moreno < 20 && hasData) {
      actions.push('Programa una dinàmica breu per augmentar reciprocitats: parelles rotatives o tasca cooperativa guiada.')
    }
    if (sociometricMetrics.workRelationCount === 0) {
      actions.push('Afegeix criteri docent de treball per separar el mapa social de les parelles que funcionen a classe.')
    }
    actions.push('Revisa el sociograma després de dues setmanes per comprovar si baixen els rebuigs i augmenta la inclusió.')

    return {
      actions: actions.slice(0, 3),
      hasData,
      healthLabel,
      healthScore,
      healthTone,
      isolatedRows,
      leaderRows,
      rejectedRows,
      riskLeaderRows,
    }
  }, [classTutorialRelations.length, sociometricMetrics])
  const sociometricCompleteReport = useMemo(() => {
    const rows = sociometricMetrics.rows || []
    const hasData = classTutorialRelations.length > 0
    const rejectedRows = rows
      .filter((row) => row.category === 'Rebutjat')
      .sort((a, b) => b.avoidReceived - a.avoidReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const isolatedRows = rows
      .filter((row) => row.category === 'Aïllat')
      .sort((a, b) => a.positiveReceived - b.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const acceptedRows = rows
      .filter((row) => row.category === 'Acceptat')
      .sort((a, b) => b.positiveReceived - a.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const leaderRows = rows
      .filter((row) => row.category === 'Líder')
      .sort((a, b) => b.positiveReceived - a.positiveReceived || a.student.name.localeCompare(b.student.name, 'ca'))
    const riskLeaderRows = rows
      .filter(
        (row) =>
          row.category === 'Controvertit' ||
          (row.positiveReceived >= 2 && row.avoidReceived > 0 && row.category !== 'Rebutjat'),
      )
      .sort((a, b) => b.avoidReceived - a.avoidReceived || b.positiveReceived - a.positiveReceived)
    const workRows = tutorialRelationSummary.studentRows
      .filter((row) => row.workPositiveCount > 0)
      .sort((a, b) => b.workPositiveCount - a.workPositiveCount || a.student.name.localeCompare(b.student.name, 'ca'))
    const alertItems = []

    if (!hasData) {
      alertItems.push({
        tone: 'warning',
        title: 'Encara falten dades sociomètriques',
        text: 'Comparteix el qüestionari o registra observacions docents abans de tancar conclusions.',
      })
    }
    if (rejectedRows.length > 0) {
      alertItems.push({
        tone: 'danger',
        title: `${rejectedRows.length} alumne/s amb rebuig significatiu`,
        text: rejectedRows.slice(0, 3).map((row) => row.student.name).join(', '),
      })
    }
    if (isolatedRows.length > 0) {
      alertItems.push({
        tone: 'warning',
        title: `${isolatedRows.length} alumne/s amb poca connexió`,
        text: isolatedRows.slice(0, 3).map((row) => row.student.name).join(', '),
      })
    }
    if (riskLeaderRows.length > 0) {
      alertItems.push({
        tone: 'warning',
        title: 'Lideratges que convé canalitzar',
        text: riskLeaderRows.slice(0, 3).map((row) => row.student.name).join(', '),
      })
    }
    if (sociometricMetrics.workRelationCount === 0) {
      alertItems.push({
        tone: 'neutral',
        title: 'Mapa de treball pendent',
        text: 'Afegeix criteri docent per diferenciar amistat, bon funcionament a classe i incompatibilitats.',
      })
    }
    if (alertItems.length === 0) {
      alertItems.push({
        tone: 'positive',
        title: 'Sense alertes crítiques',
        text: 'Mantén observació ordinària i revisa el mapa després de les properes activitats cooperatives.',
      })
    }

    const socialReading =
      !hasData
        ? 'Encara no hi ha prou dades per interpretar el mapa social del grup.'
        : rejectedRows.length > 0
          ? 'El grup té alguns vincles de rebuig que cal tractar abans de fer agrupaments sensibles.'
          : isolatedRows.length > 0
            ? 'La lectura principal és la inclusió: hi ha alumnes amb poques connexions visibles.'
            : sociometricMetrics.inclusion >= 70
              ? 'El grup mostra una xarxa social prou integrada i sense senyals extremes dominants.'
              : 'La xarxa encara és feble: cal augmentar oportunitats de relació segura i estructurada.'
    const workReading =
      sociometricMetrics.workRelationCount === 0
        ? 'No hi ha prou criteri docent de treball. El sociograma social pot servir, però no substitueix saber qui treballa bé amb qui.'
        : `Hi ha ${sociometricMetrics.workRelationCount} relacions de treball registrades. Són especialment útils per formar parelles pont i grups cooperatius.`
    const interventionPlan = [
      rejectedRows.length > 0
        ? `Contrastar el cas de ${rejectedRows[0].student.name} amb observacions d’aula i evitar exposicions públiques.`
        : 'Mantenir agrupaments diversos sense convertir el sociograma en una etiqueta fixa.',
      isolatedRows.length > 0
        ? `Crear una parella pont per a ${isolatedRows[0].student.name} en una tasca curta i observable.`
        : 'Fer rotació de parelles breu per conservar connexions positives.',
      riskLeaderRows.length > 0
        ? `Donar a ${riskLeaderRows[0].student.name} una responsabilitat positiva i acotada.`
        : 'Reforçar lideratges positius sense assenyalar alumnes davant del grup.',
      sociometricMetrics.workRelationCount === 0
        ? 'Registrar 5-8 relacions de treball des del criteri docent abans de preparar grups estables.'
        : 'Fer servir el mapa de treball per decidir suports, no només amistats.',
    ]

    return {
      acceptedRows,
      alertItems,
      hasData,
      interventionPlan,
      isolatedRows,
      leaderRows,
      rejectedRows,
      riskLeaderRows,
      socialReading,
      workReading,
      workRows,
    }
  }, [classTutorialRelations.length, sociometricMetrics, tutorialRelationSummary.studentRows])
  const sociometricIndividualReports = useMemo(() => {
    return buildSociometricStudentReports({
      categoryMetaByName: SOCIOMETRIC_CATEGORY_META,
      relations: tutorialRelationSummary.enrichedRelations,
      sociometricRows: sociometricMetrics.rows,
      students: classStudents,
      tutorialRelationRowsByStudent,
    })
  }, [classStudents, sociometricMetrics.rows, tutorialRelationRowsByStudent, tutorialRelationSummary.enrichedRelations])
  const sociometricIndividualReportsByStudentId = useMemo(
    () => new Map(sociometricIndividualReports.map((report) => [report.student.id, report])),
    [sociometricIndividualReports],
  )
  const selectedSociometricIndividualReportIds = new Set(selectedSociometricReportStudentIds)
  const visibleSociometricIndividualReports =
    selectedSociometricReportStudentIds.length > 0
      ? sociometricIndividualReports.filter((report) => selectedSociometricIndividualReportIds.has(report.student.id))
      : sociometricIndividualReports
  const selectedSociometricIndividualPreviewReport =
    visibleSociometricIndividualReports.find((report) => report.student.id === selectedSociometricReportStudentId) ||
    visibleSociometricIndividualReports[0]
  const activeSociometricReportSections = SOCIOMETRIC_REPORT_SECTIONS.filter(
    (section) => sociometricReportSections[section.id],
  )
  const estimatedSociometricReportPages =
    selectedSociometricReportType === 'individual'
      ? Math.max(1, visibleSociometricIndividualReports.length)
      : Math.max(
          1,
          activeSociometricReportSections.reduce((total, section) => total + section.pages, 0),
        )
  const handleSelectSociometricReportType = (reportTypeId) => {
    setSelectedSociometricReportType(reportTypeId)
    setSociometricReportSections(DEFAULT_SOCIOMETRIC_REPORT_SECTIONS[reportTypeId] || DEFAULT_SOCIOMETRIC_REPORT_SECTIONS.quick)
  }
  const handleToggleSociometricReportSection = (section) => {
    if (section.required) return
    setSociometricReportSections((current) => ({
      ...current,
      [section.id]: !current[section.id],
    }))
  }
  const handleToggleSociometricReportStudent = (studentId) => {
    setSelectedSociometricReportStudentIds((current) => {
      const baseSelection = current.length > 0 ? current : sociometricIndividualReports.map((report) => report.student.id)
      return baseSelection.includes(studentId)
        ? baseSelection.filter((id) => id !== studentId)
        : [...baseSelection, studentId]
    })
  }
  const handleSelectPriorityReportStudents = () => {
    const priorityIds = sociometricIndividualReports
      .filter((report) => ['Rebutjat', 'Aïllat', 'Controvertit'].includes(report.category))
      .map((report) => report.student.id)
    setSelectedSociometricReportStudentIds(priorityIds.length > 0 ? priorityIds : sociometricIndividualReports.slice(0, 6).map((report) => report.student.id))
  }
  const printSelectedSociometricStudentReport = () => {
    if (!selectedSociometricIndividualPreviewReport) return
    printSociometricReport('sociometric-single-student-printing')
  }
  const selectedSociometricRow = selectedRelationRow
    ? sociometricRowsByStudentId.get(selectedRelationRow.student.id)
    : null
  const selectedSociogramPositionIsManual = Boolean(
    selectedSociometricRow && sociogramPositionsByStudentId.has(selectedSociometricRow.student.id),
  )
  const selectedSociometricDrilldownMeta = selectedSociometricStatKey
    ? SOCIOMETRIC_STAT_DRILLDOWN_META[selectedSociometricStatKey] || null
    : null
  const selectedSociometricDrilldownItems = useMemo(
    () =>
      buildSociometricStatDrilldownItems({
        relationKey: selectedSociometricStatKey,
        relations: tutorialRelationSummary.enrichedRelations,
        studentId: selectedSociometricRow?.student.id,
      }),
    [selectedSociometricRow?.student.id, selectedSociometricStatKey, tutorialRelationSummary.enrichedRelations],
  )
  const tutorialSociogramMap = useMemo(
    () =>
      buildTutorialSociogramMap({
        filter: sociogramFilter,
        onlyReciprocal: sociogramOnlyReciprocal,
        positionsByStudentId: sociogramPositionsByStudentId,
        relations: tutorialRelationSummary.enrichedRelations,
        roleRowsByStudent: tutorialRoleRowsByStudent,
        selectedStudentId: selectedRelationRow?.student.id,
        sociometricRows: sociometricMetrics.rows,
        studentRows: tutorialRelationSummary.studentRows,
        students: classStudents,
      }),
    [
      classStudents,
      selectedRelationRow?.student.id,
      sociogramFilter,
      sociogramOnlyReciprocal,
      sociogramPositionsByStudentId,
      sociometricMetrics.rows,
      tutorialRelationSummary.enrichedRelations,
      tutorialRoleRowsByStudent,
      tutorialRelationSummary.studentRows,
    ],
  )
  const cooperativeGroups = useMemo(
    () =>
      buildCooperativeGroups({
        groupSize: cooperativeGroupSize,
        prioritizeHalfGroups,
        profiles: tutorialSummary.studentProfiles,
        recordRowsByStudent: tutorialRecordRowsByStudent,
        relationRowsByStudent: tutorialRelationRowsByStudent,
        relations: effectiveTutorialRelations,
        roleRowsByStudent: tutorialRoleRowsByStudent,
        sociometricRowsByStudentId,
        strategy: cooperativeStrategy,
      }),
    [
      cooperativeGroupSize,
      cooperativeStrategy,
      effectiveTutorialRelations,
      prioritizeHalfGroups,
      sociometricRowsByStudentId,
      tutorialRecordRowsByStudent,
      tutorialRelationRowsByStudent,
      tutorialRoleRowsByStudent,
      tutorialSummary.studentProfiles,
    ],
  )
  const selectedCooperativeGroupSet =
    classTutorialGroupSets.find((groupSet) => groupSet.id === selectedCooperativeGroupSetId) || null
  const latestCooperativeGroupSet = classTutorialGroupSets[0] || null
  const hasRelationChangesAfterGroupSave = Boolean(
    latestCooperativeGroupSet &&
      classTutorialRelations.some(
        (relation) =>
          String(relation.updatedAt || relation.createdAt || '') >
          String(latestCooperativeGroupSet.updatedAt || latestCooperativeGroupSet.createdAt || ''),
      ),
  )
  const visibleCooperativeGroups = useMemo(
    () =>
      selectedCooperativeGroupSet
        ? materializeSavedCooperativeGroups({
            profilesByStudentId: cooperativeProfilesByStudentId,
            relations: effectiveTutorialRelations,
            savedGroupSet: selectedCooperativeGroupSet,
          })
        : manualCooperativeGroups.length > 0
          ? enrichCooperativeGroups(manualCooperativeGroups, effectiveTutorialRelations)
        : cooperativeGroups,
    [
      cooperativeGroups,
      cooperativeProfilesByStudentId,
      effectiveTutorialRelations,
      manualCooperativeGroups,
      selectedCooperativeGroupSet,
    ],
  )
  const cooperativeGroupSetAnalysis = useMemo(
    () =>
      analyzeCooperativeGroupSet(visibleCooperativeGroups, {
        groupSize: selectedCooperativeGroupSet?.groupSize || cooperativeGroupSize,
        prioritizeHalfGroups:
          selectedCooperativeGroupSet?.prioritizeHalfGroups ?? prioritizeHalfGroups,
        strategy: selectedCooperativeGroupSet?.strategy || cooperativeStrategy,
      }),
    [
      cooperativeGroupSize,
      cooperativeStrategy,
      prioritizeHalfGroups,
      selectedCooperativeGroupSet,
      visibleCooperativeGroups,
    ],
  )
  const selectedCooperativeGroup =
    visibleCooperativeGroups.find((group) => group.id === selectedCooperativeGroupId) || null
  const cooperativeEditSourceGroup = visibleCooperativeGroups.find((group) =>
    group.members.some((member) => member.student.id === cooperativeEditDraft.studentId),
  )
  const cooperativeEditSourceMember = cooperativeEditSourceGroup?.members.find(
    (member) => member.student.id === cooperativeEditDraft.studentId,
  )
  const cooperativeEditTargetGroup = visibleCooperativeGroups.find(
    (group) => group.id === cooperativeEditDraft.targetGroupId,
  )
  const cooperativeEditPreview = useMemo(() => {
    if (!cooperativeEditDraft.studentId || selectedCooperativeGroupSet) return null

    const sourceGroup = visibleCooperativeGroups.find((group) =>
      group.members.some((member) => member.student.id === cooperativeEditDraft.studentId),
    )
    const sourceMember = sourceGroup?.members.find(
      (member) => member.student.id === cooperativeEditDraft.studentId,
    )
    const targetGroup = visibleCooperativeGroups.find(
      (group) => group.id === cooperativeEditDraft.targetGroupId,
    )
    if (
      !sourceGroup ||
      !sourceMember ||
      !targetGroup ||
      sourceGroup.id === targetGroup.id ||
      !canModifyCooperativeMember({
        group: sourceGroup,
        lockedStudentIds: cooperativeLockedStudentIds,
        studentId: sourceMember.student.id,
      }) ||
      targetGroup.locked
    ) {
      return null
    }

    const targetMember =
      cooperativeEditDraft.type === 'swap'
        ? targetGroup.members.find(
            (member) => member.student.id === cooperativeEditDraft.targetStudentId,
          )
        : null
    if (
      cooperativeEditDraft.type === 'swap' &&
      (!targetMember ||
        !canModifyCooperativeMember({
          group: targetGroup,
          lockedStudentIds: cooperativeLockedStudentIds,
          studentId: targetMember.student.id,
        }))
    ) {
      return null
    }
    if (cooperativeEditDraft.type === 'move' && sourceGroup.members.length <= 2) {
      return null
    }

    const nextGroups =
      cooperativeEditDraft.type === 'swap'
        ? swapCooperativeMembers(
            visibleCooperativeGroups,
            cooperativeEditDraft.studentId,
            cooperativeEditDraft.targetStudentId,
            effectiveTutorialRelations,
          )
        : moveCooperativeMemberToGroup(
            visibleCooperativeGroups,
            cooperativeEditDraft.studentId,
            cooperativeEditDraft.targetGroupId,
            effectiveTutorialRelations,
          )
    const nextAnalysis = analyzeCooperativeGroupSet(nextGroups, {
      groupSize: cooperativeGroupSize,
      prioritizeHalfGroups,
      strategy: cooperativeStrategy,
    })
    const scoreDelta = nextAnalysis.score - cooperativeGroupSetAnalysis.score
    const nextSourceGroup = nextGroups.find((group) => group.id === sourceGroup.id)
    const nextTargetGroup = nextGroups.find((group) => group.id === targetGroup.id)

    return {
      actionLabel:
        cooperativeEditDraft.type === 'swap'
          ? `Intercanviar ${formatCooperativeStudentName(sourceMember.student.name)} amb ${formatCooperativeStudentName(targetMember.student.name)}`
          : `Moure ${formatCooperativeStudentName(sourceMember.student.name)} a ${targetGroup.name}`,
      nextAnalysis,
      nextGroups,
      nextSourceGroup,
      nextTargetGroup,
      scoreDelta,
      sizeWarning:
        [nextSourceGroup, nextTargetGroup].some((group) => group?.analysis?.sizeDifference > 1),
      sourceGroup,
      sourceMember,
      targetGroup,
      targetMember,
    }
  }, [
    cooperativeEditDraft,
    cooperativeGroupSetAnalysis.score,
    cooperativeGroupSize,
    cooperativeStrategy,
    cooperativeLockedStudentIds,
    effectiveTutorialRelations,
    prioritizeHalfGroups,
    selectedCooperativeGroupSet,
    visibleCooperativeGroups,
  ])
  const generatedSeatingPlan = useMemo(
    () =>
      buildTutorialSeatingPlan({
        blockedSeatIds: seatingRestrictions.blockedSeatIds,
        layout: seatingLayout,
        lockedStudentIds: seatingLockedStudentIds,
        manualEmptySeatIds: seatingManualEmptySeatIds,
        manualSeatByStudentId: seatingManualSeatByStudentId,
        objective: seatingIterationObjective,
        problemSeatsByStudentId: seatingAppliedProblemSeats,
        prioritizeHalfGroups: seatingPrioritizeHalfGroups,
        profilesByStudentId: cooperativeProfilesByStudentId,
        relations: effectiveTutorialRelations,
        restrictions: seatingRestrictions,
        students: classStudents,
        unseatedStudentIds: seatingUnseatedStudentIds,
        variant: seatingVariant,
      }),
    [
      classStudents,
      cooperativeProfilesByStudentId,
      effectiveTutorialRelations,
      seatingLayout,
      seatingAppliedProblemSeats,
      seatingLockedStudentIds,
      seatingManualEmptySeatIds,
      seatingManualSeatByStudentId,
      seatingIterationObjective,
      seatingPrioritizeHalfGroups,
      seatingRestrictions,
      seatingUnseatedStudentIds,
      seatingVariant,
    ],
  )
  const selectedSeatingPlan =
    classTutorialSeatingPlans.find((plan) => plan.id === selectedSeatingPlanId) || null
  const loadedSeatingPlan =
    classTutorialSeatingPlans.find((plan) => plan.id === loadedSeatingPlanId) || null
  const comparisonSeatingPlan =
    classTutorialSeatingPlans.find((plan) => plan.id === comparisonSeatingPlanId) || null
  const visibleSeatingRestrictions =
    selectedSeatingPlan?.layout?.seatingRestrictions || seatingRestrictions
  const visibleSeatingPlan = selectedSeatingPlan
    ? materializeSavedSeatingPlan({ plan: selectedSeatingPlan, profilesByStudentId: cooperativeProfilesByStudentId })
    : generatedSeatingPlan
  const visibleSeatingBlockStarts = getSeatingBlockStartColumns(visibleSeatingPlan.layout).slice(1)
  const seatingPlanAnalysis = useMemo(
    () =>
      analyzeTutorialSeatingPlan({
        getSeatDistance,
        plan: visibleSeatingPlan,
        relations: effectiveTutorialRelations,
        restrictions: visibleSeatingRestrictions,
      }),
    [effectiveTutorialRelations, visibleSeatingPlan, visibleSeatingRestrictions],
  )
  const generatedSeatingPlanAnalysis = useMemo(
    () =>
      analyzeTutorialSeatingPlan({
        getSeatDistance,
        plan: generatedSeatingPlan,
        relations: effectiveTutorialRelations,
        restrictions: seatingRestrictions,
      }),
    [effectiveTutorialRelations, generatedSeatingPlan, seatingRestrictions],
  )
  const comparisonSeatingPlanAnalysis = useMemo(
    () =>
      comparisonSeatingPlan
        ? analyzeTutorialSeatingPlan({
            getSeatDistance,
            plan: materializeSavedSeatingPlan({
              plan: comparisonSeatingPlan,
              profilesByStudentId: cooperativeProfilesByStudentId,
            }),
            relations: effectiveTutorialRelations,
            restrictions: comparisonSeatingPlan.layout?.seatingRestrictions || getEmptySeatingRestrictions(),
          })
        : null,
    [comparisonSeatingPlan, cooperativeProfilesByStudentId, effectiveTutorialRelations],
  )
  const seatingCapacity = getSeatingCapacity(seatingLayout)
  const hasRelationChangesAfterSeatingSave = Boolean(
    classTutorialSeatingPlan &&
      classTutorialRelations.some(
        (relation) =>
          String(relation.updatedAt || relation.createdAt || '') >
          String(
            classTutorialSeatingPlan.contentUpdatedAt ||
              classTutorialSeatingPlan.createdAt ||
              classTutorialSeatingPlan.updatedAt ||
              '',
          ),
      ),
  )
  const seatingReviewRows = visibleSeatingPlan.placements.filter((placement) => seatingProblemSeats[placement.studentId])
  const selectedSeatingProfile = selectedSeatingStudentId
    ? cooperativeProfilesByStudentId.get(selectedSeatingStudentId) || null
    : null
  const selectedSeatingPlacement =
    visibleSeatingPlan.placements.find((placement) => placement.studentId === selectedSeatingStudentId) || null
  const selectedSeatingIsLocked = Boolean(
    selectedSeatingPlacement?.isLocked || seatingLockedStudentIds.includes(selectedSeatingStudentId),
  )
  const selectedSeatingNeedsReview = Boolean(seatingProblemSeats[selectedSeatingStudentId])
  const selectedPreferredZone = seatingRestrictions.preferredZoneByStudentId[selectedSeatingStudentId] || ''
  const selectedAvoidedZone = seatingRestrictions.avoidedZoneByStudentId[selectedSeatingStudentId] || ''
  const selectedNeverNearIds = seatingRestrictions.neverNearPairs
    .filter((pair) => pair.studentId === selectedSeatingStudentId || pair.targetStudentId === selectedSeatingStudentId)
    .map((pair) => (pair.studentId === selectedSeatingStudentId ? pair.targetStudentId : pair.studentId))
  const selectedPreferNearIds = seatingRestrictions.preferNearPairs
    .filter((pair) => pair.studentId === selectedSeatingStudentId || pair.targetStudentId === selectedSeatingStudentId)
    .map((pair) => (pair.studentId === selectedSeatingStudentId ? pair.targetStudentId : pair.studentId))
  const seatingRestrictionCount =
    seatingRestrictions.neverNearPairs.length +
    seatingRestrictions.preferNearPairs.length +
    Object.keys(seatingRestrictions.preferredZoneByStudentId).length +
    Object.keys(seatingRestrictions.avoidedZoneByStudentId).length +
    seatingLockedStudentIds.length +
    seatingRestrictions.blockedSeatIds.length
  const seatingQualityComparison = seatingQualityBaseline
    ? {
        conflictDelta: seatingPlanAnalysis.conflicts.length - seatingQualityBaseline.conflictCount,
        scoreDelta: seatingPlanAnalysis.score - seatingQualityBaseline.score,
      }
    : null
  const selectedSeatingContext = useMemo(
    () =>
      getSeatingPlacementContext({
        placement: selectedSeatingPlacement,
        plan: visibleSeatingPlan,
        prioritizeHalfGroups: seatingPrioritizeHalfGroups,
        relations: effectiveTutorialRelations,
      }),
    [effectiveTutorialRelations, seatingPrioritizeHalfGroups, selectedSeatingPlacement, visibleSeatingPlan],
  )
  const filteredTutorialProfiles = useMemo(
    () =>
      tutorialSummary.studentProfiles
        .filter((profile) => {
          const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
          if (profileFilter === 'all') return true
          if (profileFilter === 'priority') return getTutorialProfilePriority(profile, recordRow) > 0
          if (profileFilter === 'not-developed') return profile.notDevelopedCount > 0
          if (profileFilter === 'tracking') return (recordRow?.total || 0) > 0
          return true
        })
        .filter((profile) =>
          profile.evaluatedCompetencies.some(
            (item) =>
              (profileAreaFilter === 'all' || item.areaId === profileAreaFilter) &&
              (profileSubjectFilter === 'all' || item.subject === profileSubjectFilter),
          ) ||
          (profileAreaFilter === 'all' && profileSubjectFilter === 'all'),
        )
        .filter((profile) => profile.student.name.toLocaleLowerCase('ca').includes(profileSearch.trim().toLocaleLowerCase('ca')))
        .sort((a, b) => {
          const priorityA = getTutorialProfilePriority(a, tutorialRecordRowsByStudent.get(a.student.id))
          const priorityB = getTutorialProfilePriority(b, tutorialRecordRowsByStudent.get(b.student.id))
          if (priorityA !== priorityB) return priorityB - priorityA
          return a.student.name.localeCompare(b.student.name, 'ca')
        }),
    [
      profileAreaFilter,
      profileFilter,
      profileSearch,
      profileSubjectFilter,
      tutorialRecordRowsByStudent,
      tutorialSummary.studentProfiles,
    ],
  )
  const selectedRecordType = getRecordTypeMeta(recordForm.type)

  const handleSubmitTutorialRecord = async (event) => {
    event.preventDefault()
    const studentId = recordForm.studentId || classStudents[0]?.id
    if (!studentId) return

    await addTutorialRecord({
      classId: activeClassId,
      studentId,
      type: recordForm.type,
      date: recordForm.date,
      note: recordForm.note,
      agendaKind: recordForm.agendaKind,
    })
    setRecordForm((current) => ({
      ...current,
      studentId,
      date: getTodayDateInput(),
      note: '',
    }))
  }

  const handleSubmitTutorialRelation = async (event) => {
    event.preventDefault()
    const sourceStudentId = relationForm.sourceStudentId || classStudents[0]?.id
    const targetStudentId =
      relationForm.targetStudentId || classStudents.find((student) => student.id !== sourceStudentId)?.id
    if (!sourceStudentId || !targetStudentId || sourceStudentId === targetStudentId) return

    await upsertTutorialRelation({
      classId: activeClassId,
      note: relationForm.note,
      source: TEACHER_OBSERVATION_RELATION_SOURCE,
      sourceLabel: 'Criteri docent',
      sourceStudentId,
      strength: relationForm.strength,
      targetStudentId,
      type: relationForm.type,
    })
    setSelectedRelationStudentId(sourceStudentId)
    setRelationForm((current) => ({
      ...current,
      sourceStudentId,
      targetStudentId: '',
      note: '',
    }))
    setRelationSearch((current) => ({ ...current, target: '' }))
  }

  const handleCopySociometricTemplate = async () => {
    try {
      await navigator.clipboard.writeText(sociometricTemplateText)
      setSociometricImportMessage('Plantilla copiada amb la llista d’alumnes. Enganxa-la al full de càlcul.')
    } catch {
      setSociometricImportMessage('No s’ha pogut copiar automàticament. Pots copiar la capçalera manualment.')
    }
  }

  const handleDownloadSociometricTemplate = () => {
    const blob = new Blob([sociometricTemplateText], { type: 'text/tab-separated-values;charset=utf-8' })
    downloadBlob(blob, `avaluapro-sociograma-${activeClass?.name || 'classe'}-${getTodaySlug()}.tsv`)
    setSociometricImportMessage('Plantilla descarregada. Pots obrir-la amb Excel, Numbers o Google Sheets.')
  }

  const handleCreateSociometricSurvey = async () => {
    setSociometricSurveyBusy('create')
    setSociometricSurveyMessage('')
    try {
      const survey = await createSociometricSurvey({ classId: activeClassId })
      const surveyLinks = (survey.accessTokens || [])
        .map(
          (access) =>
            `${access.studentName}\t${window.location.origin}${import.meta.env.BASE_URL}?sociometric=${survey.id}&token=${access.token}`,
        )
        .join('\n')
      try {
        await navigator.clipboard.writeText(surveyLinks)
        setSociometricSurveyMessage(
          'Qüestionari creat. S’han copiat els enllaços individuals, un per alumne; caduquen al cap de 24 hores.',
        )
      } catch {
        setSociometricSurveyMessage('Qüestionari creat. Descarrega la llista d’enllaços individuals per repartir-los.')
      }
      setSociometricResponseCounts((current) => ({ ...current, [survey.id]: survey.responseCount || 0 }))
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’ha pogut crear el qüestionari sociomètric.')
    } finally {
      setSociometricSurveyBusy('')
    }
  }

  const handleCopySociometricSurveyLink = async () => {
    if (!activeSociometricSurveyLinksText) return
    try {
      await navigator.clipboard.writeText(activeSociometricSurveyLinksText)
      setSociometricSurveyMessage('Enllaços individuals copiats. Cada alumne ha de rebre només el seu.')
    } catch {
      setSociometricSurveyMessage('No s’ha pogut copiar automàticament. Pots seleccionar i copiar l’enllaç.')
    }
  }

  const handleDownloadSociometricSurveyLinks = () => {
    if (!activeSociometricSurveyLinksText) return
    const blob = new Blob([`Alumne\tEnllaç individual\n${activeSociometricSurveyLinksText}`], {
      type: 'text/tab-separated-values;charset=utf-8',
    })
    downloadBlob(blob, `avaluapro-enllacos-sociometria-${activeClass?.name || 'classe'}-${getTodaySlug()}.tsv`)
    setSociometricSurveyMessage('Llista d’enllaços individuals descarregada.')
  }

  const handleOpenSociometricSurveyLink = () => {
    if (!activeSociometricSurveyUrl) return
    window.open(activeSociometricSurveyUrl, '_blank', 'noopener,noreferrer')
  }

  const handleRefreshSociometricResponses = async () => {
    if (!activeSociometricSurvey?.id) return
    setSociometricSurveyBusy('responses')
    setSociometricSurveyMessage('')
    try {
      const responses = await listSociometricSurveyResponses(activeSociometricSurvey.id)
      setSociometricResponseCounts((current) => ({ ...current, [activeSociometricSurvey.id]: responses.length }))
      setSociometricSurveyMessage(`S’han detectat ${responses.length} resposta/es del qüestionari.`)
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’han pogut carregar les respostes del qüestionari.')
    } finally {
      setSociometricSurveyBusy('')
    }
  }

  const handleSyncSociometricSurveyResponses = async () => {
    if (!activeSociometricSurvey?.id) return
    setSociometricSurveyBusy('sync')
    setSociometricSurveyMessage('')
    try {
      const stats = await syncSociometricSurveyResponses(activeSociometricSurvey.id)
      setSociometricResponseCounts((current) => ({
        ...current,
        [activeSociometricSurvey.id]: stats.responseCount,
      }))
      setSociometricSurveyMessage(
        [
          `Sincronitzades ${stats.importedRelationCount} relacions de ${stats.responseCount} resposta/es.`,
          stats.momentId ? 'S’ha guardat un moment sociomètric nou per a la comparativa.' : '',
          stats.createdCount > 0 ? `${stats.createdCount} noves.` : '',
          stats.updatedCount > 0 ? `${stats.updatedCount} actualitzades.` : '',
          stats.skippedExistingManualCount > 0
            ? `${stats.skippedExistingManualCount} ja existien com a relacions manuals i s’han respectat.`
            : '',
          stats.skippedCount > 0 ? `${stats.skippedCount} resposta/es tenien alumnes no trobats.` : '',
        ]
          .filter(Boolean)
          .join(' '),
      )
      setActiveRelationshipTool('sociogram')
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’han pogut sincronitzar les respostes amb el sociograma.')
    } finally {
      setSociometricSurveyBusy('')
    }
  }

  const handleToggleSociometricSurveyStatus = async () => {
    if (!activeSociometricSurvey?.id) return
    const nextStatus = activeSociometricSurvey.status === 'active' ? 'closed' : 'active'
    setSociometricSurveyBusy('status')
    setSociometricSurveyMessage('')
    try {
      await setSociometricSurveyStatus(activeSociometricSurvey.id, nextStatus)
      setSociometricSurveyMessage(
        nextStatus === 'active'
          ? 'Qüestionari reobert durant 24 hores. Els enllaços individuals tornen a acceptar respostes.'
          : 'Qüestionari tancat. Els enllaços ja no acceptaran respostes.',
      )
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’ha pogut canviar l’estat del qüestionari.')
    } finally {
      setSociometricSurveyBusy('')
    }
  }

  const handleDeleteSociometricSurvey = async () => {
    if (!activeSociometricSurvey?.id) return
    const confirmed = window.confirm(
      [
        'Això eliminarà definitivament de Firebase:',
        '',
        '• el qüestionari',
        '• els tokens i enllaços individuals',
        '• totes les respostes brutes',
        '',
        'Les relacions i el moment sociomètric ja sincronitzats a Avaluapro es conservaran.',
        '',
        'Vols continuar?',
      ].join('\n'),
    )
    if (!confirmed) return

    setSociometricSurveyBusy('delete')
    setSociometricSurveyMessage('')
    try {
      await deleteSociometricSurvey(activeSociometricSurvey.id)
      setSociometricResponseCounts((current) => {
        const next = { ...current }
        delete next[activeSociometricSurvey.id]
        return next
      })
      setSociometricSurveyMessage(
        'Dades brutes eliminades. Es conserven únicament les relacions i els moments ja sincronitzats.',
      )
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’han pogut eliminar les dades brutes del qüestionari.')
    } finally {
      setSociometricSurveyBusy('')
    }
  }

  const handleImportSociometricResponses = async () => {
    if (!activeClassId || sociometricPreview.relations.length === 0) return

    await importTutorialRelations(
      sociometricPreview.relations.map((relation) => ({
        ...relation,
        classId: activeClassId,
      })),
    )
    await captureTutorialSociometricMoment({
      classId: activeClassId,
      label: `Importació manual · ${getTodayDateInput()}`,
      source: 'manual-import',
    })
    setSociometricImportMessage(
      `Importades ${sociometricPreview.positiveCount} eleccions i ${sociometricPreview.avoidCount} rebuigs. També s’ha guardat un moment sociomètric. Revisa el sociograma.`,
    )
    setSociometricPasteText('')
    setActiveRelationshipTool('sociogram')
  }

  const handleCaptureSociometricMoment = async () => {
    if (!activeClassId) return
    try {
      await captureTutorialSociometricMoment({
        classId: activeClassId,
        label: `Captura docent · ${getTodayDateInput()}`,
        source: 'manual',
      })
      setSociometricSurveyMessage('Moment sociomètric guardat. Ja el pots fer servir a l’informe comparatiu.')
    } catch (error) {
      setSociometricSurveyMessage(error.message || 'No s’ha pogut guardar aquest moment sociomètric.')
    }
  }

  const handleRelationSearchChange = (field, value) => {
    const matchedStudent = findStudentBySearch(classStudents, value)
    setRelationSearch((current) => ({ ...current, [field]: value }))
    if (matchedStudent) {
      setRelationForm((current) => ({
        ...current,
        [field === 'source' ? 'sourceStudentId' : 'targetStudentId']: matchedStudent.id,
      }))
    }
  }

  const captureSeatingQualityBaseline = (reason) => {
    if (selectedSeatingPlan) return
    setSeatingQualityBaseline({
      conflictCount: seatingPlanAnalysis.conflicts.length,
      label: seatingPlanAnalysis.quality.label,
      reason,
      score: seatingPlanAnalysis.score,
    })
  }

  const getLockedSeatingAssignments = (plan = generatedSeatingPlan) =>
    Object.fromEntries(
      plan.placements
        .filter((placement) => seatingLockedStudentIds.includes(placement.studentId))
        .map((placement) => [placement.studentId, placement.seat.id]),
    )

  const buildSeatingIterationCandidate = ({ manualAssignments, variant }) => {
    const plan = buildTutorialSeatingPlan({
      blockedSeatIds: seatingRestrictions.blockedSeatIds,
      layout: seatingLayout,
      lockedStudentIds: seatingLockedStudentIds,
      manualEmptySeatIds: [],
      manualSeatByStudentId: manualAssignments,
      objective: seatingIterationObjective,
      problemSeatsByStudentId: seatingAppliedProblemSeats,
      prioritizeHalfGroups: seatingPrioritizeHalfGroups,
      profilesByStudentId: cooperativeProfilesByStudentId,
      relations: effectiveTutorialRelations,
      restrictions: seatingRestrictions,
      students: classStudents,
      unseatedStudentIds: [],
      variant,
    })
    const analysis = analyzeTutorialSeatingPlan({
      getSeatDistance,
      plan,
      relations: effectiveTutorialRelations,
      restrictions: seatingRestrictions,
    })
    return { analysis, plan, variant }
  }

  const resetSeatingManualChanges = () => {
    captureSeatingQualityBaseline('Abans de netejar els canvis manuals')
    setSeatingManualSeatByStudentId((current) =>
      Object.fromEntries(Object.entries(current).filter(([studentId]) => seatingLockedStudentIds.includes(studentId))),
    )
    setSeatingManualEmptySeatIds([])
    setSeatingProblemSeats({})
    setSeatingAppliedProblemSeats({})
    setSeatingUnseatedStudentIds((current) => current.filter((studentId) => seatingLockedStudentIds.includes(studentId)))
    setSeatingBlockSeatMode(false)
    setSeatingIterationMessage('')
  }

  const updateSeatingStructureBlock = (index, nextValue) => {
    setSeatingStructureDraft((current) => ({
      ...current,
      blocks: current.blocks.map((value, blockIndex) =>
        blockIndex === index ? Math.min(5, Math.max(1, nextValue)) : value,
      ),
    }))
  }

  const applySeatingStructure = () => {
    const blocks = normalizeSeatingBlocks(seatingStructureDraft.blocks)
    if (blocks.length === 0) return
    captureSeatingQualityBaseline('Abans de canviar l’estructura de l’aula')
    const nextLayout = normalizeSeatingLayout({
      blocks,
      rows: seatingStructureDraft.rows,
    })
    setSeatingLayout(nextLayout)
    setSeatingManualSeatByStudentId({})
    setSeatingManualEmptySeatIds([])
    setSeatingLockedStudentIds([])
    setSeatingRestrictions((current) => ({ ...current, blockedSeatIds: [] }))
    setSeatingProblemSeats({})
    setSeatingAppliedProblemSeats({})
    setSeatingUnseatedStudentIds([])
    setSelectedSeatingPlanId('')
    setSelectedSeatingStudentId('')
    setSeatingMoveStudentId('')
    setSeatingBlockSeatMode(false)
    setSeatingVariant((current) => current + 1)
    setSeatingIterationMessage(
      `Estructura aplicada: ${nextLayout.rows} files i ${blocks.length} blocs (${blocks.join(' · ')}).`,
    )
  }

  const selectSeatingStructurePreset = (blocks) => {
    setSeatingStructureDraft((current) => ({ ...current, blocks: [...blocks] }))
  }

  const handleGenerateSeatingVariant = () => {
    captureSeatingQualityBaseline('Proposta anterior')
    setSelectedSeatingPlanId('')
    const reviewSeatEntries = Object.entries(seatingProblemSeats).filter(([, seatId]) => Boolean(seatId))
    const reviewedStudentIds = new Set(reviewSeatEntries.map(([studentId]) => studentId))
    const lockedAssignments = getLockedSeatingAssignments()

    setSeatingAppliedProblemSeats(Object.fromEntries(reviewSeatEntries))
    setSeatingManualSeatByStudentId(() => {
      if (reviewedStudentIds.size === 0) return lockedAssignments

      const stableAssignments = {}
      generatedSeatingPlan.placements.forEach((placement) => {
        if (!placement?.studentId || !placement?.seat?.id) return
        if (reviewedStudentIds.has(placement.studentId)) return
        stableAssignments[placement.studentId] = placement.seat.id
      })

      return { ...stableAssignments, ...lockedAssignments }
    })
    setSeatingManualEmptySeatIds([])
    setSeatingUnseatedStudentIds([])
    setSeatingVariant((current) => current + 1)
    setSeatingIterationMessage(
      reviewedStudentIds.size > 0
        ? `S’han recalculat els ${reviewedStudentIds.size} alumne/s marcats per revisar.`
        : `Proposta nova amb ${seatingLockedStudentIds.length} alumne/s fixats.`,
    )
  }

  const handleGenerateSeatingAlternative = () => {
    captureSeatingQualityBaseline('Proposta anterior')
    setSelectedSeatingPlanId('')
    const reviewSeatEntries = Object.entries(seatingProblemSeats).filter(([, seatId]) => Boolean(seatId))
    setSeatingAppliedProblemSeats(Object.fromEntries(reviewSeatEntries))
    setSeatingManualSeatByStudentId(getLockedSeatingAssignments())
    setSeatingManualEmptySeatIds([])
    setSeatingUnseatedStudentIds([])
    setSeatingVariant((current) => current + 1)
    setSeatingIterationMessage(
      `Alternativa nova amb focus “${
        SEATING_ITERATION_OBJECTIVES.find((item) => item.id === seatingIterationObjective)?.label
      }”. S’han mantingut ${seatingLockedStudentIds.length} alumne/s fixats.`,
    )
  }

  const handleImproveSeatingPlan = () => {
    if (selectedSeatingPlan) return
    captureSeatingQualityBaseline('Proposta anterior')
    const lockedAssignments = getLockedSeatingAssignments()
    const candidates = Array.from({ length: 16 }, (_, index) =>
      buildSeatingIterationCandidate({
        manualAssignments: lockedAssignments,
        variant: seatingVariant + index + 1,
      }),
    )
    const bestCandidate = selectBestSeatingCandidate(candidates)
    if (!bestCandidate) return

    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId(lockedAssignments)
    setSeatingManualEmptySeatIds([])
    setSeatingUnseatedStudentIds([])
    setSeatingVariant(bestCandidate.variant)
    setSeatingIterationMessage(
      `Millor alternativa trobada entre 16 opcions: ${bestCandidate.analysis.score}/100, amb focus “${
        SEATING_ITERATION_OBJECTIVES.find((item) => item.id === seatingIterationObjective)?.label
      }”.`,
    )
  }

  const handleRecalculateSeatingZone = () => {
    if (selectedSeatingPlan) return
    captureSeatingQualityBaseline('Abans de recalcular la zona')
    const zoneIteration = getSeatingZoneIterationState({
      getZoneId: (seat) => getSeatingZoneId(seat, generatedSeatingPlan.rows),
      lockedStudentIds: seatingLockedStudentIds,
      placements: generatedSeatingPlan.placements,
      seats: generatedSeatingPlan.seats,
      zoneId: seatingIterationZone,
    })

    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId(zoneIteration.stableAssignments)
    setSeatingManualEmptySeatIds(zoneIteration.outsideFreeSeatIds)
    setSeatingUnseatedStudentIds([])
    setSeatingVariant((current) => current + 1)
    setSeatingIterationMessage(
      `S’ha recalculat només ${
        SEATING_ZONE_OPTIONS.find((zone) => zone.id === seatingIterationZone)?.label.toLocaleLowerCase('ca')
      }: ${zoneIteration.recalculatedStudentIds.length} alumne/s podien canviar de lloc.`,
    )
  }

  const handleToggleSeatingHalfGroups = () => {
    captureSeatingQualityBaseline('Abans de canviar el criteri de mig grup')
    setSeatingPrioritizeHalfGroups((current) => !current)
  }

  const toggleSeatingGridSeat = (seat, placement) => {
    if (selectedSeatingPlan) return
    captureSeatingQualityBaseline('Abans de modificar la matriu')
    setSelectedSeatingPlanId('')
    if (placement?.studentId) {
      if (seatingLockedStudentIds.includes(placement.studentId)) return
      setSeatingUnseatedStudentIds((current) => [...new Set([...current, placement.studentId])])
      setSeatingManualEmptySeatIds((current) => [...new Set([...current, placement.seat.id])])
      setSeatingManualSeatByStudentId((current) => {
        const next = { ...current }
        delete next[placement.studentId]
        return next
      })
      return
    }

    setSeatingLayout((current) => {
      const cleanLayout = normalizeSeatingLayout(current)
      const activeSeatIds = cleanLayout.activeSeatIds.includes(seat.id)
        ? cleanLayout.activeSeatIds.filter((seatId) => seatId !== seat.id)
        : [...cleanLayout.activeSeatIds, seat.id]
      return normalizeSeatingLayout({ ...cleanLayout, activeSeatIds })
    })
    setSeatingManualEmptySeatIds((current) => current.filter((seatId) => seatId !== seat.id))
  }

  const handleSeatingSeatClick = (seat, placement) => {
    if (seatingBlockSeatMode) {
      if (!seat?.enabled || placement || selectedSeatingPlan) return
      captureSeatingQualityBaseline('Abans de bloquejar el seient')
      setSeatingRestrictions((current) => ({
        ...current,
        blockedSeatIds: current.blockedSeatIds.includes(seat.id)
          ? current.blockedSeatIds.filter((seatId) => seatId !== seat.id)
          : [...current.blockedSeatIds, seat.id],
      }))
      setSeatingManualEmptySeatIds((current) => current.filter((seatId) => seatId !== seat.id))
      return
    }

    if (placement?.studentId && !seatingMoveStudentId) {
      setSelectedSeatingStudentId(placement.studentId)
      setSeatingMoveStudentId('')
      return
    }

    if (!seatingMoveStudentId) {
      toggleSeatingGridSeat(seat, placement)
      return
    }

    if (
      selectedSeatingPlan ||
      !seat?.enabled ||
      seatingRestrictions.blockedSeatIds.includes(seat.id) ||
      seatingLockedStudentIds.includes(seatingMoveStudentId)
    ) {
      return
    }
    if (placement?.studentId === seatingMoveStudentId) {
      setSeatingMoveStudentId('')
      return
    }

    const sourcePlacement = generatedSeatingPlan.placements.find(
      (candidate) => candidate.studentId === seatingMoveStudentId,
    )
    if (seatingLockedStudentIds.includes(placement?.studentId)) return

    captureSeatingQualityBaseline('Abans del moviment manual')
    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => {
      const next = { ...current, [seatingMoveStudentId]: seat.id }
      if (placement?.studentId) {
        if (sourcePlacement?.seat?.id) next[placement.studentId] = sourcePlacement.seat.id
        else delete next[placement.studentId]
      }
      return next
    })
    setSeatingManualEmptySeatIds((current) => {
      const next = new Set(current)
      next.delete(seat.id)
      if (sourcePlacement?.seat?.id && !placement) next.add(sourcePlacement.seat.id)
      if (placement && sourcePlacement?.seat?.id) next.delete(sourcePlacement.seat.id)
      return [...next]
    })
    setSeatingUnseatedStudentIds((current) => {
      const next = new Set(current.filter((studentId) => studentId !== seatingMoveStudentId))
      if (placement?.studentId && !sourcePlacement?.seat?.id) next.add(placement.studentId)
      return [...next]
    })
    setSeatingMoveStudentId('')
  }

  const toggleSeatingLockedStudent = (placement) => {
    if (!placement?.studentId || !placement?.seat?.id) return
    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => ({
      ...current,
      [placement.studentId]: placement.seat.id,
    }))
    setSeatingManualEmptySeatIds((current) => current.filter((seatId) => seatId !== placement.seat.id))
    setSeatingUnseatedStudentIds((current) => current.filter((studentId) => studentId !== placement.studentId))
    setSeatingLockedStudentIds((current) =>
      current.includes(placement.studentId)
        ? current.filter((studentId) => studentId !== placement.studentId)
        : [...current, placement.studentId],
    )
  }

  const handleRegenerateWithSelectedStudentLocked = () => {
    if (!selectedSeatingPlacement?.studentId || !selectedSeatingPlacement?.seat?.id || selectedSeatingPlan) return
    captureSeatingQualityBaseline('Proposta anterior')
    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => ({
      ...current,
      [selectedSeatingPlacement.studentId]: selectedSeatingPlacement.seat.id,
    }))
    setSeatingLockedStudentIds((current) =>
      current.includes(selectedSeatingPlacement.studentId)
        ? current
        : [...current, selectedSeatingPlacement.studentId],
    )
    setSeatingManualEmptySeatIds((current) =>
      current.filter((seatId) => seatId !== selectedSeatingPlacement.seat.id),
    )
    setSeatingUnseatedStudentIds((current) =>
      current.filter((studentId) => studentId !== selectedSeatingPlacement.studentId),
    )
    setSeatingVariant((current) => current + 1)
  }

  const handleUnseatSelectedStudent = () => {
    if (!selectedSeatingPlacement || selectedSeatingIsLocked || selectedSeatingPlan) return
    captureSeatingQualityBaseline('Abans de deixar l’alumne pendent')
    setSeatingUnseatedStudentIds((current) => [...new Set([...current, selectedSeatingPlacement.studentId])])
    setSeatingManualEmptySeatIds((current) => [...new Set([...current, selectedSeatingPlacement.seat.id])])
    setSeatingManualSeatByStudentId((current) => {
      const next = { ...current }
      delete next[selectedSeatingPlacement.studentId]
      return next
    })
    setSeatingMoveStudentId(selectedSeatingPlacement.studentId)
  }

  const toggleSeatingProblemSeat = (placement) => {
    if (!placement?.studentId || !placement?.seat?.id) return
    setSelectedSeatingPlanId('')
    const wasMarked = Boolean(seatingProblemSeats[placement.studentId])
    setSeatingProblemSeats((current) => {
      const next = { ...current }
      if (next[placement.studentId]) {
        delete next[placement.studentId]
      } else {
        next[placement.studentId] = placement.seat.id
      }
      return next
    })
    if (wasMarked) {
      setSeatingAppliedProblemSeats((current) => {
        const next = { ...current }
        delete next[placement.studentId]
        return next
      })
    }
  }

  const toggleSeatingPairRestriction = (type) => {
    if (!selectedSeatingStudentId || !seatingRestrictionTargetId) return
    if (selectedSeatingStudentId === seatingRestrictionTargetId) return
    captureSeatingQualityBaseline('Abans de modificar les restriccions')
    const key = type === 'never' ? 'neverNearPairs' : 'preferNearPairs'
    const otherKey = type === 'never' ? 'preferNearPairs' : 'neverNearPairs'
    setSeatingRestrictions((current) => {
      const exists = hasSeatingPair(current[key], selectedSeatingStudentId, seatingRestrictionTargetId)
      return {
        ...current,
        [key]: exists
          ? current[key].filter(
              (pair) =>
                !(
                  (pair.studentId === selectedSeatingStudentId &&
                    pair.targetStudentId === seatingRestrictionTargetId) ||
                  (pair.studentId === seatingRestrictionTargetId &&
                    pair.targetStudentId === selectedSeatingStudentId)
                ),
            )
          : [
              ...current[key],
              { studentId: selectedSeatingStudentId, targetStudentId: seatingRestrictionTargetId },
            ],
        [otherKey]: current[otherKey].filter(
          (pair) =>
            !(
              (pair.studentId === selectedSeatingStudentId &&
                pair.targetStudentId === seatingRestrictionTargetId) ||
              (pair.studentId === seatingRestrictionTargetId &&
                pair.targetStudentId === selectedSeatingStudentId)
            ),
        ),
      }
    })
  }

  const setSelectedSeatingZoneRestriction = (type, zone) => {
    if (!selectedSeatingStudentId) return
    captureSeatingQualityBaseline('Abans de modificar les zones')
    const key = type === 'preferred' ? 'preferredZoneByStudentId' : 'avoidedZoneByStudentId'
    const otherKey = type === 'preferred' ? 'avoidedZoneByStudentId' : 'preferredZoneByStudentId'
    setSeatingRestrictions((current) => {
      const nextZones = { ...current[key] }
      const nextOtherZones = { ...current[otherKey] }
      if (zone) nextZones[selectedSeatingStudentId] = zone
      else delete nextZones[selectedSeatingStudentId]
      if (zone && nextOtherZones[selectedSeatingStudentId] === zone) delete nextOtherZones[selectedSeatingStudentId]
      return { ...current, [key]: nextZones, [otherKey]: nextOtherZones }
    })
  }

  const clearSelectedSeatingRestrictions = () => {
    if (!selectedSeatingStudentId) return
    captureSeatingQualityBaseline('Abans de netejar les restriccions')
    setSeatingRestrictions((current) => {
      const preferredZoneByStudentId = { ...current.preferredZoneByStudentId }
      const avoidedZoneByStudentId = { ...current.avoidedZoneByStudentId }
      delete preferredZoneByStudentId[selectedSeatingStudentId]
      delete avoidedZoneByStudentId[selectedSeatingStudentId]
      return {
        ...current,
        avoidedZoneByStudentId,
        neverNearPairs: current.neverNearPairs.filter(
          (pair) => pair.studentId !== selectedSeatingStudentId && pair.targetStudentId !== selectedSeatingStudentId,
        ),
        preferredZoneByStudentId,
        preferNearPairs: current.preferNearPairs.filter(
          (pair) => pair.studentId !== selectedSeatingStudentId && pair.targetStudentId !== selectedSeatingStudentId,
        ),
      }
    })
  }

  const handleSeatingDragStart = (event, placement) => {
    if (selectedSeatingPlan || !placement?.studentId) return
    if (seatingLockedStudentIds.includes(placement.studentId)) return
    setDraggingSeatingStudentId(placement.studentId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', placement.studentId)
  }

  const handleSeatingPendingDragStart = (event, studentId) => {
    if (selectedSeatingPlan || !studentId) return
    setDraggingSeatingStudentId(studentId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }

  const handleSeatingDrop = (event, targetSeat, targetPlacement) => {
    event.preventDefault()
    if (
      selectedSeatingPlan ||
      !targetSeat?.enabled ||
      seatingRestrictions.blockedSeatIds.includes(targetSeat.id)
    ) {
      return
    }
    const draggedStudentId = event.dataTransfer.getData('text/plain') || draggingSeatingStudentId
    if (!draggedStudentId) return
    if (seatingLockedStudentIds.includes(draggedStudentId) || seatingLockedStudentIds.includes(targetPlacement?.studentId)) {
      setDraggingSeatingStudentId('')
      return
    }
    const sourcePlacement = generatedSeatingPlan.placements.find((placement) => placement.studentId === draggedStudentId)
    if (targetPlacement?.studentId === draggedStudentId) return

    captureSeatingQualityBaseline('Abans del moviment manual')
    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => {
      const next = { ...current, [draggedStudentId]: targetSeat.id }
      if (targetPlacement?.studentId) {
        if (sourcePlacement?.seat?.id) next[targetPlacement.studentId] = sourcePlacement.seat.id
        else delete next[targetPlacement.studentId]
      }
      return next
    })
    setSeatingUnseatedStudentIds((current) => {
      const next = new Set(current.filter((studentId) => studentId !== draggedStudentId))
      if (targetPlacement?.studentId && !sourcePlacement?.seat?.id) next.add(targetPlacement.studentId)
      return [...next]
    })
    setSeatingManualEmptySeatIds((current) => {
      const next = new Set(current)
      next.delete(targetSeat.id)
      if (sourcePlacement?.seat?.id && !targetPlacement) next.add(sourcePlacement.seat.id)
      if (targetPlacement && sourcePlacement?.seat?.id) next.delete(sourcePlacement.seat.id)
      return [...next]
    })
    setDraggingSeatingStudentId('')
  }

  const handleSaveTutorialSeatingPlan = async () => {
    const fallbackName = `Disposició ${formatShortDate(getTodayDateInput())}`
    const savedPlan = await saveTutorialSeatingPlan({
      classId: activeClassId,
      isActive: seatingSaveAsActive,
      layout: {
        ...generatedSeatingPlan.layout,
        iterationObjective: seatingIterationObjective,
        seatingRestrictions,
        lockedStudentIds: seatingLockedStudentIds,
        prioritizeHalfGroups: seatingPrioritizeHalfGroups,
      },
      observation: seatingPlanObservation,
      qualitySnapshot: {
        conflictCount: generatedSeatingPlanAnalysis.conflicts.length,
        label: generatedSeatingPlanAnalysis.quality.label,
        score: generatedSeatingPlanAnalysis.score,
      },
      seats: generatedSeatingPlan.placements.map((placement) => ({
        halfGroup: placement.halfGroup,
        isConflict: placement.isConflict,
        isLocked: placement.isLocked,
        isStar: placement.isStar,
        studentId: placement.studentId,
        x: placement.seat.x,
          y: placement.seat.y,
      })),
      title: seatingPlanName.trim() || fallbackName,
    })
    setSeatingPlanName('')
    setSeatingPlanObservation('')
    setSeatingSaveAsActive(false)
    setLoadedSeatingPlanId(savedPlan?.id || '')
    setSelectedSeatingPlanId('')
  }

  const handleLoadTutorialSeatingPlan = (plan) => {
    if (!plan) return
    const cleanLayout = normalizeSeatingLayout(plan.layout)
    const savedRestrictions = normalizeSavedSeatingRestrictions(plan.layout?.seatingRestrictions)
    const seatAssignments = getSavedSeatingAssignments(plan, getGridSeatId)

    setSeatingLayout(cleanLayout)
    setSeatingStructureDraft({
      blocks:
        normalizeSeatingBlocks(cleanLayout.blocks).length > 0
          ? normalizeSeatingBlocks(cleanLayout.blocks)
          : DEFAULT_SEATING_BLOCKS,
      rows: cleanLayout.rows,
    })
    setSeatingManualSeatByStudentId(seatAssignments)
    setSeatingManualEmptySeatIds([])
    setSeatingLockedStudentIds([...(plan.layout?.lockedStudentIds || [])])
    setSeatingIterationObjective(plan.layout?.iterationObjective || 'balanced')
    setSeatingPrioritizeHalfGroups(plan.layout?.prioritizeHalfGroups !== false)
    setSeatingRestrictions(savedRestrictions)
    setSeatingUnseatedStudentIds(
      getUnseatedStudentIds(
        classStudents.map((student) => student.id),
        seatAssignments,
      ),
    )
    setSeatingProblemSeats({})
    setSeatingAppliedProblemSeats({})
    setSeatingPlanName(`${plan.title || 'Disposició'} · nova versió`)
    setSeatingPlanObservation(plan.observation || '')
    setSeatingSaveAsActive(Boolean(plan.isActive))
    setLoadedSeatingPlanId(plan.id)
    setSelectedSeatingPlanId('')
    setSelectedSeatingStudentId('')
    setSeatingMoveStudentId('')
    setSeatingBlockSeatMode(false)
    setSeatingQualityBaseline(null)
  }

  const handleDuplicateTutorialSeatingPlan = async (plan) => {
    if (!plan) return
    const duplicatedPlan = await saveTutorialSeatingPlan({
      classId: plan.classId,
      contentUpdatedAt: plan.contentUpdatedAt || plan.createdAt,
      isActive: false,
      layout: plan.layout,
      observation: plan.observation,
      qualitySnapshot: plan.qualitySnapshot || null,
      seats: plan.seats || [],
      title: `${plan.title || 'Disposició'} · còpia`,
    })
    setLoadedSeatingPlanId(duplicatedPlan?.id || '')
  }

  const handleSetActiveTutorialSeatingPlan = async (plan) => {
    if (!plan || plan.isActive) return
    await updateTutorialSeatingPlan(plan.id, { isActive: true })
  }

  const handleDeleteTutorialSeatingPlan = async (plan) => {
    if (!plan) return
    const shouldDelete = window.confirm(`Vols eliminar la versió “${plan.title || 'Disposició guardada'}”?`)
    if (!shouldDelete) return
    await deleteTutorialSeatingPlan(plan.id)
    if (selectedSeatingPlanId === plan.id) setSelectedSeatingPlanId('')
    if (loadedSeatingPlanId === plan.id) setLoadedSeatingPlanId('')
    if (comparisonSeatingPlanId === plan.id) setComparisonSeatingPlanId('')
  }

  const persistSociogramPosition = async (studentId, position) => {
    if (!activeClassId || !studentId || !position) return

    const nextPositions = {
      ...Object.fromEntries(savedSociogramPositionsByStudentId),
      ...sociogramDraftPositions,
      [studentId]: position,
    }
    await upsertTutorialSociogramLayout({ classId: activeClassId, positions: nextPositions })
  }

  const handleSociogramPointerDown = (event, node) => {
    if (!sociogramCanvasRef.current) return

    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSelectedRelationStudentId(node.id)
    sociogramDragRef.current = {
      lastPosition: null,
      moved: false,
      pointerId: event.pointerId,
      studentId: node.id,
    }
  }

  const handleSociogramPointerMove = (event, node) => {
    const dragState = sociogramDragRef.current
    const canvasElement = sociogramCanvasRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.studentId !== node.id || !canvasElement) {
      return
    }

    const rect = canvasElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const nextPosition = {
      x: clampSociogramPosition(((event.clientX - rect.left) / rect.width) * 100, 6, 94, node.x),
      y: clampSociogramPosition(((event.clientY - rect.top) / rect.height) * 100, 8, 92, node.y),
    }
    sociogramDragRef.current = { ...dragState, lastPosition: nextPosition, moved: true }
    setSociogramDraftPositions((current) => ({ ...current, [node.id]: nextPosition }))
  }

  const handleSociogramPointerUp = async (event, node) => {
    const dragState = sociogramDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.studentId !== node.id) return

    event.currentTarget.releasePointerCapture?.(event.pointerId)
    sociogramDragRef.current = null
    if (dragState.moved && dragState.lastPosition) {
      await persistSociogramPosition(node.id, dragState.lastPosition)
    }
  }

  const handleResetSociogramLayout = async () => {
    setSociogramDraftPositions({})
    sociogramDragRef.current = null
    await resetTutorialSociogramLayout(activeClassId)
  }

  const handleSaveCooperativeGroupSet = async () => {
    if (visibleCooperativeGroups.length === 0) return

    const fallbackName = `Grups cooperatius ${formatShortDate(getTodayDateInput())}`
    await saveTutorialGroupSet({
      classId: activeClassId,
      generationMeta: cooperativeGroupSetAnalysis.methodology,
      groupSize: cooperativeGroupSize,
      groups: visibleCooperativeGroups,
      lockedStudentIds: cooperativeLockedStudentIds,
      manualChangeCount: cooperativeEditHistory.past.length,
      name: cooperativeGroupSetName || fallbackName,
      observation: cooperativeGroupSetObservation,
      prioritizeHalfGroups,
      qualitySnapshot: {
        criticalGroupCount: cooperativeGroupSetAnalysis.criticalGroupCount,
        incompatibilityCount: cooperativeGroupSetAnalysis.incompatibilityCount,
        label: cooperativeGroupSetAnalysis.quality.label,
        reviewGroupCount: cooperativeGroupSetAnalysis.reviewGroupCount,
        score: cooperativeGroupSetAnalysis.score,
        unsupportedStudentCount: cooperativeGroupSetAnalysis.unsupportedStudentCount,
      },
      sourceGroupSetId: cooperativeSourceGroupSetId,
      sourceType: manualCooperativeGroups.length > 0 ? 'manual' : 'automatic',
      strategy: cooperativeStrategy,
    })
    setCooperativeGroupSetName('')
    setCooperativeGroupSetObservation('')
    setCooperativeSourceGroupSetId('')
    setSelectedCooperativeGroupSetId('')
  }

  const handleReuseCooperativeGroupSet = (groupSet) => {
    if (!groupSet) return
    const reusableGroups = materializeSavedCooperativeGroups({
      profilesByStudentId: cooperativeProfilesByStudentId,
      relations: effectiveTutorialRelations,
      savedGroupSet: groupSet,
    })
    setCooperativeGroupSize(String(groupSet.groupSize || 4))
    setCooperativeStrategy(groupSet.strategy || 'balanced')
    setPrioritizeHalfGroups(groupSet.prioritizeHalfGroups !== false)
    setManualCooperativeGroups(reusableGroups)
    setCooperativeLockedStudentIds(
      [...new Set((groupSet.groups || []).flatMap((group) => group.lockedMemberIds || []))],
    )
    setCooperativeEditHistory({ future: [], past: [] })
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
    setCooperativeGroupSetName(`${groupSet.name || 'Grups cooperatius'} · nova versió`)
    setCooperativeGroupSetObservation(groupSet.observation || '')
    setCooperativeSourceGroupSetId(groupSet.id)
    setSelectedCooperativeGroupId('')
    setSelectedCooperativeGroupSetId('')
  }

  const handleDeleteCooperativeGroupSet = async (groupSetId) => {
    await deleteTutorialGroupSet(groupSetId)
    if (selectedCooperativeGroupSetId === groupSetId) {
      setSelectedCooperativeGroupSetId('')
    }
  }

  const getCooperativeOutputTitle = () =>
    cooperativeGroupSetName.trim() ||
    selectedCooperativeGroupSet?.name ||
    `Grups cooperatius · ${activeClass?.name || 'classe'}`

  const handleCopyCooperativeGroups = async (audience) => {
    const title = getCooperativeOutputTitle()
    const text =
      audience === 'students'
        ? buildStudentCooperativeGroupText(visibleCooperativeGroups, { title })
        : buildTeacherCooperativeGroupText(visibleCooperativeGroups, {
            observation: cooperativeGroupSetObservation || selectedCooperativeGroupSet?.observation,
            qualityLabel: cooperativeGroupSetAnalysis.quality.label,
            score: cooperativeGroupSetAnalysis.score,
            strategyLabel: cooperativeGroupSetAnalysis.methodology.strategyLabel,
            title,
          })
    await navigator.clipboard.writeText(text)
    setCooperativeCopyMessage(
      audience === 'students'
        ? 'Còpia neta preparada: només inclou grups i noms.'
        : 'Còpia docent preparada amb criteri, qualitat, fortaleses i alertes.',
    )
  }

  const resetCooperativeManualEditing = () => {
    setManualCooperativeGroups([])
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
    setCooperativeEditHistory({ future: [], past: [] })
    setCooperativeLockedStudentIds([])
    setCooperativeSourceGroupSetId('')
  }

  const handleStartCooperativeEdit = (studentId, sourceGroupId) => {
    const sourceGroup = visibleCooperativeGroups.find((group) => group.id === sourceGroupId)
    if (
      !canModifyCooperativeMember({
        group: sourceGroup,
        lockedStudentIds: cooperativeLockedStudentIds,
        studentId,
      })
    ) {
      return
    }
    const targetGroup = visibleCooperativeGroups.find(
      (group) => group.id !== sourceGroupId && !group.locked,
    )
    setCooperativeEditDraft({
      studentId,
      targetGroupId: targetGroup?.id || '',
      targetStudentId:
        targetGroup?.members.find(
          (member) => !cooperativeLockedStudentIds.includes(member.student.id),
        )?.student.id || '',
      type: sourceGroup.members.length <= 2 ? 'swap' : 'move',
    })
  }

  const handleApplyCooperativeEdit = () => {
    if (!cooperativeEditPreview) return
    const currentSnapshot = {
      groups: visibleCooperativeGroups,
      isAutomatic: manualCooperativeGroups.length === 0,
      lockedStudentIds: cooperativeLockedStudentIds,
    }
    setCooperativeEditHistory((current) => ({
      future: [],
      past: [...current.past, currentSnapshot],
    }))
    setSelectedCooperativeGroupSetId('')
    setManualCooperativeGroups(cooperativeEditPreview.nextGroups)
    setSelectedCooperativeGroupId(
      cooperativeEditDraft.type === 'move'
        ? cooperativeEditPreview.targetGroup.id
        : cooperativeEditPreview.sourceGroup.id,
    )
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
  }

  const handleUndoCooperativeEdit = () => {
    const previousSnapshot = cooperativeEditHistory.past.at(-1)
    if (!previousSnapshot) return
    const currentSnapshot = {
      groups: visibleCooperativeGroups,
      isAutomatic: manualCooperativeGroups.length === 0,
      lockedStudentIds: cooperativeLockedStudentIds,
    }
    setCooperativeEditHistory((current) => ({
      future: [currentSnapshot, ...current.future],
      past: current.past.slice(0, -1),
    }))
    setManualCooperativeGroups(previousSnapshot.isAutomatic ? [] : previousSnapshot.groups)
    setCooperativeLockedStudentIds(previousSnapshot.lockedStudentIds || [])
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
  }

  const handleRedoCooperativeEdit = () => {
    const nextSnapshot = cooperativeEditHistory.future[0]
    if (!nextSnapshot) return
    const currentSnapshot = {
      groups: visibleCooperativeGroups,
      isAutomatic: manualCooperativeGroups.length === 0,
      lockedStudentIds: cooperativeLockedStudentIds,
    }
    setCooperativeEditHistory((current) => ({
      future: current.future.slice(1),
      past: [...current.past, currentSnapshot],
    }))
    setManualCooperativeGroups(nextSnapshot.isAutomatic ? [] : nextSnapshot.groups)
    setCooperativeLockedStudentIds(nextSnapshot.lockedStudentIds || [])
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
  }

  const commitCooperativeStructureChange = (nextGroups, nextLockedStudentIds = cooperativeLockedStudentIds) => {
    setCooperativeEditHistory((current) => ({
      future: [],
      past: [
        ...current.past,
        {
          groups: visibleCooperativeGroups,
          isAutomatic: manualCooperativeGroups.length === 0,
          lockedStudentIds: cooperativeLockedStudentIds,
        },
      ],
    }))
    setManualCooperativeGroups(enrichCooperativeGroups(nextGroups, effectiveTutorialRelations))
    setCooperativeLockedStudentIds(nextLockedStudentIds)
    setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
  }

  const handleCreateCooperativeGroup = () => {
    const nextGroups = createEmptyCooperativeGroup(visibleCooperativeGroups, cooperativeGroupSize)
    commitCooperativeStructureChange(nextGroups)
    setSelectedCooperativeGroupId(nextGroups.at(-1)?.id || '')
    setCooperativeRenameDraft(nextGroups.at(-1)?.name || '')
  }

  const handleRenameCooperativeGroup = (groupId, name) => {
    const nextGroups = renameCooperativeGroup(visibleCooperativeGroups, groupId, name)
    if (nextGroups === visibleCooperativeGroups) return
    commitCooperativeStructureChange(nextGroups)
    setCooperativeRenameDraft(name.trim())
  }

  const handleDeleteEmptyCooperativeGroup = (groupId) => {
    const nextGroups = removeEmptyCooperativeGroup(visibleCooperativeGroups, groupId)
    if (nextGroups === visibleCooperativeGroups) return
    commitCooperativeStructureChange(nextGroups)
    setSelectedCooperativeGroupId('')
  }

  const handleToggleCooperativeGroupLock = (groupId) => {
    commitCooperativeStructureChange(toggleCooperativeGroupLock(visibleCooperativeGroups, groupId))
  }

  const handleToggleCooperativeStudentLock = (studentId) => {
    commitCooperativeStructureChange(
      visibleCooperativeGroups,
      toggleCooperativeStudentLock(cooperativeLockedStudentIds, studentId),
    )
  }

  const handleShareTutoringFromHeader = async () => {
    setShareTutoringMessage('')
    const recipientEmail = normalizeEducandEmail(shareTutoringEmail)
    if (!recipientEmail) {
      setShareTutoringMessage('Escriu el correu del cotutor.')
      return
    }
    setShareTutoringBusy('share')
    try {
      const space = await shareTutoringClass({ classId: activeClassId, recipientEmail })
      setShareTutoringEmail('')
      setShareTutoringMessage(
        space?.sharedConflictSummary?.count > 0
          ? `Sol·licitud enviada a ${recipientEmail}. S’han conservat ${space.sharedConflictSummary.count} canvis remots recents.`
          : `Sol·licitud de cotutoria enviada a ${recipientEmail}. Quan l’accepti, treballareu el mateix espai.`,
      )
    } catch (error) {
      setShareTutoringMessage(error.message || 'No s’ha pogut compartir aquesta tutoria.')
    } finally {
      setShareTutoringBusy('')
    }
  }

  const handleSyncTutoringFromHeader = async () => {
    setShareTutoringMessage('')
    setShareTutoringBusy('sync')
    try {
      const space = await syncSharedTutoringClass(activeClassId)
      setShareTutoringMessage(
        space?.sharedConflictSummary?.count > 0
          ? `Sincronització feta. S’han conservat ${space.sharedConflictSummary.count} canvis recents d’un altre tutor.`
          : 'Tutoria compartida sincronitzada correctament.',
      )
    } catch (error) {
      setShareTutoringMessage(error.message || 'No s’ha pogut sincronitzar aquesta tutoria compartida.')
    } finally {
      setShareTutoringBusy('')
    }
  }

  return (
    <section className="tutoring-view" data-tour="tutoring-view">
      <header className="tutoring-hero" data-tour="tutoring-hero">
        <div>
          <span className="section-kicker">
            <GraduationCap size={17} />
            Mode tutoria
          </span>
          <h1>{activeClass?.name || 'Tutoria'}</h1>
          <p>
            Espai per recollir la visió global del grup: dades acadèmiques de totes les assignatures,
            seguiment tutorial i perfil individual de cada alumne.
          </p>
        </div>
        <aside className="tutoring-hero-share-panel">
          <div className="tutoring-hero-linked-count">
            <strong>{classStudents.length}</strong>
            <span>alumnes vinculats</span>
            <small>Dades compartides amb {linkedClass?.name || 'la classe activa'}</small>
          </div>
          <div className="tutoring-hero-share-controls">
            <EducandEmailInput
              label="Cotutor"
              onChange={setShareTutoringEmail}
              placeholder="nom"
              value={shareTutoringEmail}
            />
            <button
              className="secondary-action compact"
              disabled={shareTutoringBusy === 'share' || !cloud.user?.email}
              onClick={handleShareTutoringFromHeader}
              title={cloud.user?.email ? 'Compartir aquesta tutoria' : 'Inicia sessió per compartir la tutoria'}
              type="button"
            >
              <Share2 size={15} />
              Afegir cotutor
            </button>
            {activeClass?.sharedTutoringSpaceId && (
              <button
                className="secondary-action compact"
                disabled={shareTutoringBusy === 'sync'}
                onClick={handleSyncTutoringFromHeader}
                type="button"
              >
                <RefreshCw size={15} />
                Sync
              </button>
            )}
          </div>
          {(shareTutoringMessage || cloud.sharedTutoringError) && (
            <small
              className={`tutoring-hero-share-message ${
                cloud.sharedTutoringError && !shareTutoringMessage ? 'error' : ''
              }`}
            >
              {shareTutoringMessage || cloud.sharedTutoringError}
            </small>
          )}
        </aside>
      </header>

      <div className="tutoring-panel-tabs" aria-label="Vistes de tutoria" data-tour="tutoring-panel-tabs">
        <button
          className={activePanel === 'evaluation' ? 'active' : ''}
          onClick={() => setActivePanel('evaluation')}
          type="button"
        >
          <BookOpenCheck size={17} />
          Avaluació tutorial
        </button>
        <button
          className={activePanel === 'tracking' ? 'active' : ''}
          onClick={() => setActivePanel('tracking')}
          type="button"
        >
          <ClipboardList size={17} />
          Seguiment tutorial
        </button>
        <button
          className={activePanel === 'relationships' ? 'active' : ''}
          onClick={() => setActivePanel('relationships')}
          type="button"
        >
          <Network size={17} />
          Relacions i grups
        </button>
        <button
          className={activePanel === 'profile' ? 'active' : ''}
          onClick={() => setActivePanel('profile')}
          type="button"
        >
          <UsersRound size={17} />
          Informes tutorials
        </button>
      </div>

      {activePanel === 'evaluation' && (
        <section className="tutorial-evaluation-panel" data-tour="tutoring-evaluation-panel">
          <section className="tutorial-group-diagnosis" data-tour="tutoring-group-diagnosis">
            <header>
              <div>
                <span className="section-kicker">
                  <BarChart3 size={17} />
                  Diagnòstic tutorial del grup
                </span>
                <h2>Visió de tutor</h2>
                <p>
                  Lectura global del grup combinant competències de totes les assignatures i registres tutorials.
                </p>
              </div>
              <button className="secondary-action compact" onClick={() => setActivePanel('profile')} type="button">
                Veure informes
              </button>
            </header>

            <div className="tutorial-diagnosis-filter-bar">
              <label>
                Filtrar àrea
                <select
                  onChange={(event) => {
                    setDiagnosisAreaFilter(event.target.value)
                    setDiagnosisSubjectFilter('all')
                  }}
                  value={diagnosisAreaFilter}
                >
                  <option value="all">Totes les àrees</option>
                  {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filtrar assignatura
                <select
                  onChange={(event) => setDiagnosisSubjectFilter(event.target.value)}
                  value={diagnosisSubjectFilter}
                >
                  <option value="all">Totes les assignatures</option>
                  {diagnosisSubjectOptions.map((item) => (
                    <option key={item.subject} value={item.subject}>
                      {item.subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="tutorial-group-diagnosis-grid">
              <article>
                <span>Competències no assolides</span>
                <strong>{diagnosisSummary.evaluatedCount > 0 ? formatPercent(diagnosisSummary.notDevelopedPercent) : '-'}</strong>
                <small>
                  {diagnosisSummary.notDevelopedCount} de {diagnosisSummary.evaluatedCount} competències avaluades
                </small>
              </article>
              <article>
                <span>Cobertura tutorial</span>
                <strong>{formatPercent(diagnosisGroupSummary.academicCoveragePercent)}</strong>
                <small>{diagnosisGroupSummary.studentsWithData} alumnes amb dades acadèmiques o de seguiment</small>
              </article>
              <article>
                <span>Àrea prioritària</span>
                <strong>{diagnosisSummary.weakestArea?.name || '-'}</strong>
                <small>
                  {diagnosisSummary.weakestArea
                    ? `${formatPercent(diagnosisSummary.weakestArea.notDevelopedPercent)} no assolides`
                    : 'Encara no hi ha prou dades'}
                </small>
              </article>
              <article className={diagnosisGroupSummary.priorityStudents.length > 0 ? 'risk' : 'ok'}>
                <span>Alumnes prioritaris</span>
                <strong>{diagnosisGroupSummary.priorityStudents.length}</strong>
                <small>Rendiment baix, registres tutorials o acumulació combinada</small>
              </article>
            </div>

            {diagnosisGroupSummary.priorityStudents.length > 0 ? (
              <div className="tutorial-group-priority-list">
                {diagnosisGroupSummary.priorityStudents.slice(0, 6).map((item) => (
                  <button
                    className="tutorial-group-priority-row"
                    key={item.profile.student.id}
                    onClick={() => setSelectedTutorialProfileId(item.profile.student.id)}
                    type="button"
                  >
                    <div>
                      <strong>{item.profile.student.name}</strong>
                      <span>{item.reasons.slice(0, 3).join(' · ')}</span>
                    </div>
                    <em>{item.score}</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                Quan hi hagi notes tutorials o registres de seguiment, aquí apareixeran els alumnes que cal mirar abans.
              </div>
            )}
          </section>

          <div className="tutorial-stats-grid">
            <TutorialGroupGradeChart summary={diagnosisSummary} />
            <TutorialSubjectAverageChart subjects={diagnosisSummary.subjectSummaries} />
            <TutorialStatsCard
              detail={`${diagnosisSummary.notDevelopedCount} de ${diagnosisSummary.evaluatedCount} competències avaluades`}
              icon={TrendingDown}
              label="Competències no assolides"
              tone={diagnosisSummary.notDevelopedPercent >= 30 ? 'risk' : 'neutral'}
              value={diagnosisSummary.evaluatedCount > 0 ? formatPercent(diagnosisSummary.notDevelopedPercent) : '-'}
            />
            <TutorialStatsCard
              detail={
                diagnosisSummary.weakestArea
                  ? `${diagnosisSummary.weakestArea.notDeveloped} no assolides · mitjana ${diagnosisSummary.weakestArea.averageGrade}`
                  : 'Encara no hi ha prou dades'
              }
              icon={BarChart3}
              label="Àrea amb més dificultat"
              tone="amber"
              value={diagnosisSummary.weakestArea?.name || '-'}
            />
            <TutorialStatsCard
              detail="Baix assoliment o acumulació de competències no assolides"
              icon={AlertTriangle}
              label="Alumnes a mirar"
              onClick={() => setActivePanel('profile')}
              tone={diagnosisSummary.riskProfiles.length > 0 ? 'risk' : 'ok'}
              value={diagnosisSummary.riskProfiles.length}
            />
            <TutorialStatsCard
              detail="Competències amb alguna nota tutorial registrada"
              icon={Eye}
              label="Cobertura de dades"
              tone="blue"
              value={diagnosisSummary.evaluatedCount}
            />
          </div>

          {diagnosisSummary.evaluatedCount > 0 && (
            <div className="tutorial-insight-grid">
              <article className="tutoring-card compact">
                <div>
                  <Layers3 size={22} />
                  <h2>Àrees de dificultat</h2>
                </div>
                <div className="tutorial-insight-list">
                  {diagnosisSummary.areaSummaries.slice(0, 4).map((area) => (
                    <div className="tutorial-insight-row" key={area.id}>
                      <strong>{area.name}</strong>
                      <span>{formatPercent(area.notDevelopedPercent)} no assolides</span>
                      <small>Mitjana {area.averageGrade}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="tutoring-card compact">
                <div>
                  <BookOpenCheck size={22} />
                  <h2>Assignatures a revisar</h2>
                </div>
                <div className="tutorial-insight-list">
                  {diagnosisSummary.subjectSummaries.slice(0, 5).map((subject) => (
                    <div className="tutorial-insight-row" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>{formatPercent(subject.notDevelopedPercent)} no assolides</span>
                      <small>{subject.areaName}</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}

          <div className="tutorial-filter-bar">
            <label>
              Àrea
              <select
                onChange={(event) => {
                  setAreaFilter(event.target.value)
                  setSubjectFilter('auto')
                }}
                value={areaFilter}
              >
                <option value="all">Totes les àrees</option>
                {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura
              <select onChange={(event) => setSubjectFilter(event.target.value)} value={subjectFilter}>
                <option value="auto">Assignatura vinculada o primera disponible</option>
                {subjectOptions.map((item) => (
                  <option key={item.subject} value={item.subject}>
                    {item.subject}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-action tutorial-import-all-button" onClick={() => setShowBulkImport(true)} type="button">
              <FileSpreadsheet size={17} />
              Importar totes les matèries
            </button>
          </div>

          <div className="tutorial-subject-overview">
            {subjectOptions.map((item) => (
              <SubjectCatalogCard
                completion={subjectCompletion.get(item.subject)}
                item={item}
                key={item.subject}
                onSelect={setSubjectFilter}
              />
            ))}
          </div>

          <article className="tutorial-mark-grid-card">
            <header>
              <span className="section-kicker">
                <Layers3 size={17} />
                {selectedSubjectArea?.name || 'Àrea'}
              </span>
              <div>
                <h2>{selectedSubject || 'Assignatura'}</h2>
                <p>
                  Posa o revisa la nota de cada competència. Si aquesta classe està vinculada amb una assignatura
                  que ja té notes a Avaluapro, les competències apareixen carregades automàticament.
                </p>
                {isSelectedSubjectLinked && (
                  <div className="tutorial-linked-note">
                    <CheckCircle2 size={16} />
                    <span>
                      {linkedGradeCount > 0
                        ? `${linkedGradeCount} notes es llegeixen automàticament de ${linkedClass?.name || 'la classe vinculada'}.`
                        : `Aquesta assignatura està vinculada amb ${linkedClass?.name || 'la classe vinculada'}, però encara no hi ha notes carregades.`}
                      {' '}Si edites una cel·la aquí, quedarà guardada com a nota tutorial pròpia.
                    </span>
                  </div>
                )}
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la classe vinculada per començar a posar notes.</div>
            ) : selectedCompetencies.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-mark-table-wrap">
                <table className="tutorial-mark-table">
                  <thead>
                    <tr>
                      <th>Alumne</th>
                      {selectedCompetencies.map((competency) => (
                        <th key={competency.key}>
                          <span>{selectedSubject}</span>
                          <strong>{competency.name}</strong>
                        </th>
                      ))}
                      <th>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const rowValues = selectedCompetencies.map((competency) =>
                        getTutorialCompetencyGrade({
                          classId: activeClassId,
                          competency,
                          evaluationContext,
                          student,
                          studentId: student.id,
                          subject: selectedSubject,
                          tutorialMarks,
                        }),
                      )
                      const finalGrade = calculateGrade(rowValues)

                      return (
                        <tr key={student.id}>
                          <th>
                            <button
                              className="tutorial-student-link"
                              onClick={() => setSelectedTutorialProfileId(student.id)}
                              type="button"
                            >
                              <span>{student.name}</span>
                              <small>{student.halfGroup || 'Sense mig grup'}</small>
                            </button>
                          </th>
                          {selectedCompetencies.map((competency) => {
                            const gradeSource = getTutorialCompetencyGradeSource({
                              classId: activeClassId,
                              competency,
                              evaluationContext,
                              student,
                              studentId: student.id,
                              subject: selectedSubject,
                              tutorialMarks,
                            })
                            const value = gradeSource.value
                            return (
                              <td key={`${student.id}_${competency.key}`}>
                                <select
                                  className={`${gradeTextClassName(value)} ${
                                    gradeSource.source === 'linked' ? 'linked-grade-select' : ''
                                  } ${gradeSource.source === 'modified' ? 'modified-grade-select' : ''} ${
                                    gradeSource.source === 'exempt' ? 'exempt-grade-select' : ''
                                  }`}
                                  data-tutorial-grade-select="true"
                                  disabled={gradeSource.source === 'modified' || gradeSource.source === 'exempt'}
                                  onKeyDown={(event) => {
                                    if (gradeSource.source === 'modified' || gradeSource.source === 'exempt') return
                                    const key = event.key.toUpperCase()
                                    const nextValue = key === 'N' ? 'NA' : key
                                    if (['A', 'B', 'C', 'D', 'NA'].includes(nextValue)) {
                                      event.preventDefault()
                                      updateTutorialMark({
                                        classId: activeClassId,
                                        studentId: student.id,
                                        subject: selectedSubject,
                                        competencyKey: competency.key,
                                        value: nextValue,
                                      })
                                      window.setTimeout(() => focusNextTutorialGradeSelect(event.currentTarget), 0)
                                    }
                                    if (event.key === 'Backspace' || event.key === 'Delete') {
                                      event.preventDefault()
                                      updateTutorialMark({
                                        classId: activeClassId,
                                        studentId: student.id,
                                        subject: selectedSubject,
                                        competencyKey: competency.key,
                                        value: '',
                                      })
                                    }
                                  }}
                                  onChange={(event) =>
                                    updateTutorialMark({
                                      classId: activeClassId,
                                      studentId: student.id,
                                      subject: selectedSubject,
                                      competencyKey: competency.key,
                                      value: event.target.value,
                                    })
                                  }
                                  title={
                                    gradeSource.source === 'modified'
                                      ? 'Competència modificada: compta com a D en el balanç estàndard.'
                                      : gradeSource.source === 'exempt'
                                        ? 'Matèria exempta per a aquest alumne.'
                                        : gradeSource.source === 'linked'
                                      ? `Nota llegida de ${linkedClass?.name || 'la classe vinculada'} (${gradeSource.utName || 'última mirada'}). Pots sobreescriure-la.`
                                      : 'Nota tutorial pròpia'
                                  }
                                  value={value}
                                >
                                  {GRADE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option || '-'}
                                    </option>
                                  ))}
                                </select>
                                {gradeSource.source === 'linked' && (
                                  <small className="tutorial-linked-ut">{gradeSource.utName || 'Última mirada'}</small>
                                )}
                                {gradeSource.modified && (
                                  <div className="tutorial-grade-tools">
                                    <span
                                      className="tutorial-modified-indicator"
                                      title="Competència modificada: es compta com a D en el balanç estàndard."
                                    >
                                      M
                                    </span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                          <td>
                            <span className={gradeClassName(finalGrade)}>{finalGrade || '-'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {activePanel === 'tracking' && (
        <section className="tutorial-tracking-panel" data-tour="tutoring-tracking-panel">
          <div className="tutorial-record-summary">
            {TUTORING_RECORD_TYPES.map((type) => (
              <button
                className={`tutorial-record-pill ${type.tone} ${recordForm.type === type.id ? 'active' : ''}`}
                key={type.id}
                onClick={() => setRecordForm((current) => ({ ...current, type: type.id }))}
                type="button"
              >
                <strong>{countByType(classTutorialRecords, type.id)}</strong>
                {type.label}
              </button>
            ))}
          </div>

          <div className="tutorial-tracking-grid">
            <article className="tutoring-card tutorial-record-form-card">
              <div>
                <Plus size={24} />
                <h2>Nou registre tutorial</h2>
              </div>
              <p>
                Registra notes a l’agenda, incidents o expulsions sense duplicar la classe. Tot queda vinculat al
                perfil tutorial de l’alumne.
              </p>

              <form className="tutorial-record-form" onSubmit={handleSubmitTutorialRecord}>
                <label>
                  Alumne
                  <select
                    onChange={(event) => setRecordForm((current) => ({ ...current, studentId: event.target.value }))}
                    value={recordForm.studentId}
                  >
                    <option value="">Primer alumne de la llista</option>
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipus
                  <select
                    className={`tutorial-record-type-select ${selectedRecordType.tone}`}
                    onChange={(event) =>
                      setRecordForm((current) => ({
                        ...current,
                        type: event.target.value,
                        agendaKind: event.target.value === 'agenda' ? current.agendaKind || 'work' : current.agendaKind,
                      }))
                    }
                    value={recordForm.type}
                  >
                    {TUTORING_RECORD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                {recordForm.type === 'agenda' && (
                  <div className="tutorial-agenda-kind-toggle">
                    <span>Tipus de nota</span>
                    <div>
                      {TUTORING_AGENDA_NOTE_TYPES.map((type) => (
                        <button
                          className={recordForm.agendaKind === type.id ? 'active' : ''}
                          key={type.id}
                          onClick={() => setRecordForm((current) => ({ ...current, agendaKind: type.id }))}
                          type="button"
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label>
                  Data
                  <input
                    onChange={(event) => setRecordForm((current) => ({ ...current, date: event.target.value }))}
                    type="date"
                    value={recordForm.date}
                  />
                </label>

                <label className="full">
                  Motiu o observació
                  <textarea
                    maxLength={TUTORING_TEXT_LIMIT}
                    onChange={(event) => setRecordForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Ex: nota a l’agenda per acumulació de tasques no fetes, incident al passadís, expulsió puntual..."
                    value={recordForm.note}
                  />
                </label>

                <button className="primary-action" disabled={classStudents.length === 0} type="submit">
                  Afegir registre
                </button>
              </form>
            </article>

            <article className="tutoring-card">
              <div>
                <UsersRound size={24} />
                <h2>Alumnes amb seguiment</h2>
              </div>
              {tutorialRecordSummary.studentsWithRecords.length === 0 ? (
                <div className="empty-state compact">Encara no hi ha registres tutorials en aquesta classe.</div>
              ) : (
                <div className="tutorial-tracking-student-list">
                  {tutorialRecordSummary.studentsWithRecords.slice(0, 12).map((row) => (
                    <button
                      className="tutorial-tracking-student-row"
                      key={row.student.id}
                      onClick={() => setSelectedTutorialRecordStudentId(row.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{row.student.name}</strong>
                        <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                      </div>
                      <span>{row.agenda} agenda</span>
                      <span>{row.incident} incid.</span>
                      <span>{row.classroomExpulsion + row.centerExpulsion} exp.</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>

          <section className="tutorial-student-profile-tools">
            <article className="tutoring-card tutorial-doip-card" data-tour="tutoring-doip-card">
              <div>
                <ClipboardList size={24} />
                <h2>DOIPs pendents</h2>
              </div>
              <p>
                Marca les respostes de l’equip educatiu quan demanis informació curta sobre un alumne. Així veus qui
                encara no té cap DOIP registrat.
              </p>
              {tutorialRecordSummary.studentsWithoutDoip.length === 0 ? (
                <div className="empty-state compact">Tots els alumnes visibles tenen almenys un DOIP registrat.</div>
              ) : (
                <div className="tutorial-doip-list">
                  {tutorialRecordSummary.studentsWithoutDoip.slice(0, 12).map((row) => (
                    <button key={row.student.id} onClick={() => setSelectedDoipStudentId(row.student.id)} type="button">
                      <span>{row.student.name}</span>
                      <small>Afegir resposta DOIP</small>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="tutoring-card tutorial-modified-card" data-tour="tutoring-modified-card">
              <div>
                <SlidersHorizontal size={24} />
                <h2>Competències modificades</h2>
                <button
                  className="secondary-action compact"
                  onClick={() => openModifiedCompetencyConfig()}
                  type="button"
                >
                  Configurar
                </button>
              </div>
              <p>
                Mostra només alumnes amb alguna competència modificada, tant si s’ha marcat manualment com si arriba de
                les notes tutorials.
              </p>
              {modifiedCompetencyRows.length === 0 ? (
                <div className="empty-state compact">Encara no hi ha competències modificades registrades.</div>
              ) : (
                <div className="tutorial-modified-list">
                  {modifiedCompetencyRows.slice(0, 12).map((row) => (
                    <article className="tutorial-modified-row" key={row.student.id}>
                      <div>
                        <strong>{row.student.name}</strong>
                        <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                      </div>
                      <button
                        onClick={() => setSelectedModifiedStudentId(row.student.id)}
                        title="Veure assignatures i competències modificades"
                        type="button"
                      >
                        {row.subjectCount}
                        <span>assign.</span>
                      </button>
                      <div className="tutorial-modified-total">
                        <small>{row.percentage}%</small>
                        <strong>{row.modifiedCount}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="tutoring-card tutorial-exemptions-card" data-tour="tutoring-exemptions-card">
              <div>
                <ShieldAlert size={24} />
                <h2>Exempcions i balanç modificat</h2>
                <button
                  className="secondary-action compact"
                  disabled={classStudents.length === 0}
                  onClick={() => openExemptionConfig()}
                  type="button"
                >
                  Configurar
                </button>
              </div>
              <p>
                Només es mostren els alumnes amb alguna matèria exempta. La taula tutorial ignorarà aquestes notes.
              </p>
              {exemptionRows.length === 0 ? (
                <div className="empty-state compact">Encara no hi ha cap alumne amb matèries exemptes.</div>
              ) : (
                <div className="tutorial-exemption-summary">
                  {exemptionRows.map((row) => (
                    <article key={row.student.id}>
                      <span>{row.student.name}</span>
                      {row.subjects.length === 1 ? (
                        <strong>{row.subjects[0]}</strong>
                      ) : (
                        <button
                          className="tutorial-exemption-count"
                          onClick={() => setSelectedExemptionStudentId(row.student.id)}
                          type="button"
                        >
                          {row.subjects.length} matèries
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="tutorial-tracking-lower-grid">
            <article className="tutoring-card compact">
              <div>
                <CalendarDays size={22} />
                <h2>Historial recent</h2>
              </div>
              {tutorialRecordSummary.recentRecords.length === 0 ? (
                <div className="empty-state compact">Quan afegeixis registres, apareixeran aquí ordenats per data.</div>
              ) : (
                <div className="tutorial-record-history compact">
                  {tutorialRecordSummary.recentRecords.map((record) => (
                    <article className={`tutorial-record-entry ${record.typeMeta.tone}`} key={record.id}>
                      <div>
                        <strong>{record.student?.name || 'Alumne no trobat'}</strong>
                        <span>
                          {record.typeMeta.label} · {formatShortDate(record.date)}
                        </span>
                        <p>{record.note || 'Sense comentari afegit.'}</p>
                      </div>
                      <button
                        className="icon-button danger subtle"
                        onClick={() => deleteTutorialRecord(record.id)}
                        title="Eliminar registre"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="tutoring-card tutorial-intelligences-card" data-tour="tutoring-intelligences-card">
              <div>
                <Star size={24} />
                <h2>Intel·ligències múltiples</h2>
              </div>
              <p>Assigna perfils predominants per tenir una lectura ràpida del grup i preparar activitats variades.</p>
              {intelligenceSummary.length > 0 && (
                <div className="tutorial-intelligence-summary">
                  {intelligenceSummary.map((item) => (
                    <span key={item.id}>
                      {item.label}: <strong>{item.count}</strong>
                    </span>
                  ))}
                </div>
              )}
              <div className="tutorial-intelligence-list">
                {classStudents.slice(0, 14).map((student) => {
                  const selectedIntelligences = student.multipleIntelligences || []
                  return (
                    <div className="tutorial-intelligence-row" key={student.id}>
                      <strong>{student.name}</strong>
                      <select
                        onChange={(event) => {
                          if (!event.target.value) return
                          toggleStudentArrayValue(student, 'multipleIntelligences', event.target.value)
                          event.target.value = ''
                        }}
                        value=""
                      >
                        <option value="">Afegir perfil...</option>
                        {MULTIPLE_INTELLIGENCE_OPTIONS.filter(
                          (option) => !selectedIntelligences.includes(option.id),
                        ).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="tutorial-chip-list">
                        {selectedIntelligences.length === 0 ? (
                          <small>Sense perfil</small>
                        ) : (
                          selectedIntelligences.map((id) => {
                            const option = MULTIPLE_INTELLIGENCE_OPTIONS.find((item) => item.id === id)
                            return (
                              <button
                                key={id}
                                onClick={() => toggleStudentArrayValue(student, 'multipleIntelligences', id)}
                                type="button"
                              >
                                {option?.label || id}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>
        </section>
      )}

      {activePanel === 'relationships' && (
        <section className="tutorial-relationships-panel" data-tour="tutoring-relationships-panel">
          <section className="tutorial-relationships-hero">
            <div>
              <span className="section-kicker">
                <Network size={17} />
                Relacions del grup
              </span>
              <h2>Sociograma inicial</h2>
              <p>
                Registra afinitats, parelles que funcionen bé i incompatibilitats abans de generar grups cooperatius.
              </p>
            </div>
            <div className="tutorial-relationship-summary">
              <article className="green">
                <HeartHandshake size={19} />
                <strong>{tutorialRelationSummary.workPositiveCount}</strong>
                <span>treball positives</span>
              </article>
              <article className="blue">
                <UsersRound size={19} />
                <strong>{tutorialRelationSummary.socialPositiveCount}</strong>
                <span>afinitats socials</span>
              </article>
              <article className="red">
                <UserX size={19} />
                <strong>{tutorialRelationSummary.avoidCount}</strong>
                <span>incompatibilitats</span>
              </article>
              <article>
                <UsersRound size={19} />
                <strong>{tutorialRelationSummary.isolatedStudents.length}</strong>
                <span>sense relacions</span>
              </article>
              <article>
                <Network size={19} />
                <strong>{tutorialRelationSummary.reciprocalCount}</strong>
                <span>parelles recíproques</span>
              </article>
            </div>
          </section>

          <section className="tutorial-tool-launch-grid" data-tour="tutoring-relationship-tools">
            <button data-tour="tutoring-tool-sociogram" onClick={() => setActiveRelationshipTool('sociogram')} type="button">
              <Network size={25} />
              <strong>Sociograma</strong>
              <span>Mapa visual de relacions reals del grup.</span>
            </button>
            <button data-tour="tutoring-tool-groups" onClick={() => setActiveRelationshipTool('groups')} type="button">
              <UsersRound size={25} />
              <strong>Grups cooperatius</strong>
              <span>Proposta automàtica amb rols, notes i relacions.</span>
            </button>
            <button data-tour="tutoring-tool-seating" onClick={() => setActiveRelationshipTool('seating')} type="button">
              <LayoutGrid size={25} />
              <strong>Disposició d’aula</strong>
              <span>Matriu flexible de taules i cadires.</span>
            </button>
            <button data-tour="tutoring-tool-reports" onClick={() => setActiveRelationshipTool('reports')} type="button">
              <FileText size={25} />
              <strong>Informes sociomètrics</strong>
              <span>Converteix el sociograma en lectura docent, prioritats i accions.</span>
            </button>
          </section>

          <section
            className={`sociometric-import-panel relationship-tool-panel ${
              activeRelationshipTool === 'survey' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <ClipboardList size={17} />
                  Qüestionari sociomètric
                </span>
                <h2>Crear qüestionari per al grup</h2>
                <p>
                  Flux recomanat: crea un enllaç propi d’Avaluapro, envia’l als alumnes i recull les respostes sense
                  Google Forms ni fulls de càlcul.
                </p>
              </div>
              <div className="sociometric-import-actions">
                <button
                  className="tool-back-button contextual"
                  onClick={() => setActiveRelationshipTool('sociogram')}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={17} />
                  Tornar al sociograma
                </button>
              </div>
            </header>

            <div className="sociometric-survey-manager">
              <article className="sociometric-survey-hero">
                <span className="sociometric-survey-icon">
                  <ClipboardList size={28} />
                </span>
                <div>
                  <h3>Qüestionari públic d’Avaluapro</h3>
                  <p>
                    L’alumne tria el seu nom, marca {SOCIOMETRIC_POSITIVE_LIMIT} companys/companyes amb qui li agrada
                    estar o relacionar-se i {SOCIOMETRIC_AVOID_LIMIT} amb qui li costa més. Les respostes queden a
                    Firebase com a afinitats socials del sociograma.
                  </p>
                </div>
              </article>

              <div className="sociometric-survey-status-grid">
                <article>
                  <span>Estat</span>
                  <strong className={activeSociometricSurvey?.status === 'active' ? 'positive' : ''}>
                    {activeSociometricSurvey
                      ? activeSociometricSurvey.status === 'active'
                        ? 'Actiu'
                        : 'Tancat'
                      : 'No creat'}
                  </strong>
                </article>
                <article>
                  <span>Alumnes</span>
                  <strong>{classStudents.length}</strong>
                </article>
                <article>
                  <span>Respostes</span>
                  <strong>{activeSociometricResponseCount}</strong>
                </article>
                <article>
                  <span>Última sinc.</span>
                  <strong>{activeSociometricSurvey?.lastSyncedAt ? formatShortDate(activeSociometricSurvey.lastSyncedAt) : 'Pendent'}</strong>
                </article>
              </div>

              {activeSociometricSurveyUrl ? (
                <label className="sociometric-survey-link">
                  Enllaços individuals
                  <input
                    readOnly
                    value={`${activeSociometricSurveyLinks.length} enllaços · caducitat ${formatShortDate(activeSociometricSurvey.expiresAt)}`}
                  />
                </label>
              ) : (
                <div className="sociometric-survey-empty">
                  <strong>Encara no hi ha cap qüestionari per aquesta classe.</strong>
                  <span>Cal iniciar sessió amb Google i tenir alumnes carregats abans de crear l’enllaç.</span>
                </div>
              )}

              {sociometricSurveyMessage && <div className="sociometric-import-message">{sociometricSurveyMessage}</div>}

              <div className="sociometric-survey-actions">
                <button
                  className="primary-action"
                  disabled={!cloud.user || classStudents.length === 0 || sociometricSurveyBusy === 'create'}
                  onClick={handleCreateSociometricSurvey}
                  type="button"
                >
                  {sociometricSurveyBusy === 'create' ? <Loader2 size={17} /> : <Plus size={17} />}
                  Crear qüestionari
                </button>
                <button
                  className="secondary-action"
                  disabled={!activeSociometricSurveyUrl}
                  onClick={handleCopySociometricSurveyLink}
                  type="button"
                >
                  <Clipboard size={17} />
                  Copiar enllaços
                </button>
                <button
                  className="secondary-action"
                  disabled={!activeSociometricSurveyUrl}
                  onClick={handleDownloadSociometricSurveyLinks}
                  type="button"
                >
                  <FileDown size={17} />
                  Descarregar llista
                </button>
                <button
                  className="secondary-action"
                  disabled={!activeSociometricSurveyUrl}
                  onClick={handleOpenSociometricSurveyLink}
                  type="button"
                >
                  <ExternalLink size={17} />
                  Obrir mostra
                </button>
                <button
                  className="secondary-action"
                  disabled={!activeSociometricSurvey?.id || sociometricSurveyBusy === 'responses'}
                  onClick={handleRefreshSociometricResponses}
                  type="button"
                >
                  {sociometricSurveyBusy === 'responses' ? <Loader2 size={17} /> : <RefreshCw size={17} />}
                  Refrescar respostes
                </button>
                <button
                  className="primary-action"
                  disabled={!activeSociometricSurvey?.id || sociometricSurveyBusy === 'sync'}
                  onClick={handleSyncSociometricSurveyResponses}
                  type="button"
                >
                  {sociometricSurveyBusy === 'sync' ? <Loader2 size={17} /> : <Network size={17} />}
                  Sincronitzar sociograma
                </button>
                <button
                  className="secondary-action"
                  disabled={!activeSociometricSurvey?.id || sociometricSurveyBusy === 'status'}
                  onClick={handleToggleSociometricSurveyStatus}
                  type="button"
                >
                  <Lock size={17} />
                  {activeSociometricSurvey?.status === 'active' ? 'Tancar' : 'Reobrir'}
                </button>
                <button
                  className="danger-action"
                  disabled={
                    !activeSociometricSurvey?.id ||
                    activeSociometricSurvey.ownerUid !== cloud.user?.uid ||
                    sociometricSurveyBusy === 'delete'
                  }
                  onClick={handleDeleteSociometricSurvey}
                  type="button"
                >
                  {sociometricSurveyBusy === 'delete' ? <Loader2 size={17} /> : <Trash2 size={17} />}
                  Eliminar dades brutes
                </button>
              </div>

              <div className="sociometric-survey-sync-note">
                <AlertTriangle size={18} />
                <span>
                  En sincronitzar, Avaluapro crea relacions d’origen “Qüestionari públic”. Si ja hi ha una relació
                  de treball marcada pel docent amb la mateixa parella, la conserva com a criteri docent independent.
                </span>
              </div>
            </div>

            <div className="sociometric-import-layout">
              <article className="sociometric-import-help">
                <FileSpreadsheet size={24} />
                <h3>Pla B: importar des d’un full</h3>
                <p>
                  Una fila per alumne. La primera columna és qui respon. Després, 4 eleccions positives i 3 rebuigs.
                </p>
                <code>{SOCIOMETRIC_TEMPLATE_HEADER}</code>
                <small>
                  Pots copiar o descarregar una plantilla amb tots els alumnes. També funciona si el full ve de Google
                  Forms i la columna “Alumne” no és la primera. Els noms poden tenir accents diferents o formes curtes:
                  Avaluapro intentarà fer coincidència aproximada.
                </small>
                <div className="sociometric-import-actions compact-inline">
                  <button className="secondary-action compact" onClick={handleCopySociometricTemplate} type="button">
                    <Clipboard size={16} />
                    Copiar plantilla
                  </button>
                  <button className="secondary-action compact" onClick={handleDownloadSociometricTemplate} type="button">
                    <FileDown size={16} />
                    Descarregar plantilla
                  </button>
                </div>
              </article>

              <label className="sociometric-import-textarea">
                Enganxa aquí les respostes
                <textarea
                  onChange={(event) => {
                    setSociometricPasteText(event.target.value)
                    setSociometricImportMessage('')
                  }}
                  placeholder={`${SOCIOMETRIC_TEMPLATE_HEADER}\nALUMNE 1\tALUMNE 2\tALUMNE 3\tALUMNE 4\tALUMNE 5\tALUMNE 6\tALUMNE 7\tALUMNE 8`}
                  value={sociometricPasteText}
                />
              </label>
            </div>

            <div className="sociometric-preview-grid">
              <article>
                <span>Respostes</span>
                <strong>{sociometricPreview.responsesCount}</strong>
              </article>
              <article>
                <span>Coincidències</span>
                <strong>{sociometricPreview.matchedResponses}</strong>
              </article>
              <article className="positive">
                <span>Eleccions</span>
                <strong>{sociometricPreview.positiveCount}</strong>
              </article>
              <article className="danger">
                <span>Rebuigs</span>
                <strong>{sociometricPreview.avoidCount}</strong>
              </article>
              <article className={sociometricPreview.issues.length > 0 ? 'warning' : ''}>
                <span>Revisions</span>
                <strong>{sociometricPreview.issues.length}</strong>
              </article>
            </div>

            {sociometricImportMessage && <div className="sociometric-import-message">{sociometricImportMessage}</div>}

            {sociometricPreview.issues.length > 0 && (
              <div className="sociometric-issue-list">
                <strong>Files a revisar abans o després d’importar</strong>
                {sociometricPreview.issues.slice(0, 12).map((issue, index) => (
                  <p key={`${issue.rowNumber}_${issue.label}_${index}`}>
                    Fila {issue.rowNumber}: {issue.label} · {issue.detail}
                  </p>
                ))}
                {sociometricPreview.issues.length > 12 && (
                  <small>Hi ha {sociometricPreview.issues.length - 12} avís/os més.</small>
                )}
              </div>
            )}

            <div className="sociometric-results-preview">
              <header>
                <div>
                  <span className="section-kicker">
                    <BarChart3 size={17} />
                    Lectura ràpida
                  </span>
                  <h3>Indicadors sociomètrics actuals</h3>
                </div>
                <div className="sociometric-metric-strip">
                  <span>Densitat {sociometricMetrics.density}%</span>
                  <span>Inclusió {sociometricMetrics.inclusion}%</span>
                  <span>Positivitat {sociometricMetrics.positivity}%</span>
                  <span>Moreno {sociometricMetrics.moreno}%</span>
                </div>
              </header>
              <div className="sociometric-classification-grid">
                {sociometricMetrics.categoryCounts.map((item) => (
                  <article key={item.category}>
                    <span>{item.category}</span>
                    <strong>{item.count}</strong>
                  </article>
                ))}
              </div>
            </div>

            <footer className="sociometric-import-footer">
              <p>
                En importar, les respostes queden guardades com a relacions tutorials i alimenten el sociograma, els
                grups cooperatius i la disposició d’aula.
              </p>
              <button
                className="primary-action"
                disabled={sociometricPreview.relations.length === 0}
                onClick={handleImportSociometricResponses}
                type="button"
              >
                Importar {sociometricPreview.relations.length} relacions
              </button>
            </footer>
          </section>

          <section
            className={`sociometric-reports-panel relationship-tool-panel ${
              activeRelationshipTool === 'reports' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <FileText size={17} />
                  Informes sociomètrics
                </span>
                <h2>Generador d’informes</h2>
                <p>
                  Tria el tipus d’informe, activa les seccions que necessites i desa la vista com a PDF des del diàleg
                  d’impressió del navegador.
                </p>
              </div>
              <div className="sociometric-import-actions">
                <button
                  className="primary-action compact"
                  disabled={!['quick', 'complete', 'individual', 'comparative'].includes(selectedSociometricReportType)}
                  onClick={printSociometricReport}
                  type="button"
                >
                  <FileDown size={16} />
                  Imprimir / guardar PDF
                </button>
                <button className="tool-back-button" onClick={() => setActiveRelationshipTool('')} type="button">
                  <ArrowLeft aria-hidden="true" size={17} />
                  Tornar a eines
                </button>
              </div>
            </header>

            <div className="sociometric-reports-overview">
              <article>
                <span>Alumnes</span>
                <strong>{classStudents.length}</strong>
                <small>base de l’informe</small>
              </article>
              <article>
                <span>Relacions</span>
                <strong>{sociometricReportSnapshot.relationCount}</strong>
                <small>socials, treball i rebuigs</small>
              </article>
              <article>
                <span>Prioritaris</span>
                <strong>{sociometricReportSnapshot.priorityCount}</strong>
                <small>aïllats o rebutjats</small>
              </article>
              <article>
                <span>Líders</span>
                <strong>{sociometricReportSnapshot.leaderCount}</strong>
                <small>possibles suports positius</small>
              </article>
            </div>

            <div className="sociometric-report-type-grid">
              {SOCIOMETRIC_REPORT_TYPES.map((reportType) => {
                const Icon = reportType.icon
                const isActive = selectedSociometricReportType === reportType.id
                const isDeferred = false

                return (
                  <button
                    className={`${isActive ? 'active' : ''} ${isDeferred ? 'deferred' : ''}`}
                    key={reportType.id}
                    onClick={() => handleSelectSociometricReportType(reportType.id)}
                    type="button"
                  >
                    <Icon size={27} />
                    <div>
                      <strong>{reportType.title}</strong>
                      <p>{reportType.description}</p>
                    </div>
                    <footer>
                      <span>{reportType.estimate}</span>
                      <em>{reportType.status}</em>
                    </footer>
                  </button>
                )
              })}
            </div>

            <div className="sociometric-report-workspace">
              <article className="sociometric-report-selected">
                <span className="section-kicker">
                  <SelectedSociometricReportIcon size={17} />
                  Tipus seleccionat
                </span>
                <h3>{selectedSociometricReportTypeMeta.title}</h3>
                <p>{selectedSociometricReportTypeMeta.description}</p>
                <div className="sociometric-report-next-steps">
                  <span>{selectedSociometricReportTypeMeta.estimate}</span>
                  <span>{selectedSociometricReportTypeMeta.status}</span>
                </div>
                <div className="sociometric-report-priority-list">
                  <strong>Primera lectura del grup</strong>
                  {sociometricReportSnapshot.priorityNames.length > 0 ? (
                    <p>Alumnes a revisar primer: {sociometricReportSnapshot.priorityNames.join(', ')}.</p>
                  ) : (
                    <p>No hi ha alumnes classificats com a rebutjats o aïllats amb les dades actuals.</p>
                  )}
                </div>
              </article>

              <article className="sociometric-report-sections">
                <header>
                  <div>
                    <span className="section-kicker">
                      <ClipboardList size={17} />
                      Seccions
                    </span>
                    <h3>Blocs preparats per a les fases següents</h3>
                  </div>
                  <small>Configuració visual inicial</small>
                </header>
                <div>
                  {SOCIOMETRIC_REPORT_SECTIONS.map((section) => (
                    <button
                      className={`${section.required ? 'required' : ''} ${
                        sociometricReportSections[section.id] ? 'active' : ''
                      }`}
                      key={section.id}
                      onClick={() => handleToggleSociometricReportSection(section)}
                      type="button"
                    >
                      <CheckCircle2 size={17} />
                      <span>{section.label}</span>
                      {section.required && <em>Obligatori</em>}
                    </button>
                  ))}
                </div>
              </article>
            </div>

            <section className="sociometric-report-config">
              <article>
                <span>Seccions actives</span>
                <strong>{activeSociometricReportSections.length}</strong>
                <small>{activeSociometricReportSections.map((section) => section.label).join(' · ')}</small>
              </article>
              <article>
                <span>Estimació</span>
                <strong>{estimatedSociometricReportPages}</strong>
                <small>{selectedSociometricReportType === 'individual' ? 'fitxa/es' : 'pàgina/es aproximades'}</small>
              </article>
              <article>
                <span>Alumnes</span>
                <strong>
                  {selectedSociometricReportType === 'individual'
                    ? visibleSociometricIndividualReports.length
                    : classStudents.length}
                </strong>
                <small>{selectedSociometricReportType === 'individual' ? 'seleccionats per fitxa' : 'inclòs tot el grup'}</small>
              </article>
            </section>

            {selectedSociometricReportType === 'individual' && (
              <section className="sociometric-report-student-selector">
                <header>
                  <div>
                    <span className="section-kicker">
                      <UsersRound size={17} />
                      Selector d’alumnes
                    </span>
                    <h3>Fitxes que entraran a la vista prèvia</h3>
                  </div>
                  <div>
                    <button className="secondary-action compact" onClick={handleSelectPriorityReportStudents} type="button">
                      Prioritaris
                    </button>
                    <button
                      className="secondary-action compact"
                      onClick={() => setSelectedSociometricReportStudentIds(sociometricIndividualReports.map((report) => report.student.id))}
                      type="button"
                    >
                      Tots
                    </button>
                    <button
                      className="secondary-action compact"
                      onClick={() => setSelectedSociometricReportStudentIds([])}
                      type="button"
                    >
                      Sense filtre
                    </button>
                  </div>
                </header>
                <div>
                  {sociometricIndividualReports.map((report) => {
                    const isSelected =
                      selectedSociometricReportStudentIds.length === 0 ||
                      selectedSociometricReportStudentIds.includes(report.student.id)

                    return (
                      <button
                        className={isSelected ? 'active' : ''}
                        key={report.student.id}
                        onClick={() => handleToggleSociometricReportStudent(report.student.id)}
                        type="button"
                      >
                        <span className={`sociometric-mini-dot ${report.categoryMeta.tone}`}>
                          {report.studentCode}
                        </span>
                        <strong>{report.student.name}</strong>
                        <small>{report.category}</small>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {selectedSociometricReportType === 'comparative' && (
              <SociometricComparisonSelector
                comparisonOptions={sociometricComparisonOptions}
                currentRelationCount={classTutorialRelations.length}
                detectedMomentsLabel={
                  classTutorialSociometricMoments.length > 0
                    ? `${classTutorialSociometricMoments.length} moment/s guardats`
                    : `${sociometricComparisonOptions.length} moment/s detectats a partir de les relacions guardades`
                }
                endValue={effectiveSociometricComparisonEnd}
                onCaptureMoment={handleCaptureSociometricMoment}
                onChangeEnd={setSelectedSociometricComparisonEnd}
                onChangeStart={setSelectedSociometricComparisonStart}
                startValue={effectiveSociometricComparisonStart}
              />
            )}

            <div className="sociometric-report-preview-title">
              <span className="section-kicker">
                <Eye size={17} />
                Vista prèvia
              </span>
              <h3>{selectedSociometricReportTypeMeta.title}</h3>
            </div>

            <header className="sociometric-report-print-header">
              <span>AvaluaPro · Informe sociomètric</span>
              <h2>{selectedSociometricReportTypeMeta.title}</h2>
              <p>
                {activeClass?.name || linkedClass?.name || 'Classe sense nom'} · {classStudents.length} alumnes · Generat el{' '}
                {formatLongDate(sociometricReportDate)}
              </p>
            </header>

            {selectedSociometricReportType === 'quick' ? (
              <section className="sociometric-quick-report" aria-label="Informe ràpid del grup">
                <header>
                  <div>
                    <span className={`sociometric-report-status ${sociometricQuickReport.healthTone}`}>
                      {sociometricQuickReport.healthLabel}
                    </span>
                    <h3>Informe ràpid del grup</h3>
                    <p>
                      Lectura d’una pàgina per decidir què revisar primer abans de formar grups, canviar llocs o iniciar
                      una intervenció tutorial.
                    </p>
                  </div>
                  <div className="sociometric-report-score">
                    <strong>{sociometricQuickReport.hasData ? sociometricQuickReport.healthScore : '—'}</strong>
                    <span>índex de lectura</span>
                  </div>
                </header>

                <div className="sociometric-quick-metrics">
                  <article>
                    <span>Cohesió</span>
                    <strong>{sociometricMetrics.density}%</strong>
                    <small>Densitat de relacions registrades.</small>
                  </article>
                  <article>
                    <span>Inclusió</span>
                    <strong>{sociometricMetrics.inclusion}%</strong>
                    <small>Alumnes amb almenys una afinitat.</small>
                  </article>
                  <article>
                    <span>Positivitat</span>
                    <strong>{sociometricMetrics.positivity}%</strong>
                    <small>Pes de les eleccions positives.</small>
                  </article>
                  <article>
                    <span>Rebuig</span>
                    <strong>{sociometricMetrics.rejectionDensity}%</strong>
                    <small>Densitat de vincles a evitar.</small>
                  </article>
                  <article>
                    <span>Reciprocitat</span>
                    <strong>{sociometricMetrics.reciprocalPairCount}</strong>
                    <small>Parelles socials mútues.</small>
                  </article>
                </div>

                <div className="sociometric-quick-body">
                  <article className="sociometric-category-distribution">
                    <header>
                      <span className="section-kicker">
                        <BarChart3 size={17} />
                        Distribució
                      </span>
                      <h4>Categories socials</h4>
                    </header>
                    <div>
                      {sociometricMetrics.categoryCounts.map((item) => {
                        const categoryMeta = SOCIOMETRIC_CATEGORY_META[item.category] || SOCIOMETRIC_CATEGORY_META.Promig
                        const percentage =
                          classStudents.length > 0 ? Math.round((item.count / classStudents.length) * 100) : 0

                        return (
                          <div className={`sociometric-category-row ${categoryMeta.tone}`} key={item.category}>
                            <span>{item.category}</span>
                            <div aria-hidden="true">
                              <i style={{ width: `${percentage}%` }} />
                            </div>
                            <strong>{item.count}</strong>
                            <em>{percentage}%</em>
                          </div>
                        )
                      })}
                    </div>
                  </article>

                  <article className="sociometric-priority-panel">
                    <header>
                      <span className="section-kicker">
                        <AlertTriangle size={17} />
                        Prioritats
                      </span>
                      <h4>Alumnes a mirar primer</h4>
                    </header>
                    <div className="sociometric-priority-grid">
                      <section>
                        <strong>Rebuig</strong>
                        {sociometricQuickReport.rejectedRows.length > 0 ? (
                          sociometricQuickReport.rejectedRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>
                              {row.student.name}
                              <span>{row.avoidReceived} rebuig/s</span>
                            </p>
                          ))
                        ) : (
                          <p className="empty">Sense casos destacats.</p>
                        )}
                      </section>
                      <section>
                        <strong>Aïllament</strong>
                        {sociometricQuickReport.isolatedRows.length > 0 ? (
                          sociometricQuickReport.isolatedRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>
                              {row.student.name}
                              <span>{row.positiveReceived} elecció/ns</span>
                            </p>
                          ))
                        ) : (
                          <p className="empty">Sense casos destacats.</p>
                        )}
                      </section>
                      <section>
                        <strong>Lideratge positiu</strong>
                        {sociometricQuickReport.leaderRows.length > 0 ? (
                          sociometricQuickReport.leaderRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>
                              {row.student.name}
                              <span>{row.positiveReceived} elecció/ns</span>
                            </p>
                          ))
                        ) : (
                          <p className="empty">Encara no destaca cap líder.</p>
                        )}
                      </section>
                      <section>
                        <strong>Lideratge amb risc</strong>
                        {sociometricQuickReport.riskLeaderRows.length > 0 ? (
                          sociometricQuickReport.riskLeaderRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>
                              {row.student.name}
                              <span>{row.avoidReceived} rebuig/s</span>
                            </p>
                          ))
                        ) : (
                          <p className="empty">Sense senyal clara.</p>
                        )}
                      </section>
                    </div>
                  </article>
                </div>

                <article className="sociometric-quick-actions">
                  <header>
                    <span className="section-kicker">
                      <CheckCircle2 size={17} />
                      Primeres accions
                    </span>
                    <h4>Què faria el tutor ara?</h4>
                  </header>
                  <ol>
                    {sociometricQuickReport.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ol>
                </article>
              </section>
            ) : selectedSociometricReportType === 'complete' ? (
              <section className="sociometric-complete-report" aria-label="Informe docent complet">
                <header>
                  <div>
                    <span className={`sociometric-report-status ${sociometricQuickReport.healthTone}`}>
                      {sociometricQuickReport.healthLabel}
                    </span>
                    <h3>Informe docent complet</h3>
                    <p>
                      Lectura ampliada del sociograma per passar de les dades a decisions de tutoria, agrupaments i
                      intervenció pedagògica.
                    </p>
                  </div>
                  <div className="sociometric-report-score">
                    <strong>{sociometricQuickReport.hasData ? sociometricQuickReport.healthScore : '—'}</strong>
                    <span>índex global</span>
                  </div>
                </header>

                {sociometricReportSections.summary && (
                  <section className="sociometric-complete-section sociometric-complete-hero">
                    <header>
                      <span className="section-kicker">
                        <FileText size={17} />
                        Resum executiu
                      </span>
                      <h4>Lectura curta per al tutor</h4>
                    </header>
                    <p>{sociometricCompleteReport.socialReading}</p>
                    <div className="sociometric-complete-metric-strip">
                      <article>
                        <span>Alumnes</span>
                        <strong>{classStudents.length}</strong>
                      </article>
                      <article>
                        <span>Relacions</span>
                        <strong>{classTutorialRelations.length}</strong>
                      </article>
                      <article>
                        <span>Prioritaris</span>
                        <strong>
                          {sociometricCompleteReport.rejectedRows.length + sociometricCompleteReport.isolatedRows.length}
                        </strong>
                      </article>
                      <article>
                        <span>Líders</span>
                        <strong>{sociometricCompleteReport.leaderRows.length}</strong>
                      </article>
                    </div>
                  </section>
                )}

                {sociometricReportSections.contexts && (
                  <div className="sociometric-complete-grid">
                    <section className="sociometric-complete-section">
                      <header>
                        <span className="section-kicker">
                          <UsersRound size={17} />
                          Lectura social
                        </span>
                        <h4>Com es relaciona el grup</h4>
                      </header>
                      <p>{sociometricCompleteReport.socialReading}</p>
                      <ul className="sociometric-complete-facts">
                        <li>
                          <strong>{sociometricMetrics.inclusion}%</strong>
                          <span>inclusió</span>
                        </li>
                        <li>
                          <strong>{sociometricMetrics.positivity}%</strong>
                          <span>positivitat</span>
                        </li>
                        <li>
                          <strong>{sociometricMetrics.rejectionDensity}%</strong>
                          <span>rebuig</span>
                        </li>
                      </ul>
                    </section>

                    <section className="sociometric-complete-section">
                      <header>
                        <span className="section-kicker">
                          <HeartHandshake size={17} />
                          Relacions de treball
                        </span>
                        <h4>Amb qui funciona millor a classe</h4>
                      </header>
                      <p>{sociometricCompleteReport.workReading}</p>
                      <div className="sociometric-complete-mini-list">
                        {sociometricCompleteReport.workRows.length > 0 ? (
                          sociometricCompleteReport.workRows.slice(0, 4).map((row) => (
                            <p key={row.student.id}>
                              {row.student.name}
                              <span>{row.workPositiveCount} vincle/s de treball</span>
                            </p>
                          ))
                        ) : (
                          <p className="empty">Encara no hi ha relacions de treball registrades pel docent.</p>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {sociometricReportSections.sociogram && (
                  <section className="sociometric-complete-section sociometric-complete-sociogram">
                    <header>
                      <span className="section-kicker">
                        <Network size={17} />
                        Sociograma visual
                      </span>
                      <h4>Mapa que s’inclourà a l’informe</h4>
                    </header>
                    <div>
                      <Network size={34} />
                      <p>
                        Inclou el mapa actual amb colors per categoria, fletxes de direcció, relacions socials, de
                        treball i rebuigs. A la F6 aquesta vista quedarà preparada per imprimir o guardar en PDF.
                      </p>
                    </div>
                  </section>
                )}

                {sociometricReportSections.priority && (
                  <section className="sociometric-complete-section">
                    <header>
                      <span className="section-kicker">
                        <AlertTriangle size={17} />
                        Alumnes prioritaris
                      </span>
                      <h4>On mirar primer</h4>
                    </header>
                    <div className="sociometric-complete-priority-list">
                      <article>
                        <strong>Rebuig</strong>
                        {sociometricCompleteReport.rejectedRows.length > 0 ? (
                          sociometricCompleteReport.rejectedRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>{row.student.name}</p>
                          ))
                        ) : (
                          <p className="empty">Sense casos destacats.</p>
                        )}
                      </article>
                      <article>
                        <strong>Aïllament</strong>
                        {sociometricCompleteReport.isolatedRows.length > 0 ? (
                          sociometricCompleteReport.isolatedRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>{row.student.name}</p>
                          ))
                        ) : (
                          <p className="empty">Sense casos destacats.</p>
                        )}
                      </article>
                      <article>
                        <strong>Lideratge</strong>
                        {sociometricCompleteReport.leaderRows.length > 0 ? (
                          sociometricCompleteReport.leaderRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>{row.student.name}</p>
                          ))
                        ) : (
                          <p className="empty">Sense líder clar.</p>
                        )}
                      </article>
                      <article>
                        <strong>Risc</strong>
                        {sociometricCompleteReport.riskLeaderRows.length > 0 ? (
                          sociometricCompleteReport.riskLeaderRows.slice(0, 3).map((row) => (
                            <p key={row.student.id}>{row.student.name}</p>
                          ))
                        ) : (
                          <p className="empty">Sense senyal clara.</p>
                        )}
                      </article>
                    </div>
                  </section>
                )}

                {sociometricReportSections.alerts && (
                  <section className="sociometric-complete-section">
                    <header>
                      <span className="section-kicker">
                        <ShieldAlert size={17} />
                        Alertes pedagògiques
                      </span>
                      <h4>Senyals que demanen decisió</h4>
                    </header>
                    <div className="sociometric-complete-alert-list">
                      {sociometricCompleteReport.alertItems.map((alert) => (
                        <article className={alert.tone} key={alert.title}>
                          <strong>{alert.title}</strong>
                          <p>{alert.text}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {sociometricReportSections.interventions && (
                  <section className="sociometric-complete-section sociometric-complete-plan">
                    <header>
                      <span className="section-kicker">
                        <CheckCircle2 size={17} />
                        Pla d’intervenció
                      </span>
                      <h4>Accions concretes per començar</h4>
                    </header>
                    <ol>
                      {sociometricCompleteReport.interventionPlan.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ol>
                  </section>
                )}

                {sociometricReportSections.technical && (
                  <section className="sociometric-complete-section sociometric-complete-annex">
                    <header>
                      <span className="section-kicker">
                        <SlidersHorizontal size={17} />
                        Annex tècnic
                      </span>
                      <h4>Com s’ha llegit el mapa</h4>
                    </header>
                    <p>
                      Les categories socials es calculen combinant eleccions rebudes, rebuigs, reciprocitat i posició
                      dins la xarxa. Les relacions socials provenen sobretot del qüestionari de l’alumnat; les relacions
                      de treball incorporen criteri docent i es llegeixen com a informació pedagògica diferent.
                    </p>
                  </section>
                )}
              </section>
            ) : selectedSociometricReportType === 'comparative' ? (
              <section className="sociometric-comparative-report" aria-label="Informe comparatiu sociomètric">
                <header>
                  <div>
                    <span className="sociometric-report-status positive">Comparativa activa</span>
                    <h3>Informe comparatiu</h3>
                    <p>
                      Lectura de l’evolució del grup entre dos moments: què ha millorat, què demana atenció i quines
                      accions convé mantenir.
                    </p>
                  </div>
                  <div className="sociometric-report-score">
                    <strong>{sociometricComparativeReport.metricRows.filter((metric) => metric.tone === 'positive').length}</strong>
                    <span>millores</span>
                  </div>
                </header>

                {sociometricReportSections.summary && (
                  <section className="sociometric-comparison-summary">
                    <span className="section-kicker">
                      <FileText size={17} />
                      Resum comparatiu
                    </span>
                    <h4>{sociometricComparativeReport.summary}</h4>
                    <p>
                      Moment inicial: {sociometricComparisonStartRelations.length} relacions · Moment final:{' '}
                      {sociometricComparisonEndRelations.length} relacions.
                    </p>
                  </section>
                )}

                <div className="sociometric-comparison-metrics">
                  {sociometricComparativeReport.metricRows.map((metric) => (
                    <article className={metric.tone} key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>
                        {metric.start}
                        {metric.suffix} → {metric.end}
                        {metric.suffix}
                      </strong>
                      <em>
                        {metric.delta > 0 ? '+' : ''}
                        {metric.delta}
                        {metric.suffix}
                      </em>
                      <small>{metric.description}</small>
                    </article>
                  ))}
                </div>

                {sociometricReportSections.priority && (
                  <div className="sociometric-comparison-grid">
                    <section>
                      <header>
                        <span className="section-kicker">
                          <CheckCircle2 size={17} />
                          Alumnes que milloren
                        </span>
                        <h4>Canvis positius</h4>
                      </header>
                      {sociometricComparativeReport.improvedStudents.length > 0 ? (
                        sociometricComparativeReport.improvedStudents.slice(0, 5).map((item) => (
                          <p key={item.student.id}>
                            {item.student.name}
                            <span>
                              {item.startCategory} → {item.endCategory} · +{item.positiveDelta} positives ·{' '}
                              {item.rejectionDelta > 0 ? '+' : ''}
                              {item.rejectionDelta} rebuigs
                            </span>
                          </p>
                        ))
                      ) : (
                        <p className="empty">Encara no hi ha millores individuals destacades.</p>
                      )}
                    </section>

                    <section>
                      <header>
                        <span className="section-kicker">
                          <AlertTriangle size={17} />
                          Alumnes a revisar
                        </span>
                        <h4>Canvis sensibles</h4>
                      </header>
                      {sociometricComparativeReport.worsenedStudents.length > 0 ? (
                        sociometricComparativeReport.worsenedStudents.slice(0, 5).map((item) => (
                          <p key={item.student.id}>
                            {item.student.name}
                            <span>
                              {item.startCategory} → {item.endCategory} · {item.rejectionDelta > 0 ? '+' : ''}
                              {item.rejectionDelta} rebuigs
                            </span>
                          </p>
                        ))
                      ) : (
                        <p className="empty">Sense empitjoraments individuals destacats.</p>
                      )}
                    </section>
                  </div>
                )}

                {sociometricReportSections.contexts && (
                  <div className="sociometric-comparison-grid">
                    <section>
                      <header>
                        <span className="section-kicker">
                          <Star size={17} />
                          Nous lideratges
                        </span>
                        <h4>Suports emergents</h4>
                      </header>
                      {sociometricComparativeReport.newLeaders.length > 0 ? (
                        sociometricComparativeReport.newLeaders.slice(0, 5).map((item) => (
                          <p key={item.student.id}>
                            {item.student.name}
                            <span>{item.startCategory || 'Sense dades'} → Líder</span>
                          </p>
                        ))
                      ) : (
                        <p className="empty">No apareixen nous líders en aquesta comparativa.</p>
                      )}
                    </section>

                    <section>
                      <header>
                        <span className="section-kicker">
                          <UsersRound size={17} />
                          Prioritats resoltes
                        </span>
                        <h4>Casos que surten de zona sensible</h4>
                      </header>
                      {sociometricComparativeReport.resolvedPriorityStudents.length > 0 ? (
                        sociometricComparativeReport.resolvedPriorityStudents.slice(0, 5).map((item) => (
                          <p key={item.student.id}>
                            {item.student.name}
                            <span>
                              {item.startCategory} → {item.endCategory}
                            </span>
                          </p>
                        ))
                      ) : (
                        <p className="empty">Encara no hi ha prioritats resoltes de manera clara.</p>
                      )}
                    </section>
                  </div>
                )}

                {sociometricReportSections.interventions && (
                  <section className="sociometric-comparison-actions">
                    <header>
                      <span className="section-kicker">
                        <CheckCircle2 size={17} />
                        Accions després de comparar
                      </span>
                      <h4>Què mantindria o ajustaria el tutor?</h4>
                    </header>
                    <ol>
                      {sociometricComparativeReport.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ol>

                    <div className="sociometric-impact-strip">
                      <article>
                        <span>Intervencions</span>
                        <strong>{sociometricImpactReport.interventions.length}</strong>
                      </article>
                      <article>
                        <span>Observacions docents</span>
                        <strong>{sociometricImpactReport.observationCount}</strong>
                      </article>
                      <article>
                        <span>Registres tutorials</span>
                        <strong>{sociometricImpactReport.recordCount}</strong>
                      </article>
                    </div>
                  </section>
                )}

                <div className="sociometric-comparison-grid sociometric-impact-grid">
                  <section>
                    <header>
                      <span className="section-kicker">
                        <CalendarDays size={17} />
                        Què hi ha hagut entremig
                      </span>
                      <h4>Intervencions registrades</h4>
                    </header>
                    {sociometricImpactReport.interventions.length > 0 ? (
                      sociometricImpactReport.interventions.map((item) => (
                        <p key={`${item.type}_${item.date}_${item.title}`}>
                          {item.title}
                          <span>
                            {item.type === 'groups'
                              ? 'Grups cooperatius'
                              : item.type === 'seating'
                                ? 'Disposició d’aula'
                                : 'Intervenció'}{' '}
                            · {item.detail} · {formatShortDate(String(item.date || '').slice(0, 10))}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p className="empty">Encara no hi ha grups o disposicions guardades entre aquests dos moments.</p>
                    )}
                  </section>

                  <section>
                    <header>
                      <span className="section-kicker">
                        <BarChart3 size={17} />
                        Lectura d’impacte
                      </span>
                      <h4>Coincidències útils per interpretar</h4>
                    </header>
                    {sociometricImpactReport.signals.length > 0 ? (
                      <div className="sociometric-impact-signal-list">
                        {sociometricImpactReport.signals.map((signal) => (
                          <article className={signal.tone} key={signal.title}>
                            <strong>{signal.title}</strong>
                            <p>{signal.text}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="empty">Encara no hi ha prou senyals per fer una lectura d’impacte amb context.</p>
                    )}
                  </section>
                </div>

                {sociometricComparisonOptions.length < 2 && (
                  <div className="sociometric-comparison-note">
                    <AlertTriangle size={18} />
                    <span>
                      Hi ha pocs moments diferenciats. La comparativa serà més potent quan es passin dos qüestionaris
                      en dates diferents o es registrin noves observacions després d’una intervenció.
                    </span>
                  </div>
                )}
              </section>
            ) : selectedSociometricReportType === 'individual' ? (
              <section className="sociometric-individual-report" aria-label="Fitxes individuals sociomètriques">
                <header>
                  <div>
                    <span className="sociometric-report-status positive">Fitxes actives</span>
                    <h3>Fitxes individuals</h3>
                    <p>
                      Lectura breu per alumne amb categoria social, lectura de treball, relacions clau i recomanacions
                      per a tutoria.
                    </p>
                  </div>
                  <div className="sociometric-report-score">
                    <strong>{visibleSociometricIndividualReports.length}</strong>
                    <span>fitxes disponibles</span>
                  </div>
                </header>

                <div className="sociometric-individual-layout">
                  <aside className="sociometric-student-picker">
                    <header>
                      <span className="section-kicker">
                        <UsersRound size={17} />
                        Alumnes
                      </span>
                      <strong>{visibleSociometricIndividualReports.length} fitxes</strong>
                    </header>
                    <div>
                      {visibleSociometricIndividualReports.map((report) => (
                        <button
                          className={selectedSociometricIndividualPreviewReport?.student.id === report.student.id ? 'active' : ''}
                          key={report.student.id}
                          onClick={() => setSelectedSociometricReportStudentId(report.student.id)}
                          type="button"
                        >
                          <span className={`sociometric-mini-dot ${report.categoryMeta.tone}`}>
                            {report.studentCode}
                          </span>
                          <div>
                            <strong>{report.student.name}</strong>
                            <small>{report.category} · {report.workCategory}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  </aside>

                  {selectedSociometricIndividualPreviewReport ? (
                    <article className="sociometric-student-report-card">
                      <SociometricStudentInsightCard report={selectedSociometricIndividualPreviewReport} />
                      <footer className="sociometric-student-report-actions">
                        <button className="primary-action compact" onClick={printSelectedSociometricStudentReport} type="button">
                          <FileDown size={16} />
                          Descarregar només aquest alumne
                        </button>
                        <button className="secondary-action compact" onClick={() => printSociometricReport()} type="button">
                          <UsersRound size={16} />
                          Descarregar fitxes seleccionades
                        </button>
                      </footer>
                    </article>
                  ) : (
                    <div className="empty-state compact">Afegeix alumnes per generar fitxes individuals.</div>
                  )}
                </div>

                <div className="sociometric-individual-print-stack">
                  {visibleSociometricIndividualReports.map((report) => (
                    <article
                      className={`sociometric-student-report-card ${
                        selectedSociometricIndividualPreviewReport?.student.id === report.student.id ? 'single-print-target' : ''
                      }`}
                      key={report.student.id}
                    >
                      <SociometricStudentInsightCard report={report} />
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="sociometric-report-placeholder">
                <FileText size={24} />
                <div>
                  <strong>{selectedSociometricReportTypeMeta.title}</strong>
                  <p>Aquesta opció queda preparada per a {selectedSociometricReportTypeMeta.status.toLowerCase()}.</p>
                </div>
              </section>
            )}

            <footer className="sociometric-report-print-footer">
              Informe orientatiu generat amb AvaluaPro. Les dades sociomètriques s’han d’interpretar dins del context
              educatiu del grup i contrastar-les amb l’observació docent.
            </footer>

            <footer className="sociometric-report-footer">
              <p>
                {selectedSociometricReportType === 'quick'
                  ? 'L’informe ràpid ja es calcula amb les dades actuals del sociograma i es pot imprimir o guardar com a PDF.'
                  : selectedSociometricReportType === 'complete'
                    ? 'L’informe docent complet respecta les seccions actives i es pot imprimir o guardar com a PDF.'
                    : selectedSociometricReportType === 'comparative'
                      ? 'L’informe comparatiu reconstrueix dos moments amb les relacions guardades i es pot imprimir o guardar com a PDF.'
                      : selectedSociometricReportType === 'individual'
                        ? 'Les fitxes individuals ja es calculen amb les dades actuals i es poden imprimir o guardar com a PDF.'
                        : 'Aquesta opció queda preparada per a una fase posterior del generador d’informes.'}
              </p>
              <button
                className="primary-action"
                disabled={!['quick', 'complete', 'individual', 'comparative'].includes(selectedSociometricReportType)}
                onClick={printSociometricReport}
                type="button"
              >
                <FileDown size={17} />
                {selectedSociometricReportType === 'individual'
                  ? 'Imprimir fitxes'
                  : selectedSociometricReportType === 'complete'
                    ? 'Imprimir informe complet'
                    : selectedSociometricReportType === 'comparative'
                      ? 'Imprimir informe comparatiu'
                      : 'Imprimir informe ràpid'}
              </button>
            </footer>
          </section>

          <section
            className={`tutorial-sociogram-visual-card relationship-tool-panel ${
              activeRelationshipTool === 'sociogram' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <Network size={17} />
                  Sociograma visual
                </span>
                <h2>Mapa de relacions</h2>
                <p>
                  Mapa radial estable: els casos més integrats queden cap al centre i els alumnes aïllats o rebutjats
                  cap a l’exterior. Clica un alumne per enfocar les seves relacions.
                </p>
              </div>
              <div className="tutorial-sociogram-actions">
                <button className="tool-back-button" onClick={() => setActiveRelationshipTool('')} type="button">
                  <ArrowLeft aria-hidden="true" size={17} />
                  Tornar a eines
                </button>
                <button
                  className="sociogram-survey-action"
                  onClick={() => setActiveRelationshipTool('survey')}
                  type="button"
                >
                  <ClipboardList aria-hidden="true" size={16} />
                  Qüestionari sociomètric
                </button>
                <div className="tutorial-sociogram-filter-tabs" aria-label="Filtre del sociograma">
                  {SOCIOGRAM_FILTERS.map((filter) => (
                    <button
                      className={sociogramFilter === filter.id ? 'active' : ''}
                      key={filter.id}
                      onClick={() => setSociogramFilter(filter.id)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <label className="tutorial-sociogram-toggle">
                  <input
                    checked={sociogramOnlyReciprocal}
                    onChange={(event) => setSociogramOnlyReciprocal(event.target.checked)}
                    type="checkbox"
                  />
                  Només recíproques
                </label>
                <button
                  className="secondary-action compact"
                  disabled={!classTutorialSociogramLayout && Object.keys(sociogramDraftPositions).length === 0}
                  onClick={handleResetSociogramLayout}
                  type="button"
                >
                  <RotateCcw size={16} />
                  Restablir mapa
                </button>
              </div>
            </header>

            <div className="tutorial-sociogram-insight-grid">
              <article>
                <span>Cohesió</span>
                <strong>{sociometricMetrics.density}%</strong>
                <small>Densitat social registrada.</small>
              </article>
              <article>
                <span>Inclusió</span>
                <strong>{sociometricMetrics.inclusion}%</strong>
                <small>Amb almenys una afinitat.</small>
              </article>
              <article>
                <span>Recíproques</span>
                <strong>{sociometricMetrics.reciprocalPairCount}</strong>
                <small>Parelles socials mútues.</small>
              </article>
              <article>
                <span>Rebuig</span>
                <strong>{sociometricMetrics.rejectionDensity}%</strong>
                <small>Densitat de rebuig social.</small>
              </article>
              <article>
                <span>Subgrups</span>
                <strong>{sociometricMetrics.meaningfulSubgroupCount}</strong>
                <small>Components amb 2+ alumnes.</small>
              </article>
              <article>
                <span>Treball</span>
                <strong>{sociometricMetrics.workRelationCount}</strong>
                <small>Relacions docents d’aula.</small>
              </article>
            </div>

            {hasManualSociogramLayout && (
              <div className="tutorial-sociogram-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Mapa ajustat manualment</strong>
                  <p>
                    Hi ha {sociogramManualPositionCount} alumne/s amb posició guardada manualment. La ubicació visual
                    pot no coincidir exactament amb la disposició radial automàtica per categories.
                  </p>
                </div>
              </div>
            )}

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la tutoria per veure el sociograma.</div>
            ) : (
              <div
                aria-label="Mapa visual de relacions tutorials"
                className="tutorial-sociogram-canvas"
                ref={sociogramCanvasRef}
              >
                <svg aria-hidden="true" className="tutorial-sociogram-lines" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <marker
                      id="sociogram-arrow-green"
                      markerHeight="10"
                      markerWidth="10"
                      orient="auto"
                      refX="8"
                      refY="5"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" />
                    </marker>
                    <marker
                      id="sociogram-arrow-blue"
                      markerHeight="10"
                      markerWidth="10"
                      orient="auto"
                      refX="8"
                      refY="5"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" />
                    </marker>
                    <marker
                      id="sociogram-arrow-red"
                      markerHeight="10"
                      markerWidth="10"
                      orient="auto"
                      refX="8"
                      refY="5"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" />
                    </marker>
                  </defs>
                  {tutorialSociogramMap.rings.map((ring) => (
                    <ellipse
                      className={`tutorial-sociogram-ring ring-${ring.categoryId}`}
                      cx="50"
                      cy="50"
                      key={ring.categoryId}
                      rx={ring.xRadius}
                      ry={ring.yRadius}
                    >
                      <title>{ring.label}</title>
                    </ellipse>
                  ))}
                  {tutorialSociogramMap.rings.map((ring) => (
                    <text
                      className={`tutorial-sociogram-ring-label ring-${ring.categoryId}`}
                      key={`${ring.categoryId}_label`}
                      textAnchor="middle"
                      x="50"
                      y={Math.max(6, 50 - ring.yRadius - 1.8)}
                    >
                      {ring.label}
                    </text>
                  ))}
                  {tutorialSociogramMap.links.map((link) => (
                    <line
                        className={`tutorial-sociogram-link ${link.typeMeta.tone} ${link.context} ${
                          link.reciprocal ? 'reciprocal' : ''
                        } ${
                          link.isSelectedLink ? 'selected' : 'muted'
                        } ${link.direction} ${
                          link.category === 'avoid' ? 'relation-avoid' : 'relation-support'
                        }`}
                      key={link.id}
                      markerEnd={`url(#sociogram-arrow-${
                        link.context === 'social' ? 'green' : link.context === 'work' ? 'blue' : 'red'
                      })`}
                      strokeWidth={1 + getRelationInfluence(link) * 0.55}
                      vectorEffect="non-scaling-stroke"
                      x1={link.source.x}
                      x2={link.targetEndpoint.x}
                      y1={link.source.y}
                      y2={link.targetEndpoint.y}
                    >
                      <title>
                        {link.source.student.name} → {link.target.student.name}: {link.typeMeta.shortLabel}
                      </title>
                    </line>
                  ))}
                </svg>
                <div className="tutorial-sociogram-node-layer">
                  {tutorialSociogramMap.nodes.map((node) => {
                    const sociometricRow = sociometricRowsByStudentId.get(node.id)
                    const categoryId = sociometricRow?.categoryMeta?.id || 'average'
                    const sizeClass = sociometricRow?.nodeSizeClass || 'node-small'

                    return (
                      <button
                        className={`tutorial-sociogram-node social-${categoryId} ${sizeClass} ${
                          node.isSelected ? 'selected' : ''
                        } ${node.isRelated ? 'related' : ''} ${node.isDimmed ? 'dimmed' : ''} ${
                          node.avoidCount > 0 ? 'has-avoid' : ''
                        } ${node.isStar ? 'is-star' : ''} ${node.isConflict ? 'is-conflict' : ''} ${
                          node.isDirectAvoid ? 'direct-avoid' : ''
                        } ${node.isDirectSupport ? 'direct-support' : ''}`}
                        key={node.id}
                        onClick={() => setSelectedRelationStudentId(node.id)}
                        onPointerCancel={(event) => handleSociogramPointerUp(event, node)}
                        onPointerDown={(event) => handleSociogramPointerDown(event, node)}
                        onPointerMove={(event) => handleSociogramPointerMove(event, node)}
                        onPointerUp={(event) => handleSociogramPointerUp(event, node)}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        title={`${node.student.name} · ${sociometricRow?.category || 'Promig'}`}
                        type="button"
                      >
                        <span>{node.code || node.initials}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedSociometricRow && (
              <aside className="tutorial-sociogram-selected-panel">
                <div>
                  <span className={`sociometric-category-pill ${selectedSociometricRow.categoryMeta.tone}`}>
                    {selectedSociometricRow.category}
                  </span>
                  <h3>{selectedSociometricRow.student.name}</h3>
                  <p>{selectedSociometricRow.categoryMeta.description}</p>
                  <p className="tutorial-sociogram-category-reading">
                    {getSociometricCategoryExplanation(selectedSociometricRow)}
                  </p>
                  {selectedSociogramPositionIsManual && (
                    <p className="tutorial-sociogram-position-note">
                      La posició d’aquest alumne està ajustada manualment i pot no coincidir amb la seva anella automàtica.
                    </p>
                  )}
                </div>
                <dl>
                  <div>
                    <dt>Eleccions rebudes</dt>
                    <dd>
                      <button
                        aria-expanded={selectedSociometricStatKey === 'positiveReceived'}
                        className={`sociogram-stat-button ${
                          selectedSociometricStatKey === 'positiveReceived' ? 'active tone-green' : ''
                        }`}
                        onClick={() =>
                          setSelectedSociometricStatKey((current) =>
                            current === 'positiveReceived' ? '' : 'positiveReceived',
                          )
                        }
                        type="button"
                      >
                        {selectedSociometricRow.positiveReceived}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Eleccions fetes</dt>
                    <dd>
                      <button
                        aria-expanded={selectedSociometricStatKey === 'positiveGiven'}
                        className={`sociogram-stat-button ${
                          selectedSociometricStatKey === 'positiveGiven' ? 'active tone-green' : ''
                        }`}
                        onClick={() =>
                          setSelectedSociometricStatKey((current) =>
                            current === 'positiveGiven' ? '' : 'positiveGiven',
                          )
                        }
                        type="button"
                      >
                        {selectedSociometricRow.positiveGiven}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Rebuigs rebuts</dt>
                    <dd>
                      <button
                        aria-expanded={selectedSociometricStatKey === 'avoidReceived'}
                        className={`sociogram-stat-button ${
                          selectedSociometricStatKey === 'avoidReceived' ? 'active tone-red' : ''
                        }`}
                        onClick={() =>
                          setSelectedSociometricStatKey((current) =>
                            current === 'avoidReceived' ? '' : 'avoidReceived',
                          )
                        }
                        type="button"
                      >
                        {selectedSociometricRow.avoidReceived}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Rebuigs fets</dt>
                    <dd>
                      <button
                        aria-expanded={selectedSociometricStatKey === 'avoidGiven'}
                        className={`sociogram-stat-button ${
                          selectedSociometricStatKey === 'avoidGiven' ? 'active tone-red' : ''
                        }`}
                        onClick={() =>
                          setSelectedSociometricStatKey((current) => (current === 'avoidGiven' ? '' : 'avoidGiven'))
                        }
                        type="button"
                      >
                        {selectedSociometricRow.avoidGiven}
                      </button>
                    </dd>
                  </div>
                </dl>
                {selectedSociometricDrilldownMeta && (
                  <section className={`tutorial-sociogram-drilldown ${selectedSociometricDrilldownMeta.tone}`}>
                    <header>
                      <div>
                        <strong>{selectedSociometricDrilldownMeta.label}</strong>
                        <span>
                          {selectedSociometricDrilldownItems.length} alumne/s implicat/s · pes total{' '}
                          {selectedSociometricRow[selectedSociometricStatKey] || 0}
                        </span>
                      </div>
                      <button
                        aria-label="Tancar detall"
                        className="icon-button subtle"
                        onClick={() => setSelectedSociometricStatKey('')}
                        type="button"
                      >
                        <X aria-hidden="true" size={16} />
                      </button>
                    </header>
                    {selectedSociometricDrilldownItems.length > 0 ? (
                      <div className="tutorial-sociogram-drilldown-list">
                        {selectedSociometricDrilldownItems.map((item) => (
                          <button
                            className="tutorial-sociogram-drilldown-item"
                            key={item.id}
                            onClick={() => setSelectedRelationStudentId(item.id)}
                            type="button"
                          >
                            <span className="name">{item.name}</span>
                            <span className="meta">
                              pes {item.weight}
                              {item.relationCount > 1 ? ` · ${item.relationCount} registres` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>{selectedSociometricDrilldownMeta.emptyLabel}</p>
                    )}
                  </section>
                )}
              </aside>
            )}

            <footer className="tutorial-sociogram-legend">
              <section>
                <strong>Nodes</strong>
                <span className="legend-dot green">Líder</span>
                <span className="legend-dot blue">Promig</span>
                <span className="legend-dot cyan">Acceptat</span>
                <span className="legend-dot orange">Controvertit</span>
                <span className="legend-dot gray">Aïllat</span>
                <span className="legend-dot red">Rebutjat</span>
                <span className="legend-outline yellow">Estrella</span>
              </section>
              <section>
                <strong>Línies</strong>
                <span className="legend-line green">Afinitat social</span>
                <span className="legend-line blue">Relació de treball</span>
                <span className="legend-line red">Rebuig</span>
                <span className="legend-line dark">Recíproca</span>
              </section>
              <section>
                <strong>Mida</strong>
                <span className="legend-size large">Molts vots</span>
                <span className="legend-size medium">Alguns vots</span>
                <span className="legend-size small">Pocs vots</span>
              </section>
              <section className="legend-summary">
                <strong>{tutorialSociogramMap.selectedNode?.student.name || 'Sense alumne seleccionat'}</strong>
                <span>{tutorialSociogramMap.relatedCount} relació/ns visibles</span>
                {selectedSociometricRow && (
                  <>
                    <div className="legend-summary-pills">
                      <span className="summary-pill green">
                        Rep {selectedSociometricRow.positiveReceived} elecció/ns
                      </span>
                      <span className="summary-pill green">
                        Fa {selectedSociometricRow.positiveGiven} elecció/ns
                      </span>
                      <span className="summary-pill red">
                        Rep {selectedSociometricRow.avoidReceived} rebuig/s
                      </span>
                      <span className="summary-pill red">
                        Fa {selectedSociometricRow.avoidGiven} rebuig/s
                      </span>
                    </div>
                    <small className="legend-summary-note">
                      Les línies més intenses mostren les relacions directes de l’alumne seleccionat; la resta queda
                      en segon pla per facilitar la lectura.
                    </small>
                  </>
                )}
              </section>
            </footer>
          </section>

          <section
            className={`cooperative-generator-panel cooperative-canvas relationship-tool-panel ${
              activeRelationshipTool === 'groups' ? 'active' : ''
            } ${selectedCooperativeGroup || cooperativeWorkspacePanel ? 'has-inspector' : ''}`}
          >
            <header className="cooperative-canvas-header">
              <div className="cooperative-canvas-title">
                <button
                  aria-label="Tornar a eines"
                  className="tool-back-button icon-only"
                  onClick={() => setActiveRelationshipTool('')}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={20} />
                </button>
                <UsersRound aria-hidden="true" size={26} />
                <div>
                  <h2>Grups cooperatius</h2>
                  <span>
                    {cooperativeGroupSetAnalysis.reviewGroupCount + cooperativeGroupSetAnalysis.criticalGroupCount === 0
                      ? 'Proposta equilibrada'
                      : `${cooperativeGroupSetAnalysis.reviewGroupCount + cooperativeGroupSetAnalysis.criticalGroupCount} grup/s a revisar`}
                    {' · '}
                    {visibleCooperativeGroups.length} grups · {cooperativeGroupSetAnalysis.totalStudents} alumnes
                  </span>
                </div>
              </div>
              <div className="cooperative-canvas-actions">
                <button
                  className="primary-action compact"
                  onClick={() => {
                    setSelectedCooperativeGroupId('')
                    setCooperativeWorkspacePanel('save')
                  }}
                  type="button"
                >
                  <Save size={16} />
                  Guardar
                </button>
                <button
                  className={cooperativeWorkspacePanel === 'share' ? 'secondary-action compact active' : 'secondary-action compact'}
                  onClick={() => {
                    setSelectedCooperativeGroupId('')
                    setCooperativeWorkspacePanel((current) => (current === 'share' ? '' : 'share'))
                  }}
                  type="button"
                >
                  <Share2 size={16} />
                  Compartir
                </button>
              </div>
            </header>

            {cooperativeCopyMessage && (
              <div className="cooperative-copy-message" role="status">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>{cooperativeCopyMessage}</span>
                <button
                  aria-label="Tancar missatge"
                  onClick={() => setCooperativeCopyMessage('')}
                  type="button"
                >
                  <X aria-hidden="true" size={15} />
                </button>
              </div>
            )}

            {selectedCooperativeGroupSet && (
              <div className="cooperative-saved-active">
                <div>
                  <strong>Veient versió guardada: {selectedCooperativeGroupSet.name}</strong>
                  <span>
                    {formatShortDate(selectedCooperativeGroupSet.createdAt?.slice(0, 10))} ·{' '}
                    {selectedCooperativeGroupSet.groups?.length || 0} grups ·{' '}
                    {getCooperativeGroupSetOrigin(selectedCooperativeGroupSet)}
                  </span>
                  {selectedCooperativeGroupSet.qualitySnapshot && (
                    <span>
                      Qualitat guardada: {selectedCooperativeGroupSet.qualitySnapshot.score}/100 ·{' '}
                      {selectedCooperativeGroupSet.qualitySnapshot.label}. Recalculada ara:{' '}
                      {cooperativeGroupSetAnalysis.score}/100 · {cooperativeGroupSetAnalysis.quality.label}
                    </span>
                  )}
                  {selectedCooperativeGroupSet.observation && <p>{selectedCooperativeGroupSet.observation}</p>}
                </div>
                <div className="cooperative-saved-active-actions">
                  <button
                    className="primary-action compact"
                    onClick={() => handleReuseCooperativeGroupSet(selectedCooperativeGroupSet)}
                    type="button"
                  >
                    <RefreshCw size={16} />
                    Treballar com nova versió
                  </button>
                  <button
                    className="secondary-action compact"
                    onClick={() => setSelectedCooperativeGroupSetId('')}
                    type="button"
                  >
                    Tornar a proposta actual
                  </button>
                </div>
              </div>
            )}

            {hasRelationChangesAfterGroupSave && (
              <div className="tutorial-seating-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Les relacions han canviat des de l’última versió de grups guardada.</strong>
                  <p>Revisa la proposta abans de reutilitzar-la perquè pot haver canviat algun criteri important.</p>
                </div>
              </div>
            )}

            {cooperativeWorkspacePanel === 'versions' && (
              <aside className="cooperative-canvas-inspector cooperative-versions-inspector">
                <header>
                  <div>
                    <span>Historial</span>
                    <h3>Versions guardades</h3>
                  </div>
                  <button aria-label="Tancar" onClick={() => setCooperativeWorkspacePanel('')} type="button">
                    <X aria-hidden="true" size={18} />
                  </button>
                </header>
                {classTutorialGroupSets.length > 0 ? (
                  <div className="cooperative-saved-list">
                    {classTutorialGroupSets.map((groupSet) => (
                      <article className={selectedCooperativeGroupSetId === groupSet.id ? 'active' : ''} key={groupSet.id}>
                        <button
                          onClick={() => {
                            setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)
                            setSelectedCooperativeGroupId('')
                            setSelectedCooperativeGroupSetId(groupSet.id)
                          }}
                          type="button"
                        >
                          <strong>{groupSet.name}</strong>
                          <span>
                            {formatShortDate(groupSet.createdAt?.slice(0, 10))} · {groupSet.groups?.length || 0} grups ·{' '}
                            {COOPERATIVE_GROUP_STRATEGIES.find((strategy) => strategy.id === groupSet.strategy)?.label ||
                              'Equilibrat'}
                            {groupSet.qualitySnapshot?.score !== undefined
                              ? ` · ${groupSet.qualitySnapshot.score}/100`
                              : ''}
                          </span>
                        </button>
                        <button
                          className="icon-button danger subtle"
                          onClick={() => handleDeleteCooperativeGroupSet(groupSet.id)}
                          title="Eliminar versió"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">Encara no hi ha cap versió guardada.</div>
                )}
              </aside>
            )}

            <nav aria-label="Eines dels grups cooperatius" className="cooperative-canvas-toolbar">
              <button
                className={cooperativeWorkspacePanel === 'config' ? 'active' : ''}
                onClick={() => {
                  setSelectedCooperativeGroupId('')
                  setCooperativeWorkspacePanel((current) => (current === 'config' ? '' : 'config'))
                }}
                type="button"
              >
                <SlidersHorizontal aria-hidden="true" size={22} />
                <strong>Configuració</strong>
                <span>{cooperativeGroupSize === '2' ? 'Parelles' : `Grups de ${cooperativeGroupSize}`}</span>
                <span>
                  {COOPERATIVE_GROUP_STRATEGIES.find((strategy) => strategy.id === cooperativeStrategy)?.label ||
                    'Equilibrat'}
                </span>
                <small>{prioritizeHalfGroups ? 'Mig grup prioritzat' : 'Mig grup barrejat'}</small>
              </button>
              <button
                onClick={() => {
                  setCooperativeWorkspacePanel('')
                  handleCreateCooperativeGroup()
                }}
                type="button"
              >
                <Plus aria-hidden="true" size={24} />
                <strong>Crear grup</strong>
              </button>
              <button
                className={cooperativeWorkspacePanel === 'versions' ? 'active' : ''}
                onClick={() => {
                  setSelectedCooperativeGroupId('')
                  setCooperativeWorkspacePanel((current) => (current === 'versions' ? '' : 'versions'))
                }}
                type="button"
              >
                <History aria-hidden="true" size={22} />
                <strong>Versions</strong>
                <span>{classTutorialGroupSets.length} guardades</span>
              </button>
            </nav>

            {cooperativeWorkspacePanel === 'config' && (
              <aside className="cooperative-canvas-inspector cooperative-config-inspector">
                <header>
                  <div>
                    <span>Configuració</span>
                    <h3>Ajustar proposta</h3>
                  </div>
                  <button
                    aria-label="Tancar configuració"
                    onClick={() => setCooperativeWorkspacePanel('')}
                    type="button"
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                </header>
                <label>
                  Mida dels grups
                  <select
                    onChange={(event) => {
                      setCooperativeGroupSize(event.target.value)
                      resetCooperativeManualEditing()
                      setSelectedCooperativeGroupSetId('')
                    }}
                    value={cooperativeGroupSize}
                  >
                    <option value="2">Parelles</option>
                    <option value="3">Grups de 3</option>
                    <option value="4">Grups de 4</option>
                    <option value="5">Grups de 5</option>
                    <option value="6">Grups de 6</option>
                  </select>
                </label>
                <label>
                  Criteri pedagògic
                  <select
                    onChange={(event) => {
                      setCooperativeStrategy(event.target.value)
                      resetCooperativeManualEditing()
                      setSelectedCooperativeGroupSetId('')
                    }}
                    value={cooperativeStrategy}
                  >
                    {COOPERATIVE_GROUP_STRATEGIES.map((strategy) => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.label}
                      </option>
                    ))}
                  </select>
                  <small>
                    {COOPERATIVE_GROUP_STRATEGIES.find((strategy) => strategy.id === cooperativeStrategy)?.description}
                  </small>
                </label>
                <button
                  aria-pressed={prioritizeHalfGroups}
                  className={`cooperative-inspector-toggle ${prioritizeHalfGroups ? 'active' : ''}`}
                  onClick={() => {
                    setPrioritizeHalfGroups((current) => !current)
                    resetCooperativeManualEditing()
                    setSelectedCooperativeGroupSetId('')
                  }}
                  type="button"
                >
                  <Layers3 aria-hidden="true" size={19} />
                  <span>
                    <strong>Prioritzar mig grup</strong>
                    <small>Evita barrejar els dos subgrups sempre que sigui possible.</small>
                  </span>
                </button>
                {manualCooperativeGroups.length > 0 && (
                  <button className="secondary-action compact" onClick={resetCooperativeManualEditing} type="button">
                    <RotateCcw size={16} />
                    Tornar a la proposta automàtica
                  </button>
                )}
              </aside>
            )}

            {cooperativeWorkspacePanel === 'save' && (
              <aside className="cooperative-canvas-inspector cooperative-save-inspector">
                <header>
                  <div>
                    <span>Versió nova</span>
                    <h3>Guardar proposta</h3>
                  </div>
                  <button aria-label="Tancar" onClick={() => setCooperativeWorkspacePanel('')} type="button">
                    <X aria-hidden="true" size={18} />
                  </button>
                </header>
                <label>
                  Nom de la versió
                  <input
                    onChange={(event) => setCooperativeGroupSetName(event.target.value)}
                    placeholder="Ex: Laboratori UT2"
                    value={cooperativeGroupSetName}
                  />
                </label>
                <label>
                  Observació
                  <textarea
                    onChange={(event) => setCooperativeGroupSetObservation(event.target.value)}
                    placeholder="Ex: funciona bé en pràctiques, revisar el grup 3..."
                    rows="5"
                    value={cooperativeGroupSetObservation}
                  />
                </label>
                <button
                  className="primary-action"
                  onClick={() => {
                    handleSaveCooperativeGroupSet()
                    setCooperativeWorkspacePanel('')
                  }}
                  type="button"
                >
                  <Save size={17} />
                  Guardar versió
                </button>
              </aside>
            )}

            {cooperativeWorkspacePanel === 'share' && (
              <aside className="cooperative-canvas-inspector cooperative-share-inspector">
                <header>
                  <div>
                    <span>Sortida</span>
                    <h3>Compartir grups</h3>
                  </div>
                  <button aria-label="Tancar" onClick={() => setCooperativeWorkspacePanel('')} type="button">
                    <X aria-hidden="true" size={18} />
                  </button>
                </header>
                <button onClick={() => handleCopyCooperativeGroups('teacher')} type="button">
                  <Clipboard aria-hidden="true" size={19} />
                  <span>
                    <strong>Copiar per al docent</strong>
                    <small>Inclou notes, alertes i lectura pedagògica.</small>
                  </span>
                </button>
                <button onClick={() => handleCopyCooperativeGroups('students')} type="button">
                  <ClipboardList aria-hidden="true" size={19} />
                  <span>
                    <strong>Copiar per a l’alumnat</strong>
                    <small>Només mostra la composició dels grups.</small>
                  </span>
                </button>
                <button onClick={() => setShowCooperativeProjection(true)} type="button">
                  <Eye aria-hidden="true" size={19} />
                  <span>
                    <strong>Projectar grups</strong>
                    <small>Obre una vista neta per mostrar a classe.</small>
                  </span>
                </button>
              </aside>
            )}

            {classStudents.length < 2 ? (
              <div className="empty-state compact">Calen almenys dos alumnes per generar grups cooperatius.</div>
            ) : (
              <>
                <section
                  className={`cooperative-overview-status ${
                    cooperativeGroupSetAnalysis.reviewGroupCount +
                      cooperativeGroupSetAnalysis.criticalGroupCount ===
                    0
                      ? 'balanced'
                      : 'review'
                  }`}
                >
                  {cooperativeGroupSetAnalysis.reviewGroupCount +
                    cooperativeGroupSetAnalysis.criticalGroupCount ===
                  0 ? (
                    <CheckCircle2 aria-hidden="true" size={18} />
                  ) : (
                    <AlertTriangle aria-hidden="true" size={18} />
                  )}
                  <strong>
                    {cooperativeGroupSetAnalysis.reviewGroupCount +
                      cooperativeGroupSetAnalysis.criticalGroupCount ===
                    0
                      ? 'Proposta equilibrada'
                      : `${cooperativeGroupSetAnalysis.reviewGroupCount + cooperativeGroupSetAnalysis.criticalGroupCount} grup/s a revisar`}
                  </strong>
                  <span>
                    {visibleCooperativeGroups.length} grups · {cooperativeGroupSetAnalysis.totalStudents} alumnes
                  </span>
                  {manualCooperativeGroups.length > 0 && <em>Editada manualment</em>}
                </section>

                {selectedCooperativeGroup && !cooperativeWorkspacePanel && (
                  <section
                    className="cooperative-group-detail cooperative-canvas-inspector"
                    aria-label={`Detall de ${selectedCooperativeGroup.name}`}
                  >
                    <header>
                      <div>
                        <span className={`cooperative-detail-quality ${selectedCooperativeGroup.analysis?.quality.tone}`}>
                          {selectedCooperativeGroup.analysis?.quality.label} · {selectedCooperativeGroup.analysis?.score}/100
                        </span>
                        <div className="cooperative-detail-title-row">
                          <h3>{selectedCooperativeGroup.name}</h3>
                          {selectedCooperativeGroup.locked && (
                            <span className="cooperative-lock-badge">
                              <Lock aria-hidden="true" size={13} />
                              Grup bloquejat
                            </span>
                          )}
                        </div>
                        <p>{selectedCooperativeGroup.analysis?.summary}</p>
                      </div>
                      <div className="cooperative-detail-header-actions">
                        {!selectedCooperativeGroupSet && (
                          <>
                            <button
                              className={`secondary-action compact ${selectedCooperativeGroup.locked ? 'active' : ''}`}
                              onClick={() => handleToggleCooperativeGroupLock(selectedCooperativeGroup.id)}
                              type="button"
                            >
                              <Lock aria-hidden="true" size={15} />
                              {selectedCooperativeGroup.locked ? 'Desbloquejar grup' : 'Bloquejar grup'}
                            </button>
                            {selectedCooperativeGroup.members.length === 0 && (
                              <button
                                className="secondary-action compact danger"
                                onClick={() => handleDeleteEmptyCooperativeGroup(selectedCooperativeGroup.id)}
                                type="button"
                              >
                                <Trash2 aria-hidden="true" size={15} />
                                Eliminar grup buit
                              </button>
                            )}
                          </>
                        )}
                        <button
                          className="icon-button subtle"
                          onClick={() => setSelectedCooperativeGroupId('')}
                          title="Tancar detall"
                          type="button"
                        >
                          <X aria-hidden="true" size={18} />
                        </button>
                      </div>
                    </header>

                    {!selectedCooperativeGroupSet && (
                      <div className="cooperative-rename-row">
                        <label>
                          Nom del grup
                          <input
                            onChange={(event) => setCooperativeRenameDraft(event.target.value)}
                            value={cooperativeRenameDraft}
                          />
                        </label>
                        <button
                          className="secondary-action compact"
                          disabled={
                            !cooperativeRenameDraft.trim() ||
                            cooperativeRenameDraft.trim() === selectedCooperativeGroup.name
                          }
                          onClick={() =>
                            handleRenameCooperativeGroup(
                              selectedCooperativeGroup.id,
                              cooperativeRenameDraft,
                            )
                          }
                          type="button"
                        >
                          Guardar nom
                        </button>
                      </div>
                    )}

                    <div className="cooperative-detail-layout">
                      <section>
                        <h4>Alumnes i perfils</h4>
                        <div className="cooperative-detail-members">
                          {selectedCooperativeGroup.members.map((member) => (
                            <article className={`cooperative-detail-member ${member.performanceLevel}`} key={member.student.id}>
                              <div>
                                <strong>{formatCooperativeStudentName(member.student.name)}</strong>
                                <span>{member.halfGroup}</span>
                              </div>
                              <div className="cooperative-member-labels">
                                {(member.pedagogicalLabels || []).map((label) => (
                                  <span className={label.tone} key={label.id}>
                                    {label.label}
                                  </span>
                                ))}
                              </div>
                              {!selectedCooperativeGroupSet && (
                                <div className="cooperative-member-actions">
                                  <button
                                    aria-pressed={cooperativeLockedStudentIds.includes(member.student.id)}
                                    className={
                                      cooperativeLockedStudentIds.includes(member.student.id) ? 'locked' : ''
                                    }
                                    onClick={() => handleToggleCooperativeStudentLock(member.student.id)}
                                    type="button"
                                  >
                                    <Lock aria-hidden="true" size={14} />
                                    {cooperativeLockedStudentIds.includes(member.student.id)
                                      ? 'Desbloquejar'
                                      : 'Bloquejar'}
                                  </button>
                                  <button
                                    aria-pressed={cooperativeEditDraft.studentId === member.student.id}
                                    className={
                                      cooperativeEditDraft.studentId === member.student.id ? 'active' : ''
                                    }
                                    disabled={
                                      !canModifyCooperativeMember({
                                        group: selectedCooperativeGroup,
                                        lockedStudentIds: cooperativeLockedStudentIds,
                                        studentId: member.student.id,
                                      })
                                    }
                                    onClick={() =>
                                      handleStartCooperativeEdit(member.student.id, selectedCooperativeGroup.id)
                                    }
                                    type="button"
                                  >
                                    <ArrowRightLeft aria-hidden="true" size={15} />
                                    Modificar
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="cooperative-detail-reading">
                        <div>
                          <h4>Fortaleses</h4>
                          {selectedCooperativeGroup.analysis?.strengths.length > 0 ? (
                            <ul className="positive">
                              {selectedCooperativeGroup.analysis.strengths.map((strength) => (
                                <li key={strength}>{strength}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No s’ha detectat cap fortalesa destacada amb les dades actuals.</p>
                          )}
                        </div>
                        <div>
                          <h4>Punts a revisar</h4>
                          {selectedCooperativeGroup.alerts.length > 0 ? (
                            <ul className="warning">
                              {selectedCooperativeGroup.alerts.map((alert, index) => (
                                <li key={`${selectedCooperativeGroup.id}_detail_alert_${index}`}>{alert.text}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No hi ha alertes pedagògiques rellevants.</p>
                          )}
                        </div>
                      </section>

                      <section className="cooperative-detail-relations">
                        <h4>Relacions dins del grup</h4>
                        {selectedCooperativeGroup.workRelations.map((relation) => (
                          <p className="work" key={`${selectedCooperativeGroup.id}_${relation.label}_detail_work`}>
                            <b>Treball:</b> {relation.label}
                          </p>
                        ))}
                        {selectedCooperativeGroup.socialRelations.map((relation) => (
                          <p className="social" key={`${selectedCooperativeGroup.id}_${relation.label}_detail_social`}>
                            <b>Social:</b> {relation.label}
                          </p>
                        ))}
                        {selectedCooperativeGroup.avoidRelations.map((relation) => (
                          <p className="warning" key={`${selectedCooperativeGroup.id}_${relation.label}_detail_avoid`}>
                            <b>Incompatibilitat:</b> {relation.label}
                          </p>
                        ))}
                        {selectedCooperativeGroup.supportiveRelations.length === 0 &&
                          selectedCooperativeGroup.avoidRelations.length === 0 && (
                            <p className="empty">No hi ha relacions registrades entre els membres d’aquest grup.</p>
                          )}
                      </section>
                    </div>

                    {cooperativeEditSourceMember && !selectedCooperativeGroupSet && (
                      <section className="cooperative-edit-workspace">
                        <header>
                          <div>
                            <span>Canvi manual pendent</span>
                            <h4>{formatCooperativeStudentName(cooperativeEditSourceMember.student.name)}</h4>
                            <p>Configura el canvi i revisa’n l’impacte abans de confirmar-lo.</p>
                          </div>
                          <button
                            className="icon-button subtle"
                            onClick={() => setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)}
                            title="Cancel·lar canvi"
                            type="button"
                          >
                            <X aria-hidden="true" size={17} />
                          </button>
                        </header>

                        <div className="cooperative-edit-controls">
                          <fieldset>
                            <legend>Acció</legend>
                            <div>
                              <button
                                className={cooperativeEditDraft.type === 'move' ? 'active' : ''}
                                disabled={cooperativeEditSourceGroup?.members.length <= 2}
                                onClick={() =>
                                  setCooperativeEditDraft((current) => ({ ...current, type: 'move' }))
                                }
                                type="button"
                              >
                                Moure
                              </button>
                              <button
                                className={cooperativeEditDraft.type === 'swap' ? 'active' : ''}
                                onClick={() =>
                                  setCooperativeEditDraft((current) => ({
                                    ...current,
                                    targetStudentId:
                                      cooperativeEditTargetGroup?.members.find(
                                        (member) =>
                                          !cooperativeLockedStudentIds.includes(member.student.id),
                                      )?.student.id || '',
                                    type: 'swap',
                                  }))
                                }
                                type="button"
                              >
                                Intercanviar
                              </button>
                            </div>
                            {cooperativeEditSourceGroup?.members.length <= 2 && (
                              <small>Cal intercanviar: moure’l deixaria un alumne sol.</small>
                            )}
                          </fieldset>

                          <label>
                            Grup de destinació
                            <select
                              onChange={(event) => {
                                const nextTargetGroup = visibleCooperativeGroups.find(
                                  (group) => group.id === event.target.value,
                                )
                                setCooperativeEditDraft((current) => ({
                                  ...current,
                                  targetGroupId: event.target.value,
                                  targetStudentId:
                                    nextTargetGroup?.members.find(
                                      (member) =>
                                        !cooperativeLockedStudentIds.includes(member.student.id),
                                    )?.student.id || '',
                                }))
                              }}
                              value={cooperativeEditDraft.targetGroupId}
                            >
                              {visibleCooperativeGroups
                                .filter(
                                  (group) =>
                                    group.id !== cooperativeEditSourceGroup?.id && !group.locked,
                                )
                                .map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.name}
                                  </option>
                                ))}
                            </select>
                          </label>

                          {cooperativeEditDraft.type === 'swap' && (
                            <label>
                              Alumne per intercanviar
                              <select
                                onChange={(event) =>
                                  setCooperativeEditDraft((current) => ({
                                    ...current,
                                    targetStudentId: event.target.value,
                                  }))
                                }
                                value={cooperativeEditDraft.targetStudentId}
                              >
                                {(cooperativeEditTargetGroup?.members || [])
                                  .filter(
                                    (member) =>
                                      !cooperativeLockedStudentIds.includes(member.student.id),
                                  )
                                  .map((member) => (
                                    <option key={member.student.id} value={member.student.id}>
                                      {formatCooperativeStudentName(member.student.name)}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                        </div>

                        {cooperativeEditPreview && (
                          <div
                            className={`cooperative-edit-preview ${
                              cooperativeEditPreview.scoreDelta > 0
                                ? 'positive'
                                : cooperativeEditPreview.scoreDelta < 0
                                  ? 'danger'
                                  : 'neutral'
                            }`}
                          >
                            <div>
                              <span>Impacte previst</span>
                              <strong>
                                {cooperativeEditPreview.scoreDelta > 0
                                  ? `Millora +${cooperativeEditPreview.scoreDelta}`
                                  : cooperativeEditPreview.scoreDelta < 0
                                    ? `Empitjora ${cooperativeEditPreview.scoreDelta}`
                                    : 'Es manté igual'}
                              </strong>
                              <small>
                                Qualitat global: {cooperativeGroupSetAnalysis.score}/100 →{' '}
                                {cooperativeEditPreview.nextAnalysis.score}/100
                              </small>
                            </div>
                            <div>
                              <b>{cooperativeEditPreview.actionLabel}</b>
                              <span>
                                {cooperativeEditPreview.sourceGroup.name}:{' '}
                                {cooperativeEditPreview.sourceGroup.analysis.quality.label} →{' '}
                                {cooperativeEditPreview.nextSourceGroup?.analysis.quality.label}
                              </span>
                              <span>
                                {cooperativeEditPreview.targetGroup.name}:{' '}
                                {cooperativeEditPreview.targetGroup.analysis.quality.label} →{' '}
                                {cooperativeEditPreview.nextTargetGroup?.analysis.quality.label}
                              </span>
                              {cooperativeEditPreview.sizeWarning && (
                                <em>El canvi deixa algun grup lluny de la mida objectiu.</em>
                              )}
                            </div>
                            <div className="cooperative-edit-actions">
                              <button
                                className="secondary-action compact"
                                onClick={() => setCooperativeEditDraft(EMPTY_COOPERATIVE_EDIT_DRAFT)}
                                type="button"
                              >
                                Cancel·lar
                              </button>
                              <button
                                className="primary-action compact"
                                onClick={handleApplyCooperativeEdit}
                                type="button"
                              >
                                Confirmar canvi
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                  </section>
                )}

                <div className="cooperative-group-grid">
                  {visibleCooperativeGroups.map((group) => (
                    <article
                      className={`cooperative-group-card ${group.alertTone || ''} ${
                        selectedCooperativeGroupId === group.id ? 'selected' : ''
                      }`}
                      key={group.id}
                    >
                      <header>
                        <div>
                          <span>{group.name}</span>
                          <strong>{group.members.length} alumnes</strong>
                          {group.locked && (
                            <small className="cooperative-card-lock">
                              <Lock aria-hidden="true" size={12} />
                              Bloquejat
                            </small>
                          )}
                        </div>
                        <div className="cooperative-group-status">
                          <em
                            className={
                              ['positive', 'good'].includes(group.analysis?.quality.tone)
                                ? 'positive'
                                : 'warning'
                            }
                          >
                            {['positive', 'good'].includes(group.analysis?.quality.tone)
                              ? 'Equilibrat'
                              : 'A revisar'}
                          </em>
                        </div>
                      </header>

                      <div className="cooperative-group-members">
                        {group.members.map((member) => (
                          <div
                            className={`cooperative-member compact ${member.performanceLevel}`}
                            key={member.student.id}
                          >
                            <strong>{formatCooperativeStudentName(member.student.name)}</strong>
                            {member.isStar && (
                              <Star
                                aria-label="Alumne estrella"
                                className="cooperative-member-star"
                                fill="currentColor"
                                size={15}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        aria-expanded={selectedCooperativeGroupId === group.id}
                        className="cooperative-group-detail-button"
                        onClick={() => {
                          setCooperativeWorkspacePanel('')
                          setSelectedCooperativeGroupId((current) => {
                            const nextId = current === group.id ? '' : group.id
                            setCooperativeRenameDraft(nextId ? group.name : '')
                            return nextId
                          })
                        }}
                        type="button"
                      >
                        <Eye aria-hidden="true" size={16} />
                        {selectedCooperativeGroupId === group.id ? 'Tancar detall' : 'Detall i modificació'}
                      </button>
                    </article>
                  ))}
                </div>

                {(cooperativeEditHistory.past.length > 0 || cooperativeEditHistory.future.length > 0) && (
                  <div className="cooperative-canvas-history-actions">
                    <button
                      disabled={cooperativeEditHistory.past.length === 0}
                      onClick={handleUndoCooperativeEdit}
                      type="button"
                    >
                      <Undo2 aria-hidden="true" size={18} />
                      Desfer
                    </button>
                    <button
                      disabled={cooperativeEditHistory.future.length === 0}
                      onClick={handleRedoCooperativeEdit}
                      type="button"
                    >
                      <Redo2 aria-hidden="true" size={18} />
                      Refer
                    </button>
                  </div>
                )}
              </>
            )}

            {showCooperativeProjection && (
              <Modal
                onClose={() => setShowCooperativeProjection(false)}
                panelClassName="cooperative-projection-modal"
                size="xl"
                title="Vista per projectar a l’alumnat"
              >
                <section className="cooperative-projection-view">
                  <header>
                    <div>
                      <span>Avaluapro · agrupament cooperatiu</span>
                      <h2>{getCooperativeOutputTitle()}</h2>
                      <p>Aquesta vista només mostra la composició dels grups.</p>
                    </div>
                    <button
                      className="secondary-action compact"
                      onClick={() => handleCopyCooperativeGroups('students')}
                      type="button"
                    >
                      <ClipboardList size={16} />
                      Copiar llista neta
                    </button>
                  </header>
                  <div className="cooperative-projection-grid">
                    {visibleCooperativeGroups.map((group) => (
                      <article key={`projection_${group.id}`}>
                        <strong>{group.name}</strong>
                        <span>{group.members.length} alumnes</span>
                        <ol>
                          {group.members.map((member) => (
                            <li key={`projection_${group.id}_${member.student.id}`}>
                              {formatCooperativeStudentName(member.student.name)}
                            </li>
                          ))}
                        </ol>
                      </article>
                    ))}
                  </div>
                  <footer>
                    No s’hi mostren notes, perfils, alertes, relacions ni observacions docents.
                  </footer>
                </section>
              </Modal>
            )}
          </section>

          <section
            className={`tutorial-seating-planner-panel relationship-tool-panel seating-panel-${seatingWorkspacePanel || 'none'} ${
              activeRelationshipTool === 'seating' ? 'active' : ''
            }`}
          >
            <header className="tutorial-seating-app-header">
              <div className="tutorial-seating-title">
                <button
                  aria-label="Tornar a les eines de tutoria"
                  className="tutorial-seating-back"
                  onClick={() => setActiveRelationshipTool('')}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={22} />
                </button>
                <LayoutGrid aria-hidden="true" size={25} />
                <div>
                  <span>Mode tutoria</span>
                  <h2>Disposició d’aula</h2>
                </div>
                <button
                  className={`tutorial-seating-score-chip ${seatingPlanAnalysis.quality.tone}`}
                  onClick={() => setSeatingWorkspacePanel('diagnostics')}
                  type="button"
                >
                  <strong>{seatingPlanAnalysis.score}/100</strong>
                  <span>· {seatingPlanAnalysis.conflicts.length} conflicte/s</span>
                </button>
              </div>
              <div className="tutorial-seating-header-actions">
                <button className="primary" disabled={Boolean(selectedSeatingPlan)} onClick={handleImproveSeatingPlan} type="button">
                  <TrendingUp aria-hidden="true" size={17} />
                  Millorar
                </button>
                <button
                  className={seatingWorkspacePanel === 'structure' ? 'active' : ''}
                  onClick={() => setSeatingWorkspacePanel((current) => (current === 'structure' ? '' : 'structure'))}
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" size={17} />
                  Configurar
                </button>
                <button className="save" onClick={() => setSeatingWorkspacePanel('save')} type="button">
                  <Save aria-hidden="true" size={17} />
                  Guardar
                </button>
                <button onClick={() => setSeatingWorkspacePanel('diagnostics')} type="button">
                  <BarChart3 aria-hidden="true" size={17} />
                  Més
                </button>
              </div>
            </header>

            <nav aria-label="Eines de disposició d’aula" className="tutorial-seating-side-toolbar">
              <button
                className={seatingWorkspacePanel === 'structure' ? 'active' : ''}
                onClick={() => setSeatingWorkspacePanel('structure')}
                type="button"
              >
                <LayoutGrid aria-hidden="true" size={22} />
                <strong>Estructura</strong>
                <span>{normalizeSeatingBlocks(seatingLayout.blocks).join(' · ') || 'Clàssica'}</span>
              </button>
              <button
                className={seatingWorkspacePanel === 'objective' ? 'active' : ''}
                onClick={() => setSeatingWorkspacePanel('objective')}
                type="button"
              >
                <TrendingUp aria-hidden="true" size={22} />
                <strong>Objectiu</strong>
                <span>
                  {SEATING_ITERATION_OBJECTIVES.find((item) => item.id === seatingIterationObjective)?.label}
                </span>
              </button>
              <button
                className={seatingWorkspacePanel === 'half-groups' ? 'active' : ''}
                onClick={() => setSeatingWorkspacePanel('half-groups')}
                type="button"
              >
                <UsersRound aria-hidden="true" size={22} />
                <strong>Mig grup</strong>
                <span>{seatingPrioritizeHalfGroups ? 'Prioritzar' : 'Barrejar'}</span>
              </button>
              <button
                className={seatingWorkspacePanel === 'restrictions' ? 'active' : ''}
                onClick={() => setSeatingWorkspacePanel('restrictions')}
                type="button"
              >
                <ShieldAlert aria-hidden="true" size={22} />
                <strong>Restriccions</strong>
                <span>{seatingRestrictionCount} actives</span>
              </button>
              <button
                className={seatingWorkspacePanel === 'versions' ? 'active' : ''}
                onClick={() => setSeatingWorkspacePanel('versions')}
                type="button"
              >
                <History aria-hidden="true" size={22} />
                <strong>Versions</strong>
                <span>{classTutorialSeatingPlans.length} guardades</span>
              </button>
            </nav>

            {seatingWorkspacePanel && (
              <aside className="tutorial-seating-config-panel">
                <header>
                  <div>
                    <span>Configuració</span>
                    <h3>
                      {seatingWorkspacePanel === 'structure'
                        ? 'Estructura física de l’aula'
                        : seatingWorkspacePanel === 'objective'
                          ? 'Objectiu de la proposta'
                          : seatingWorkspacePanel === 'half-groups'
                            ? 'Organització del mig grup'
                            : seatingWorkspacePanel === 'restrictions'
                              ? 'Restriccions de l’aula'
                              : seatingWorkspacePanel === 'versions'
                                ? 'Versions guardades'
                                : seatingWorkspacePanel === 'save'
                                  ? 'Guardar disposició'
                                  : 'Lectura de la proposta'}
                    </h3>
                  </div>
                  <button aria-label="Tancar configuració" onClick={() => setSeatingWorkspacePanel('')} type="button">
                    <X aria-hidden="true" size={17} />
                  </button>
                </header>

                {seatingWorkspacePanel === 'structure' && (
                  <div className="tutorial-seating-structure-editor">
                    <p>Defineix les files i quantes taules individuals hi ha a cada bloc.</p>
                    <label>
                      Files
                      <span className="tutorial-seating-stepper">
                        <button
                          aria-label="Treure una fila"
                          onClick={() =>
                            setSeatingStructureDraft((current) => ({
                              ...current,
                              rows: Math.max(3, current.rows - 1),
                            }))
                          }
                          type="button"
                        >
                          −
                        </button>
                        <strong>{seatingStructureDraft.rows}</strong>
                        <button
                          aria-label="Afegir una fila"
                          onClick={() =>
                            setSeatingStructureDraft((current) => ({
                              ...current,
                              rows: Math.min(7, current.rows + 1),
                            }))
                          }
                          type="button"
                        >
                          +
                        </button>
                      </span>
                    </label>
                    <fieldset>
                      <legend>Distribució per blocs</legend>
                      <div className="tutorial-seating-block-editors">
                        {seatingStructureDraft.blocks.map((blockSize, index) => (
                          <label key={`seating_block_${index}`}>
                            <span>Bloc {index + 1}</span>
                            <div>
                              <button
                                aria-label={`Treure una columna al bloc ${index + 1}`}
                                onClick={() => updateSeatingStructureBlock(index, blockSize - 1)}
                                type="button"
                              >
                                −
                              </button>
                              <strong>{blockSize}</strong>
                              <button
                                aria-label={`Afegir una columna al bloc ${index + 1}`}
                                onClick={() => updateSeatingStructureBlock(index, blockSize + 1)}
                                type="button"
                              >
                                +
                              </button>
                              {seatingStructureDraft.blocks.length > 1 && (
                                <button
                                  aria-label={`Eliminar el bloc ${index + 1}`}
                                  className="remove"
                                  onClick={() =>
                                    setSeatingStructureDraft((current) => ({
                                      ...current,
                                      blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index),
                                    }))
                                  }
                                  type="button"
                                >
                                  <X aria-hidden="true" size={13} />
                                </button>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                      {seatingStructureDraft.blocks.length < 5 && (
                        <button
                          className="tutorial-seating-add-block"
                          onClick={() =>
                            setSeatingStructureDraft((current) => ({
                              ...current,
                              blocks: [...current.blocks, 1],
                            }))
                          }
                          type="button"
                        >
                          <Plus aria-hidden="true" size={15} />
                          Afegir bloc
                        </button>
                      )}
                    </fieldset>
                    <div className="tutorial-seating-structure-preview" aria-label="Previsualització de l’estructura">
                      {Array.from({ length: seatingStructureDraft.rows }).map((_, rowIndex) => (
                        <div key={`preview_row_${rowIndex}`}>
                          {seatingStructureDraft.blocks.map((blockSize, blockIndex) => (
                            <span key={`preview_${rowIndex}_${blockIndex}`}>
                              {Array.from({ length: blockSize }).map((__, columnIndex) => (
                                <i key={`preview_${rowIndex}_${blockIndex}_${columnIndex}`} />
                              ))}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    <strong className="tutorial-seating-distribution-label">
                      {seatingStructureDraft.blocks.join(' · ')} · {seatingStructureDraft.rows} files ·{' '}
                      {seatingStructureDraft.blocks.reduce((sum, size) => sum + size, 0) *
                        seatingStructureDraft.rows}{' '}
                      taules
                    </strong>
                    <div className="tutorial-seating-structure-presets">
                      <span>Presets ràpids</span>
                      <div>
                        {SEATING_STRUCTURE_PRESETS.map((preset) => (
                          <button
                            className={
                              preset.blocks.join(',') === seatingStructureDraft.blocks.join(',') ? 'active' : ''
                            }
                            key={preset.id}
                            onClick={() => selectSeatingStructurePreset(preset.blocks)}
                            type="button"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="tutorial-seating-apply-structure" onClick={applySeatingStructure} type="button">
                      Aplicar estructura
                    </button>
                    <p className="tutorial-seating-config-note">
                      Després podràs eliminar o afegir taules individuals clicant directament al plànol.
                    </p>
                  </div>
                )}

                {seatingWorkspacePanel === 'objective' && (
                  <div className="tutorial-seating-simple-panel">
                    <label>
                      Prioritat
                      <select
                        disabled={Boolean(selectedSeatingPlan)}
                        onChange={(event) => setSeatingIterationObjective(event.target.value)}
                        value={seatingIterationObjective}
                      >
                        {SEATING_ITERATION_OBJECTIVES.map((objective) => (
                          <option key={objective.id} value={objective.id}>
                            {objective.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      {SEATING_ITERATION_OBJECTIVES.find((item) => item.id === seatingIterationObjective)?.description}
                    </p>
                    <button onClick={handleGenerateSeatingAlternative} type="button">
                      <Shuffle aria-hidden="true" size={16} />
                      Generar alternativa
                    </button>
                    <button onClick={handleGenerateSeatingVariant} type="button">
                      <RefreshCw aria-hidden="true" size={16} />
                      Regenerar proposta
                    </button>
                    <button className="primary" onClick={handleImproveSeatingPlan} type="button">
                      <TrendingUp aria-hidden="true" size={16} />
                      Millorar proposta
                    </button>
                  </div>
                )}

                {seatingWorkspacePanel === 'half-groups' && (
                  <div className="tutorial-seating-simple-panel">
                    <p>Decideix si els mig grups han de quedar visualment agrupats o es poden barrejar.</p>
                    <button
                      className={seatingPrioritizeHalfGroups ? 'primary' : ''}
                      onClick={handleToggleSeatingHalfGroups}
                      type="button"
                    >
                      <UsersRound aria-hidden="true" size={16} />
                      {seatingPrioritizeHalfGroups ? 'Prioritzar mig grup' : 'Permetre barreja'}
                    </button>
                  </div>
                )}

                {seatingWorkspacePanel === 'restrictions' && (
                  <div className="tutorial-seating-simple-panel">
                    <strong>{seatingRestrictionCount} restriccions actives</strong>
                    <p>Selecciona un alumne per editar proximitats i zones, o bloqueja una taula lliure.</p>
                    <button
                      className={seatingBlockSeatMode ? 'primary' : ''}
                      disabled={Boolean(selectedSeatingPlan)}
                      onClick={() => {
                        setSeatingBlockSeatMode((current) => !current)
                        setSeatingMoveStudentId('')
                      }}
                      type="button"
                    >
                      <Ban aria-hidden="true" size={16} />
                      {seatingBlockSeatMode ? 'Cancel·lar bloqueig' : 'Bloquejar seient'}
                    </button>
                  </div>
                )}

                {seatingWorkspacePanel === 'save' && (
                  <div className="tutorial-seating-simple-panel">
                    <label>
                      Nom de la versió
                      <input
                        onChange={(event) => setSeatingPlanName(event.target.value)}
                        placeholder="Ex: inici de curs"
                        value={seatingPlanName}
                      />
                    </label>
                    <label>
                      Observació
                      <textarea
                        onChange={(event) => setSeatingPlanObservation(event.target.value)}
                        placeholder="Què vols recordar d’aquesta disposició?"
                        rows={4}
                        value={seatingPlanObservation}
                      />
                    </label>
                    <label className="tutorial-seating-save-active">
                      <input
                        checked={seatingSaveAsActive}
                        onChange={(event) => setSeatingSaveAsActive(event.target.checked)}
                        type="checkbox"
                      />
                      Marcar com a disposició activa
                    </label>
                    <button className="primary" onClick={handleSaveTutorialSeatingPlan} type="button">
                      <Save aria-hidden="true" size={16} />
                      Guardar versió
                    </button>
                  </div>
                )}

                {seatingWorkspacePanel === 'diagnostics' && (
                  <div className="tutorial-seating-diagnostics-summary">
                    <strong>{seatingPlanAnalysis.score}/100 · {seatingPlanAnalysis.quality.label}</strong>
                    <p>{seatingPlanAnalysis.summary}</p>
                    <dl>
                      <div>
                        <dt>Conflictes</dt>
                        <dd>{seatingPlanAnalysis.conflicts.length}</dd>
                      </div>
                      <div>
                        <dt>Capacitat</dt>
                        <dd>{seatingCapacity}/{classStudents.length}</dd>
                      </div>
                      <div>
                        <dt>Fixats</dt>
                        <dd>{seatingLockedStudentIds.length}</dd>
                      </div>
                    </dl>
                    {seatingPlanAnalysis.conflicts.slice(0, 4).map((conflict, index) => (
                      <article className={conflict.severity} key={`${conflict.title}_${index}`}>
                        <AlertTriangle aria-hidden="true" size={15} />
                        <span>
                          <strong>{conflict.title}</strong>
                          <small>{conflict.text}</small>
                        </span>
                      </article>
                    ))}
                    <button onClick={resetSeatingManualChanges} type="button">
                      <RotateCcw aria-hidden="true" size={16} />
                      Netejar canvis manuals
                    </button>
                  </div>
                )}

                {seatingWorkspacePanel === 'versions' && (
                  <div className="tutorial-seating-versions-compact">
                    {classTutorialSeatingPlans.length > 0 ? (
                      classTutorialSeatingPlans.map((plan) => (
                        <article key={`compact_${plan.id}`}>
                          <div>
                            <strong>{plan.title || 'Disposició guardada'}</strong>
                            <small>{plan.qualitySnapshot?.score ?? '—'}/100</small>
                          </div>
                          <button onClick={() => handleLoadTutorialSeatingPlan(plan)} type="button">
                            Carregar
                          </button>
                        </article>
                      ))
                    ) : (
                      <p>Encara no hi ha cap versió guardada.</p>
                    )}
                  </div>
                )}
              </aside>
            )}

            <div className="tutorial-seating-matrix-help compact">
              <article className="tutorial-seating-capacity">
                <strong>Capacitat activa</strong>
                <div>
                  <span>
                    {seatingCapacity}/{classStudents.length} llocs
                  </span>
                </div>
              </article>
              <article>
                <strong>Matriu 9 x 5</strong>
                <p>Clica espais buits per crear o eliminar taules.</p>
              </article>
              <article>
                <strong>Moure alumnes</strong>
                <p>Arrossega per intercanviar. El candau fixa el lloc.</p>
              </article>
            </div>

            <div className="tutorial-seating-version-presets">
              {['inici de curs', '2n trimestre', 'grups laboratori', 'disposició d’examen'].map((preset) => (
                <button
                  className={seatingPlanName === preset ? 'active' : ''}
                  key={preset}
                  onClick={() => setSeatingPlanName(preset)}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="tutorial-seating-save-details">
              <label>
                Observació de la versió
                <textarea
                  onChange={(event) => setSeatingPlanObservation(event.target.value)}
                  placeholder="Ex: després del canvi de trimestre; prioritzar calma i seguiment."
                  rows={2}
                  value={seatingPlanObservation}
                />
              </label>
              <label className="tutorial-seating-active-toggle">
                <input
                  checked={seatingSaveAsActive}
                  onChange={(event) => setSeatingSaveAsActive(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Marcar com a disposició activa</strong>
                  <small>Serà la versió de referència actual de la classe.</small>
                </span>
              </label>
              {loadedSeatingPlan && (
                <p>
                  <History aria-hidden="true" size={15} />
                  Editant una còpia carregada de <strong>{loadedSeatingPlan.title}</strong>. En guardar es crearà una
                  versió nova.
                </p>
              )}
            </div>

            <div className="tutorial-seating-restriction-bar">
              <div>
                <SlidersHorizontal aria-hidden="true" size={17} />
                <span>
                  <strong>{seatingRestrictionCount}</strong> restriccions actives
                </span>
              </div>
              <button
                className={seatingBlockSeatMode ? 'active' : ''}
                disabled={Boolean(selectedSeatingPlan)}
                onClick={() => {
                  setSeatingBlockSeatMode((current) => !current)
                  setSeatingMoveStudentId('')
                }}
                type="button"
              >
                <Ban aria-hidden="true" size={15} />
                {seatingBlockSeatMode ? 'Cancel·lar bloqueig' : 'Bloquejar seient'}
              </button>
              {seatingBlockSeatMode && <p>Selecciona una taula lliure per bloquejar-la o desbloquejar-la.</p>}
            </div>

            <section className="tutorial-seating-iteration-panel">
              <header>
                <div>
                  <RefreshCw aria-hidden="true" size={18} />
                  <div>
                    <strong>Iteració intel·ligent</strong>
                    <span>Ajusta la proposta sense començar de zero.</span>
                  </div>
                </div>
                <label>
                  Objectiu
                  <select
                    disabled={Boolean(selectedSeatingPlan)}
                    onChange={(event) => {
                      setSeatingIterationObjective(event.target.value)
                      setSeatingIterationMessage('')
                    }}
                    value={seatingIterationObjective}
                  >
                    {SEATING_ITERATION_OBJECTIVES.map((objective) => (
                      <option key={objective.id} value={objective.id}>
                        {objective.label}
                      </option>
                    ))}
                  </select>
                </label>
              </header>

              <p>
                {SEATING_ITERATION_OBJECTIVES.find((objective) => objective.id === seatingIterationObjective)?.description}
              </p>

              <div className="tutorial-seating-iteration-actions">
                <button
                  disabled={Boolean(selectedSeatingPlan)}
                  onClick={handleGenerateSeatingAlternative}
                  type="button"
                >
                  <Shuffle aria-hidden="true" size={16} />
                  <span>
                    <strong>Generar alternativa</strong>
                    <small>Manté els alumnes fixats.</small>
                  </span>
                </button>
                <button
                  className="primary"
                  disabled={Boolean(selectedSeatingPlan)}
                  onClick={handleImproveSeatingPlan}
                  type="button"
                >
                  <TrendingUp aria-hidden="true" size={16} />
                  <span>
                    <strong>Millorar proposta</strong>
                    <small>Tria la millor de 16 opcions.</small>
                  </span>
                </button>
                <div className="tutorial-seating-zone-iteration">
                  <select
                    aria-label="Zona que es vol recalcular"
                    disabled={Boolean(selectedSeatingPlan)}
                    onChange={(event) => setSeatingIterationZone(event.target.value)}
                    value={seatingIterationZone}
                  >
                    {SEATING_ZONE_OPTIONS.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.label}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={Boolean(selectedSeatingPlan)}
                    onClick={handleRecalculateSeatingZone}
                    type="button"
                  >
                    <RefreshCw aria-hidden="true" size={15} />
                    Recalcular zona
                  </button>
                </div>
              </div>

              <div className="tutorial-seating-kept-students">
                <strong>{seatingLockedStudentIds.length} alumne/s es mantindran igual</strong>
                {seatingLockedStudentIds.length > 0 ? (
                  <div>
                    {seatingLockedStudentIds.map((studentId) => (
                      <span key={studentId}>
                        {getSeatingShortName(classStudents.find((student) => student.id === studentId)?.name)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>Fixa alumnes amb el candau de la seva targeta o del panell lateral.</p>
                )}
              </div>

              {seatingIterationMessage && (
                <div className="tutorial-seating-iteration-result">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  <span>{seatingIterationMessage}</span>
                  <button
                    aria-label="Tancar resultat de la iteració"
                    onClick={() => setSeatingIterationMessage('')}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                </div>
              )}
            </section>

            <section className={`tutorial-seating-quality-panel ${seatingPlanAnalysis.quality.tone}`}>
              <div className="tutorial-seating-quality-score">
                <span>Qualitat global</span>
                <strong>
                  {seatingPlanAnalysis.score}
                  <small>/100</small>
                </strong>
                <em>{seatingPlanAnalysis.quality.label}</em>
              </div>

              <div className="tutorial-seating-quality-summary">
                <div>
                  <strong>Lectura de la proposta</strong>
                  <p>{seatingPlanAnalysis.summary}</p>
                </div>
                {seatingPlanAnalysis.strengths.length > 0 && (
                  <ul>
                    {seatingPlanAnalysis.strengths.map((strength) => (
                      <li key={strength}>
                        <CheckCircle2 aria-hidden="true" size={15} />
                        {strength}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="tutorial-seating-quality-conflicts">
                <header>
                  <strong>Conflictes detectats</strong>
                  <span>{seatingPlanAnalysis.conflicts.length}</span>
                </header>
                {seatingPlanAnalysis.conflicts.length > 0 ? (
                  <div>
                    {seatingPlanAnalysis.conflicts.slice(0, 3).map((conflict, index) => (
                      <article className={conflict.severity} key={`${conflict.title}_${conflict.text}_${index}`}>
                        <AlertTriangle aria-hidden="true" size={14} />
                        <p>
                          <strong>{conflict.title}</strong>
                          <span>{conflict.text}</span>
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty">
                    <CheckCircle2 aria-hidden="true" size={15} />
                    Cap conflicte rellevant.
                  </p>
                )}
              </div>
            </section>

            {seatingQualityComparison && (
              <div
                className={`tutorial-seating-quality-comparison ${
                  seatingQualityComparison.scoreDelta > 0
                    ? 'improved'
                    : seatingQualityComparison.scoreDelta < 0
                      ? 'worsened'
                      : 'stable'
                }`}
              >
                {seatingQualityComparison.scoreDelta > 0 ? (
                  <TrendingUp aria-hidden="true" size={19} />
                ) : seatingQualityComparison.scoreDelta < 0 ? (
                  <TrendingDown aria-hidden="true" size={19} />
                ) : (
                  <BarChart3 aria-hidden="true" size={19} />
                )}
                <div>
                  <strong>
                    {seatingQualityComparison.scoreDelta > 0
                      ? `El canvi millora ${seatingQualityComparison.scoreDelta} punts`
                      : seatingQualityComparison.scoreDelta < 0
                        ? `El canvi empitjora ${Math.abs(seatingQualityComparison.scoreDelta)} punts`
                        : 'El canvi manté la mateixa puntuació'}
                  </strong>
                  <p>
                    {seatingQualityBaseline.reason}: {seatingQualityBaseline.score}/100 ({seatingQualityBaseline.label}).
                    Ara: {seatingPlanAnalysis.score}/100 ({seatingPlanAnalysis.quality.label}).
                    {seatingQualityComparison.conflictDelta !== 0
                      ? ` ${
                          seatingQualityComparison.conflictDelta > 0
                            ? `S’han afegit ${seatingQualityComparison.conflictDelta} conflicte/s.`
                            : `S’han resolt ${Math.abs(seatingQualityComparison.conflictDelta)} conflicte/s.`
                        }`
                      : ' El nombre de conflictes no ha canviat.'}
                  </p>
                </div>
                <button onClick={() => setSeatingQualityBaseline(null)} type="button">
                  <X aria-hidden="true" size={15} />
                  <span className="sr-only">Tancar comparació</span>
                </button>
              </div>
            )}

            {(generatedSeatingPlan.warnings.length > 0 || hasRelationChangesAfterSeatingSave) && (
              <div className="tutorial-seating-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>No es poden respectar tots els criteris amb aquesta matriu.</strong>
                  {hasRelationChangesAfterSeatingSave && (
                    <p>Les relacions han canviat des de l’última disposició guardada. Revisa-la o genera’n una de nova.</p>
                  )}
                  {generatedSeatingPlan.warnings.slice(0, 3).map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            )}

            {seatingReviewRows.length > 0 && !selectedSeatingPlan && (
              <div className="tutorial-seating-review-summary">
                <strong>{seatingReviewRows.length} alumne/s marcats per revisar</strong>
                <p>
                  En clicar “Generar proposta”, el programa intentarà recol·locar sobretot aquests alumnes,
                  respectant els llocs bloquejats i els criteris de relacions, mig grup i ajuda acadèmica.
                </p>
                <div>
                  {seatingReviewRows.map((placement) => (
                    <span key={placement.studentId}>{placement.student.student.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="tutorial-seating-insight-grid">
              <article>
                <strong>Incompatibilitats a prop</strong>
                <span>{seatingPlanAnalysis.adjacentAvoidPairs.length}</span>
                <p>Alumnes amb rebuig o tensió que han quedat massa a prop.</p>
              </article>
              <article>
                <strong>Suports clars</strong>
                <span>
                  {Math.max(
                    0,
                    seatingPlanAnalysis.vulnerablePlacements.length - seatingPlanAnalysis.vulnerableWithoutSupport.length,
                  )}
                  /{seatingPlanAnalysis.vulnerablePlacements.length}
                </span>
                <p>Perfils vulnerables que sí que tenen algun suport proper.</p>
              </article>
              <article>
                <strong>Prioritaris davant</strong>
                <span>
                  {seatingPlanAnalysis.priorityInFront.length}/{seatingPlanAnalysis.priorityPlacements.length}
                </span>
                <p>Alumnes delicats situats en zones de seguiment més fàcil.</p>
              </article>
              <article>
                <strong>Parelles de treball</strong>
                <span>{seatingPlanAnalysis.adjacentWorkPairs.length}</span>
                <p>Vincles de treball útils que han quedat a prop dins l’aula.</p>
              </article>
            </div>

            {seatingPlanAnalysis.recommendations.length > 0 && (
              <div className="tutorial-seating-recommendations">
                <strong>Recomanacions automàtiques</strong>
                <div>
                  {seatingPlanAnalysis.recommendations.map((recommendation) => (
                    <p key={recommendation}>{recommendation}</p>
                  ))}
                </div>
              </div>
            )}

            <section className="tutorial-seating-history">
              <header>
                <div>
                  <History aria-hidden="true" size={18} />
                  <div>
                    <strong>Historial de disposicions</strong>
                    <span>{classTutorialSeatingPlans.length} versió/ns guardada/es</span>
                  </div>
                </div>
                {selectedSeatingPlan && (
                  <button className="secondary-action compact" onClick={() => setSelectedSeatingPlanId('')} type="button">
                    Tornar a proposta actual
                  </button>
                )}
              </header>

              {comparisonSeatingPlan && comparisonSeatingPlanAnalysis && (
                <div className="tutorial-seating-history-comparison">
                  <div>
                    <span>Proposta actual</span>
                    <strong>{generatedSeatingPlanAnalysis.score}/100</strong>
                    <small>{generatedSeatingPlanAnalysis.quality.label}</small>
                  </div>
                  <BarChart3 aria-hidden="true" size={19} />
                  <div>
                    <span>{comparisonSeatingPlan.title}</span>
                    <strong>{comparisonSeatingPlanAnalysis.score}/100</strong>
                    <small>{comparisonSeatingPlanAnalysis.quality.label}</small>
                  </div>
                  <p>
                    {generatedSeatingPlanAnalysis.score === comparisonSeatingPlanAnalysis.score
                      ? 'Tenen la mateixa puntuació global.'
                      : generatedSeatingPlanAnalysis.score > comparisonSeatingPlanAnalysis.score
                        ? `La proposta actual millora ${generatedSeatingPlanAnalysis.score - comparisonSeatingPlanAnalysis.score} punts.`
                        : `La versió guardada supera l’actual en ${comparisonSeatingPlanAnalysis.score - generatedSeatingPlanAnalysis.score} punts.`}
                  </p>
                  <button onClick={() => setComparisonSeatingPlanId('')} title="Tancar comparació" type="button">
                    <X aria-hidden="true" size={15} />
                  </button>
                </div>
              )}

              {classTutorialSeatingPlans.length > 0 ? (
                <div className="tutorial-seating-history-list">
                  {classTutorialSeatingPlans.map((plan) => (
                    <article
                      className={`${plan.isActive ? 'active' : ''} ${
                        selectedSeatingPlanId === plan.id ? 'previewing' : ''
                      }`}
                      key={plan.id}
                    >
                      <div className="tutorial-seating-history-copy">
                        <div>
                          <strong>{plan.title || 'Disposició guardada'}</strong>
                          {plan.isActive && <span className="active-badge">Activa</span>}
                        </div>
                        <small>
                          {formatShortDate((plan.createdAt || plan.updatedAt)?.slice(0, 10))} ·{' '}
                          {plan.seats?.length || 0} alumnes
                          {plan.qualitySnapshot?.score !== undefined
                            ? ` · ${plan.qualitySnapshot.score}/100`
                            : ''}
                        </small>
                        {plan.observation && <p>{plan.observation}</p>}
                      </div>
                      <div className="tutorial-seating-history-actions">
                        <button
                          aria-label={`Veure ${plan.title || 'disposició guardada'}`}
                          onClick={() => setSelectedSeatingPlanId(plan.id)}
                          title="Veure versió"
                          type="button"
                        >
                          <Eye aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={`Carregar ${plan.title || 'disposició guardada'} per editar`}
                          onClick={() => handleLoadTutorialSeatingPlan(plan)}
                          title="Carregar per editar"
                          type="button"
                        >
                          <History aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={`Duplicar ${plan.title || 'disposició guardada'}`}
                          onClick={() => handleDuplicateTutorialSeatingPlan(plan)}
                          title="Duplicar"
                          type="button"
                        >
                          <Clipboard aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={`Comparar ${plan.title || 'disposició guardada'} amb la proposta actual`}
                          className={comparisonSeatingPlanId === plan.id ? 'active' : ''}
                          onClick={() => setComparisonSeatingPlanId(plan.id)}
                          title="Comparar amb la proposta actual"
                          type="button"
                        >
                          <BarChart3 aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={
                            plan.isActive
                              ? `${plan.title || 'Disposició guardada'} és activa`
                              : `Marcar ${plan.title || 'disposició guardada'} com a activa`
                          }
                          className={plan.isActive ? 'active-plan' : ''}
                          disabled={Boolean(plan.isActive)}
                          onClick={() => handleSetActiveTutorialSeatingPlan(plan)}
                          title={plan.isActive ? 'Disposició activa' : 'Marcar com a activa'}
                          type="button"
                        >
                          <CheckCircle2 aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={`Eliminar ${plan.title || 'disposició guardada'}`}
                          className="danger"
                          onClick={() => handleDeleteTutorialSeatingPlan(plan)}
                          title="Eliminar versió"
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty">Encara no hi ha cap versió guardada per a aquesta classe.</p>
              )}
            </section>

            {generatedSeatingPlan.unplacedProfiles.length > 0 && !selectedSeatingPlan && (
              <div className="tutorial-seating-pending-list">
                <strong>Alumnes pendents de col·locar</strong>
                <div>
                  {generatedSeatingPlan.unplacedProfiles.map((profile) => (
                    <button
                      draggable
                      key={profile.student.id}
                      onDragStart={(event) => handleSeatingPendingDragStart(event, profile.student.id)}
                      type="button"
                    >
                      {profile.student.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`tutorial-seating-workspace ${selectedSeatingProfile ? 'has-panel' : ''}`}>
              <div className="tutorial-seating-classroom">
                <div className="tutorial-seating-classroom-front">
                  <span>Pissarra</span>
                  <strong>Taula docent</strong>
                </div>
                <div
                  className={`tutorial-seating-board-grid ${seatingMoveStudentId ? 'move-mode' : ''} ${
                    seatingBlockSeatMode ? 'block-mode' : ''
                  }`}
                  style={{
                    '--seating-columns': visibleSeatingPlan.columns,
                    gridTemplateColumns: `repeat(${visibleSeatingPlan.columns}, minmax(88px, 1fr))`,
                  }}
                >
                  {visibleSeatingPlan.seats.map((seat) => {
                  const placement = visibleSeatingPlan.placements.find((item) => item.seat.id === seat.id)
                  const isManualEmpty = seatingManualEmptySeatIds.includes(seat.id)
                  const isLocked = Boolean(placement?.isLocked || seatingLockedStudentIds.includes(placement?.studentId))
                  const isSelected = placement?.studentId === selectedSeatingStudentId
                  const isBlocked = visibleSeatingRestrictions.blockedSeatIds?.includes(seat.id)
                  const isBlockStart = visibleSeatingBlockStarts.includes(seat.x)
                  const blockPosition = getSeatingBlockPosition(visibleSeatingPlan.layout, seat.x)
                  return (
                    <div
                      aria-pressed={isSelected}
                      className={`tutorial-seat-card ${seat.enabled ? 'active-table' : 'disabled'} ${
                        placement?.isStar ? 'star' : ''
                      } ${placement?.isConflict ? 'conflict' : ''} ${
                        placement ? getHalfGroupClassName(placement.halfGroup) : ''
                      } ${seatingProblemSeats[placement?.studentId] ? 'problem' : ''} ${
                        isLocked ? 'locked' : ''
                      } ${isBlocked ? 'blocked-seat' : ''} ${isSelected ? 'selected' : ''} ${
                        draggingSeatingStudentId || seatingMoveStudentId ? 'drop-ready' : ''
                      } ${isBlockStart ? 'block-start' : ''}`}
                      draggable={Boolean(placement && !selectedSeatingPlan && !isLocked && !isBlocked)}
                      key={seat.id}
                      onClick={() => handleSeatingSeatClick(seat, placement)}
                      onDragEnd={() => setDraggingSeatingStudentId('')}
                      onDragOver={(event) => {
                        if (seat.enabled && !isBlocked && !selectedSeatingPlan) event.preventDefault()
                      }}
                      onDragStart={(event) => handleSeatingDragStart(event, placement)}
                      onDrop={(event) => handleSeatingDrop(event, seat, placement)}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target || !['Enter', ' '].includes(event.key)) return
                        event.preventDefault()
                        handleSeatingSeatClick(seat, placement)
                      }}
                      role="button"
                      style={{ '--seat-block': blockPosition.block + 1 }}
                      tabIndex={0}
                      title={
                        seatingBlockSeatMode
                          ? placement
                            ? 'Només es poden bloquejar taules lliures.'
                            : 'Bloquejar o desbloquejar aquest seient.'
                          : seatingMoveStudentId
                          ? seat.enabled
                            ? 'Col·locar aquí l’alumne seleccionat.'
                            : 'Aquest espai no té taula activa.'
                          : placement
                            ? 'Seleccionar alumne. També pots arrossegar-lo per intercanviar el lloc.'
                            : seat.enabled
                              ? 'Clica per deixar aquest espai buit.'
                              : 'Clica per crear una taula.'
                      }
                    >
                      {!seat.enabled ? (
                        <span className="empty">Espai</span>
                      ) : isBlocked ? (
                        <span className="empty blocked">
                          <Ban aria-hidden="true" size={16} />
                          Bloquejat
                        </span>
                      ) : placement ? (
                        <>
                          <div className="tutorial-seat-student-media">
                            {placement.student.student.photoUrl ? (
                              <img alt="" draggable="false" src={placement.student.student.photoUrl} />
                            ) : (
                              <span>{getSociogramInitials(placement.student.student.name)}</span>
                            )}
                          </div>
                          <div className="tutorial-seat-student-copy">
                            <strong title={placement.student.student.name}>
                              {getSeatingShortName(placement.student.student.name)}
                            </strong>
                            <small>
                              <span aria-hidden="true" />
                              {placement.halfGroup}
                            </small>
                          </div>
                          <div className="tutorial-seat-statuses">
                            {placement.isStar ? (
                              <span className="star" title="Alumne estrella">
                                <Star aria-hidden="true" size={13} />
                                <span className="sr-only">Alumne estrella</span>
                              </span>
                            ) : null}
                            {placement.isConflict ? (
                              <span className="conflict" title="Requereix control de proximitats">
                                <ShieldAlert aria-hidden="true" size={13} />
                                <span className="sr-only">Requereix control de proximitats</span>
                              </span>
                            ) : null}
                            {placement.student.supportLabel ? (
                              <span className="support" title={placement.student.supportLabel}>
                                <HeartHandshake aria-hidden="true" size={13} />
                                <span className="sr-only">{placement.student.supportLabel}</span>
                              </span>
                            ) : null}
                          </div>
                          {!selectedSeatingPlan && (
                            <div className="tutorial-seat-actions">
                              <button
                                aria-label={isLocked ? 'Desfixar aquest lloc' : 'Fixar aquest alumne en aquest lloc'}
                                className={`tutorial-seat-lock-button ${isLocked ? 'active' : ''}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedSeatingStudentId(placement.studentId)
                                  toggleSeatingLockedStudent(placement)
                                }}
                                title={isLocked ? 'Desfixar aquest lloc' : 'Fixar aquest alumne en aquest lloc'}
                                type="button"
                              >
                                <Lock aria-hidden="true" size={13} />
                              </button>
                              <button
                                aria-label={
                                  seatingProblemSeats[placement.studentId]
                                    ? `Deixar de revisar el lloc de ${placement.student.student.name}`
                                    : `Revisar el lloc de ${placement.student.student.name}`
                                }
                                className={`tutorial-seat-problem-button ${
                                  seatingProblemSeats[placement.studentId] ? 'active' : ''
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedSeatingStudentId(placement.studentId)
                                  toggleSeatingProblemSeat(placement)
                                }}
                                title={
                                  seatingProblemSeats[placement.studentId]
                                    ? 'Deixar de revisar aquest lloc'
                                    : 'Marcar aquest lloc per revisar'
                                }
                                type="button"
                              >
                                <Eye aria-hidden="true" size={13} />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="empty">{isManualEmpty ? 'Buida' : 'Taula lliure'}</span>
                      )}
                    </div>
                  )
                  })}
                </div>
              </div>

              {selectedSeatingProfile && (
                <aside className="tutorial-seating-student-panel" aria-label="Detall de l’alumne seleccionat">
                  <header>
                    <div className="tutorial-seating-panel-identity">
                      <div className="tutorial-seating-panel-avatar">
                        {selectedSeatingProfile.student.photoUrl ? (
                          <img alt="" src={selectedSeatingProfile.student.photoUrl} />
                        ) : (
                          <span>{getSociogramInitials(selectedSeatingProfile.student.name)}</span>
                        )}
                      </div>
                      <div>
                        <span>{selectedSeatingProfile.halfGroup}</span>
                        <h3>{selectedSeatingProfile.student.name}</h3>
                      </div>
                    </div>
                    <button
                      aria-label="Tancar el panell de l’alumne"
                      onClick={() => {
                        setSelectedSeatingStudentId('')
                        setSeatingMoveStudentId('')
                      }}
                      title="Tancar"
                      type="button"
                    >
                      <X aria-hidden="true" size={17} />
                    </button>
                  </header>

                  <div className="tutorial-seating-position">
                    <MapPin aria-hidden="true" size={17} />
                    <div>
                      <strong>{selectedSeatingContext.zoneLabel}</strong>
                      <span>
                        {selectedSeatingPlacement
                          ? `Fila ${selectedSeatingPlacement.seat.y + 1} · columna ${selectedSeatingPlacement.seat.x + 1}`
                          : 'Encara no té una taula assignada'}
                      </span>
                    </div>
                  </div>

                  <div className="tutorial-seating-profile-metrics">
                    <div>
                      <span>Rendiment</span>
                      <strong>{formatAverageGrade(selectedSeatingProfile.tutorialProfile.averageScore)}</strong>
                    </div>
                    <div>
                      <span>Prioritat</span>
                      <strong>{selectedSeatingProfile.priorityScore > 0 ? `P${selectedSeatingProfile.priorityScore}` : 'OK'}</strong>
                    </div>
                    <div>
                      <span>Sociometria</span>
                      <strong>{selectedSeatingProfile.sociometricCategory}</strong>
                    </div>
                    <div>
                      <span>Seguiment</span>
                      <strong>{selectedSeatingProfile.recordSeverity || 0}</strong>
                    </div>
                  </div>

                  <section>
                    <strong>Per què és aquí</strong>
                    <ul>
                      {selectedSeatingContext.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </section>

                  {selectedSeatingContext.alerts.length > 0 && (
                    <section className="risk">
                      <strong>Cal revisar</strong>
                      <ul>
                        {selectedSeatingContext.alerts.map((alert) => (
                          <li key={alert}>{alert}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {selectedSeatingContext.nearby.length > 0 && (
                    <section>
                      <strong>Alumnes propers</strong>
                      <div className="tutorial-seating-nearby-list">
                        {selectedSeatingContext.nearby.map((item) => {
                          const relationLabel = item.pair.hasAvoid
                            ? 'Evitar'
                            : item.pair.workInfluence > 0
                              ? 'Treball'
                              : item.pair.socialInfluence > 0
                                ? 'Social'
                                : item.pair.supportiveInfluence > 0
                                  ? 'Suport'
                                  : 'Proximitat'
                          return (
                            <div key={item.placement.studentId}>
                              <span>{item.placement.student.student.name}</span>
                              <strong className={item.pair.hasAvoid ? 'risk' : ''}>
                                {relationLabel} · {item.distance <= 1 ? 'al costat' : 'a prop'}
                              </strong>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {!selectedSeatingPlan && (
                    <section className="tutorial-seating-restrictions-panel">
                      <div className="tutorial-seating-restrictions-heading">
                        <strong>Restriccions pedagògiques</strong>
                        {(selectedNeverNearIds.length > 0 ||
                          selectedPreferNearIds.length > 0 ||
                          selectedPreferredZone ||
                          selectedAvoidedZone) && (
                          <button onClick={clearSelectedSeatingRestrictions} type="button">
                            Netejar
                          </button>
                        )}
                      </div>

                      <label>
                        Relació amb un altre alumne
                        <select
                          onChange={(event) => setSeatingRestrictionTargetId(event.target.value)}
                          value={seatingRestrictionTargetId}
                        >
                          <option value="">Selecciona alumne</option>
                          {classStudents
                            .filter((student) => student.id !== selectedSeatingStudentId)
                            .map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="tutorial-seating-pair-actions">
                        <button
                          className={
                            seatingRestrictionTargetId &&
                            selectedNeverNearIds.includes(seatingRestrictionTargetId)
                              ? 'never active'
                              : 'never'
                          }
                          disabled={!seatingRestrictionTargetId}
                          onClick={() => toggleSeatingPairRestriction('never')}
                          type="button"
                        >
                          <Ban aria-hidden="true" size={14} />
                          Mai a prop
                        </button>
                        <button
                          className={
                            seatingRestrictionTargetId &&
                            selectedPreferNearIds.includes(seatingRestrictionTargetId)
                              ? 'near active'
                              : 'near'
                          }
                          disabled={!seatingRestrictionTargetId}
                          onClick={() => toggleSeatingPairRestriction('near')}
                          type="button"
                        >
                          <HeartHandshake aria-hidden="true" size={14} />
                          Millor a prop
                        </button>
                      </div>

                      <div className="tutorial-seating-zone-controls">
                        <label>
                          Zona preferent
                          <select
                            onChange={(event) =>
                              setSelectedSeatingZoneRestriction('preferred', event.target.value)
                            }
                            value={selectedPreferredZone}
                          >
                            <option value="">Sense preferència</option>
                            <option value="front">Davant</option>
                            <option value="center">Centre</option>
                            <option value="back">Darrere</option>
                          </select>
                        </label>
                        <label>
                          Zona a evitar
                          <select
                            onChange={(event) => setSelectedSeatingZoneRestriction('avoided', event.target.value)}
                            value={selectedAvoidedZone}
                          >
                            <option value="">Cap zona</option>
                            <option value="front">Davant</option>
                            <option value="center">Centre</option>
                            <option value="back">Darrere</option>
                          </select>
                        </label>
                      </div>

                      <div className="tutorial-seating-restriction-chips">
                        {selectedNeverNearIds.map((studentId) => (
                          <span className="never" key={`never_${studentId}`}>
                            Mai: {getSeatingShortName(classStudents.find((student) => student.id === studentId)?.name)}
                          </span>
                        ))}
                        {selectedPreferNearIds.map((studentId) => (
                          <span className="near" key={`near_${studentId}`}>
                            A prop: {getSeatingShortName(classStudents.find((student) => student.id === studentId)?.name)}
                          </span>
                        ))}
                        {selectedPreferredZone && (
                          <span>
                            Preferent:{' '}
                            {selectedPreferredZone === 'front'
                              ? 'davant'
                              : selectedPreferredZone === 'back'
                                ? 'darrere'
                                : 'centre'}
                          </span>
                        )}
                        {selectedAvoidedZone && (
                          <span className="never">
                            Evitar:{' '}
                            {selectedAvoidedZone === 'front'
                              ? 'davant'
                              : selectedAvoidedZone === 'back'
                                ? 'darrere'
                                : 'centre'}
                          </span>
                        )}
                        {selectedSeatingIsLocked && <span>Alumne fix</span>}
                      </div>
                    </section>
                  )}

                  {seatingMoveStudentId === selectedSeatingStudentId && (
                    <div className="tutorial-seating-move-notice">
                      <Move aria-hidden="true" size={17} />
                      <span>Tria una taula activa. Si està ocupada, intercanviarem els alumnes.</span>
                    </div>
                  )}

                  {!selectedSeatingPlan ? (
                    <div className="tutorial-seating-panel-actions">
                      <button
                        className={seatingMoveStudentId === selectedSeatingStudentId ? 'active' : ''}
                        onClick={() =>
                          setSeatingMoveStudentId((current) =>
                            current === selectedSeatingStudentId ? '' : selectedSeatingStudentId,
                          )
                        }
                        type="button"
                      >
                        <Move aria-hidden="true" size={16} />
                        {selectedSeatingPlacement ? 'Moure alumne' : 'Triar un lloc'}
                      </button>
                      <button
                        className={selectedSeatingIsLocked ? 'active' : ''}
                        disabled={!selectedSeatingPlacement}
                        onClick={() => toggleSeatingLockedStudent(selectedSeatingPlacement)}
                        type="button"
                      >
                        <Lock aria-hidden="true" size={16} />
                        {selectedSeatingIsLocked ? 'Desfixar lloc' : 'Fixar lloc'}
                      </button>
                      <button
                        className={selectedSeatingNeedsReview ? 'review-active' : ''}
                        disabled={!selectedSeatingPlacement}
                        onClick={() => toggleSeatingProblemSeat(selectedSeatingPlacement)}
                        type="button"
                      >
                        <Eye aria-hidden="true" size={16} />
                        {selectedSeatingNeedsReview ? 'Revisió marcada' : 'Marcar per revisar'}
                      </button>
                      <button
                        disabled={!selectedSeatingPlacement}
                        onClick={handleRegenerateWithSelectedStudentLocked}
                        type="button"
                      >
                        <Shuffle aria-hidden="true" size={16} />
                        Regenerar mantenint-lo
                      </button>
                      <button
                        className="danger"
                        disabled={!selectedSeatingPlacement || selectedSeatingIsLocked}
                        onClick={handleUnseatSelectedStudent}
                        type="button"
                      >
                        <UserX aria-hidden="true" size={16} />
                        Deixar pendent
                      </button>
                    </div>
                  ) : (
                    <p className="tutorial-seating-readonly-note">
                      Estàs consultant una disposició guardada. Torna a la proposta actual per editar-la.
                    </p>
                  )}
                </aside>
              )}
            </div>
          </section>

          <div className="tutorial-relationships-grid">
            <article className="tutoring-card tutorial-relation-form-card" data-tour="tutoring-relation-form">
              <div>
                <Plus size={24} />
                <h2>Registrar relació</h2>
              </div>
              <form className="tutorial-relation-form" onSubmit={handleSubmitTutorialRelation}>
                <label>
                  Alumne origen
                  <div className="tutorial-relation-picker">
                    <Search size={16} />
                    <input
                      list="tutorial-source-students"
                      onChange={(event) => handleRelationSearchChange('source', event.target.value)}
                      placeholder="Escriu el nom..."
                      value={relationSearch.source}
                    />
                    <select
                      onChange={(event) => {
                        const student = classStudents.find((item) => item.id === event.target.value)
                        setRelationForm((current) => ({ ...current, sourceStudentId: event.target.value }))
                        setRelationSearch((current) => ({ ...current, source: student?.name || '' }))
                      }}
                      value={relationForm.sourceStudentId}
                    >
                      <option value="">Primer alumne de la llista</option>
                      {classStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label>
                  Alumne relacionat
                  <div className="tutorial-relation-picker">
                    <Search size={16} />
                    <input
                      list="tutorial-target-students"
                      onChange={(event) => handleRelationSearchChange('target', event.target.value)}
                      placeholder="Escriu el nom..."
                      value={relationSearch.target}
                    />
                    <select
                      onChange={(event) => {
                        const student = classStudents.find((item) => item.id === event.target.value)
                        setRelationForm((current) => ({ ...current, targetStudentId: event.target.value }))
                        setRelationSearch((current) => ({ ...current, target: student?.name || '' }))
                      }}
                      value={relationForm.targetStudentId}
                    >
                      <option value="">Tria un alumne</option>
                      {classStudents
                        .filter((student) => student.id !== relationForm.sourceStudentId)
                        .map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </label>
                <datalist id="tutorial-source-students">
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.name} />
                  ))}
                </datalist>
                <datalist id="tutorial-target-students">
                  {classStudents
                    .filter((student) => student.id !== relationForm.sourceStudentId)
                    .map((student) => (
                      <option key={student.id} value={student.name} />
                    ))}
                </datalist>

                <fieldset className="tutorial-relation-type-grid">
                  <legend>Tipus</legend>
                  {TUTORING_RELATION_TYPES.map((type) => (
                    <button
                      className={`tutorial-relation-type-button ${type.tone} ${
                        relationForm.type === type.id ? 'active' : ''
                      }`}
                      key={type.id}
                      onClick={() => setRelationForm((current) => ({ ...current, type: type.id }))}
                      type="button"
                    >
                      {type.shortLabel}
                    </button>
                  ))}
                </fieldset>

                <label>
                  Intensitat
                  <select
                    onChange={(event) => setRelationForm((current) => ({ ...current, strength: event.target.value }))}
                    value={relationForm.strength}
                  >
                    <option value="1">Baixa</option>
                    <option value="2">Mitjana</option>
                    <option value="3">Alta</option>
                  </select>
                </label>

                <label className="full">
                  Nota breu
                  <textarea
                    maxLength={RELATION_NOTE_LIMIT}
                    onChange={(event) => setRelationForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Ex: treballen bé en tasques obertes, cal evitar-los en exàmens cooperatius..."
                    value={relationForm.note}
                  />
                </label>

                <button className="primary-action" disabled={classStudents.length < 2} type="submit">
                  Guardar relació
                </button>
              </form>
            </article>

            <article className="tutoring-card tutorial-sociogram-card">
              <div>
                <Network size={24} />
                <h2>Mapa ràpid del grup</h2>
              </div>
              {classStudents.length === 0 ? (
                <div className="empty-state compact">Afegeix alumnes a la tutoria per començar el sociograma.</div>
              ) : (
                <div className="tutorial-sociogram-list">
                  {tutorialRelationSummary.studentRows.map((row) => {
                    const isSelected = row.student.id === selectedRelationRow?.student.id
                    const roleRow = tutorialRoleRowsByStudent.get(row.student.id)
                    return (
                      <article
                        className={`tutorial-sociogram-row ${isSelected ? 'active' : ''}`}
                        key={row.student.id}
                      >
                        <button
                          className="tutorial-sociogram-row-main"
                          onClick={() => setSelectedRelationStudentId(row.student.id)}
                          type="button"
                        >
                          <div>
                            <strong>{row.student.name}</strong>
                            <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                          </div>
                          <span className="green">{row.supportiveCount} positives</span>
                          <span className="red">{row.avoidCount} evitar</span>
                          <span>{row.total} total</span>
                        </button>
                        <div className="tutorial-role-actions">
                          <button
                            className={roleRow?.star ? 'active star' : ''}
                            onClick={() =>
                              toggleTutorialStudentRole({ classId: activeClassId, role: 'star', studentId: row.student.id })
                            }
                            type="button"
                          >
                            <Star size={15} />
                            Estrella
                          </button>
                          <button
                            className={roleRow?.conflict ? 'active conflict' : ''}
                            onClick={() =>
                              toggleTutorialStudentRole({
                                classId: activeClassId,
                                role: 'conflict',
                                studentId: row.student.id,
                              })
                            }
                            type="button"
                          >
                            <ShieldAlert size={15} />
                            Conflictiu
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </article>
          </div>

          <div className="tutorial-relationships-grid detail">
            <article className="tutoring-card tutorial-student-relation-search" data-tour="tutoring-relation-search">
              <div>
                <Search size={24} />
                <h2>Cercador per alumne</h2>
              </div>
              <label>
                Alumne
                <div className="tutorial-relation-picker">
                  <Search size={16} />
                  <input
                    list="tutorial-summary-students"
                    onChange={(event) => {
                      const matchedStudent = findStudentBySearch(classStudents, event.target.value)
                      if (matchedStudent) setSelectedRelationStudentId(matchedStudent.id)
                    }}
                    placeholder="Escriu el nom..."
                  />
                  <select
                    onChange={(event) => setSelectedRelationStudentId(event.target.value)}
                    value={selectedRelationRow?.student.id || ''}
                  >
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <datalist id="tutorial-summary-students">
                {classStudents.map((student) => (
                  <option key={student.id} value={student.name} />
                ))}
              </datalist>
            </article>

            <article className="tutoring-card tutorial-student-relation-card">
              <button
                onClick={() => {
                  setActiveRelationshipTool('sociogram')
                }}
                type="button"
              >
                <Network size={24} />
                <strong>Sociograma centrat</strong>
                <span>{selectedRelationRow?.student.name || 'Selecciona un alumne'}</span>
              </button>
            </article>

            <article className="tutoring-card tutorial-student-relation-card">
              <button onClick={() => setActiveRelationshipTool('groups')} type="button">
                <UsersRound size={24} />
                <strong>Grup cooperatiu</strong>
                <span>
                  {visibleCooperativeGroups.find((group) =>
                    group.members.some((member) => member.student.id === selectedRelationRow?.student.id),
                  )?.name || 'Encara no assignat'}
                </span>
              </button>
            </article>

            <article className="tutoring-card tutorial-student-relations-log">
              <div>
                <ClipboardList size={24} />
                <h2>Relacions i comentaris</h2>
              </div>
              {!selectedRelationRow ? (
                <div className="empty-state compact">Selecciona un alumne per veure’n les relacions.</div>
              ) : selectedRelationRow.total === 0 ? (
                <div className="empty-state compact">Aquest alumne encara no té relacions registrades.</div>
              ) : (
                <div className="tutorial-relation-pills">
                  {[...selectedRelationRow.outgoing, ...selectedRelationRow.incoming].map((relation) => {
                    const typeMeta = getRelationTypeMeta(relation.type)
                    const isOutgoing = relation.sourceStudentId === selectedRelationRow.student.id
                    const otherStudent = classStudents.find(
                      (student) => student.id === (isOutgoing ? relation.targetStudentId : relation.sourceStudentId),
                    )
                    return (
                      <article className={`tutorial-relation-pill ${typeMeta.tone}`} key={relation.id}>
                        <strong>
                          {isOutgoing ? 'Cap a' : 'Rep de'} {otherStudent?.name || 'Alumne no trobat'}
                        </strong>
                        <span>
                          {typeMeta.shortLabel} · intensitat {relation.strength || 2} ·{' '}
                          {relation.sourceLabel || 'Criteri docent'}
                        </span>
                        {relation.note && <p>{relation.note}</p>}
                      </article>
                    )
                  })}
                </div>
              )}
            </article>
          </div>
        </section>
      )}

      {activePanel === 'profile' && (
        <section className="tutorial-profile-panel" data-tour="tutoring-profile-panel">
          <article className="tutoring-card">
            <div>
              <FileText size={24} />
              <h2>Informes tutorials</h2>
            </div>
            <p>Revisa la síntesi de cada alumne, completa el comentari del tutor i prepara el PDF tutorial.</p>
            <label className="tutorial-report-search">
              <Search size={17} />
              <input
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder="Cercar alumne..."
                type="search"
                value={profileSearch}
              />
            </label>
            <div className="tutorial-profile-filter-tabs" aria-label="Filtre d’informes tutorials">
              <button
                className={profileFilter === 'priority' ? 'active' : ''}
                onClick={() => setProfileFilter('priority')}
                type="button"
              >
                Prioritaris
              </button>
              <button
                className={profileFilter === 'not-developed' ? 'active' : ''}
                onClick={() => setProfileFilter('not-developed')}
                type="button"
              >
                No assolides
              </button>
              <button
                className={profileFilter === 'tracking' ? 'active' : ''}
                onClick={() => setProfileFilter('tracking')}
                type="button"
              >
                Seguiment
              </button>
              <button
                className={profileFilter === 'all' ? 'active' : ''}
                onClick={() => setProfileFilter('all')}
                type="button"
              >
                Tots
              </button>
            </div>
            <div className="tutorial-profile-scope-filters">
              <label>
                Àrea
                <select
                  onChange={(event) => {
                    setProfileAreaFilter(event.target.value)
                    setProfileSubjectFilter('all')
                  }}
                  value={profileAreaFilter}
                >
                  <option value="all">Totes les àrees</option>
                  {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignatura
                <select
                  onChange={(event) => setProfileSubjectFilter(event.target.value)}
                  value={profileSubjectFilter}
                >
                  <option value="all">Totes les assignatures</option>
                  {profileSubjectOptions.map((item) => (
                    <option key={item.subject} value={item.subject}>
                      {item.subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {tutorialSummary.studentProfiles.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes per començar a preparar informes tutorials.</div>
            ) : filteredTutorialProfiles.length === 0 ? (
              <div className="empty-state compact">Aquest filtre no té cap alumne ara mateix.</div>
            ) : (
              <div className="tutorial-student-profile-list">
                {filteredTutorialProfiles.map((profile) => {
                  const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
                  const trackingCount = recordRow?.total || 0
                  const priority = getTutorialProfilePriority(profile, recordRow)
                  const reportStatus = profile.student.tutorialReportUpdatedAt
                    ? 'En preparació'
                    : priority > 0
                      ? 'Cal revisar'
                      : 'No iniciat'
                  return (
                    <button
                      className={`tutorial-student-profile-row ${
                        priority > 0 ? 'risk' : ''
                      }`}
                      key={profile.student.id}
                      onClick={() => setSelectedTutorialProfileId(profile.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{profile.student.name}</strong>
                        <small>
                          {profile.notDevelopedCount} no assolides · {trackingCount} registres · {reportStatus}
                        </small>
                      </div>
                      <span className="tutorial-report-row-status">{reportStatus}</span>
                      <em>Preparar</em>
                    </button>
                  )
                })}
              </div>
            )}
          </article>
        </section>
      )}

      {selectedTutorialProfile && (
        <TutorialStudentProfileModal
          classLabel={activeClass?.name}
          key={selectedTutorialProfile.student.id}
          onClose={() => setSelectedTutorialProfileId('')}
          onSaveReport={(patch) => updateStudent(selectedTutorialProfile.student.id, patch)}
          profile={selectedTutorialProfile}
          recordRow={tutorialRecordRowsByStudent.get(selectedTutorialProfile.student.id)}
          sociometricReport={sociometricIndividualReportsByStudentId.get(selectedTutorialProfile.student.id)}
        />
      )}

      {selectedTutorialRecordRow && (
        <TutorialRecordStudentModal
          onClose={() => setSelectedTutorialRecordStudentId('')}
          onDelete={deleteTutorialRecord}
          row={selectedTutorialRecordRow}
        />
      )}
      {selectedDoipStudent && (
        <Modal
          onClose={() => {
            setSelectedDoipStudentId('')
            setDoipDraft('')
          }}
          size="lg"
          title={`Resposta DOIP: ${selectedDoipStudent.name}`}
        >
          <div className="tutorial-doip-detail-modal">
            {selectedDoipRecords.length === 0 ? (
              <div className="empty-state compact">Encara no hi ha cap resposta DOIP registrada per aquest alumne.</div>
            ) : (
              <div className="tutorial-record-history compact">
                {selectedDoipRecords.map((record) => (
                  <article className="tutorial-record-entry blue" key={record.id}>
                    <div>
                      <strong>{formatShortDate(record.date)}</strong>
                      <p>{record.note || 'Sense resum afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => deleteTutorialRecord(record.id)}
                      title="Eliminar resposta DOIP"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
            <label className="field-label">
              Resum de respostes de l’equip educatiu
              <textarea
                maxLength={TUTORING_TEXT_LIMIT}
                onChange={(event) => setDoipDraft(event.target.value)}
                placeholder="Resumeix les respostes rebudes i els acords principals."
                value={doipDraft}
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary-action"
                disabled={!doipDraft.trim()}
                onClick={async () => {
                  await addTutorialRecord({
                    classId: activeClassId,
                    date: getTodayDateInput(),
                    note: doipDraft,
                    studentId: selectedDoipStudent.id,
                    type: 'doip',
                  })
                  setDoipDraft('')
                }}
                type="button"
              >
                Afegir resposta DOIP
              </button>
              <small>Si més endavant demanes un altre DOIP, pots afegir una altra entrada aquí mateix.</small>
            </div>
          </div>
        </Modal>
      )}
      {selectedModifiedRow && (
        <Modal
          onClose={() => setSelectedModifiedStudentId('')}
          size="lg"
          title={`Competències modificades: ${selectedModifiedRow.student.name}`}
        >
          <div className="tutorial-modified-detail">
            {selectedModifiedRow.subjects.map((subject) => (
              <article key={subject.subject}>
                <div>
                  <strong>{subject.subject}</strong>
                  <small>{subject.areaName}</small>
                </div>
                <div>
                  {subject.competencies.map((competency) => (
                    <span key={competency.key} title={competency.name}>
                      {competency.code}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {selectedExemptionRow && (
        <Modal
          onClose={() => setSelectedExemptionStudentId('')}
          size="lg"
          title={`Matèries exemptes: ${selectedExemptionRow.student.name}`}
        >
          <div className="tutorial-exemption-detail">
            {selectedExemptionRow.subjects.map((subject) => {
              const subjectMeta = allSubjectOptions.find((item) => item.subject === subject)
              return (
                <article key={subject}>
                  <div>
                    <strong>{subject}</strong>
                    <small>{subjectMeta?.areaName || getSubjectArea(subject)?.name || 'Àrea no indicada'}</small>
                  </div>
                  <button
                    className="secondary-action compact danger"
                    onClick={() => toggleStudentArrayValue(selectedExemptionRow.student, 'tutorialExemptSubjects', subject)}
                    type="button"
                  >
                    Treure exempció
                  </button>
                </article>
              )
            })}
          </div>
        </Modal>
      )}
      {showExemptionConfig && (
        <Modal
          onClose={() => setShowExemptionConfig(false)}
          size="lg"
          title="Configurar matèries exemptes"
        >
          <div className="tutorial-exemption-config">
            <p>
              Tria un alumne i una matèria. Pots repetir el procés si un alumne està exempt de més d’una assignatura.
            </p>
            <div className="tutorial-modified-config-fields">
              <label>
                Alumne
                <select
                  onChange={(event) => setExemptionForm((current) => ({ ...current, studentId: event.target.value }))}
                  value={exemptionConfigStudent?.id || ''}
                >
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignatura exempta
                <select
                  onChange={(event) => setExemptionForm((current) => ({ ...current, subject: event.target.value }))}
                  value={exemptionConfigSubject}
                >
                  {allSubjectOptions.map((item) => (
                    <option key={item.subject} value={item.subject}>
                      {item.subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!exemptionConfigStudent ? (
              <div className="empty-state compact">Afegeix alumnes abans de configurar exempcions.</div>
            ) : (
              <button
                className={`tutorial-exemption-toggle ${
                  exemptionConfigStudent.tutorialExemptSubjects?.includes(exemptionConfigSubject) ? 'active' : ''
                }`}
                disabled={!exemptionConfigSubject}
                onClick={() => toggleStudentArrayValue(exemptionConfigStudent, 'tutorialExemptSubjects', exemptionConfigSubject)}
                type="button"
              >
                <span>{exemptionConfigSubject || 'Assignatura'}</span>
                <strong>
                  {exemptionConfigStudent.tutorialExemptSubjects?.includes(exemptionConfigSubject)
                    ? 'Treure exempció'
                    : 'Marcar com a exempta'}
                </strong>
              </button>
            )}
          </div>
        </Modal>
      )}
      {showModifiedCompetencyConfig && (
        <Modal
          onClose={() => setShowModifiedCompetencyConfig(false)}
          size="lg"
          title="Configurar competències modificades"
        >
          <div className="tutorial-modified-config">
            <div className="tutorial-modified-config-fields">
              <label>
                Alumne
                <select
                  onChange={(event) =>
                    setModifiedCompetencyForm((current) => ({ ...current, studentId: event.target.value }))
                  }
                  value={modifiedConfigStudent?.id || ''}
                >
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignatura
                <select
                  onChange={(event) =>
                    setModifiedCompetencyForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  value={modifiedConfigSubject}
                >
                  {allSubjectOptions.map((item) => (
                    <option key={item.subject} value={item.subject}>
                      {item.subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!modifiedConfigStudent ? (
              <div className="empty-state compact">Afegeix alumnes abans de configurar competències modificades.</div>
            ) : modifiedConfigCompetencies.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-modified-config-grid">
                {modifiedConfigCompetencies.map((competency, index) => {
                  const isActive = modifiedConfigStudent.tutorialModifiedCompetencies?.includes(competency.key)
                  return (
                    <button
                      className={isActive ? 'active' : ''}
                      key={competency.key}
                      onClick={() =>
                        toggleStudentArrayValue(modifiedConfigStudent, 'tutorialModifiedCompetencies', competency.key)
                      }
                      type="button"
                    >
                      <b>C{index + 1}</b>
                      <span>{competency.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
      {showBulkImport && (
        <TutoringBulkImportModal
          activeClass={activeClass}
          classId={activeClassId}
          columns={bulkImportColumns}
          evaluationContext={evaluationContext}
          onClose={() => setShowBulkImport(false)}
          onSave={importTutorialMarks}
          students={classStudents}
          tutorialMarks={tutorialMarks}
        />
      )}
    </section>
  )
}
