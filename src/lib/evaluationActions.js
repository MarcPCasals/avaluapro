import { canonicalizeSubjectName } from '../data/subjects.js'
import { selectEvaluationCompetencies } from './transversalEvaluation.js'

const CFN_SUBJECT = 'Ciències Físiques i de la Natura'
const actions = (prefix, descriptions) => descriptions.map((description, index) => ({
  id: `${prefix}${index + 1}`, description,
}))

export const CFN_ACTION_CATALOG = {
  'C1/CA1': actions('C1R', [
    'Utilitzar lèxic científic.',
    'Expressar el model amb representacions multimodals.',
    'Fer prediccions amb el model.',
    'Validar el model i les prediccions.',
  ]),
  'C1/CA2': actions('C1P', [
    'Descriure el sistema o fenomen.',
    'Identificar els nivells d’organització o d’escala.',
    'Utilitzar el model per explicar.',
    'Identificar interaccions i establir relacions.',
    'Explicar els mecanismes de canvi.',
  ]),
  'C2/CA1': actions('C2P', [
    'Identificar o formular una pregunta investigable.',
    'Formular una hipòtesi pertinent.',
    'Seleccionar i aplicar criteris de classificació.',
    'Identificar variables i controls.',
    'Expressar les dades amb pertinència.',
    'Tractar, representar i interpretar les dades.',
    'Extreure conclusions pertinents.',
  ]),
  'C2/CA2': actions('C2R', [
    'Dissenyar el procediment.',
    'Obtenir dades amb rigor.',
    'Aplicar les normes de seguretat.',
    'Comunicar el procediment.',
    'Comunicar els resultats amb rigor formal.',
  ]),
  'C3/CA1': actions('C3S', [
    'Formular un posicionament o judici.',
    'Contrastar i revisar el posicionament.',
    'Valorar beneficis, inconvenients i riscos.',
    'Integrar criteris diversos en la valoració.',
    'Adoptar i justificar mesures responsables.',
    'Justificar hàbits saludables.',
  ]),
  'C3/CA2': actions('C3C', [
    'Interpretar les dades.',
    'Avaluar la fiabilitat de les dades i les fonts.',
    'Seleccionar dades fiables i significatives.',
    'Identificar i utilitzar el model científic pertinent.',
    'Connectar dades, model i conclusió.',
    'Construir un raonament coherent.',
    'Avaluar arguments.',
    'Contraargumentar.',
  ]),
}

export function getActionCatalogScope(subject, scope = 'specific') {
  return `${canonicalizeSubjectName(subject)}::${scope}`
}

export function getCriterionActionKey(competency, criterion) {
  const competencyCode = competency.name.match(/^(?:TRANS\s+)?C\d+\b/i)?.[0].toUpperCase()
  const criterionCode = criterion.name.match(/^CA\d+\b/i)?.[0].toUpperCase()
  // Custom names have no curriculum code; their full names keep catalogues reusable across UTs.
  return `${competencyCode || competency.name}/${criterionCode || criterion.name}`
}

export function getEvaluationActionCatalog(classItem, scope = 'specific') {
  const defaults = scope !== 'transversal' && classItem?.subject === CFN_SUBJECT ? CFN_ACTION_CATALOG : {}
  return { ...defaults, ...classItem?.evaluationActionCatalogs?.[getActionCatalogScope(classItem?.subject, scope)] }
}

export function getSelectedCriterionActions(catalog, competency, criterion) {
  const selected = new Set(criterion.selectedActionIds || [])
  return (catalog[getCriterionActionKey(competency, criterion)] || []).filter(action => selected.has(action.id))
}

