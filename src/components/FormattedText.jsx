import { parseInlineFormatting } from '../lib/formattedText'
import './formattedText.css'

export function FormattedText({ as: Tag = 'span', className = '', text = '', ...props }) {
  const tokens = parseInlineFormatting(text)
  return (
    <Tag {...props} className={`formatted-text ${className}`.trim()}>
      {tokens.map((token, index) => token.type === 'boldItalic'
        ? <strong key={`${index}:${token.text}`}><em>{token.text}</em></strong>
        : token.type === 'bold'
          ? <strong key={`${index}:${token.text}`}>{token.text}</strong>
          : token.type === 'italic'
            ? <em key={`${index}:${token.text}`}>{token.text}</em>
            : token.text)}
    </Tag>
  )
}
