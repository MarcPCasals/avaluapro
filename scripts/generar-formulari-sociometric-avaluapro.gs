/**
 * Plantilla reutilitzable per crear formularis sociometrics d'Avaluapro.
 *
 * Com s'utilitza:
 * 1. Crea un Google Sheets.
 * 2. Ves a Extensions > Apps Script.
 * 3. Enganxa aquest fitxer i desa'l.
 * 4. Recarrega el Google Sheets.
 * 5. Al menu Avaluapro, clica "Preparar plantilla".
 * 6. Enganxa els alumnes a la pestanya "Alumnes".
 * 7. Al menu Avaluapro, clica "Crear formulari sociometric".
 *
 * El formulari generat crea respostes amb aquestes columnes:
 * Alumne | Eleccio 1 | Eleccio 2 | Eleccio 3 | Eleccio 4 | Rebuig 1 | Rebuig 2 | Rebuig 3
 *
 * Aquest format es pot importar directament a Avaluapro.
 */

var AVALUAPRO_SHEETS = {
  config: 'Configuració',
  students: 'Alumnes',
  links: 'Enllaços',
  importSheet: 'Import Avaluapro'
};

var AVALUAPRO_DEFAULTS = {
  classe: '2n B',
  eleccionsPositives: 4,
  rebuigs: 3
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Avaluapro')
    .addItem('Preparar plantilla', 'prepararPlantillaSociometricaAvaluapro')
    .addItem('Crear formulari sociomètric', 'crearFormulariSociometricAvaluapro')
    .addItem("Crear full d'importació", 'crearFullImportAvaluapro')
    .addToUi();
}

function prepararPlantillaSociometricaAvaluapro() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.config);
  var studentsSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.students);
  var linksSheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.links);

  prepararConfig_(configSheet);
  prepararAlumnes_(studentsSheet);
  prepararEnllacos_(linksSheet);

  spreadsheet.setActiveSheet(studentsSheet);
  SpreadsheetApp.getUi().alert('Plantilla preparada. Enganxa els alumnes a la pestanya "Alumnes" i després crea el formulari.');
}

function crearFormulariSociometricAvaluapro() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  assegurarPlantilla_(spreadsheet);

  var config = llegirConfiguracio_(spreadsheet);
  var alumnes = llegirAlumnes_(spreadsheet);
  validarConfiguracio_(config, alumnes);

  var form = FormApp.create('Avaluapro - qüestionari sociomètric - ' + config.classe);
  form.setDescription([
    'Classe: ' + config.classe,
    '',
    'Aquest qüestionari serveix per entendre millor les relacions del grup i ajudar el tutor/a a organitzar grups, espais i suport entre companys.',
    'Respon amb sinceritat i respecte.'
  ].join('\n'));
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Resposta registrada. Gràcies per ajudar a entendre millor el grup.');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  form.addSectionHeaderItem()
    .setTitle('Identificació')
    .setHelpText('Tria el teu nom abans de respondre.');

  form.addListItem()
    .setTitle('Alumne')
    .setChoiceValues(alumnes)
    .setRequired(true);

  form.addPageBreakItem()
    .setTitle('Eleccions positives')
    .setHelpText("Tria " + config.eleccionsPositives + " companys o companyes amb qui t'agrada estar al pati o treballar.");

  for (var positiveIndex = 1; positiveIndex <= config.eleccionsPositives; positiveIndex += 1) {
    form.addListItem()
      .setTitle('Elecció ' + positiveIndex)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(alumnes)
      .setRequired(true);
  }

  form.addPageBreakItem()
    .setTitle('Rebuigs o dificultats')
    .setHelpText('Tria ' + config.rebuigs + ' companys o companyes amb qui et costa més estar o treballar.');

  for (var rejectIndex = 1; rejectIndex <= config.rebuigs; rejectIndex += 1) {
    form.addListItem()
      .setTitle('Rebuig ' + rejectIndex)
      .setHelpText('No et triis a tu mateix/a i intenta no repetir persones.')
      .setChoiceValues(alumnes)
      .setRequired(true);
  }

  form.addPageBreakItem()
    .setTitle('Revisa les respostes')
    .setHelpText("Abans d'enviar, comprova que no has repetit noms ni t'has triat a tu mateix/a.");

  registrarEnllacos_(spreadsheet, {
    classe: config.classe,
    editUrl: form.getEditUrl(),
    responseUrl: form.getPublishedUrl(),
    sheetUrl: spreadsheet.getUrl()
  });
  crearFullImportAvaluapro();

  SpreadsheetApp.getUi().alert([
    'Formulari creat correctament.',
    '',
    'Enllaç per editar: ' + form.getEditUrl(),
    '',
    'Enllaç per respondre: ' + form.getPublishedUrl(),
    '',
    'Els enllaços també han quedat guardats a la pestanya "Enllaços".'
  ].join('\n'));
}

function crearFullImportAvaluapro() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  assegurarPlantilla_(spreadsheet);

  var config = llegirConfiguracio_(spreadsheet);
  var alumnes = llegirAlumnes_(spreadsheet);
  validarConfiguracio_(config, alumnes);

  var sheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.importSheet);
  sheet.clear();

  var header = crearCapcalera_(config);
  var rows = [];

  for (var rowIndex = 0; rowIndex < alumnes.length; rowIndex += 1) {
    var row = [alumnes[rowIndex]];
    for (var columnIndex = 1; columnIndex < header.length; columnIndex += 1) {
      row.push('');
    }
    rows.push(row);
  }

  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#eef2ff');

  spreadsheet.setActiveSheet(sheet);
}

