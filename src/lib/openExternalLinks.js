/**
 * Intenta obrir tots els enllaços durant el mateix gest de l'usuari i retorna
 * els que el bloquejador de finestres emergents no ha autoritzat.
 */
export function openExternalLinks(links = [], openWindow) {
  const openLink = openWindow || ((...args) => globalThis.open?.(...args))
  return links.filter((link) => {
    let openedWindow
    try {
      openedWindow = openLink(link.url, '_blank')
    } catch {
      return true
    }
    if (!openedWindow) return true
    try {
      openedWindow.opener = null
    } catch {
      // Alguns navegadors protegeixen aquesta propietat; l'enllaç ja és obert.
    }
    return false
  })
}
