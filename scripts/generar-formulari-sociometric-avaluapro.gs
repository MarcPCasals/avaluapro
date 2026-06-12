/**
 * Plantilla reutilitzable per crear formularis sociomètrics d'Avaluapro.
 *
 * Com s'utilitza:
 * 1. Crea un Google Sheets.
 * 2. Ves a Extensions > Apps Script.
 * 3. Enganxa aquest fitxer i desa'l.
 * 4. Recarrega el Google Sheets.
 * 5. Al menú Avaluapro, clica "Preparar plantilla".
 * 6. Enganxa els alumnes a la pestanya "Alumnes".
 * 7. Al menú Avaluapro, clica "Crear formulari sociomètric".
 *
 * El formulari generat crea respostes amb aquestes columnes:
 * Alumne | Elecció 1 | Elecció 2 | Elecció 3 | Elecció 4 | Rebuig 1 | Rebuig 2 | Rebuig 3
 *
 * Aquest format es pot importar directament a Avaluapro.
 */

const AVALUAPRO_SHEETS = {
  config: 'Configuració',
  students: 'Alumnes',
  links: 'Enllaços',
  import: 'Import Avaluapro',
}

const AVALUAPRO_DEFAULTS = {
  classe: '2n B',
  eleccionsPositives: 4,
  rebuigs: 3,
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Avaluapro')
    .addItem('Preparar plantilla', 'prepararPlantillaSociometricaAvaluapro')
    .addItem('Crear formulari sociomètric', 'crearFormulariSociometricAvaluapro')
    .addItem("Crear full d'importació", 'crearFullImportAvaluapro')
    .addToUi()
}

function prepararPlantillaSociometricaAvaluapro() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const configSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.config)
  const studentsSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.students)
  const linksSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.links)

  prepararConfig_(configSheet)
  prepararAlumnes_(studentsSheet)
  prepararEnllacos_(linksSheet)

  spreadsheet.setActiveSheet(studentsSheet)
  SpreadsheetApp.getUi().alert('Plantilla preparada. Enganxa els alumnes a la pestanya "Alumnes" i després crea el formulari.')
}

function crearFormulariSociometricAvaluapro() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  assegurarPlantilla_(spreadsheet)

  const config = llegirConfiguracio_(spreadsheet)
  const alumnes = llegirAlumnes_(spreadsheet)
  validarConfiguracio_(config, alumnes)

  const form = FormApp.create(`Avaluapro - qüestionari sociomètric - ${config.classe}`)
  form.setDescription(
    [
      `Classe: ${config.classe}`,
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
    .setChoiceValues(alumnes)
    .setRequired(true)

  form.addPageBreakItem()
    .setTitle('Eleccions positives')
    .setHelpText(`Tria ${config.eleccionsPositives} companys o companyes amb qui t'agrada estar al pati o treballar.`)

  for (let index = 1; index <= config.eleccionsPositives; index += 1) {
    form.addListItem()
      .setTitle(`Elecció ${index}`)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(alumnes)
      .setRequired(true)
  }

  form.addPageBreakItem()
    .setTitle('Rebuigs o dificultats')
    .setHelpText(`Tria ${config.rebuigs} companys o companyes amb qui et costa més estar o treballar.`)

  for (let index = 1; index <= config.rebuigs; index += 1) {
    form.addListItem()
      .setTitle(`Rebuig ${index}`)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(alumnes)
      .setRequired(true)
  }

  form.addPageBreakItem()
    .setTitle('Revisa les respostes')
    .setHelpText("Abans d'enviar, comprova que no has repetit noms ni t'has triat a tu mateix/a.")

  registrarEnllacos_(spreadsheet, {
    classe: config.classe,
    editUrl: form.getEditUrl(),
    responseUrl: form.getPublishedUrl(),
    sheetUrl: spreadsheet.getUrl(),
  })
  crearFullImportAvaluapro()

  SpreadsheetApp.getUi().alert(
    [
      'Formulari creat correctament.',
      '',
      `Enllaç per editar: ${form.getEditUrl()}`,
      '',
      `Enllaç per respondre: ${form.getPublishedUrl()}`,
      '',
      'Els enllaços també han quedat guardats a la pestanya "Enllaços".',
    ].join('\n'),
  )
}

function crearFullImportAvaluapro() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  assegurarPlantilla_(spreadsheet)

  const config = llegirConfiguracio_(spreadsheet)
  const alumnes = llegirAlumnes_(spreadsheet)
  validarConfiguracio_(config, alumnes)

  const sheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.import)
  sheet.clear()

  const header = crearCapcalera_(config)
  const rows = alumnes.map((alumne) => [alumne].concat(Array(header.length - 1).fill('')))

  sheet.getRange(1, 1, 1, header.length).setValues([header])
  sheet.getRange(2, 1, rows.length, header.length).setValues(rows)
  sheet.setFrozenRows(1)
  sheet.autoResizeColumns(1, header.length)
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#eef2ff')

  spreadsheet.setActiveSheet(sheet)
}

