import { HALF_GROUP_NAMES } from './halfGroupUtils.js'

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

function photoSource(value) {
  if (typeof value !== 'string') return ''
  return /^(data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=\s]+$|https?:\/\/|blob:)/i.test(value) ? value : ''
}

export function halfGroupRoster(students, assignments) {
  return HALF_GROUP_NAMES.map((name) => ({ name, students: students.filter((student) => assignments[student.id] === name) }))
}

// Only these explicitly selected fields enter the document; no diagnostic data is serialized.
export function buildGroupRosterHtml(groups, { title = 'Llista de grups', className = '' } = {}) {
  const sections = groups.map((group) => `<section><h2>${escapeHtml(group.name)}</h2><ol>${(group.students || []).map((student) => {
    const photo = photoSource(student.photoUrl)
    return `<li>${photo ? `<img src="${escapeHtml(photo)}" alt="" />` : ''}<span>${escapeHtml(student.name)}</span></li>`
  }).join('')}</ol></section>`).join('')
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>
    *{box-sizing:border-box}body{font:16px system-ui,sans-serif;color:#172033;margin:0;background:#f1f5f9}main{max-width:1000px;margin:24px auto;background:white;padding:32px}h1{font-size:26px;margin:0 0 8px}p{margin:0 0 24px}h2{font-size:20px;border-bottom:2px solid #cbd5e1;padding-bottom:8px;break-after:avoid}section{margin-bottom:28px}ol{padding:0;list-style:none;margin:0}li{display:flex;align-items:center;gap:14px;min-height:38px;padding:6px 0;border-bottom:1px solid #e2e8f0;break-inside:avoid}li span{overflow-wrap:anywhere}img{width:48px;height:48px;object-fit:cover;border-radius:6px;flex:none}.groups{columns:2;column-gap:32px}section{break-inside:avoid}.toolbar{max-width:1000px;margin:20px auto;padding:0 20px}button{font:inherit;padding:12px 18px;cursor:pointer}button:disabled{cursor:wait}.photo-error{font-size:12px;color:#64748b;width:48px;flex:none}
    @media(max-width:650px){.groups{columns:1}main{padding:20px}}@page{size:A4;margin:14mm}@media print{body{background:white;font-size:12px}main{margin:0;padding:0;max-width:none}.toolbar{display:none}.groups{columns:2;column-gap:8mm}h1{font-size:22px}h2{font-size:17px}img{width:38px;height:38px}li{gap:10px;min-height:30px;padding:4px 0}section{break-inside:auto}h2{break-after:avoid}}
    </style></head><body><div class="toolbar"><button id="print-roster" type="button">Imprimir / desar en PDF</button></div><main><h1>${escapeHtml(title)}</h1>${className ? `<p>${escapeHtml(className)}</p>` : ''}<div class="groups">${sections}</div></main></body></html>`
}

export function openGroupRosterExport(groups, options) {
  const html = buildGroupRosterHtml(groups, options)
  const output = window.open('', '_blank')
  if (!output) throw new Error('Permet obrir la finestra d’exportació al navegador i torna-ho a provar.')
  output.opener = null
  output.document.open()
  output.document.write(html)
  output.document.close()
  const button = output.document.getElementById('print-roster')
  button.onclick = async () => {
    button.disabled = true
    button.textContent = 'Preparant fotos…'
    await Promise.all([...output.document.images].map(async (photo) => {
      try { await photo.decode() } catch {
        const fallback = output.document.createElement('span')
        fallback.className = 'photo-error'
        fallback.textContent = 'Foto no disponible'
        photo.replaceWith(fallback)
      }
    }))
    button.disabled = false
    button.textContent = 'Imprimir / desar en PDF'
    output.focus()
    output.print()
  }
}
