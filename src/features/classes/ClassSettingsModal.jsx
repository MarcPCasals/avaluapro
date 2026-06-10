import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Cloud, GraduationCap, Link2, RefreshCw, Settings, Share2, Trash2 } from 'lucide-react'
import { EducandEmailInput } from '../../components/EducandEmailInput'
import { Modal } from '../../components/Modal'
import { normalizeEducandEmail } from '../../lib/email'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassFormFields } from './ClassFormFields'

export function ClassSettingsModal({ classId, onClose }) {
  const classes = useAvaluaproStore((state) => state.classes)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const linkClassToSharedTutoringSpace = useAvaluaproStore((state) => state.linkClassToSharedTutoringSpace)
  const loadSharedTutoringSpaces = useAvaluaproStore((state) => state.loadSharedTutoringSpaces)
  const shareTutoringClass = useAvaluaproStore((state) => state.shareTutoringClass)
  const syncSharedTutoringClass = useAvaluaproStore((state) => state.syncSharedTutoringClass)
  const updateClass = useAvaluaproStore((state) => state.updateClass)
  const reorderClass = useAvaluaproStore((state) => state.reorderClass)
  const deleteClass = useAvaluaproStore((state) => state.deleteClass)
  const [shareEmail, setShareEmail] = useState('')
  const [sharedMessage, setSharedMessage] = useState('')
  const [sharedBusy, setSharedBusy] = useState('')
  const currentClass = classes.find((item) => item.id === classId)
  const orderedClasses = [...classes].sort((a, b) => (a.order || 0) - (b.order || 0))
  const availableSharedTutoringSpaces = useMemo(
    () =>
      (cloud.sharedTutoringSpaces || []).filter(
        (space) => space.id && space.id !== currentClass?.sharedTutoringSpaceId,
      ),
    [cloud.sharedTutoringSpaces, currentClass?.sharedTutoringSpaceId],
  )

  useEffect(() => {
    if (cloud.user?.email) {
      loadSharedTutoringSpaces()
    }
  }, [cloud.user?.email, loadSharedTutoringSpaces])

  if (!currentClass) return null

  const sharedMembers = currentClass.sharedTutoringMemberEmails || []
  const currentSharedSpace = (cloud.sharedTutoringSpaces || []).find(
    (space) => space.id === currentClass.sharedTutoringSpaceId,
  )
  const sharedSummary = currentSharedSpace?.sharedSummary || {}
  const sharedConflictCount = currentSharedSpace?.sharedConflictSummary?.count || 0
  const handleShareTutoring = async () => {
    setSharedMessage('')
    const recipientEmail = normalizeEducandEmail(shareEmail)
    if (!recipientEmail) {
      setSharedMessage('Escriu el correu del cotutor.')
      return
    }
    setSharedBusy('share')
    try {
      const space = await shareTutoringClass({ classId, recipientEmail })
      setShareEmail('')
      setSharedMessage(
        space?.sharedConflictSummary?.count > 0
          ? `Tutoria compartida, però s’han conservat ${space.sharedConflictSummary.count} canvis remots recents. Sincronitza abans de continuar.`
          : `Tutoria compartida amb ${recipientEmail}.`,
      )
    } catch (error) {
      setSharedMessage(error.message || 'No s’ha pogut compartir aquesta tutoria.')
    } finally {
      setSharedBusy('')
    }
  }

  const handleLinkTutoring = async (spaceId) => {
    setSharedMessage('')
    setSharedBusy(spaceId)
    try {
      await linkClassToSharedTutoringSpace({ classId, spaceId })
      setSharedMessage('Tutoria compartida vinculada a aquesta classe.')
    } catch (error) {
      setSharedMessage(error.message || 'No s’ha pogut vincular aquesta tutoria.')
    } finally {
      setSharedBusy('')
    }
  }

  const handleSyncTutoring = async () => {
    setSharedMessage('')
    setSharedBusy('sync')
    try {
      const space = await syncSharedTutoringClass(classId)
      setSharedMessage(
        space?.sharedConflictSummary?.count > 0
          ? `Sincronització feta. S’han conservat ${space.sharedConflictSummary.count} canvis remots recents d’un altre tutor.`
          : 'Tutoria compartida sincronitzada.',
      )
    } catch (error) {
      setSharedMessage(error.message || 'No s’ha pogut sincronitzar aquesta tutoria.')
    } finally {
      setSharedBusy('')
    }
  }

  return (
    <Modal onClose={onClose} size="lg" title="Configuració del grup">
      <div className="modal-section">
        <h3>
          <Settings size={18} />
          Matèria i identificació
        </h3>
        <p>
          Aquesta configuració només cal tocar-la si la classe no segueix la teva matèria principal.
          El botó CFN crearà estructura quan aquesta assignatura tingui competències precarregades.
        </p>
        <ClassFormFields
          onChange={(patch) => updateClass(classId, patch)}
          value={{
            name: currentClass.name,
            subject: currentClass.subject || '',
            color: currentClass.color || 'blue',
            tutors: currentClass.tutors || '',
          }}
        />
      </div>
      <div className="modal-section">
        <h3>
          <ArrowUp size={18} />
          Ordre de les classes
        </h3>
        <p>
          Mou les classes amunt o avall per decidir com apareixen a la barra superior.
          Això no canvia cap dada dels alumnes.
        </p>
        <div className="class-order-list">
          {orderedClasses.map((classItem, index) => (
            <div className={`class-order-row ${classItem.id === classId ? 'active' : ''}`} key={classItem.id}>
              <span>{index + 1}</span>
              <strong>{classItem.name}</strong>
              <small>{classItem.subject || 'Sense assignatura'}</small>
              <div>
                <button
                  className="secondary-action compact"
                  disabled={index === 0}
                  onClick={() => reorderClass(classItem.id, -1)}
                  title="Moure amunt"
                  type="button"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  className="secondary-action compact"
                  disabled={index === orderedClasses.length - 1}
                  onClick={() => reorderClass(classItem.id, 1)}
                  title="Moure avall"
                  type="button"
                >
                  <ArrowDown size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-section tutorial-settings-panel">
        <h3>
          <GraduationCap size={18} />
          Tutoria
        </h3>
        <p>
          Marca aquest grup si també és el teu grup de tutoria. Avaluapro reutilitzarà els mateixos
          alumnes, mitjos grups, fotografies, diagnòstics i anotacions perquè no hagis de configurar-ho dues vegades.
        </p>
        <label className="tutorial-toggle-row">
          <input
            checked={Boolean(currentClass.isTutoringGroup || currentClass.subject === 'Tutoria')}
            onChange={(event) =>
              updateClass(classId, {
                isTutoringGroup: event.target.checked,
                tutorialLinkedClassId: currentClass.tutorialLinkedClassId || classId,
              })
            }
            type="checkbox"
          />
          <span>
            <strong>Aquest grup també és una tutoria</strong>
            <small>Activarà el botó “Mode tutoria” quan aquesta classe estigui seleccionada.</small>
          </span>
        </label>
        {(currentClass.isTutoringGroup || currentClass.subject === 'Tutoria') && (
          <>
            <label className="field-label">
              Classe d’origen per compartir alumnes
              <select
                onChange={(event) => updateClass(classId, { tutorialLinkedClassId: event.target.value })}
                value={currentClass.tutorialLinkedClassId || classId}
              >
                {orderedClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} · {classItem.subject || 'Sense assignatura'}
                  </option>
                ))}
              </select>
            </label>
            <section className="shared-tutoring-panel">
              <div className="shared-tutoring-heading">
                <Cloud size={18} />
                <div>
                  <strong>Tutoria compartida</strong>
                  <span>
                    Dona accés a un cotutor perquè tots dos pugueu treballar el mateix espai de tutoria.
                  </span>
                </div>
              </div>
              {!cloud.user?.email ? (
                <p className="shared-tutoring-note">
                  Inicia sessió amb Google per compartir o vincular tutories.
                </p>
              ) : (
                <>
                  <div className="shared-tutoring-current">
                    <span>{currentClass.sharedTutoringSpaceId ? 'Vinculada' : 'Encara no compartida'}</span>
                    {currentSharedSpace?.updatedAt && (
                      <small>
                        Última sincronització compartida:{' '}
                        {new Date(currentSharedSpace.updatedAt).toLocaleString('ca-ES')}
                      </small>
                    )}
                    {sharedMembers.length > 0 && (
                      <small>Membres: {sharedMembers.join(', ')}</small>
                    )}
                    {sharedConflictCount > 0 && (
                      <small className="shared-tutoring-conflict-note">
                        Hi ha {sharedConflictCount} canvi(s) recent(s) d’un altre tutor que s’han conservat.
                        Sincronitza abans de continuar editant.
                      </small>
                    )}
                  </div>
                  {currentClass.sharedTutoringSpaceId && (
                    <div className="shared-tutoring-scope">
                      <article>
                        <strong>{sharedSummary.studentCount ?? 0}</strong>
                        <span>Alumnes</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.studentsWithProfileCount ?? 0}</strong>
                        <span>Perfils tutorials</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.tutorialRecordCount ?? 0}</strong>
                        <span>Registres</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.doipCount ?? 0}</strong>
                        <span>DOIPs</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.tutorialMarkCount ?? 0}</strong>
                        <span>Notes tutoria</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.tutorialLinkedMarkCount ?? 0}</strong>
                        <span>Notes auto</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.relationCount ?? 0}</strong>
                        <span>Relacions</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.studentRoleCount ?? 0}</strong>
                        <span>Rols</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.tutorialGroupSetCount ?? 0}</strong>
                        <span>Grups</span>
                      </article>
                      <article>
                        <strong>{sharedSummary.seatingPlanCount ?? 0}</strong>
                        <span>Aula</span>
                      </article>
                    </div>
                  )}
                  <div className="shared-tutoring-actions">
                    <EducandEmailInput
                      label="Correu del cotutor"
                      onChange={setShareEmail}
                      value={shareEmail}
                    />
                    <button
                      className="secondary-action"
                      disabled={sharedBusy === 'share'}
                      onClick={handleShareTutoring}
                      type="button"
                    >
                      <Share2 size={16} />
                      Compartir
                    </button>
                    {currentClass.sharedTutoringSpaceId && (
                      <button
                        className="secondary-action"
                        disabled={sharedBusy === 'sync'}
                        onClick={handleSyncTutoring}
                        type="button"
                      >
                        <RefreshCw size={16} />
                        Sincronitzar ara
                      </button>
                    )}
                  </div>
                  {availableSharedTutoringSpaces.length > 0 && (
                    <div className="shared-tutoring-list">
                      <strong>Tutories compartides disponibles</strong>
                      {availableSharedTutoringSpaces.map((space) => (
                        <div className="shared-tutoring-space-row" key={space.id}>
                          <div>
                            <span>{space.className || 'Tutoria compartida'}</span>
                            <small>{(space.memberEmails || []).join(', ')}</small>
                          </div>
                          <button
                            className="secondary-action compact"
                            disabled={sharedBusy === space.id}
                            onClick={() => handleLinkTutoring(space.id)}
                            type="button"
                          >
                            <Link2 size={15} />
                            Vincular
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(sharedMessage || cloud.sharedTutoringError) && (
                    <p
                      className={`shared-tutoring-status ${
                        cloud.sharedTutoringError && !sharedMessage ? 'error' : ''
                      }`}
                    >
                      {sharedMessage || cloud.sharedTutoringError}
                    </p>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
      <div className="modal-section danger-zone">
        <h3>
          <Trash2 size={18} />
          Eliminar classe
        </h3>
        <p>
          Aquesta acció eliminarà la classe, alumnes, notes, tasques, comentaris i llocs fixos associats.
          Abans de fer-ho, descarrega una còpia de seguretat si vols conservar l’estat actual.
        </p>
        <button
          className="danger-action"
          onClick={async () => {
            const answer = window.prompt(
              [
                `Vols eliminar la classe "${currentClass.name}" i totes les seves dades?`,
                '',
                'Aquesta acció no es pot desfer des d’Avaluapro.',
                '',
                'Per confirmar, escriu ELIMINA.',
              ].join('\n'),
            )
            if (answer !== 'ELIMINA') return
            await deleteClass(classId)
            onClose()
          }}
          type="button"
        >
          <Trash2 size={16} />
          Eliminar aquesta classe
        </button>
      </div>
    </Modal>
  )
}
