const DEFAULT_MAX_SIZE = 360
const DEFAULT_QUALITY = 0.82

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

  const maxSize = options.maxSize || DEFAULT_MAX_SIZE
  const quality = options.quality || DEFAULT_QUALITY
  const image = await loadImageFromFile(file)
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}
