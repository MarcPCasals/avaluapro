/**
 * Generador de formulari sociomètric per a Avaluapro.
 *
 * Com s'utilitza:
 * 1. Ves a https://script.google.com/
 * 2. Crea un projecte nou.
 * 3. Enganxa aquest fitxer.
 * 4. Substitueix la llista ALUMNES pels alumnes reals de la classe.
 * 5. Executa crearFormulariSociometricAvaluapro().
 *
 * El full de respostes que es crea queda preparat per copiar i enganxar
 * directament a Avaluapro:
 *
 * Alumne | Elecció 1 | Elecció 2 | Elecció 3 | Elecció 4 | Rebuig 1 | Rebuig 2 | Rebuig 3
 */

const CONFIG_AVALUAPRO = {
  classe: '2n B',
  centre: 'Escola Andorrana',
  eleccionsPositives: 4,
  rebuigs: 3,
}

const ALUMNES = [
  'Andorra Serra, Laia',
  'Bonell Riba, Marc',
  'Casal Torres, Jana',
  'Duran Font, Pol',
  'Esteve Mora, Abril',
  'Ferrer Soler, Nil',
  'Garcia Vila, Ona',
  'Llop Prat, Biel',
  'Marti Costa, Cloe',
  'Noguera Puig, Quim',
]

function crearFormulariSociometricAvaluapro() {
  validarConfiguracio_()

  const form = FormApp.create(`Avaluapro - Qüestionari sociomètric - ${CONFIG_AVALUAPRO.classe}`)
  const spreadsheet = SpreadsheetApp.create(`Avaluapro - Respostes sociomètriques - ${CONFIG_AVALUAPRO.classe}`)

  form.setDescription(
    [
      `Classe: ${CONFIG_AVALUAPRO.classe}`,
      '',
      'Aquest qüestionari serveix per entendre millor les relacions del grup i ajudar el tutor/a a organitzar grups, espais i suport entre companys.',
      'Respon amb sinceritat i respecte.',
    ].join('\n'),
  )
  form.setProgressBar(true)
  form.setCollectEmail(false)
  form.setLimitOneResponsePerUser(false)
  form.setShowLinkToRespondAgain(false)
  form.setConfirmationMessage('Resposta registrada. Gràcies per ajudar a entendre millor el grup.')
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId())

  form.addSectionHeaderItem()
    .setTitle('Identificació')
    .setHelpText('Tria el teu nom abans de respondre.')

  form.addListItem()
    .setTitle('Alumne')
    .setChoiceValues(ALUMNES)
    .setRequired(true)

  form.addPageBreakItem()
    .setTitle('Eleccions positives')
    .setHelpText(`Tria ${CONFIG_AVALUAPRO.eleccionsPositives} companys o companyes amb qui t'agrada estar al pati o treballar.`)

  for (let index = 1; index <= CONFIG_AVALUAPRO.eleccionsPositives; index += 1) {
    form.addListItem()
      .setTitle(`Elecció ${index}`)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(ALUMNES)
      .setRequired(true)
  }

  form.addPageBreakItem()
    .setTitle('Rebuigs o dificultats')
    .setHelpText(`Tria ${CONFIG_AVALUAPRO.rebuigs} companys o companyes amb qui et costa mes estar o treballar.`)

  for (let index = 1; index <= CONFIG_AVALUAPRO.rebuigs; index += 1) {
    form.addListItem()
      .setTitle(`Rebuig ${index}`)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(ALUMNES)
      .setRequired(true)
  }

  form.addPageBreakItem()
    .setTitle('Revisa les respostes')
    .setHelpText('Abans d\'enviar, comprova que no has repetit noms ni t\'has triat a tu mateix/a.')

  Logger.log(`Formulari per editar: ${form.getEditUrl()}`)
  Logger.log(`Formulari per respondre: ${form.getPublishedUrl()}`)
  Logger.log(`Full de respostes: ${spreadsheet.getUrl()}`)
}

function crearFullPlantillaSociometricaAvaluapro() {
  validarConfiguracio_()

  const spreadsheet = SpreadsheetApp.create(`Avaluapro - Plantilla sociograma - ${CONFIG_AVALUAPRO.classe}`)
  const sheet = spreadsheet.getActiveSheet()
  sheet.setName('Import Avaluapro')

  const header = [
    'Alumne',
    'Elecció 1',
    'Elecció 2',
    'Elecció 3',
    'Elecció 4',
    'Rebuig 1',
    'Rebuig 2',
    'Rebuig 3',
  ]
  const rows = ALUMNES.map((alumne) => [alumne, '', '', '', '', '', '', ''])

  sheet.getRange(1, 1, 1, header.length).setValues([header])
  sheet.getRange(2, 1, rows.length, header.length).setValues(rows)
  sheet.setFrozenRows(1)
  sheet.autoResizeColumns(1, header.length)

  Logger.log(`Plantilla creada: ${spreadsheet.getUrl()}`)
}

function validarConfiguracio_() {
  if (!Array.isArray(ALUMNES) || ALUMNES.length === 0) {
    throw new Error('Cal omplir la llista ALUMNES abans de crear el formulari.')
  }

  const nomsNormalitzats = ALUMNES.map((nom) => normalitzarNom_(nom))
  const nomsDuplicats = nomsNormalitzats.filter((nom, index) => nomsNormalitzats.indexOf(nom) !== index)

  if (nomsDuplicats.length > 0) {
    throw new Error('Hi ha alumnes duplicats a la llista. Revisa els noms abans de continuar.')
  }

  const minim = Math.max(CONFIG_AVALUAPRO.eleccionsPositives, CONFIG_AVALUAPRO.rebuigs) + 1
  if (ALUMNES.length < minim) {
    throw new Error(`Calen com a mínim ${minim} alumnes per poder triar sense repetir-se a un mateix/a.`)
  }
}

function normalitzarNom_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
