import fs from 'node:fs'
import path from 'node:path'

const INPUT = process.argv[2]
const OUTPUT =
  process.argv[3] ||
  path.join(path.dirname(INPUT || '.'), `avaluapro-v2-from-v1-${new Date().toISOString().slice(0, 10)}.json`)

const COLLECTIONS = [
  'classes',
  'students',
  'semesters',
  'uts',
  'competencies',
  'criteria',
  'indicators',
  'marks',
  'tasks',
  'taskRecords',
  'behaviorEvents',
  'agendaNotes',
  'seatingCharts',
]

const PAIR_GRADE_MATRIX = {
  A: { A: 'A', B: 'A', C: 'B', D: 'C', NA: 'C' },
  B: { A: 'A', B: 'B', C: 'B', D: 'C', NA: 'C' },
  C: { A: 'B', B: 'B', C: 'C', D: 'D', NA: 'D' },
  D: { A: 'C', B: 'C', C: 'D', D: 'D', NA: 'D' },
  NA: { A: 'C', B: 'C', C: 'D', D: 'D', NA: 'D' },
}

const DIAGNOSIS_MAP = {
  dislexia: 'dyslexia',
  discalculia: 'dyslexia',
  tdah: 'tdah',
  tea: 'tea',
  ta: 'tea',
  qi_tel: 'qi-tdl',
  qi_tdl: 'qi-tdl',
  progres: 'progress',
}

function usage() {
  console.error('Ús: node scripts/convert-v1-backup.mjs <backup-v1.json> [sortida-v2.json]')
  process.exit(1)
}

