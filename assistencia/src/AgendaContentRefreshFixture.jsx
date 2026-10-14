import { useState } from 'react'
import { AgendaTimelineView, AgendaSessionDetail } from '../../src/features/agenda/AgendaSessionViews.jsx'
import { loadAgendaContentRefresh, refreshAgendaBundleContent, summarizeAgendaContentRefresh } from '../../src/features/agenda/agendaContentRefresh.js'
import '../../src/features/agenda/agenda.css'

const unit = { entityType: 'planningUnit', id: 'synthetic-up', title: 'UP sintètica', subject: 'Ciències', transversalMaterials: [] }
const original = { entityType: 'planningActivity', id: 'synthetic-activity', planningUnitId: unit.id, description: 'Descripció inicial sintètica.', teacherMaterials: [], studentMaterials: [] }
const initialBundles = [1, 2].map((part) => ({
  planningUnit: unit,
  application: { id: 'synthetic-application', subject: 'Ciències' },
  session: { id: `synthetic-session-${part}`, classId: 'synthetic-class', startsAt: `2099-10-${20 + part}T09:00:00`, endsAt: `2099-10-${20 + part}T10:00:00`, status: 'planned', durationMinutes: 60 },
  items: [
    { id: `own-${part}`, title: 'Activitat pròpia moguda al principi', type: 'activity', plannedMinutes: 33, order: 0, fixedToSession: true },
    { id: `linked-${part}`, title: 'Activitat amb temps ajustat', type: 'activity', sourceActivityId: original.id, sourcePlanningUnitId: unit.id, plannedMinutes: 17, order: 1, fixedToSession: true, segmentIndex: part, segmentCount: 2, sourceActivity: original },
  ], results: [],
}))

export function AgendaContentRefreshFixture() {
  const [bundles, setBundles] = useState(initialBundles)
  const [changed, setChanged] = useState(false)
  const [fail, setFail] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const selected = bundles.find((bundle) => bundle.session.id === selectedId)
  const refreshContent = async ({ sessionIds }) => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 1200))
    if (fail) throw new Error('Error de connexió sintètic. Torna-ho a provar.')
    const targets = bundles.filter((bundle) => sessionIds.includes(bundle.session.id))
    const source = changed ? { ...original, description: 'Descripció actualitzada des de Programació.', teacherMaterials: [], studentMaterials: [{ id: 'synthetic-material', label: 'Material nou sintètic', kind: 'link', url: 'https://example.org/new' }] } : original
    const data = await loadAgendaContentRefresh({ bundles: targets,
      repository: { loadScope: async (_key, loader) => ({ source: 'remote', entities: (await loader()).map((entry) => entry.entity || entry) }) },
      loadStructure: async () => ({ planningUnit: unit, phases: [], activities: [source] }), loadOverrides: async () => [],
    })
    setBundles((current) => current.map((bundle) => refreshAgendaBundleContent(bundle, data)))
    return summarizeAgendaContentRefresh(targets, data)
  }
  return <main style={{ maxWidth: 1200, margin: '24px auto', padding: 16 }}>
    <h1>Prova sintètica: actualització del contingut</h1>
    <p>Entorn d’assistència · dades inventades · sense Firebase.</p>
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => setChanged(true)}>Canviar descripció i material de la Programació</button>
      <label><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />Simular error de connexió</label>
    </div>
    <AgendaTimelineView bundles={bundles} classes={[{ id: 'synthetic-class', name: 'Grup sintètic', subject: 'Ciències' }]} selectedClassId="synthetic-class" loading={false} today="2099-10-20" onOpenSession={(bundle) => setSelectedId(bundle.session.id)} onRefreshContent={refreshContent} />
    <p role="status">Ordre i minuts: {bundles.map((bundle) => bundle.items.map((item) => `${item.order}: ${item.plannedMinutes} min`).join(' → ')).join(' | ')}</p>
    {selected && <AgendaSessionDetail bundle={selected} classes={[{ id: 'synthetic-class', name: 'Grup sintètic' }]} calendarEvents={[]} />}
  </main>
}
