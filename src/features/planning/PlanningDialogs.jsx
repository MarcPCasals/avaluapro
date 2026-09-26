import { useEffect, useMemo, useRef, useState } from 'react'
import { Bold, Clock3, Copy, History, Italic, Link2, Loader2, Plus, Search, Trash2, Users } from 'lucide-react'
import { FormattedText } from '../../components/FormattedText'
import { Modal } from '../../components/Modal'
import { PEDAGOGICAL_TYPE_LABELS } from '../../domain/planning/documents'
import { stripInlineFormatting } from '../../lib/formattedText'
import { PlanningDiversityEditor } from './PlanningDiversityEditor'

function AutoGrowTextarea({ className = '', textareaRef: externalRef, value, ...props }) {
  const textareaRef = useRef(null)
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const nextHeight = Math.max(140, Math.min(textarea.scrollHeight, 440))
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > 440 ? 'auto' : 'hidden'
  }, [value])
  const setTextareaRef = (node) => {
    textareaRef.current = node
    if (externalRef) externalRef.current = node
  }
  return <textarea {...props} className={`planning-autogrow-textarea ${className}`.trim()} ref={setTextareaRef} value={value} />
}

function FormattedTextarea({ onChange, value }) {
  const textareaRef = useRef(null)
  const applyFormat = (marker) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const insertion = `${marker}${selected}${marker}`
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`)
    globalThis.requestAnimationFrame?.(() => {
      textarea.focus()
      const selectionStart = start + marker.length
      textarea.setSelectionRange(selectionStart, selectionStart + selected.length)
    })
  }
  return (
    <div className="planning-format-editor">
      <div aria-label="Format de la descripció" className="planning-format-toolbar" role="toolbar">
        <button aria-label="Posar la selecció en negreta" onClick={() => applyFormat('**')} onMouseDown={(event) => event.preventDefault()} title="Negreta" type="button"><Bold size={15} /></button>
        <button aria-label="Posar la selecció en cursiva" onClick={() => applyFormat('*')} onMouseDown={(event) => event.preventDefault()} title="Cursiva" type="button"><Italic size={15} /></button>
        <span>Selecciona unes paraules i aplica-hi el format.</span>
      </div>
      <AutoGrowTextarea onChange={(event) => onChange(event.target.value)} rows="6" textareaRef={textareaRef} value={value} />
      {value && <div className="planning-format-preview"><small>Vista prèvia</small><FormattedText as="p" text={value} /></div>}
    </div>
  )
}

function DialogActions({ busy, onClose, submitLabel }) {
  return (
    <div className="modal-actions">
      <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
      <button className="primary-action" disabled={busy} form="planning-dialog-form" type="submit">
        {busy && <Loader2 className="spin" size={17} />}
        {submitLabel}
      </button>
    </div>
  )
}

function PlanningDialog({ children, error, onClose, onSubmit, size = 'md', submitLabel, title }) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setLocalError('')
    try {
      const result = await onSubmit()
      if (result === false) return
      onClose()
    } catch (submitError) {
      setLocalError(submitError.message || 'No s’ha pogut desar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="planning-dialog" size={size} title={title}>
      <form className="planning-dialog-form" id="planning-dialog-form" onSubmit={handleSubmit}>
        {children}
        {(localError || error) && <p className="planning-inline-error" role="alert">{localError || error}</p>}
      </form>
      <DialogActions busy={busy} onClose={onClose} submitLabel={submitLabel} />
    </Modal>
  )
}

export function AcademicYearDialog({ onClose, onSave }) {
  const today = new Date()
  const currentYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1
  const [values, setValues] = useState({
    endsOn: `${currentYear + 1}-06-30`,
    label: `${currentYear}-${currentYear + 1}`,
    startsOn: `${currentYear}-09-01`,
  })
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel="Crear curs" title="Nou curs acadèmic">
      <label>Nom del curs<input autoFocus required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} /></label>
      <div className="planning-form-row">
        <label>Comença<input required type="date" value={values.startsOn} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} /></label>
        <label>Acaba<input required type="date" value={values.endsOn} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} /></label>
      </div>
    </PlanningDialog>
  )
}

export function TemporalUnitDialog({ initialValue, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    endsOn: initialValue?.endsOn || '',
    label: initialValue?.label || '',
    startsOn: initialValue?.startsOn || '',
  }))
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel={initialValue ? 'Desar canvis' : 'Crear UT'} title={initialValue ? 'Editar UT' : 'Nova unitat temporal'}>
      <label>Nom de la UT<input autoFocus placeholder="Per exemple, UT1" required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} /></label>
      <div className="planning-form-row">
        <label>Comença<input required type="date" value={values.startsOn} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} /></label>
        <label>Acaba<input required type="date" value={values.endsOn} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} /></label>
      </div>
    </PlanningDialog>
  )
}

export function PlanningUnitDialog({ onClose, onSave, temporalUnits }) {
  const [values, setValues] = useState({ code: '', level: '', temporalUnitId: temporalUnits[0]?.id || '', title: '' })
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel="Crear UP" title="Nova unitat de programació">
      <div className="planning-form-row compact">
        <label>Codi<input autoFocus placeholder="UP 1" required value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} /></label>
        <label>Nivell<input placeholder="1r d’ESO" required value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value })} /></label>
      </div>
      <label>Títol<input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Unitat temporal<select required value={values.temporalUnitId} onChange={(event) => setValues({ ...values, temporalUnitId: event.target.value })}>
        {temporalUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
      </select></label>
    </PlanningDialog>
  )
}

export function PlanningConnectionDialog({ applications = [], classes = [], currentClass, onClose, onSave, units = [] }) {
  const [planningUnitId, setPlanningUnitId] = useState(units[0]?.id || '')
  const classNames = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes])
  const sourceLabels = (unit) => [...new Set(applications
    .filter((application) => application.planningUnitId === unit.id && application.status !== 'archived')
    .map((application) => application.classLabel || classNames.get(application.classId))
    .filter(Boolean))]
  const selectedUnit = units.find((unit) => unit.id === planningUnitId)

  return (
    <PlanningDialog
      onClose={onClose}
      onSubmit={() => onSave(selectedUnit)}
      size="lg"
      submitLabel={`Connectar amb ${currentClass?.name || 'la classe'}`}
      title="Connectar una programació existent"
    >
      <div className="planning-copy-intro">
        <Link2 size={20} />
        <p>Les classes connectades comparteixen la mateixa UP, però cadascuna conserva el seu calendari, les seves sessions i el seu seguiment.</p>
      </div>
      {units.length === 0 ? (
        <p className="planning-empty-inline">No hi ha cap altra programació disponible en aquest curs. Pots crear-ne una de zero per a {currentClass?.name || 'aquesta classe'}.</p>
      ) : (
        <div className="planning-connection-list" role="radiogroup" aria-label="Programacions disponibles">
          {units.map((unit) => {
            const sources = sourceLabels(unit)
            const selected = planningUnitId === unit.id
            return (
              <button
                aria-checked={selected}
                className={selected ? 'selected' : ''}
                key={unit.id}
                onClick={() => setPlanningUnitId(unit.id)}
                role="radio"
                type="button"
              >
                <span>{unit.code}</span>
                <div>
                  <strong>{unit.title}</strong>
                  <small>{unit.level} · {sources.length ? `Connectada amb ${sources.join(', ')}` : 'Encara sense classe'}</small>
                </div>
                <Users size={17} />
              </button>
            )
          })}
        </div>
      )}
    </PlanningDialog>
  )
}

export function PhaseDialog({ initialValue, onClose, onSave, parentPhaseId = '' }) {
  const [values, setValues] = useState(() => ({
    kind: initialValue?.kind || 'custom',
    parentPhaseId: initialValue?.parentPhaseId || parentPhaseId,
    title: initialValue?.title || '',
  }))
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values, initialValue)} submitLabel="Desar fase" title={initialValue ? 'Editar fase' : parentPhaseId ? 'Nova subfase' : 'Nova fase'}>
      <label>Nom<input autoFocus required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Tipus<select value={values.kind} onChange={(event) => setValues({ ...values, kind: event.target.value })}>
        <option value="preparation">Preparació</option>
        <option value="resolution">Resolució</option>
        <option value="closing">Tancament</option>
        <option value="custom">Personalitzada</option>
      </select></label>
    </PlanningDialog>
  )
}

function materialDrafts(initialValue) {
  const teacher = (initialValue?.teacherMaterials || []).map((material) => ({ ...material, audience: 'teacher' }))
  const students = (initialValue?.studentMaterials || []).map((material) => ({ ...material, audience: 'students' }))
  return [...teacher, ...students]
}

export function ActivityDialog({ availableIndicators = [], classes = [], initialPhaseId = '', initialValue, onClose, onSave, phases, students = [] }) {
  const [values, setValues] = useState(() => ({
    description: initialValue?.description || '',
    evidenceMode: initialValue?.evidenceMode || 'none',
    grouping: initialValue?.grouping || '',
    hasTiming: initialValue?.plannedMinutes !== null && initialValue?.plannedMinutes !== undefined,
    pedagogicalType: initialValue?.pedagogicalType || 'custom',
    phaseId: initialValue?.phaseId || initialPhaseId || phases[0]?.id || '',
    plannedMinutes: initialValue?.plannedMinutes || '',
    space: initialValue?.space || '',
    title: initialValue?.title || '',
    type: initialValue?.type || 'activity',
  }))
  const [materials, setMaterials] = useState(() => materialDrafts(initialValue))
  const [indicatorIds, setIndicatorIds] = useState(() => initialValue?.indicatorIds || [])
  const [diversityMeasures, setDiversityMeasures] = useState(() => initialValue?.diversityMeasures || [])
  const updateMaterial = (index, field, value) => setMaterials((items) => items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: value } : item
  )))
  const addMaterial = () => setMaterials((items) => [...items, {
    audience: 'teacher',
    id: globalThis.crypto?.randomUUID?.() || `material-${Date.now()}`,
    kind: 'link',
    label: '',
    preparationKind: 'reference',
    reminderDaysBefore: 1,
    url: '',
  }])
  const save = () => {
    const normalizedMaterials = materials.map((material) => ({
      id: material.id,
      kind: material.kind,
      label: material.label,
      preparationKind: material.preparationKind || 'reference',
      reminderDaysBefore: Number(material.reminderDaysBefore ?? 1),
      url: material.kind === 'link' ? material.url : '',
    }))
    return onSave({
      ...values,
      evidenceMode: values.type === 'activity' ? values.evidenceMode : 'none',
      plannedMinutes: values.hasTiming ? Number(values.plannedMinutes) : null,
      indicatorIds,
      diversityMeasureIds: diversityMeasures.map((measure) => measure.id),
      diversityMeasures,
      studentMaterials: normalizedMaterials.filter((_, index) => materials[index].audience === 'students'),
      teacherMaterials: normalizedMaterials.filter((_, index) => materials[index].audience === 'teacher'),
    }, initialValue)
  }

  return (
    <PlanningDialog onClose={onClose} onSubmit={save} size="lg" submitLabel={initialValue ? 'Desar element' : 'Afegir a la seqüència'} title={initialValue ? 'Editar element' : 'Nou element de la seqüència'}>
      <div className="planning-form-row">
        <label>Tipus<select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}>
          <option value="activity">Activitat</option>
          <option value="indication">Indicació</option>
          <option value="transition">Pausa o transició</option>
        </select></label>
        <label>Fase<select required value={values.phaseId} onChange={(event) => setValues({ ...values, phaseId: event.target.value })}>
          {phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}
        </select></label>
      </div>
      {values.type === 'activity' && (
        <label>Moment pedagògic<select value={values.pedagogicalType} onChange={(event) => setValues({ ...values, pedagogicalType: event.target.value })}>
          {Object.entries(PEDAGOGICAL_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select><small className="planning-field-help">Aquest tipus reservarà la icona oficial corresponent quan ens facilitis les imatges originals.</small></label>
      )}
      <label>Títol<input autoFocus required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Descripció<FormattedTextarea value={values.description} onChange={(description) => setValues({ ...values, description })} /></label>
      <div className="planning-timing-fields">
        <label className="planning-check-label"><input checked={values.hasTiming} onChange={(event) => setValues({ ...values, hasTiming: event.target.checked })} type="checkbox" />Té temporització</label>
        {values.hasTiming && <label>Minuts previstos<input min="1" required type="number" value={values.plannedMinutes} onChange={(event) => setValues({ ...values, plannedMinutes: event.target.value })} /></label>}
      </div>
      <div className="planning-form-row">
        <label>Agrupament<input placeholder="Individual, parelles, grups…" value={values.grouping} onChange={(event) => setValues({ ...values, grouping: event.target.value })} /></label>
        <label>Espai<input placeholder="Aula, laboratori…" value={values.space} onChange={(event) => setValues({ ...values, space: event.target.value })} /></label>
      </div>
      {values.type === 'activity' && <label>Seguiment de la tasca<select value={values.evidenceMode} onChange={(event) => setValues({ ...values, evidenceMode: event.target.value })}>
        <option value="none">No cal registrar entrega</option>
        <option value="final">Comprovar al final de l’activitat</option>
        <option value="perSession">Comprovar a cada sessió</option>
      </select></label>}
      {values.type === 'activity' && availableIndicators.length > 0 && (
        <fieldset className="planning-indicator-picker">
          <legend>Indicadors associats</legend>
          <div>{availableIndicators.map((indicator) => (
            <label key={indicator.id}><input checked={indicatorIds.includes(indicator.id)} onChange={(event) => setIndicatorIds((current) => event.target.checked ? [...current, indicator.id] : current.filter((id) => id !== indicator.id))} type="checkbox" />{indicator.label}</label>
          ))}</div>
        </fieldset>
      )}
      {values.type === 'activity' && (
        <PlanningDiversityEditor classes={classes} measures={diversityMeasures} onChange={setDiversityMeasures} students={students} />
      )}
      <section className="planning-material-editor">
        <div><div><strong>Materials</strong><span>Enllaços externs o referències físiques.</span></div><button className="secondary-action compact" onClick={addMaterial} type="button"><Plus size={15} />Afegir</button></div>
        {materials.map((material, index) => (
          <div className="planning-material-row" key={material.id || index}>
            <select aria-label="Destinatari del material" value={material.audience} onChange={(event) => updateMaterial(index, 'audience', event.target.value)}>
              <option value="teacher">Docent</option><option value="students">Alumnat</option>
            </select>
            <select aria-label="Tipus de material" value={material.kind} onChange={(event) => updateMaterial(index, 'kind', event.target.value)}>
              <option value="link">Enllaç</option><option value="physical">Material físic</option>
            </select>
            <select aria-label="Funció del material" value={material.preparationKind || 'reference'} onChange={(event) => updateMaterial(index, 'preparationKind', event.target.value)}>
              <option value="reference">Consulta</option><option value="student">L’ha de portar l’alumnat</option><option value="teacher">Preparar</option><option value="print">Imprimir</option><option value="buy">Comprar</option><option value="reserve">Reservar espai</option>
            </select>
            <input aria-label="Nom del material" placeholder="Nom" required value={material.label} onChange={(event) => updateMaterial(index, 'label', event.target.value)} />
            {material.kind === 'link' && <input aria-label="Enllaç del material" placeholder="https://…" required type="url" value={material.url || ''} onChange={(event) => updateMaterial(index, 'url', event.target.value)} />}
            {(material.preparationKind || 'reference') !== 'reference' && <label className="planning-material-reminder">Avisar<input aria-label="Dies d’antelació" min="0" onChange={(event) => updateMaterial(index, 'reminderDaysBefore', event.target.value)} type="number" value={material.reminderDaysBefore ?? 1} /><span>dies abans</span></label>}
            <button aria-label="Eliminar material" className="icon-action" onClick={() => setMaterials((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 size={15} /></button>
          </div>
        ))}
      </section>
    </PlanningDialog>
  )
}

export function AnnualCopyDialog({ academicYears, loadTemporalUnits, onClose, onSave, sourceYearId }) {
  const targetYears = academicYears.filter((year) => year.id !== sourceYearId)
  const [academicYearId, setAcademicYearId] = useState(targetYears[0]?.id || '')
  const [temporalUnits, setTemporalUnits] = useState([])
  const [temporalUnitId, setTemporalUnitId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!academicYearId) {
      return undefined
    }
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setLoadError('')
    })
    loadTemporalUnits(academicYearId)
      .then((items) => {
        if (cancelled) return
        setTemporalUnits(items)
        setTemporalUnitId(items[0]?.id || '')
      })
      .catch((error) => !cancelled && setLoadError(error.message || 'No s’han pogut carregar les UT.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [academicYearId, loadTemporalUnits])

  const save = () => {
    if (!academicYearId) throw new Error('Primer crea el curs de destinació des de Programació.')
    if (!temporalUnitId) throw new Error('El curs de destinació necessita almenys una UT.')
    return onSave({ academicYearId, temporalUnitId })
  }

  return (
    <PlanningDialog error={loadError} onClose={onClose} onSubmit={save} submitLabel="Crear la còpia" title="Duplicar la UP per a un altre curs">
      <div className="planning-copy-intro"><Copy size={20} /><p>Es copiaran la UP, les fases i totes les activitats. La versió actual quedarà intacta i els permisos no es traslladaran.</p></div>
      {targetYears.length === 0 ? (
        <p className="planning-empty-inline">Encara no hi ha cap altre curs. Tanca aquest diàleg, crea’l amb «Nou curs» i defineix-hi almenys una UT.</p>
      ) : (
        <>
          <label>Curs de destinació<select autoFocus value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
            {targetYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
          </select></label>
          <label>Unitat temporal<select disabled={loading || temporalUnits.length === 0} value={temporalUnitId} onChange={(event) => setTemporalUnitId(event.target.value)}>
            {loading && <option value="">Carregant…</option>}
            {!loading && temporalUnits.length === 0 && <option value="">Aquest curs encara no té cap UT</option>}
            {temporalUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
          </select></label>
        </>
      )}
    </PlanningDialog>
  )
}

export function ActivityHistoryDialog({ loadStructure, loadUnits, onClose, onSave, phases }) {
  const [units, setUnits] = useState([])
  const [sourceUnitId, setSourceUnitId] = useState('')
  const [structure, setStructure] = useState({ activities: [], phases: [], planningUnit: null })
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [phaseId, setPhaseId] = useState(phases[0]?.id || '')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => !cancelled && setLoading(true))
    loadUnits()
      .then((items) => {
        if (cancelled) return
        setUnits(items)
        setSourceUnitId(items[0]?.id || '')
      })
      .catch((error) => !cancelled && setLoadError(error.message || 'No s’ha pogut carregar l’històric.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [loadUnits])

  useEffect(() => {
    let cancelled = false
    if (!sourceUnitId) {
      return undefined
    }
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setSelectedActivityId('')
    })
    loadStructure(sourceUnitId)
      .then((value) => !cancelled && setStructure(value))
      .catch((error) => !cancelled && setLoadError(error.message || 'No s’ha pogut obrir aquesta UP.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [loadStructure, sourceUnitId])

  const numberedActivities = useMemo(() => {
    const phaseOrder = new Map((structure.phases || []).map((phase, index) => [phase.id, index]))
    return [...(structure.activities || [])]
      .sort((left, right) => (phaseOrder.get(left.phaseId) ?? 999) - (phaseOrder.get(right.phaseId) ?? 999) || Number(left.order) - Number(right.order))
      .map((activity, index) => ({ ...activity, sequenceNumber: index + 1 }))
  }, [structure.activities, structure.phases])
  const visibleActivities = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ca')
    return numberedActivities.filter((activity) => !needle ||
      `a${activity.sequenceNumber} ${activity.title} ${activity.description || ''}`.toLocaleLowerCase('ca').includes(needle))
  }, [numberedActivities, search])
  const selectedActivity = structure.activities.find((activity) => activity.id === selectedActivityId)
  const save = () => {
    if (!selectedActivity) throw new Error('Selecciona l’activitat que vols recuperar.')
    if (!phaseId) throw new Error('Selecciona la fase de destinació.')
    return onSave({
      activity: selectedActivity,
      phaseId,
      sourceAcademicYearId: structure.planningUnit?.academicYearId,
    })
  }

  return (
    <PlanningDialog error={loadError} onClose={onClose} onSubmit={save} size="lg" submitLabel="Copiar l’activitat" title="Recuperar una activitat antiga">
      <div className="planning-copy-intro"><History size={20} /><p>L’històric es carrega només en obrir aquest espai. La còpia conservarà contingut, temps, materials, indicadors i mesures.</p></div>
      {units.length === 0 && !loading ? <p className="planning-empty-inline">No hi ha UP de cursos anteriors.</p> : (
        <>
          <div className="planning-form-row">
            <label>Programació d’origen<select value={sourceUnitId} onChange={(event) => setSourceUnitId(event.target.value)}>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.academicYearLabel} · {unit.code} · {unit.title}</option>)}
            </select></label>
            <label>Fase de destinació<select value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
              {phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}
            </select></label>
          </div>
          <label className="planning-history-search"><Search size={15} /><input placeholder="Cerca pel títol o la descripció" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="planning-history-results">
            {loading ? <p><Loader2 className="spin" size={17} />Carregant activitats…</p> : visibleActivities.length === 0 ? <p>No s’ha trobat cap activitat.</p> : visibleActivities.map((activity) => (
              <button className={selectedActivityId === activity.id ? 'selected' : ''} key={activity.id} onClick={() => setSelectedActivityId(activity.id)} type="button">
                <span><b>A{activity.sequenceNumber}</b>{activity.title}</span>
                <small>{stripInlineFormatting(activity.description) || 'Sense descripció'}</small>
                <em><Clock3 size={13} />{activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'}</em>
              </button>
            ))}
          </div>
        </>
      )}
    </PlanningDialog>
  )
}