function makeId(...parts) {
  return parts
    .filter(Boolean)
    .join('_')
    .replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

function normalizeGrade(value) {
  const grade = String(value || '').trim().toUpperCase()
  return ['A', 'B', 'C', 'D', 'NA'].includes(grade) ? grade : ''
}

function combineTwoGrades(firstGrade, secondGrade) {
  if (!firstGrade) return secondGrade || ''
  if (!secondGrade) return firstGrade || ''
  return PAIR_GRADE_MATRIX[firstGrade]?.[secondGrade] || ''
}

function calculateGrade(grades) {
  return grades.map(normalizeGrade).filter(Boolean).reduce((current, next) => combineTwoGrades(current, next), '')
}

function calculateV1IndicatorGrade(grades) {
  const numeric = { A: 4, B: 3, C: 2, D: 1, NA: 1 }
  const scores = grades
    .map(normalizeGrade)
    .filter(Boolean)
    .map((grade) => numeric[grade])
    .filter(Boolean)

  if (scores.length === 0) return ''
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  if (average >= 3.5) return 'A'
  if (average >= 2.5) return 'B'
  if (average >= 1.5) return 'C'
  return 'D'
}

function splitNoteEntries(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function inferSubject(className) {
  if (/^pi\b|projecte/i.test(className)) return 'Projecte Integrador'
  return 'Ciències Físiques i de la Natura'
}

function getHalfGroupName(classItem, halfGroupId) {
  if (!halfGroupId) return ''
  return classItem.halfGroups?.find((halfGroup) => halfGroup.id === halfGroupId)?.name || halfGroupId
}

function convertBackup(v1Classes) {
  const dataset = COLLECTIONS.reduce((collections, collection) => ({ ...collections, [collection]: [] }), {})
  let markIndex = 1
  let noteIndex = 1
  let indicatorIndex = 1

  v1Classes.forEach((classItem, classIndex) => {
    const classId = makeId('v1class', classItem.id || classIndex)
    dataset.classes.push({
      id: classId,
      name: classItem.name || `Classe ${classIndex + 1}`,
      color: classItem.color || 'blue',
      order: classItem.orderIndex ?? classIndex + 1,
      subject: inferSubject(classItem.name || ''),
      utModelReady: true,
    })

    if (classItem.seatingChartMain) {
      dataset.seatingCharts.push({
        id: makeId('seat', classId, 'all'),
        classId,
        halfGroup: 'all',
        title: 'Grup sencer',
        imageData: classItem.seatingChartMain,
        updatedAt: new Date().toISOString(),
      })
    }

    classItem.halfGroups?.forEach((halfGroup) => {
      if (!halfGroup.image) return
      dataset.seatingCharts.push({
        id: makeId('seat', classId, halfGroup.id),
        classId,
        halfGroup: halfGroup.name || halfGroup.id,
        title: `Mig grup: ${halfGroup.name || halfGroup.id}`,
        imageData: halfGroup.image,
        updatedAt: new Date().toISOString(),
      })
    })

    classItem.semesters?.forEach((semester, semesterIndex) => {
      const semesterId = makeId('v1sem', classItem.id, semester.id || semesterIndex)
      dataset.semesters.push({
        id: semesterId,
        classId,
        name: semester.name || `${semesterIndex + 1}r Semestre`,
        order: semesterIndex + 1,
      })

      semester.uts?.forEach((ut, utIndex) => {
        const utId = makeId('v1ut', classItem.id, semester.id, ut.id || utIndex)
        dataset.uts.push({
          id: utId,
          classId,
          semesterId,
          name: ut.name || `UT${utIndex + 1}`,
          order: utIndex + 1,
        })

        ut.competencies?.forEach((competency, competencyIndex) => {
          const competencyId = makeId('v1comp', classItem.id, semester.id, ut.id, competency.id || competencyIndex)
          dataset.competencies.push({
            id: competencyId,
            classId,
            utId,
            name: competency.name || `Competència ${competencyIndex + 1}`,
            color: competency.color || ['orange', 'green', 'purple', 'blue'][competencyIndex % 4],
            order: competencyIndex + 1,
            source: 'V1',
          })

          competency.criteria?.forEach((criterion, criterionIndex) => {
            const criterionId = makeId('v1crit', classItem.id, semester.id, ut.id, criterion.id || criterionIndex)
            dataset.criteria.push({
              id: criterionId,
              competencyId,
              name: criterion.name || `Criteri ${criterionIndex + 1}`,
              order: criterionIndex + 1,
              rubric: { A: '', B: '', C: '', D: '' },
            })

            criterion.indicators?.forEach((indicator, order) => {
              dataset.indicators.push({
                id: makeId('v1ind', criterionId, indicator.id || indicatorIndex++),
                criterionId,
                name: indicator.name || `Indicador ${order + 1}`,
                description: indicator.description || '',
                order: order + 1,
              })
            })
          })
        })
      })
    })

    classItem.students?.forEach((student, studentIndex) => {
      const studentId = makeId('v1student', student.id || studentIndex)
      const notes = student.notes || {}
      const personalBits = [notes.personal, notes.link ? `Enllaç personal: ${notes.link}` : '', notes.profileComment]
        .map((item) => String(item || '').trim())
        .filter(Boolean)

      dataset.students.push({
        id: studentId,
        classId,
        name: student.name || `Alumne ${studentIndex + 1}`,
        halfGroup: getHalfGroupName(classItem, student.halfGroup),
        photoUrl: notes.photo || '',
        personalNotes: personalBits.join('\n\n'),
        diagnosisNotes: notes.diagnosticText || '',
        diagnoses: [...new Set((notes.diagnostics || []).map((item) => DIAGNOSIS_MAP[item] || item).filter(Boolean))],
      })

      splitNoteEntries(notes.equips).forEach((text) => {
        dataset.agendaNotes.push({
          id: makeId('v1note', noteIndex++),
          classId,
          studentId,
          type: 'team',
          text,
          date: new Date().toISOString().slice(0, 10),
        })
      })

      splitNoteEntries(notes.tutoria).forEach((text) => {
        dataset.agendaNotes.push({
          id: makeId('v1note', noteIndex++),
          classId,
          studentId,
          type: 'tutoring',
          text,
          date: new Date().toISOString().slice(0, 10),
        })
      })

      classItem.semesters?.forEach((semester) => {
        semester.uts?.forEach((ut) => {
          ut.competencies?.forEach((competency) => {
            competency.criteria?.forEach((criterion) => {
              const criterionId = makeId('v1crit', classItem.id, semester.id, ut.id, criterion.id)
              const directGrade = normalizeGrade(student.marks?.[criterion.id])
              const indicatorGrades = (criterion.indicators || []).map((indicator) => student.marks?.[indicator.id])
              const calculatedGrade = directGrade || calculateV1IndicatorGrade(indicatorGrades)
              if (!calculatedGrade) return

              dataset.marks.push({
                id: makeId('v1mark', markIndex++),
                studentId,
                criterionId,
                value: calculatedGrade,
              })
            })
          })
        })
      })
    })
  })

  return {
    app: 'avaluapro-v2',
    version: 2,
    exportedAt: new Date().toISOString(),
    profile: { defaultSubject: 'Ciències Físiques i de la Natura' },
    preferences: {},
    collections: dataset,
  }
}

if (!INPUT) usage()

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
if (!Array.isArray(raw)) {
  throw new Error('Aquest conversor espera un backup V1 en format array de classes.')
}

const converted = convertBackup(raw)
fs.writeFileSync(OUTPUT, JSON.stringify(converted, null, 2))

const summary = Object.fromEntries(
  COLLECTIONS.map((collection) => [collection, converted.collections[collection].length]),
)
console.log(JSON.stringify({ output: OUTPUT, summary }, null, 2))