// Accept plain text and the Markdown bullet format used in curriculum documents.
// Uncoded actions use their text as identity so reordering a list keeps selections intact.
export function parseActionLines(text) {
  const parsed = String(text).split(/\r?\n/).map(line => line.trim()
    .replace(/^[-*•]\s+/, '').replaceAll('**', '').trim()).filter(Boolean).map(line => {
    const coded = line.match(/^([\p{L}\p{N}_-]+)\s*:\s*(.+)$/u)
    if (coded) return { id: coded[1].toUpperCase(), description: coded[2].trim() }
    if (/^[\p{L}\p{N}_-]+\s*:\s*$/u.test(line)) throw new Error('Cada codi ha de tenir una descripció.')
    return { id: `text:${line.normalize('NFC')}`, description: line }
  })
  const unique = new Map()
  for (const action of parsed) {
    if (unique.has(action.id) && unique.get(action.id).description !== action.description) {
      throw new Error(`El codi ${action.id} té dues descripcions diferents.`)
    }
    unique.set(action.id, action)
  }
  return [...unique.values()]
}

export function buildEvaluationActionsPatch(state, { classId, utId, scope = 'specific', catalog, selections }) {
  const classItem = state.classes.find(item => item.id === classId)
  if (!classItem || !state.uts.some(ut => ut.id === utId && ut.classId === classId)) {
    throw new Error('No s’ha trobat la classe o la UT.')
  }
  const competencies = new Map(selectEvaluationCompetencies(state, classItem, utId, scope)
    .filter(item => item.classId === classId).map(item => [item.id, item]))
  return {
    classes: state.classes.map(item => item.id === classId ? {
      ...item,
      evaluationActionCatalogs: {
        ...item.evaluationActionCatalogs,
        [getActionCatalogScope(item.subject, scope)]: catalog,
      },
    } : item),
    criteria: state.criteria.map(criterion => {
      const competency = competencies.get(criterion.competencyId)
      if (!competency || !Object.hasOwn(selections, criterion.id)) return criterion
      const available = new Set((catalog[getCriterionActionKey(competency, criterion)] || []).map(action => action.id))
      return { ...criterion, selectedActionIds: [...new Set(selections[criterion.id])].filter(id => available.has(id)) }
    }),
  }
}

export function getEvaluationActionCopyDestinations(state, classId) {
  return state.classes.filter(item => item.id !== classId)
    .map(item => ({ id: item.id, name: item.name, subject: item.subject }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ca', { numeric: true }))
}

// A subject catalog belongs to the class, so existing and future UTs reuse it.
// Copying the catalog must never select actions or alter marks in a destination UT.
export function buildCopyEvaluationActionsPatch(state, configuration) {
  const { classId, utId, scope = 'specific', catalog, selections, targets } = configuration
  if (!Array.isArray(targets) || !targets.length) throw new Error('Selecciona almenys una classe de destí.')
  const sourcePatch = buildEvaluationActionsPatch(state, { classId, utId, scope, catalog, selections })
  let classes = sourcePatch.classes
  const criteria = sourcePatch.criteria
  const seen = new Set()
  const report = { classes: 0 }
  for (const target of targets) {
    if (target.classId === classId || seen.has(target.classId)) throw new Error('Cada classe de destí ha de ser diferent de la classe d’origen i no es pot repetir.')
    seen.add(target.classId)
    const destination = state.classes.find(item => item.id === target.classId)
    if (!destination) throw new Error('No s’ha trobat una classe de destí.')
    const merged = { ...getEvaluationActionCatalog(destination, scope) }
    for (const [key, incoming] of Object.entries(catalog)) {
      const actions = new Map((merged[key] || []).map(action => [action.id, action]))
      for (const action of incoming) {
        const existing = actions.get(action.id)
        if (existing && existing.description !== action.description) {
          throw new Error(`${destination.name || 'La classe de destí'}: el codi ${action.id} ja té una descripció diferent. Canvia el codi abans de copiar.`)
        }
        actions.set(action.id, { ...action })
      }
      merged[key] = [...actions.values()]
    }
    classes = classes.map(item => item.id === destination.id ? {
      ...item, evaluationActionCatalogs: { ...item.evaluationActionCatalogs, [getActionCatalogScope(item.subject, scope)]: merged },
    } : item)
    report.classes++
  }
  return { patch: { classes, criteria }, report }
}
