/**
 * Format lleuger i segur per a textos pedagògics. Només interpreta negreta
 * (**text**) i cursiva (*text*); la resta sempre es conserva com a text pla.
 */
export function parseInlineFormatting(value = '') {
  const text = String(value || '')
  const tokens = []
  const pattern = /\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*/g
  let cursor = 0
  let match = pattern.exec(text)
  while (match) {
    if (match.index > cursor) tokens.push({ text: text.slice(cursor, match.index), type: 'text' })
    const type = match[1] !== undefined ? 'boldItalic' : match[2] !== undefined ? 'bold' : 'italic'
    tokens.push({ text: match[1] ?? match[2] ?? match[3], type })
    cursor = match.index + match[0].length
    match = pattern.exec(text)
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), type: 'text' })
  return tokens
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Converteix el format intern en HTML segur per a l'editor visual. */
export function inlineFormattingToHtml(value = '') {
  return parseInlineFormatting(value).map((token) => {
    const text = escapeHtml(token.text).replaceAll('\n', '<br>')
    if (token.type === 'boldItalic') return `<strong><em>${text}</em></strong>`
    if (token.type === 'bold') return `<strong>${text}</strong>`
    if (token.type === 'italic') return `<em>${text}</em>`
    return text
  }).join('')
}

export function stripInlineFormatting(value = '') {
  return parseInlineFormatting(value).map((token) => token.text).join('')
}
