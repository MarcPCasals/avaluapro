import { createCustomStudentInterviewQuestion, STUDENT_INTERVIEW_ANSWER_LIMIT, STUDENT_INTERVIEW_QUESTION_LIMIT } from '../../lib/studentInterviewTemplate'

export function StudentInterviewForm({ questions, onChange, additionalNote, onAdditionalNoteChange }) {
  const updateQuestion = (id, patch) => onChange(questions.map((item) => item.id === id ? { ...item, ...patch } : item))

  return (
    <section className="student-interview-form">
      <div className="student-interview-form-heading">
        <div>
          <strong>Guió de l’entrevista</strong>
          <p>Una resposta per pregunta. Pots adaptar les preguntes només per a aquesta entrevista.</p>
        </div>
      </div>
      <div className="student-interview-questions">
        {questions.map((item, index) => (
          <article className="student-interview-question" key={item.id}>
            <div className="student-interview-question-heading">
              <span className="student-interview-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.section}</strong>
              {item.id.startsWith('custom-') && (
                <button
                  className="student-interview-remove"
                  onClick={() => onChange(questions.filter((question) => question.id !== item.id))}
                  type="button"
                >Eliminar</button>
              )}
            </div>
            <label>
              <span>Pregunta</span>
              <textarea
                className="student-interview-prompt"
                maxLength={STUDENT_INTERVIEW_QUESTION_LIMIT}
                onChange={(event) => updateQuestion(item.id, { question: event.target.value })}
                placeholder="Escriu la pregunta…"
                required={Boolean(item.answer.trim())}
                rows={2}
                value={item.question}
              />
            </label>
            <label>
              <span>Resposta</span>
              <textarea
                maxLength={STUDENT_INTERVIEW_ANSWER_LIMIT}
                onChange={(event) => updateQuestion(item.id, { answer: event.target.value })}
                placeholder="Anota aquí la resposta de l’alumne…"
                rows={3}
                value={item.answer}
              />
            </label>
          </article>
        ))}
      </div>
      <button className="student-interview-add" onClick={() => onChange([...questions, createCustomStudentInterviewQuestion()])} type="button">
        + Afegir una pregunta
      </button>
      <label className="student-interview-additional">
        Nota addicional · opcional
        <textarea
          maxLength={STUDENT_INTERVIEW_ANSWER_LIMIT}
          onChange={(event) => onAdditionalNoteChange(event.target.value)}
          placeholder="Acords o informació que no encaixi en cap pregunta…"
          rows={3}
          value={additionalNote}
        />
      </label>
    </section>
  )
}

export function StudentInterviewAnswers({ interview }) {
  if (!interview?.questions?.length && !interview?.additionalNote) return null
  return (
    <div className="student-interview-answers">
      {interview.questions.map((item, index) => (
        <section className="student-interview-answer" key={`${index}-${item.question}`}>
          <strong>{item.section}</strong>
          <span>{item.question}</span>
          <p>{item.answer}</p>
        </section>
      ))}
      {interview.additionalNote && (
        <section className="student-interview-answer">
          <strong>Nota addicional</strong>
          <p>{interview.additionalNote}</p>
        </section>
      )}
    </div>
  )
}
