const DEFAULT_MAX_SIZE = 360
const DEFAULT_QUALITY = 0.82
const DEFAULT_MAX_SOURCE_BYTES = 12 * 1024 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 220 * 1024

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || ''
  return Math.round((base64.length * 3) / 4)
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No s’ha pogut llegir la imatge.'))
    }

    image.src = url
  })
}

export async function imageFileToCompressedDataUrl(file, options = {}) {
  if (!file) return ''
  if (!file.type.startsWith('image/')) {
    throw new Error('El fitxer seleccionat no és una imatge.')
  }

  const maxSourceBytes = options.maxSourceBytes || DEFAULT_MAX_SOURCE_BYTES
  if (file.size > maxSourceBytes) {
    throw new Error(
      `Aquesta imatge pesa massa (${Math.round(file.size / 1024 / 1024)} MB). Tria una imatge més petita o fes-ne una captura retallada.`,
    )
  }

  const maxSize = options.maxSize || DEFAULT_MAX_SIZE
  const quality = options.quality || DEFAULT_QUALITY
  const minQuality = options.minQuality || 0.58
  const maxOutputBytes = options.maxOutputBytes || DEFAULT_MAX_OUTPUT_BYTES
  const image = await loadImageFromFile(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const baseScale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
  const attempts = [
    { scale: baseScale, quality },
    { scale: baseScale, quality: Math.max(minQuality, quality - 0.12) },
    { scale: baseScale * 0.82, quality: Math.max(minQuality, quality - 0.18) },
    { scale: baseScale * 0.68, quality: Math.max(minQuality, quality - 0.24) },
  ]

  for (const attempt of attempts) {
    const width = Math.max(1, Math.round(image.naturalWidth * attempt.scale))
    const height = Math.max(1, Math.round(image.naturalHeight * attempt.scale))

    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', attempt.quality)
    if (estimateDataUrlBytes(dataUrl) <= maxOutputBytes) {
      return dataUrl
    }
  }

  throw new Error(
    'La imatge continua sent massa gran després de comprimir-la. Retalla-la o fes servir una versió amb menys resolució.',
  )
}
