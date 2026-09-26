/**
 * Format lleuger i segur per a textos pedagògics. Només interpreta negreta
 * (**text**) i cursiva (*text*); la resta sempre es conserva com a text pla.
 */
export function parseInlineFormatting(value = '') {
  const text = String(value || '')
  const tokens = []
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g
  let cursor = 0
  let match = pattern.exec(text)
  while (match) {
    if (match.index > cursor) tokens.push({ text: text.slice(cursor, match.index), type: 'text' })
    tokens.push({ text: match[1] ?? match[2], type: match[1] !== undefined ? 'bold' : 'italic' })
    cursor = match.index + match[0].length
    match = pattern.exec(text)
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), type: 'text' })
  return tokens
}

export function stripInlineFormatting(value = '') {
  return parseInlineFormatting(value).map((token) => token.text).join('')
}
