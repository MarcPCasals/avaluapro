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

/**
 * Combina els materials propis d'una activitat amb els que s'han configurat
 * una sola vegada per a tota la UP. La deduplicació per URL evita obrir dues
 * vegades un recurs que també s'hagi afegit expressament a una activitat.
 */
export function getEffectiveActivityMaterialLinks(activity = {}, planningUnit = {}) {
  const transversalActivity = {
    studentMaterials: planningUnit.transversalMaterials || [],
    teacherMaterials: [],
  }
  const links = [
    ...getActivityMaterialLinks(activity),
    ...getActivityMaterialLinks(transversalActivity).map((material) => ({
      ...material,
      transversal: true,
    })),
  ]
  return [...new Map(links.map((material) => [material.url, material])).values()]
}
