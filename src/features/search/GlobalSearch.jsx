import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { loadPlanningSearchEntities } from '../../data/local/planningIndexedDb'
import { buildSearchIndex } from './globalSearch.js'
import { navigateToSearchTarget, validateSearchTarget } from './searchNavigation.js'
import { SearchDialog } from './SearchDialog'
import './globalSearch.css'

export function GlobalSearch({ onTopAction }) {
  const state = useAvaluaproStore()
  const uid = state.cloud.user?.uid || ''
  const [open, setOpen] = useState(false)
  const [planning, setPlanning] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailBusy, setDetailBusy] = useState(false)
  useEffect(() => {
    const keyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !document.querySelector('[aria-modal="true"]')) {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', keyDown)
    return () => document.removeEventListener('keydown', keyDown)
  }, [])
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setNotice('')
    setPlanning([])
    loadPlanningSearchEntities(uid).then(rows => { if (!cancelled) setPlanning(rows) })
      .catch(() => { if (!cancelled) setNotice('No s’ha pogut consultar la programació local. La resta de la cerca continua disponible.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, uid])
  const { classes, students, tutorialRecords, tasks, taskRecords, agendaNotes, behaviorEvents, competencies, criteria } = state
  const index = useMemo(() => open ? buildSearchIndex({ classes, students, tutorialRecords, tasks, taskRecords, agendaNotes, behaviorEvents, competencies, criteria }, planning) : [],
    [open, classes, students, tutorialRecords, tasks, taskRecords, agendaNotes, behaviorEvents, competencies, criteria, planning])
  const select = async (entry) => {
    const current = useAvaluaproStore.getState()
    if ((current.cloud.user?.uid || '') !== uid) throw new Error('El compte ha canviat. Torna a obrir la cerca.')
    if (entry.source && entry.source.collection !== 'planning' && !current[entry.source.collection]?.some(item => item.id === entry.source.id)) {
      throw new Error('Aquest contingut ja no està disponible. Torna a cercar.')
    }
    validateSearchTarget(current, entry.target)
    if (entry.target.topAction) {
      if (entry.target.classId && current.ui.activeClassId !== entry.target.classId) await current.setActiveClass(entry.target.classId)
      setOpen(false)
      onTopAction(entry.target.topAction, entry.target)
      return
    }
    // Els DOIPs i els registres tutorials s'obren en el seu visor original.
    const record = entry.source?.collection === 'tutorialRecords' && current.tutorialRecords.find(item => item.id === entry.source.id)
    const nativeRecord = record && ((record.type === 'doip' && entry.target.mode === 'tutoring') || ['family-contact', 'student-interview', 'tutorial-observation', 'team-information', 'guidance', 'agreement', 'other-tutorial'].includes(record.type))
    const showDetail = entry.kind === 'content' && !nativeRecord
    await navigateToSearchTarget(useAvaluaproStore, showDetail ? { ...entry.target, previewOnly: true } : entry.target)
    setOpen(false)
    if (showDetail) { setDetailError(''); setDetail(entry) }
  }
  return (
    <>
      <button className="global-search-trigger" type="button" onClick={() => setOpen(true)} aria-label="Cercar a AvaluaPro" title="Cercar a AvaluaPro (⌘K / Ctrl+K)" data-tour="global-search">
        <Search size={23} aria-hidden="true" /><span>Cercar…</span><kbd>⌘K</kbd>
      </button>
      {open && createPortal(<SearchDialog index={index} activeClassId={state.ui.activeClassId} onClose={() => setOpen(false)} onSelect={select} loading={loading}
        loadNotice={notice || 'La cerca inclou els continguts disponibles en aquest dispositiu. Obre la programació per actualitzar-ne els continguts.'} />, document.body)}
      {detail && createPortal(
        <Modal title={detail.title} onClose={() => setDetail(null)} size="lg" panelClassName="global-search-detail">
          <p className="global-search-detail-path">{detail.path}</p>
          <div className="global-search-detail-text">{detail.text || 'Aquest element no té cap descripció afegida.'}</div>
          {detailError && <p className="inline-error" role="alert">{detailError}</p>}
          <button className="primary-action" disabled={detailBusy} onClick={async () => {
            setDetailBusy(true)
            setDetailError('')
            try {
              await navigateToSearchTarget(useAvaluaproStore, { ...detail.target, previewOnly: false })
              setDetail(null)
            } catch (error) { setDetailError(error.message || 'Aquest resultat ja no està disponible.') }
            finally { setDetailBusy(false) }
          }} type="button">Veure a {detail.target.mode === 'planning' ? 'Programació' : detail.target.mode === 'agenda' ? 'Agenda' : detail.target.mode === 'evaluation' ? 'Avaluació' : detail.target.mode === 'students' ? 'Alumnes' : detail.target.mode === 'tutoring' ? 'Tutoria' : 'Seguiment'}</button>
        </Modal>, document.body)}
    </>
  )
}