function assegurarPlantilla_(spreadsheet) {
  if (!spreadsheet.getSheetByName(AVALUAPRO_SHEETS.config)
    || !spreadsheet.getSheetByName(AVALUAPRO_SHEETS.students)
    || !spreadsheet.getSheetByName(AVALUAPRO_SHEETS.links)) {
    prepararPlantillaSociometricaAvaluapro();
  }
}

function prepararConfig_(sheet) {
  sheet.clear();
  sheet.getRange('A1:B1').setValues([['Camp', 'Valor']]);
  sheet.getRange('A2:B4').setValues([
    ['Classe', AVALUAPRO_DEFAULTS.classe],
    ['Eleccions positives', AVALUAPRO_DEFAULTS.eleccionsPositives],
    ['Rebuigs', AVALUAPRO_DEFAULTS.rebuigs]
  ]);
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#eef2ff');
  sheet.autoResizeColumns(1, 2);
  sheet.setFrozenRows(1);
}

function prepararAlumnes_(sheet) {
  var lastRow = sheet.getLastRow();
  var existingStudents = [];

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var index = 0; index < values.length; index += 1) {
      var existingStudent = String(values[index][0] || '').trim();
      if (existingStudent) {
        existingStudents.push(existingStudent);
      }
    }
  }

  sheet.clear();
  sheet.getRange('A1').setValue('Alumne');
  sheet.getRange('B1').setValue('Opcional');
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#eef2ff');

  var students = existingStudents.length > 0 ? existingStudents : [
    'Andorra Serra, Laia',
    'Bonell Riba, Marc',
    'Casal Torres, Jana',
    'Duran Font, Pol',
    'Esteve Mora, Abril',
    'Ferrer Soler, Nil',
    'Garcia Vila, Ona',
    'Llop Prat, Biel',
    'Marti Costa, Cloe',
    'Noguera Puig, Quim'
  ];
  var studentRows = [];

  for (var studentIndex = 0; studentIndex < students.length; studentIndex += 1) {
    studentRows.push([students[studentIndex]]);
  }

  sheet.getRange(2, 1, studentRows.length, 1).setValues(studentRows);
  sheet.autoResizeColumns(1, 2);
  sheet.setFrozenRows(1);
}

function prepararEnllacos_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.getRange('A1:E1').setValues([[
    'Data',
    'Classe',
    'Formulari per editar',
    'Formulari per respondre',
    'Full de respostes'
  ]]);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#eef2ff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
}

function llegirConfiguracio_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(AVALUAPRO_SHEETS.config);
  var values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues();
  var config = {
    classe: AVALUAPRO_DEFAULTS.classe,
    eleccionsPositives: AVALUAPRO_DEFAULTS.eleccionsPositives,
    rebuigs: AVALUAPRO_DEFAULTS.rebuigs
  };

  for (var index = 0; index < values.length; index += 1) {
    var key = values[index][0];
    var value = values[index][1];
    var normalizedKey = normalitzarNom_(key);

    if (normalizedKey === 'classe') {
      config.classe = String(value || AVALUAPRO_DEFAULTS.classe).trim();
    }
    if (normalizedKey === 'eleccions positives') {
      config.eleccionsPositives = Number(value) || AVALUAPRO_DEFAULTS.eleccionsPositives;
    }
    if (normalizedKey === 'rebuigs') {
      config.rebuigs = Number(value) || AVALUAPRO_DEFAULTS.rebuigs;
    }
  }

  return config;
}

function llegirAlumnes_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(AVALUAPRO_SHEETS.students);
  var lastRow = sheet.getLastRow();
  var alumnes = [];

  if (lastRow < 2) {
    return alumnes;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var index = 0; index < values.length; index += 1) {
    var alumne = String(values[index][0] || '').trim();
    if (alumne) {
      alumnes.push(alumne);
    }
  }

  return alumnes;
}

function crearCapcalera_(config) {
  var header = ['Alumne'];

  for (var positiveIndex = 1; positiveIndex <= config.eleccionsPositives; positiveIndex += 1) {
    header.push('Elecció ' + positiveIndex);
  }
  for (var rejectIndex = 1; rejectIndex <= config.rebuigs; rejectIndex += 1) {
    header.push('Rebuig ' + rejectIndex);
  }

  return header;
}

function registrarEnllacos_(spreadsheet, links) {
  var sheet = getOrCreateSheet_(spreadsheet, AVALUAPRO_SHEETS.links);
  prepararEnllacos_(sheet);
  sheet.appendRow([
    new Date(),
    links.classe,
    links.editUrl,
    links.responseUrl,
    links.sheetUrl
  ]);
  sheet.autoResizeColumns(1, 5);
}

function validarConfiguracio_(config, alumnes) {
  if (!Array.isArray(alumnes) || alumnes.length === 0) {
    throw new Error('Cal omplir la pestanya "Alumnes" abans de crear el formulari.');
  }

  var seen = {};
  var hasDuplicates = false;

  for (var index = 0; index < alumnes.length; index += 1) {
    var normalizedName = normalitzarNom_(alumnes[index]);
    if (seen[normalizedName]) {
      hasDuplicates = true;
    }
    seen[normalizedName] = true;
  }

  if (hasDuplicates) {
    throw new Error('Hi ha alumnes duplicats a la pestanya "Alumnes". Revisa els noms abans de continuar.');
  }

  var minim = Math.max(config.eleccionsPositives, config.rebuigs) + 1;
  if (alumnes.length < minim) {
    throw new Error('Calen com a mínim ' + minim + ' alumnes per poder triar sense repetir-se a un mateix/a.');
  }
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function normalitzarNom_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