function assegurarPlantilla_(spreadsheet) {
  if (!spreadsheet.getSheetByName(AVALUAPRO_SHEETS.config)
    || !spreadsheet.getSheetByName(AVALUAPRO_SHEETS.students)
    || !spreadsheet.getSheetByName(AVALUAPRO_SHEETS.links)) {
    prepararPlantillaSociometricaAvaluapro()
  }
}

function prepararConfig_(sheet) {
  sheet.clear()
  sheet.getRange('A1:B1').setValues([['Camp', 'Valor']])
  sheet.getRange('A2:B4').setValues([
    ['Classe', AVALUAPRO_DEFAULTS.classe],
    ['Eleccions positives', AVALUAPRO_DEFAULTS.eleccionsPositives],
    ['Rebuigs', AVALUAPRO_DEFAULTS.rebuigs],
  ])
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#eef2ff')
  sheet.autoResizeColumns(1, 2)
  sheet.setFrozenRows(1)
}

function prepararAlumnes_(sheet) {
  const lastRow = sheet.getLastRow()
  const existingStudents = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(Boolean)
    : []

  sheet.clear()
  sheet.getRange('A1').setValue('Alumne')
  sheet.getRange('B1').setValue('Opcional')
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#eef2ff')

  const students = existingStudents.length > 0
    ? existingStudents
    : [
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

  sheet.getRange(2, 1, students.length, 1).setValues(students.map((student) => [student]))
  sheet.autoResizeColumns(1, 2)
  sheet.setFrozenRows(1)
}

function prepararEnllacos_(sheet) {
  if (sheet.getLastRow() > 0) {
    return
  }

  sheet.getRange('A1:E1').setValues([[
    'Data',
    'Classe',
    'Formulari per editar',
    'Formulari per respondre',
    'Full de respostes',
  ]])
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#eef2ff')
  sheet.setFrozenRows(1)
  sheet.autoResizeColumns(1, 5)
}

function llegirConfiguracio_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(AVALUAPRO_SHEETS.config)
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues()
  const config = {
    classe: AVALUAPRO_DEFAULTS.classe,
    eleccionsPositives: AVALUAPRO_DEFAULTS.eleccionsPositives,
    rebuigs: AVALUAPRO_DEFAULTS.rebuigs,
  }

  values.forEach(([key, value]) => {
    const normalizedKey = normalitzarNom_(key)
    if (normalizedKey === 'classe') {
      config.classe = String(value || AVALUAPRO_DEFAULTS.classe).trim()
    }
    if (normalizedKey === 'eleccions positives') {
      config.eleccionsPositives = Number(value) || AVALUAPRO_DEFAULTS.eleccionsPositives
    }
    if (normalizedKey === 'rebuigs') {
      config.rebuigs = Number(value) || AVALUAPRO_DEFAULTS.rebuigs
    }
  })

  return config
}

function llegirAlumnes_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(AVALUAPRO_SHEETS.students)
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) {
    return []
  }

  return sheet.getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat()
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function crearCapcalera_(config) {
  const header = ['Alumne']
  for (let index = 1; index <= config.eleccionsPositives; index += 1) {
    header.push(`Elecció ${index}`)
  }
  for (let index = 1; index <= config.rebuigs; index += 1) {
    header.push(`Rebuig ${index}`)
  }
  return header
}

function registrarEnllacos_(spreadsheet, links) {
  const sheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.links)
  prepararEnllacos_(sheet)
  sheet.appendRow([
    new Date(),
    links.classe,
    links.editUrl,
    links.responseUrl,
    links.sheetUrl,
  ])
  sheet.autoResizeColumns(1, 5)
}

function validarConfiguracio_(config, alumnes) {
  if (!Array.isArray(alumnes) || alumnes.length === 0) {
    throw new Error('Cal omplir la pestanya "Alumnes" abans de crear el formulari.')
  }

  const nomsNormalitzats = alumnes.map((nom) => normalitzarNom_(nom))
  const nomsDuplicats = nomsNormalitzats.filter((nom, index) => nomsNormalitzats.indexOf(nom) !== index)

  if (nomsDuplicats.length > 0) {
    throw new Error('Hi ha alumnes duplicats a la pestanya "Alumnes". Revisa els noms abans de continuar.')
  }

  const minim = Math.max(config.eleccionsPositives, config.rebuigs) + 1
  if (alumnes.length < minim) {
    throw new Error(`Calen com a mínim ${minim} alumnes per poder triar sense repetir-se a un mateix/a.`)
  }
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name)
}

function normalitzarNom_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
