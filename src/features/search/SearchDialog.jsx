import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, FileText, Search, UserRound, Waypoints } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { contentSnippet, searchEntries } from './globalSearch.js'

const KIND_LABELS = { feature: 'Funció o pantalla', student: 'Alumne · Accés directe', content: 'Contingut' }
const ICONS = { feature: Waypoints, student: UserRound, content: FileText }

// Component compartit amb l'entorn sintètic: no coneix el magatzem, Firebase ni credencials.
export function SearchDialog({ index, activeClassId, onClose, onSelect, loading = false, loadNotice = '' }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [limit, setLimit] = useState(24)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const listId = useId()
  const results = useMemo(() => searchEntries(index, query, activeClassId, limit + 1), [index, query, activeClassId, limit])
  const visible = results.slice(0, limit)
  const selectedIndex = Math.min(activeIndex, Math.max(0, visible.length - 1))
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    document.getElementById(`${listId}-${selectedIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, listId])
  const choose = async (entry) => {
    if (!entry || busy) return
    setError('')
    setBusy(true)
    try { await onSelect(entry) } catch (cause) { setError(cause.message || 'No s’ha pogut obrir el resultat.'); setBusy(false) }
  }
  return (
    <Modal onClose={() => !busy && onClose()} size="lg" title="Cerca a AvaluaPro" panelClassName="global-search-dialog">
      <div className="global-search-input-wrap">
        <Search size={24} aria-hidden="true" />
        <input ref={inputRef} aria-label="Cerca funcions, alumnes o continguts" role="combobox" aria-autocomplete="list"
          aria-expanded="true" aria-controls={listId} aria-activedescendant={visible.length ? `${listId}-${selectedIndex}` : undefined}
          autoComplete="off" spellCheck="false" placeholder="DOIP, nom d’un alumne, entrevista, activitat…"
          value={query} disabled={busy} onChange={event => { setQuery(event.target.value); setActiveIndex(0); setLimit(24) }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex(current => Math.max(0, Math.min(visible.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))))
            }
            if (event.key === 'Enter') { event.preventDefault(); choose(visible[selectedIndex]) }
          }} />
      </div>
      <div className="global-search-context">
        <span>Totes les classes · Prioritat a la classe actual</span>
        <span role="status">{busy ? 'Obrint…' : loading ? 'Carregant continguts…' : query.trim() ? `${visible.length}${results.length > limit ? '+' : ''} resultats` : 'Dreceres suggerides'}</span>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loadNotice && <p className="global-search-notice">{loadNotice}</p>}
      <div className="global-search-results" id={listId} role="listbox" aria-label="Resultats de la cerca" aria-busy={loading || busy}>
        {visible.map((entry, position) => {
          const Icon = ICONS[entry.kind]
          return (
            <button key={entry.id} id={`${listId}-${position}`} role="option" aria-selected={position === selectedIndex}
              className={`global-search-result ${position === selectedIndex ? 'active' : ''}`} tabIndex={-1} disabled={busy}
              onMouseMove={() => setActiveIndex(position)} onClick={() => choose(entry)} type="button">
              <span className={`global-search-result-icon ${entry.kind}`}><Icon size={20} aria-hidden="true" /></span>
              <span className="global-search-result-copy">
                <small>{KIND_LABELS[entry.kind]}{entry.classId && entry.classId === activeClassId ? ' · Classe actual' : ''}</small>
                <strong>{entry.title}</strong>
                <span>{entry.path}</span>
                {entry.text && <span className="global-search-snippet">{contentSnippet(entry.text, query)}</span>}
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          )
        })}
      </div>
      {!visible.length && <div className="global-search-empty"><strong>Cap coincidència.</strong><p>Prova un nom, una paraula del contingut o una funció: DOIPs, horari, sociograma…</p></div>}
      {results.length > limit && <button className="secondary-action" onClick={() => setLimit(value => value + 24)} type="button">Mostrar més resultats</button>}
      <footer className="global-search-footer">↑ ↓ per triar · Retorn per obrir · Esc per tancar</footer>
    </Modal>
  )
}
