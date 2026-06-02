import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileJson, History, Inbox, RefreshCw, Send, Upload } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { downloadJson, getTodaySlug } from '../../lib/downloads'
import { gradeClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function formatMatchStatus(status) {
  if (status === 'exact') return 'Coincidència exacta'
  if (status === 'strong') return 'Coincidència probable'
  if (status === 'partial') return 'Revisar coincidència'
  return 'Sense coincidència'
}

function getMatchClassName(status) {
  if (status === 'exact') return 'ok'
  if (status === 'strong') return 'warning'
  if (status === 'partial') return 'warning'
  return 'risk'
}

function normalizeRecipientEmail(value = '') {
  const cleanValue = String(value).trim().toLowerCase()
  if (!cleanValue) return ''
  if (cleanValue.includes('@')) return cleanValue
  return `${cleanValue}@educand.ad`
}

function formatPackageDate(value = '') {
  if (!value) return 'Sense data'
  try {
    return new Intl.DateTimeFormat('ca-AD', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatSentPackageStatus(status) {
  if (status === 'imported') return 'Importat pel tutor'
  if (status === 'sent') return 'Enviat'
  return 'En procés'
}

function isTutoringClassItem(classItem) {
  return Boolean(classItem?.isTutoringGroup || classItem?.subject === 'Tutoria')
}

function TeacherPackageSendPanel({ activeClass, packageError, packagePreview }) {
  const cloud = useAvaluaproStore((state) => state.cloud)
  const createTeacherGradePackage = useAvaluaproStore((state) => state.createTeacherGradePackage)
  const sendTeacherGradePackageToTutor = useAvaluaproStore((state) => state.sendTeacherGradePackageToTutor)
  const loadSentTeacherGradePackages = useAvaluaproStore((state) => state.loadSentTeacherGradePackages)
  const [recipientInput, setRecipientInput] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const finalRecipientEmail = normalizeRecipientEmail(recipientInput)

  useEffect(() => {
    if (cloud.user?.uid) {
      loadSentTeacherGradePackages()
    }
  }, [cloud.user?.uid, loadSentTeacherGradePackages])

  const handleDownloadPackage = () => {
    const packageData = createTeacherGradePackage(activeClass.id)
    downloadJson(
      packageData,
      `avaluapro-paquet-notes-${slugify(activeClass.name)}-${slugify(activeClass.subject)}-${getTodaySlug()}.json`,
    )
  }

  const handleSendPackage = async () => {
    setStatus('')
    setError('')

    try {
      if (!finalRecipientEmail) throw new Error('Escriu el correu del tutor destinatari.')
      const sentPackage = await sendTeacherGradePackageToTutor({
        classId: activeClass.id,
        recipientEmail: finalRecipientEmail,
      })
      setRecipientInput('')
      setStatus(`Notes enviades correctament a ${sentPackage.recipientEmailLower}.`)
    } catch (sendError) {
      setError(
        `No s’han pogut enviar les notes de ${activeClass.name}. ${
          sendError.message || 'Revisa el correu destinatari i la connexió.'
        }`,
      )
    }
  }

  if (packageError) {
    return (
      <div className="teacher-package-empty">
        <AlertTriangle size={28} />
        <strong>No es pot preparar el paquet de notes.</strong>
        <p>{packageError}</p>
      </div>
    )
  }

  const packageData = packagePreview.packageData

  return (
    <div className="teacher-package-panel">
      <section className="teacher-package-hero">
        <div>
          <span>
            <Send size={17} />
            Compartir notes amb tutoria
          </span>
          <strong>
            {packageData.source.subject} · {packageData.source.className}
          </strong>
          <p>
            Aquest paquet conté només les notes finals de competència, sempre amb la darrera mirada disponible
            per alumne i competència. Els criteris i les notes internes no viatgen al tutor.
          </p>
        </div>
        <div className="teacher-package-hero-actions">
          <button className="primary-action" disabled={!cloud.user} onClick={handleSendPackage} type="button">
            <Send size={18} />
            Enviar al tutor
          </button>
          <button className="secondary-action" onClick={handleDownloadPackage} type="button">
            <Download size={18} />
            Descarregar JSON
          </button>
        </div>
      </section>

      <section className="teacher-package-recipient">
        <label htmlFor="teacher-package-recipient">
          Correu del tutor destinatari
          <span>Si escrius només el nom, afegirem @educand.ad automàticament.</span>
        </label>
        <div>
          <input
            id="teacher-package-recipient"
            onChange={(event) => setRecipientInput(event.target.value)}
            placeholder="mperezc"
            type="text"
            value={recipientInput}
          />
          <strong>{finalRecipientEmail || '@educand.ad'}</strong>
        </div>
        {!cloud.user && (
          <p>
            Per enviar directament al núvol cal iniciar sessió amb Google. El JSON manual continua disponible com a
            alternativa.
          </p>
        )}
      </section>

      {(error || cloud.teacherPackagesError) && (
        <div className="teacher-package-message risk">
          <AlertTriangle size={18} />
          {error || cloud.teacherPackagesError}
        </div>
      )}
      {status && (
        <div className="teacher-package-toast ok">
          <CheckCircle2 size={18} />
          {status}
        </div>
      )}

      <div className="teacher-package-summary-grid">
        <article>
          <strong>{packageData.summary.studentCount}</strong>
          <span>Alumnes</span>
        </article>
        <article>
          <strong>{packageData.summary.competencyCount}</strong>
          <span>Competències</span>
        </article>
        <article>
          <strong>{packageData.summary.gradeCount}</strong>
          <span>Notes incloses</span>
        </article>
        <article>
          <strong>{packageData.summary.emptyCount}</strong>
          <span>Sense avaluar</span>
        </article>
      </div>

      <section className="teacher-package-preview-list">
        {packageData.students.map((student) => (
          <article key={student.sourceStudentId}>
            <div>
              <strong>{student.name}</strong>
              <small>{student.halfGroup || 'Sense mig grup'}</small>
            </div>
            <div className="teacher-package-grade-strip">
              {student.competencies.map((competency) => (
                <span key={competency.competencyKey}>
                  <em>{competency.competencyName.split(':')[0]}</em>
                  <b className={gradeClassName(competency.grade)}>{competency.grade || '-'}</b>
                  <small>{competency.sourceUtName || 'Sense UT'}</small>
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="teacher-package-sent-log">
        <header>
          <div>
            <History size={18} />
            <strong>Registre d’enviaments</strong>
          </div>
          <span>{cloud.sentTeacherPackages?.length || 0} últims</span>
        </header>
        {cloud.user ? (
          cloud.sentTeacherPackages?.length > 0 ? (
            <div className="teacher-package-log-list">
              {cloud.sentTeacherPackages.map((sentPackage) => (
                <article key={sentPackage.id}>
                  <div>
                    <strong>
                      {sentPackage.packageData?.source?.subject || 'Matèria desconeguda'} ·{' '}
                      {sentPackage.packageData?.source?.className || 'Classe desconeguda'}
                    </strong>
                    <small>
                      A {sentPackage.recipientEmailLower || 'correu desconegut'} ·{' '}
                      {formatPackageDate(sentPackage.createdAt)}
                    </small>
                  </div>
                  <span className={sentPackage.status === 'imported' ? 'imported' : ''}>
                    {formatSentPackageStatus(sentPackage.status)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="teacher-package-inbox-empty">
              Encara no has enviat cap paquet des d’aquest compte.
            </p>
          )
        ) : (
          <p className="teacher-package-inbox-empty">
            Inicia sessió amb Google per veure l’historial d’enviaments al núvol.
          </p>
        )}
      </section>
    </div>
  )
}

function TeacherPackageReceivePanel({ activeClass }) {
  const fileInputRef = useRef(null)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const loadReceivedTeacherGradePackages = useAvaluaproStore((state) => state.loadReceivedTeacherGradePackages)
  const previewTeacherGradePackage = useAvaluaproStore((state) => state.previewTeacherGradePackage)
  const importTeacherGradePackage = useAvaluaproStore((state) => state.importTeacherGradePackage)
  const importReceivedTeacherGradePackage = useAvaluaproStore((state) => state.importReceivedTeacherGradePackage)
  const [packageData, setPackageData] = useState(null)
  const [preview, setPreview] = useState(null)
  const [selectedCloudPackageId, setSelectedCloudPackageId] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (cloud.user?.email) {
      loadReceivedTeacherGradePackages()
    }
  }, [cloud.user?.email, loadReceivedTeacherGradePackages])

  const handleSelectCloudPackage = (receivedPackage) => {
    try {
      const nextPreview = previewTeacherGradePackage(receivedPackage.packageData, activeClass.id)
      setSelectedCloudPackageId(receivedPackage.id)
      setPackageData(receivedPackage.packageData)
      setPreview(nextPreview)
      setStatus('')
      setError('')
    } catch (previewError) {
      setSelectedCloudPackageId('')
      setPackageData(null)
      setPreview(null)
      setStatus('')
      setError(previewError.message || 'No s’ha pogut revisar aquest paquet.')
    }
  }

  const handleLoadPackage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const nextPackage = JSON.parse(text)
      const nextPreview = previewTeacherGradePackage(nextPackage, activeClass.id)
      setSelectedCloudPackageId('')
      setPackageData(nextPackage)
      setPreview(nextPreview)
      setStatus('')
      setError('')
    } catch (loadError) {
      setPackageData(null)
      setPreview(null)
      setStatus('')
      setError(loadError.message || 'No s’ha pogut llegir aquest paquet de notes.')
    }
  }

  const handleImportPackage = async () => {
    if (!packageData) return

    try {
      const result = selectedCloudPackageId
        ? await importReceivedTeacherGradePackage({ classId: activeClass.id, packageId: selectedCloudPackageId })
        : await importTeacherGradePackage(packageData, activeClass.id)
      const missingMessage =
        result.missingMatches > 0
          ? ` ${result.missingMatches} alumne/s han quedat fora perquè no tenien coincidència prou fiable.`
          : ''
      setStatus(`${result.importedGrades} notes importades correctament a la tutoria.${missingMessage}`)
      setError('')
    } catch (importError) {
      setError(
        `No s’han pogut importar les notes a ${activeClass.name}. ${
          importError.message || 'Revisa la classe de destí i els noms dels alumnes.'
        }`,
      )
      setStatus('')
    }
  }

  const missingMatchNames = useMemo(
    () =>
      preview?.rows
        ?.filter((row) => !row.targetStudent)
        .map((row) => row.sourceStudent.name)
        .slice(0, 6) || [],
    [preview],
  )

  return (
    <div className="teacher-package-panel">
      <section className="teacher-package-hero receive">
        <div>
          <span>
            <Upload size={17} />
            Rebre notes
          </span>
          <strong>{activeClass.name}</strong>
          <p>
            Carrega el paquet enviat per un docent, revisa quins alumnes coincideixen i importa només les notes
            finals de competència a la pantalla de tutoria.
          </p>
        </div>
        <div className="teacher-package-hero-actions">
          <button className="primary-action" onClick={loadReceivedTeacherGradePackages} type="button">
            <RefreshCw size={18} />
            Actualitzar safata
          </button>
          <button className="secondary-action" onClick={() => fileInputRef.current?.click()} type="button">
            <FileJson size={18} />
            Carregar JSON
          </button>
        </div>
        <input
          ref={fileInputRef}
          accept="application/json,.json"
          className="sr-only"
          onChange={handleLoadPackage}
          type="file"
        />
      </section>

      {cloud.user?.email ? (
        <section className="teacher-package-inbox">
          <header>
            <div>
              <Inbox size={18} />
              <strong>Safata de paquets rebuts</strong>
            </div>
            <span>{cloud.user.email}</span>
          </header>
          {cloud.teacherPackages.length > 0 ? (
            <div className="teacher-package-inbox-list">
              {cloud.teacherPackages.map((receivedPackage) => (
                <button
                  className={receivedPackage.id === selectedCloudPackageId ? 'selected' : ''}
                  key={receivedPackage.id}
                  onClick={() => handleSelectCloudPackage(receivedPackage)}
                  type="button"
                >
                  <div>
                    <strong>
                      {receivedPackage.packageData?.source?.subject || 'Matèria desconeguda'} ·{' '}
                      {receivedPackage.packageData?.source?.className || 'Classe desconeguda'}
                    </strong>
                    <small>
                      {receivedPackage.senderEmail || 'Docent desconegut'} · {formatPackageDate(receivedPackage.createdAt)}
                    </small>
                  </div>
                  <span className={receivedPackage.status === 'imported' ? 'imported' : ''}>
                    {receivedPackage.status === 'imported' ? 'Importat' : 'Nou'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="teacher-package-inbox-empty">
              Encara no hi ha cap paquet enviat al teu correu. També pots carregar un JSON manual.
            </p>
          )}
        </section>
      ) : (
        <div className="teacher-package-message risk">
          <AlertTriangle size={18} />
          Inicia sessió amb Google per veure els paquets enviats al núvol.
        </div>
      )}

      {(error || cloud.teacherPackagesError) && (
        <div className="teacher-package-message risk">
          <AlertTriangle size={18} />
          {error || cloud.teacherPackagesError}
        </div>
      )}
      {status && (
        <div className="teacher-package-toast ok">
          <CheckCircle2 size={18} />
          {status}
        </div>
      )}

      {!preview && !error && (
        <div className="teacher-package-empty">
          <FileJson size={30} />
          <strong>Encara no has carregat cap paquet.</strong>
          <p>Quan l’obris, veuràs una revisió abans d’incorporar les notes a la tutoria.</p>
        </div>
      )}

      {preview && (
        <>
          <div className="teacher-package-summary-grid">
            <article>
              <strong>{preview.packageData.source.subject}</strong>
              <span>Matèria</span>
            </article>
            <article>
              <strong>{preview.summary.exactMatches}</strong>
              <span>Coincidències exactes</span>
            </article>
            <article>
              <strong>{preview.summary.partialMatches}</strong>
              <span>A revisar</span>
            </article>
            <article>
              <strong>{preview.summary.importableGrades}</strong>
              <span>Notes importables</span>
            </article>
          </div>

          <section className="teacher-package-match-list">
            {preview.rows.map((row) => (
              <article className={getMatchClassName(row.status)} key={row.sourceStudent.sourceStudentId}>
                <div>
                  <strong>{row.sourceStudent.name}</strong>
                  <small>
                    {row.targetStudent ? `Entrarà com ${row.targetStudent.name}` : 'Cal revisar aquest alumne'}
                  </small>
                </div>
                <span>{formatMatchStatus(row.status)}</span>
                <div className="teacher-package-grade-strip">
                  {row.gradedCompetencies.map((competency) => (
                    <b className={gradeClassName(competency.grade)} key={competency.competencyKey}>
                      {competency.grade}
                    </b>
                  ))}
                </div>
              </article>
            ))}
          </section>

          {preview.summary.missingMatches > 0 && (
            <div className="teacher-package-message warning">
              <AlertTriangle size={18} />
              {preview.summary.missingMatches} alumne/s no tenen una coincidència prou fiable i no s’importaran:{' '}
              {missingMatchNames.join(', ')}
              {preview.summary.missingMatches > missingMatchNames.length ? '…' : ''}. Revisa noms i cognoms abans de
              donar-ho per tancat.
            </div>
          )}

          <footer className="teacher-package-actions">
            <span>
              Les coincidències exactes i probables es poden importar directament. Les files marcades com “sense
              coincidència” queden fora per evitar posar notes a un alumne equivocat.
            </span>
            <button
              className="primary-action"
              disabled={preview.summary.importableGrades === 0}
              onClick={handleImportPackage}
              type="button"
            >
              <CheckCircle2 size={18} />
              Importar notes
            </button>
          </footer>
        </>
      )}
    </div>
  )
}

export function TeacherGradePackageModal({ onClose }) {
  const state = useAvaluaproStore()
  const activeClass = state.classes.find((classItem) => classItem.id === state.ui.activeClassId)
  const createTeacherGradePackage = useAvaluaproStore((store) => store.createTeacherGradePackage)
  const sendClasses = useMemo(() => state.classes.filter((classItem) => !isTutoringClassItem(classItem)), [state.classes])
  const receiveClasses = useMemo(() => state.classes.filter((classItem) => isTutoringClassItem(classItem)), [state.classes])
  const [mode, setMode] = useState(isTutoringClassItem(activeClass) ? 'receive' : 'send')
  const [sendClassId, setSendClassId] = useState(
    !isTutoringClassItem(activeClass) ? activeClass?.id || '' : sendClasses[0]?.id || '',
  )
  const [receiveClassId, setReceiveClassId] = useState(
    isTutoringClassItem(activeClass) ? activeClass?.id || '' : receiveClasses[0]?.id || activeClass?.id || '',
  )
  const sendClass = sendClasses.find((classItem) => classItem.id === sendClassId) || sendClasses[0]
  const receiveClass =
    receiveClasses.find((classItem) => classItem.id === receiveClassId) ||
    (isTutoringClassItem(activeClass) ? activeClass : receiveClasses[0] || activeClass)

  const packagePreview = useMemo(() => {
    if (!sendClass) return { error: '', packageData: null }
    try {
      return { error: '', packageData: createTeacherGradePackage(sendClass.id) }
    } catch (error) {
      return { error: error.message || 'No s’ha pogut preparar el paquet.', packageData: null }
    }
  }, [createTeacherGradePackage, sendClass])

  return (
    <Modal onClose={onClose} size="xl" title="Compartir notes entre docents">
      <div className="teacher-package-shell">
        <section className="teacher-package-intro">
          <div>
            <strong>Enviar i rebre notes de competències</strong>
            <p>
              Els professors d’assignatura envien només les notes finals de competència. El tutor les rep a la seva
              classe de tutoria i el programa intenta encaixar els alumnes pel nom.
            </p>
          </div>
          <div className="teacher-package-mode-switch">
            <button className={mode === 'send' ? 'active' : ''} onClick={() => setMode('send')} type="button">
              <Send size={17} />
              Enviar notes
            </button>
            <button className={mode === 'receive' ? 'active' : ''} onClick={() => setMode('receive')} type="button">
              <Inbox size={17} />
              Rebre notes
            </button>
          </div>
        </section>

        {mode === 'send' && (
          <section className="teacher-package-class-picker">
            <label htmlFor="teacher-package-send-class">
              Classe que envia les notes
              <select
                id="teacher-package-send-class"
                onChange={(event) => setSendClassId(event.target.value)}
                value={sendClass?.id || ''}
              >
                {sendClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} · {classItem.subject || 'Sense assignatura'}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {mode === 'receive' && receiveClasses.length > 0 && (
          <section className="teacher-package-class-picker">
            <label htmlFor="teacher-package-receive-class">
              Tutoria que rep les notes
              <select
                id="teacher-package-receive-class"
                onChange={(event) => setReceiveClassId(event.target.value)}
                value={receiveClass?.id || ''}
              >
                {receiveClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {mode === 'send' ? (
          sendClass ? (
          <TeacherPackageSendPanel
            activeClass={sendClass}
            packageError={packagePreview.error}
            packagePreview={{ packageData: packagePreview.packageData }}
          />
          ) : (
            <div className="teacher-package-empty">
              <AlertTriangle size={28} />
              <strong>No hi ha cap classe d’assignatura per enviar.</strong>
              <p>Crea o selecciona una classe que no sigui de tutoria abans d’enviar notes a un tutor.</p>
            </div>
          )
        ) : receiveClass ? (
          <TeacherPackageReceivePanel activeClass={receiveClass} />
        ) : (
          <div className="teacher-package-empty">
            <AlertTriangle size={28} />
            <strong>No hi ha cap classe de tutoria per rebre notes.</strong>
            <p>Marca una classe com a tutoria a la configuració de classe per importar-hi notes d’altres docents.</p>
          </div>
        )
        }
      </div>
    </Modal>
  )
}
