// Fre local d'ús accidental: els comptadors no contenen dades del quadern.
// No és una quota global del projecte ni substitueix els límits del servidor.
export const EDIT_HISTORY_LIMITS = Object.freeze({ perMinute: 10, documentsPerMinute: 300, perDay: 100, documentsPerDay: 1500 })
const STORAGE_KEY = 'avaluapro:edit-history-budget:v1'
const DAY_MS = 86_400_000
export function createEditHistoryBudget({ now = Date.now, storage = () => globalThis.localStorage, limits = EDIT_HISTORY_LIMITS } = {}) {
  let uses = []
  function read() {
    try {
      const raw = storage()?.getItem(STORAGE_KEY)
      const saved = raw ? JSON.parse(raw) : null
      if (Array.isArray(saved)) uses = saved.filter(item => Number.isFinite(item.at) && Number.isFinite(item.documents) && item.documents >= 0)
    } catch { /* En navegació privada es manté el fre en memòria. */ }
    uses = uses.filter(item => item.at > now() - DAY_MS)
  }
  function check(documents = 1) {
    read()
    if (documents > limits.documentsPerMinute) return { allowed: false, retryAt: 0, message: 'Aquesta recuperació afecta més de 300 documents i supera el límit preventiu. No s’ha modificat cap dada.' }
    const minute = uses.filter(item => item.at > now() - 60_000)
    const dailyDocuments = uses.reduce((total, item) => total + item.documents, 0)
    const minuteDocuments = minute.reduce((total, item) => total + item.documents, 0)
    if (uses.length >= limits.perDay || dailyDocuments + documents > limits.documentsPerDay) {
      return { allowed: false, retryAt: uses[0]?.at + DAY_MS || now() + DAY_MS, message: 'S’ha arribat al límit preventiu de desfer i refer de les últimes 24 hores en aquest navegador. Els canvis es conserven.' }
    }
    if (minute.length >= limits.perMinute || minuteDocuments + documents > limits.documentsPerMinute) {
      return { allowed: false, retryAt: minute[0]?.at + 60_000 || now() + 60_000, message: 'Pausa de protecció: massa recuperacions o massa documents en un minut. Espera uns instants; els canvis es conserven.' }
    }
    return { allowed: true, retryAt: 0, message: '' }
  }
  function consume(documents) {
    const status = check(documents)
    if (!status.allowed) return status
    uses.push({ at: now(), documents })
    try { storage()?.setItem(STORAGE_KEY, JSON.stringify(uses)) } catch { /* Fre en memòria. */ }
    return status
  }
  return { check, consume }
}
