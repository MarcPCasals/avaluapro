function materialLink(material, audience, url) {
  return {
    ...material,
    audience,
    url,
  }
}

/**
 * Retorna els enllaços reals d'una activitat. El format nou desa el recurs
 * docent opcional dins del mateix material d'alumnat; el format anterior,
 * amb dos materials independents, continua sent compatible.
 */
export function getActivityMaterialLinks(activity = {}) {
  const links = [
    ...(activity.studentMaterials || []).flatMap((material) => [
      material?.kind === 'link' && material.url
        ? materialLink(material, 'students', material.url)
        : null,
      material?.kind === 'link' && material.teacherUrl
        ? materialLink(material, 'teacher', material.teacherUrl)
        : null,
    ]),
    ...(activity.teacherMaterials || []).map((material) => (
      material?.kind === 'link' && material.url
        ? materialLink(material, 'teacher', material.url)
        : null
    )),
  ].filter(Boolean)

  return [...new Map(links.map((material) => [material.url, material])).values()]
}
