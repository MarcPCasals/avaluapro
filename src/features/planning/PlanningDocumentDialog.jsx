import { useRef, useState } from 'react'
import { CircleHelp, ClipboardPaste, Download, FileJson, FileText, Import, Loader2, Upload } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { ContextualTab } from '../../components/ContextualHelp'
import { parsePlanningDocumentExport, parsePlanningTableText } from '../../domain/planning/documents'
import { downloadBlob } from '../../lib/downloads'
import { moveHorizontalTabFocus } from '../../lib/tabs'
import { PlanningDocumentView } from './PlanningDocumentView'

function ImportPreview({ bundle }) {
  if (!bundle) return null
  const totalMinutes = bundle.importSummary?.calculatedTotalMinutes
    ?? bundle.activities.reduce((sum, activity) => sum + (Number(activity.plannedMinutes) || 0), 0)
  const warnings = bundle.importSummary?.warnings
    || (bundle.importSummary?.warning ? [bundle.importSummary.warning] : [])
  const phaseByKey = new Map(bundle.phases.map((phase) => [phase.key, phase]))
  return (
    <section className="planning-import-preview">
      <div><span>UP detectada</span><strong>{bundle.unit.code} · {bundle.unit.title}</strong><small>{bundle.unit.level}</small></div>
      <dl>
        <div><dt>Fases</dt><dd>{bundle.phases.filter((phase) => !phase.parentKey).length}</dd></div>
        <div><dt>Subfases</dt><dd>{bundle.phases.filter((phase) => phase.parentKey).length}</dd></div>
        <div><dt>Activitats</dt><dd>{bundle.activities.length}</dd></div>
        <div><dt>Temps detectat</dt><dd>{totalMinutes} min</dd></div>
        <div><dt>Materials</dt><dd>{bundle.importSummary?.materialCount ?? 0}</dd></div>
      </dl>
      {warnings.length > 0 && <ul className="planning-import-warnings">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <details>
        <summary>Revisar les activitats detectades</summary>
        <ol>
          {bundle.activities.map((activity, index) => (
            <li key={`${activity.phaseKey}:${activity.order}:${index}`}>
              <span>{index + 1}</span>
              <div><strong>{activity.title}</strong><small>{[phaseByKey.get(activity.phaseKey)?.title, activity.plannedMinutes != null ? `${activity.plannedMinutes} min` : 'Sense temps', `${(activity.teacherMaterials?.length || 0) + (activity.studentMaterials?.length || 0)} materials`].filter(Boolean).join(' · ')}</small></div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}

export function PlanningDocumentDialog({ activities, onClose, onImportBundle, onImportTable, phases, temporalUnits, unit }) {
  const [tab, setTab] = useState(unit ? 'document' : 'import')
  const [bundle, setBundle] = useState(null)
  const [tableText, setTableText] = useState('')
  const [tablePreview, setTablePreview] = useState(null)
  const [temporalUnitId, setTemporalUnitId] = useState(unit?.temporalUnitId || temporalUnits[0]?.id || '')
  const [targetPhaseId, setTargetPhaseId] = useState(phases[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const wordInput = useRef(null)
  const jsonInput = useRef(null)

  const readWord = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { parsePlanningWordFile } = await import('./planningWord')
      const result = await parsePlanningWordFile(file)
      setBundle(result.bundle)
    } catch (operationError) {
      setBundle(null)
      setError(operationError.message || 'No s’ha pogut llegir el Word.')
    } finally {
      setBusy(false)
    }
  }
  const readJson = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setBundle(parsePlanningDocumentExport(await file.text()))
    } catch (operationError) {
      setBundle(null)
      setError(operationError.message || 'No s’ha pogut llegir el JSON.')
    } finally {
      setBusy(false)
    }
  }
  const downloadTemplate = async () => {
    setTemplateBusy(true)
    setError('')
    try {
      const { buildPlanningWordTemplateBlob } = await import('./planningWord')
      downloadBlob(await buildPlanningWordTemplateBlob(), 'plantilla-programacio-avaluapro.docx')
      setSuccess('Plantilla Word descarregada. Les fases i subfases són orientatives i es poden canviar.')
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut crear la plantilla Word.')
    } finally {
      setTemplateBusy(false)
    }
  }
  const previewTable = () => {
    try {
      setError('')
      setTablePreview(parsePlanningTableText(tableText))
    } catch (operationError) {
      setTablePreview(null)
      setError(operationError.message)
    }
  }
  const importBundle = async () => {
    if (!bundle) return
    setBusy(true)
    setError('')
    try {
      const imported = await onImportBundle(bundle, temporalUnitId)
      setSuccess(`S’ha creat ${imported.code} amb ${bundle.activities.length} activitats.${unit ? ' La UP oberta anterior no s’ha modificat.' : ''}`)
      setBundle(null)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut importar la UP.')
    } finally {
      setBusy(false)
    }
  }
  const importTable = async () => {
    if (!tablePreview) return
    setBusy(true)
    setError('')
    try {
      const result = await onImportTable(tablePreview.activities, targetPhaseId)
      if (result === false) return
      setSuccess(`S’han afegit ${result.length} activitats a la UP oberta.`)
      setTablePreview(null)
      setTableText('')
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut importar la taula.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="planning-document-dialog" size="xl" title="Document i importacions">
      <nav aria-label="Eines documentals" className="planning-document-tabs" role="tablist">
        {unit && <ContextualTab aria-selected={tab === 'document'} className={tab === 'document' ? 'active' : ''} help="Presenta tota la UP en un format continu i llegible, preparat per revisar o exportar." helpTitle="Vista documental" onClick={() => setTab('document')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'document' ? 0 : -1} type="button"><FileText size={16} />Vista documental</ContextualTab>}
        <ContextualTab aria-selected={tab === 'import'} className={tab === 'import' ? 'active' : ''} help="Crea una UP nova a partir d’un document Word o d’una còpia JSON. No substitueix cap unitat existent." helpTitle="Importar una UP" onClick={() => setTab('import')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'import' ? 0 : -1} type="button"><Import size={16} />Importar una UP</ContextualTab>
        {unit && <ContextualTab aria-selected={tab === 'table'} className={tab === 'table' ? 'active' : ''} help="Afegeix activitats a la UP oberta enganxant una taula copiada d’Excel o Numbers i revisant-ne abans la previsualització." helpTitle="Enganxar una taula" onClick={() => setTab('table')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'table' ? 0 : -1} type="button"><ClipboardPaste size={16} />Enganxar taula</ContextualTab>}
      </nav>
      {tab === 'document' && unit && <div role="tabpanel"><PlanningDocumentView activities={activities} phases={phases} unit={unit} /></div>}
      {tab === 'import' && (
        <section className="planning-import-panel" role="tabpanel">
          <header><Upload size={20} /><div><strong>Crear una còpia nova des d’un fitxer</strong><p>El fitxer es llegeix dins del navegador. No se substitueix cap UP existent.</p></div></header>
          <div className="planning-import-source-actions">
            <button className="secondary-action" disabled={busy} onClick={() => wordInput.current?.click()} type="button"><FileText size={17} />Seleccionar Word</button>
            <button className="secondary-action" disabled={busy} onClick={() => jsonInput.current?.click()} type="button"><FileJson size={17} />Seleccionar JSON</button>
            <button className="secondary-action" disabled={templateBusy} onClick={downloadTemplate} type="button">{templateBusy ? <Loader2 className="spin" size={17} /> : <Download size={17} />}Descarregar plantilla Word</button>
            <input accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => readWord(event.target.files?.[0])} ref={wordInput} type="file" />
            <input accept=".json,application/json" hidden onChange={(event) => readJson(event.target.files?.[0])} ref={jsonInput} type="file" />
          </div>
          <details className="planning-import-guide" open>
            <summary><CircleHelp size={16} />Com preparar el Word</summary>
            <div>
              <p>La plantilla és recomanada, però el lector també accepta versions antigues amb una columna de Recursos.</p>
              <ul>
                <li>Posa cada activitat en una fila i identifica-la amb un número únic.</li>
                <li>Conserva les capçaleres Núm., Subfase, Descriptiu activitat, Temps, Material i Agrupament.</li>
                <li>Escriu la durada com 20, 20 min o 20’. Evita indicar-hi el nombre de sessions.</li>
                <li>Pots afegir, canviar o eliminar fases i subfases. Escriu el nom de cada fase damunt de la seva taula.</li>
                <li>Abans d’importar, revisa el recompte d’activitats, els minuts i els avisos de la previsualització.</li>
              </ul>
            </div>
          </details>
          {busy && <p className="planning-import-loading"><Loader2 className="spin" size={17} />Llegint el fitxer…</p>}
          <ImportPreview bundle={bundle} />
          {bundle && <div className="planning-import-confirm"><label>Unitat temporal<select value={temporalUnitId} onChange={(event) => setTemporalUnitId(event.target.value)}>{temporalUnits.map((temporalUnit) => <option key={temporalUnit.id} value={temporalUnit.id}>{temporalUnit.label}</option>)}</select></label><button className="primary-action" disabled={busy || !temporalUnitId} onClick={importBundle} type="button">Crear la còpia importada</button></div>}
        </section>
      )}
      {tab === 'table' && unit && onImportTable && (
        <section className="planning-import-panel" role="tabpanel">
          <header><ClipboardPaste size={20} /><div><strong>Enganxar des d’Excel o Numbers</strong><p>La primera fila ha de contenir capçaleres. Es reconeixen Activitat, Fase, Subfase, Minuts, Materials, Agrupament, Espai, IA, Diversitat i Comentaris.</p></div></header>
          <textarea onChange={(event) => { setTableText(event.target.value); setTablePreview(null) }} placeholder={'Fase\tSubfase\tActivitat\tMinuts\tMaterials\tAgrupament\tEspai\tIA'} rows="8" value={tableText} />
          <div className="planning-import-table-actions"><label>Fase si la taula no la reconeix<select value={targetPhaseId} onChange={(event) => setTargetPhaseId(event.target.value)}>{phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></label><button className="secondary-action" disabled={!tableText.trim()} onClick={previewTable} type="button">Previsualitzar</button></div>
          {tablePreview && <section className="planning-table-preview"><strong>{tablePreview.activities.length} activitats detectades</strong>{tablePreview.activities.slice(0, 6).map((activity, index) => <div key={`${activity.title}-${index}`}><span>{index + 1}</span><b>{activity.title}</b><small>{activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'}{activity.phaseLabel ? ` · ${activity.phaseLabel}` : ''}</small></div>)}{tablePreview.activities.length > 6 && <p>i {tablePreview.activities.length - 6} activitats més</p>}<button className="primary-action" disabled={busy || !targetPhaseId} onClick={importTable} type="button">Afegir-les a la UP oberta</button></section>}
        </section>
      )}
      {error && <p className="planning-inline-error" role="alert">{error}</p>}
      {success && <p aria-live="polite" className="planning-import-success" role="status">{success}</p>}
    </Modal>
  )
}
