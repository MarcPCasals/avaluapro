import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const WEEKDAYS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export function ReminderDateCalendar({ disabled = false, onChange, value }) {
  const [month, setMonth] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7)
    const today = new Date()
    return dateKey(today.getFullYear(), today.getMonth(), 1).slice(0, 7)
  })
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = new Date(year, monthNumber - 1, 1, 12)
  const offset = (firstDay.getDay() + 6) % 7
  const dayCount = new Date(year, monthNumber, 0, 12).getDate()
  const monthLabel = new Intl.DateTimeFormat('ca-AD', { month: 'long', year: 'numeric' }).format(firstDay)
  const moveMonth = (direction) => {
    const next = new Date(year, monthNumber - 1 + direction, 1, 12)
    setMonth(dateKey(next.getFullYear(), next.getMonth(), 1).slice(0, 7))
  }
  return (
    <div className="reminder-date-calendar" aria-label="Calendari per reprogramar">
      <header>
        <button aria-label="Mes anterior" disabled={disabled} onClick={() => moveMonth(-1)} type="button"><ChevronLeft size={18} /></button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button aria-label="Mes següent" disabled={disabled} onClick={() => moveMonth(1)} type="button"><ChevronRight size={18} /></button>
      </header>
      <div className="reminder-date-calendar-grid">
        {WEEKDAYS.map(day => <span className="reminder-date-weekday" key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1
          const key = dateKey(year, monthNumber - 1, day)
          const label = new Intl.DateTimeFormat('ca-AD', { dateStyle: 'full' }).format(new Date(year, monthNumber - 1, day, 12))
          return <button aria-label={label} aria-pressed={key === value} disabled={disabled} key={key} onClick={() => onChange(key)} type="button">{day}</button>
        })}
      </div>
    </div>
  )
}
