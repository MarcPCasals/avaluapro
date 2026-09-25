const dyslexiaSections = [
  {
    title: 'Dislèxia · Descripció',
    tone: 'blue',
    items: [
      'La dislèxia afecta principalment les habilitats implicades en la lectura fluent de les paraules i en la seva escriptura.',
      'Fonamentalment estan alterades les habilitats de consciència fonològica, memòria verbal i velocitat de processament verbal.',
      'Es dona al marge de les habilitats intel·lectuals i sense alteracions neurològiques o sensorials que ho justifiquin.',
      'La gravetat dependrà de la qualitat i precocitat del suport rebut tant en l’àmbit familiar com en l’escolar.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Fer saber a l’alumne/a que coneixem les seves dificultats, ens interessem per ell/a i l’ajudarem perquè tingui les mateixes oportunitats que els companys/es.',
      'Comprendre que presentar dificultats en el llenguatge escrit pot provocar frustracions, estrès, pressió i cansament.',
      'Evitar expressions com “esforça’t més” o “fixa-t’hi més”, perquè sovint l’alumnat ja s’esforça però no obté els resultats esperats.',
      'Ser flexible amb allò relacionat amb el seu dèficit: oblidar coses que abans sabia, llegir malament o cometre molts errors ortogràfics.',
      'Evitar situacions que el deixin en evidència davant dels altres: llegir en veu alta, rapidesa de càlcul, escriure a la pissarra o correccions públiques.',
      'Comprovar individualment que ha entès l’enunciat o la lectura abans d’iniciar l’activitat.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Evitar donar moltes ordres orals al mateix temps.',
      'Presentar els continguts curriculars amb suports variats: visuals i/o auditius.',
      'Facilitar l’ús de les TIC: lectors informàtics, llibres digitals o corrector ortogràfic.',
      'Alternar lectura autònoma amb lectura del docent, d’un company o amb suport d’àudio o síntesi de veu.',
      'Centrar l’ensenyament en habilitats útils i transferibles més que en acumular informació innecessària.',
      'Ajudar en la gestió del temps i donar temps extra quan calgui.',
      'Oferir la lectura oral de preguntes, sobretot en tasques d’avaluació.',
      'Contemplar tasques d’avaluació orals o amb format més visual.',
      'Permetre complementar respostes amb dibuixos o gràfics.',
      'Permetre guies estructurades en redaccions.',
      'Evitar penalitzar l’ortografia quan s’avaluen altres competències.',
      'Reduir còpia de pissarra, dictats llargs o transcripció mecànica quan no aporten valor a l’objectiu d’aprenentatge.',
      'Fragmentar textos i intercalar preguntes de comprensió durant la lectura, no només al final.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Evitar textos en majúscules i/o cursives.',
      'Augmentar mida de lletra i interlineat i evitar justificar el text quan sigui possible.',
      'Utilitzar instruccions clares, concises i amb llenguatge simple.',
      'Utilitzar enunciats curts, sense subordinades complexes.',
      'Separar visualment operacions i/o dades.',
      'Utilitzar una numeració clara, que no es confongui amb lletres.',
      'Evitar preguntes molt llargues o obertes quan cal organitzar moltes idees per escrit; millor preguntes concretes.',
      'Destacar el més important en negreta.',
      'Permetre preparar amb antelació lectures en veu alta si la situació li genera tensió o exposició negativa.',
    ],
  },
]

const dyscalculiaSections = [
  {
    title: 'Discalcúlia · Descripció',
    tone: 'blue',
    items: [
      'La discalcúlia és una dificultat específica d’aprenentatge que afecta la comprensió i el processament del sistema numèric, els càlculs i els conceptes matemàtics bàsics.',
      'Té una base neurobiològica i es dona al marge de les habilitats intel·lectuals.',
      'Pot provocar nerviosisme o bloqueig davant les tasques matemàtiques.',
    ],
  },
  {
    title: 'Manifestacions habituals a l’aula',
    tone: 'rose',
    items: [
      'Dificultat per reconèixer i recordar nombres, signes o seqüències numèriques.',
      'Dificultat per comprendre el concepte de quantitat, magnitud o ordre.',
      'Errors freqüents en operacions bàsiques: sumes, restes, multiplicacions o divisions.',
      'Dificultat amb el càlcul mental i el record de les taules de multiplicar.',
      'Confusió en l’ús de símbols matemàtics com >, <, =, ÷ o ×.',
      'Dificultat per estimar temps, distàncies o manejar diners.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Fer saber a l’alumne/a que coneixem les seves dificultats i que l’ajudarem perquè tingui les mateixes oportunitats que els companys/es.',
      'Reforçar la confiança i autoestima acadèmica, especialment si associa les matemàtiques amb fracàs o frustració.',
      'Evitar etiquetar o ridiculitzar davant dels errors matemàtics.',
      'Donar temps extra per comprendre els enunciats, representar el problema i revisar el resultat.',
      'Oferir ajuda individualitzada quan es presentin conceptes matemàtics nous.',
      'Valorar i fer visibles els punts forts de l’alumne/a en altres àmbits.',
      'Establir rutines clares i predictibles per reduir l’ansietat davant activitats numèriques.',
      'Tranquil·litzar i reforçar cada petit avenç perquè la dificultat no es visqui com a manca d’esforç o mandra.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Presentar els continguts matemàtics amb suports variats: manipulatius, visuals, esquemes, línies numèriques, gràfics o material concret.',
      'Relacionar els aprenentatges matemàtics amb situacions reals i quotidianes.',
      'Explicar els problemes en passos curts i visibles.',
      'Modelar verbalment el procediment mentre es resol una operació o problema perquè l’alumne pugui fer visible el pensament.',
      'Repetir i revisar conceptes bàsics abans d’introduir-ne de nous.',
      'Fer servir colors, pictogrames o codis visuals per distingir operacions i passos.',
      'Facilitar l’ús de les TIC, aplicacions interactives, calculadores o eines visuals.',
      'Permetre l’ús de calculadora, taules, fórmules o suports quan l’objectiu no sigui memoritzar el càlcul.',
      'Reduir el nombre de càlculs repetitius quan no aporten valor a l’objectiu d’aprenentatge.',
      'Permetre formes alternatives de resposta: oral, manipulativa, gràfica o digital.',
      'Estructurar la dificultat de les tasques del més fàcil al més complex per evitar bloqueig prematur.',
      'Fer autocorrecció guiada i diagnòstica, ajudant a detectar en quin pas s’ha produït l’error.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Simplificar els enunciats dels problemes: curts, clars i sense dades irrellevants.',
      'Oferir exemples resolts abans de demanar la resolució autònoma, sense donar la solució de l’exercici.',
      'Evitar l’aglomeració de números, dades o instruccions en una mateixa pregunta.',
      'Permetre respostes visuals, gràfiques o esquemàtiques en tasques numèriques.',
      'No penalitzar excessivament errors d’atenció puntuals si el procediment és correcte i l’objectiu és comprendre el procés.',
      'Ressaltar signes, unitats, desenes i centenes amb codis visuals estables.',
    ],
  },
]

const dysorthographySections = [
  {
    title: 'Disortografia · Descripció',
    tone: 'blue',
    items: [
      'La disortografia és una dificultat persistent per aplicar les convencions ortogràfiques, malgrat haver rebut ensenyament i pràctica adequats.',
      'Pot aparèixer sola o juntament amb dislèxia, però no són equivalents: una afecta especialment l’ortografia i l’altra, sobretot, la precisió i fluïdesa lectores.',
      'Els errors poden afectar la correspondència so-grafia, les regles ortogràfiques, les paraules irregulars, els accents o la segmentació de paraules.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Separar la qualitat de les idees de la correcció ortogràfica per evitar que l’alumne associï escriure amb fracassar.',
      'Corregir un nombre assumible d’errors prioritaris i evitar retornar textos completament marcats en vermell.',
      'Fer visible el progrés comparant l’alumne amb les seves produccions anteriors, no amb la velocitat dels companys.',
      'Permetre revisar en privat i donar temps per explicar oralment què volia escriure quan el text no ho reflecteix prou bé.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Ensenyar explícitament una regla o patró cada vegada, amb exemples, contraexemples i pràctica espaiada.',
      'Construir un registre personal d’errors freqüents i convertir-lo en una llista breu de revisió.',
      'Treballar famílies de paraules, morfemes, arrels i regularitats, no només la còpia repetida de paraules aïllades.',
      'Modelar una revisió per fases: primer contingut i estructura; després un o dos objectius ortogràfics concrets.',
      'Permetre diccionari, corrector i predicció de text quan l’ortografia no sigui l’objectiu que s’avalua.',
      'Combinar canals visual, auditiu i cinestèsic per fixar paraules i patrons especialment resistents.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'No descomptar reiteradament el mateix error ni penalitzar tota la producció quan s’avaluen continguts d’una altra matèria.',
      'Indicar abans de la tasca quins aspectes ortogràfics concrets es tindran en compte.',
      'Facilitar una llista de comprovació breu, exemples de referència i temps específic de revisió.',
      'Permetre lliurar textos digitals o complementar-los oralment quan l’ortografia impedeixi mostrar el coneixement real.',
    ],
  },
]

const tdaSections = [
  {
    title: 'TDA · Perfil predominantment inatent',
    tone: 'blue',
    items: [
      'En l’ús escolar habitual, TDA descriu el perfil predominantment inatent del trastorn per dèficit d’atenció amb o sense hiperactivitat.',
      'Pot manifestar-se amb oblits, pèrdua del fil, dificultat per iniciar o acabar tasques, lentitud, desorganització i poca memòria de treball.',
      'La dificultat pot passar desapercebuda perquè no sempre genera moviment, impulsivitat o conflicte a l’aula.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Comprovar discretament que ha captat l’inici de la consigna i sap quin és el primer pas.',
      'Acordar un senyal breu i privat per recuperar el fil sense exposar l’alumne davant del grup.',
      'Evitar interpretar la lentitud, els oblits o la desconnexió com a desinterès o falta d’esforç.',
      'Ajudar a estimar el temps, preparar el material i tancar cada tasca amb una comprovació final.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Donar instruccions breus, d’una en una, i deixar-ne una versió visual durant la tasca.',
      'Dividir activitats llargues en trams curts amb un punt de control visible entre trams.',
      'Utilitzar llistes de passos, temporitzadors visuals, agenda i recordatoris externs.',
      'Reduir distractors irrellevants i destacar només la informació necessària en cada moment.',
      'Alternar escolta, resposta i manipulació per evitar períodes llargs d’atenció passiva.',
      'Preveure temps addicional quan la lentitud atencional, i no el contingut, sigui la barrera.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Presentar menys exercicis per pàgina i marcar clarament on comença i acaba cada bloc.',
      'Permetre pauses breus planificades i reprendre la tasca des d’un punt assenyalat.',
      'Fer comprovacions intermèdies en proves llargues perquè un error d’inici no arrossegui tota l’activitat.',
      'Permetre eines d’organització i formats alternatius quan la doble demanda d’atendre i escriure penalitzi massa.',
    ],
  },
]

const tdahSections = [
  {
    title: 'TDAH · Descripció',
    tone: 'blue',
    items: [
      'Es caracteritza per un nivell d’impulsivitat, activitat i atenció no adequats a l’edat de desenvolupament.',
      'En aquest perfil, les dificultats d’atenció s’acompanyen d’hiperactivitat i/o impulsivitat amb impacte funcional a l’aula.',
      'Pot haver-hi necessitat intensa de moviment, dificultat per esperar, interrupcions, respostes precipitades i regulació emocional variable.',
      'Té base neurobiològica i pot afectar el rendiment per impulsivitat, poca planificació, dificultats de memòria de treball i fatiga d’autoregulació.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Fer saber a l’alumne/a que coneixem les seves dificultats i que l’ajudarem a gestionar-les.',
      'Establir rutines clares, previsibles i visuals.',
      'Seure’l en una zona amb menys distractors, idealment prop de l’adult i lluny de porta o finestra si això l’ajuda.',
      'Donar instruccions breus, concretes i d’una en una.',
      'Afavorir el contacte visual abans de donar indicacions importants.',
      'Reforçar positivament les conductes adequades i els petits progressos.',
      'Utilitzar senyals no verbals pactats per redirigir l’atenció sense exposar-lo davant del grup.',
      'Comprovar que ha anotat deures, tasques o consignes importants abans d’acabar la classe.',
      'Ajudar-lo a planificar el temps i a dividir les tasques, anticipant també els moments d’espera.',
      'Treballar estratègies d’autoinstruccions i revisió.',
      'Ajudar-lo a organitzar el material i l’espai de treball.',
      'Evitar que el dèficit d’atenció es converteixi en etiqueta personal.',
      'Afavorir la participació en tasques breus i amb rols actius.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Dividir les tasques llargues en parts curtes amb objectius visibles.',
      'Evitar demanar moltes tasques simultànies o consignes encadenades sense suport visual.',
      'Alternar activitats de moviment amb activitats més sedentàries i assignar encàrrecs funcionals que permetin moure’s amb propòsit.',
      'Utilitzar suports visuals, auditius i cinestèsics.',
      'Fer pauses breus i estructurades quan sigui necessari.',
      'Fer preguntes directes i freqüents per mantenir l’atenció.',
      'Utilitzar resums freqüents del que s’està treballant.',
      'Afavorir el treball cooperatiu en grups petits i amb rols definits.',
      'Utilitzar les TIC per estructurar tasques, temporitzar i reforçar continguts.',
      'Permetre moviment controlat si ajuda a regular-se i pactar com tornar a la tasca.',
      'Revisar la comprensió abans de començar la tasca.',
      'Ampliar el temps en activitats o proves quan calgui, aproximadament un 30% si és necessari.',
      'Permetre fer algunes proves en un espai amb menys estímuls si el context general interfereix massa.',
      'Permetre respostes orals o formats alternatius quan l’escriptura sostinguda interfereixi en l’avaluació.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Separar els exercicis per passos i visualitzar clarament què cal fer en cada moment.',
      'Donar instruccions breus i destacar el més important en negreta.',
      'Incloure exemples o models de resposta, sense donar la solució de la tasca.',
      'Ressaltar paraules clau, dades rellevants i verb d’acció dels enunciats.',
      'Permetre calculadora o altres ajudes quan l’objectiu no sigui memoritzar càlcul i la doble demanda atencional penalitzi massa.',
    ],
  },
]

const teaSections = [
  {
    title: 'TEA · Descripció',
    tone: 'blue',
    items: [
      'El Trastorn de l’Espectre Autista és un trastorn del neurodesenvolupament.',
      'Pot implicar dificultats en la comunicació i la interacció social.',
      'Pot implicar patrons repetitius de conducta, interessos restringits i necessitat d’estructura, rutina i predictibilitat.',
      'Pot anar associat a dificultats sensorials o maneres diferents de processar la informació.',
      'Les manifestacions són molt heterogènies: no tots els alumnes amb TEA tenen les mateixes necessitats.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Establir una relació de confiança i seguretat.',
      'Fer saber a l’alumne/a que coneixem les seves necessitats i que l’ajudarem a anticipar i comprendre les situacions escolars.',
      'Utilitzar un llenguatge clar, directe i sense dobles sentits quan calgui.',
      'Anticipar canvis en rutines, espais, professorat o activitats.',
      'Oferir espais o moments de calma si hi ha sobrecàrrega sensorial o emocional.',
      'Respectar els interessos especials i utilitzar-los com a via de motivació quan sigui possible.',
      'Validar les emocions i ajudar-lo a identificar-les i regular-les.',
      'Evitar interpretar conductes de bloqueig, rigidesa o aïllament com a manca de voluntat.',
      'Acompanyar les situacions socials i el treball en grup amb suports explícits.',
      'Destacar les fortaleses de l’alumne/a i evitar centrar-se només en les dificultats.',
      'Evitar confrontacions directes quan està desregulat; és preferible reconduir amb calma, alternatives i espais de regulació.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Donar consignes curtes i concretes i comprovar-ne la comprensió.',
      'Utilitzar horaris visuals, esquemes, seqüències de passos o anticipadors.',
      'Dividir projectes o tasques obertes en subtasques clares.',
      'Utilitzar suports visuals per explicar normes, rutines i processos.',
      'Afavorir el treball individual o en parelles estables abans de passar a grups grans.',
      'Definir rols clars en activitats cooperatives.',
      'Permetre certa flexibilitat en activitats socials o cooperatives si generen ansietat.',
      'Utilitzar interessos de l’alumne/a per connectar amb continguts curriculars.',
      'Fer repassos, esquemes i síntesis previsibles.',
      'Regular l’ambient sensorial: soroll, llum, acumulació d’estímuls o moviment.',
      'Preveure espais de regulació o pauses si cal.',
      'Comprovar individualment la comprensió dels enunciats, especialment en proves o activitats noves.',
      'Reduir o prioritzar volum de tasques quan la sobrecàrrega impedeixi mostrar realment què sap.',
      'Utilitzar TIC, pictogrames, esquemes o altres suports visuals.',
      'Ampliar el temps per processar la informació i respondre.',
      'Permetre formes alternatives de resposta: oral, visual, escrita breu o digital.',
      'Avaluar també el procés, l’esforç i l’ús d’estratègies, no només el producte final.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Utilitzar consignes clares, literals i sense ambigüitats.',
      'Evitar tasques massa obertes sense estructura.',
      'Presentar situacions o problemes amb contextos neutres i reals, evitant metàfores o dobles sentits si no són l’objectiu d’aprenentatge.',
      'Evitar enunciats oberts o abstractes sense exemples o passos previs.',
    ],
  },
]

const qiLimitSections = [
  {
    title: 'QI límit · Descripció',
    tone: 'blue',
    items: [
      'Fa referència a un funcionament cognitiu situat en una zona límit, que pot fer que l’alumne/a necessiti més temps, més estructura i més suport per consolidar aprenentatges.',
      'Pot afectar el raonament abstracte, la planificació, la resolució de problemes, la comprensió d’idees complexes i la transferència d’allò après a situacions noves.',
      'Les necessitats no depenen només de la capacitat individual: també depenen de les demandes de l’entorn, les rutines, els suports i la manera com es presenten les tasques.',
      'És important observar també habilitats adaptatives: autonomia, organització, participació, relació amb iguals i capacitat de seguir normes o rutines.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Fixar objectius assolibles i visibles, amb temps suficient per consolidar-los abans d’augmentar la dificultat.',
      'Validar l’esforç i separar la dificultat global d’aprenentatge de la manca de voluntat.',
      'Evitar infantilitzar: adaptar la complexitat mantenint materials, temes i tracte adequats a l’edat.',
      'Reforçar autonomia, presa de decisions i habilitats adaptatives dins de les rutines ordinàries.',
      'Fer explícit què ja sap fer, quin és el pas següent i quina ajuda pot demanar.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Fraccionar les tasques en passos curts i visibles.',
      'Partir d’exemples concrets i materials manipulatius abans d’avançar cap a l’abstracció.',
      'Modelar el procediment, practicar-lo de manera guiada i retirar l’ajuda gradualment.',
      'Repetir aprenentatges essencials en contextos diferents per afavorir-ne la transferència.',
      'Reduir simultaneïtat: una demanda cognitiva principal cada vegada i passos curts i visibles.',
      'Activar coneixements previs i connectar explícitament el contingut nou amb allò ja consolidat.',
      'Prioritzar competències essencials i funcionals quan hi hagi un decalatge global i sostingut.',
      'Fer seguiment de petites fites a curt termini i revisar-les amb l’alumne.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Reduir volum mantenint els objectius prioritaris i oferir pràctica addicional distribuïda en el temps.',
      'Destacar paraules clau i separar visualment passos, dades, exemples i criteris d’èxit.',
      'Donar exemples resolts o mig resolts abans de demanar autonomia completa.',
      'Permetre més temps i formes de resposta guiades quan la càrrega cognitiva no sigui l’objectiu principal.',
      'Prioritzar criteris essencials i, si escau, marcar competències modificades al perfil de l’alumne.',
      'Organitzar la feina amb agenda, calendari, horaris o graelles visibles quan hi hagi dificultat de planificació general.',
    ],
  },
]

const tdlSections = [
  {
    title: 'TDL · Descripció',
    tone: 'blue',
    items: [
      'El trastorn del desenvolupament del llenguatge és una dificultat persistent que interfereix en la comunicació i/o l’aprenentatge quotidià.',
      'Pot afectar la comprensió oral, l’expressió, l’accés al vocabulari, la morfosintaxi, la coherència del discurs i la comprensió lectora.',
      'Les demandes lingüístiques llargues o implícites poden fer que l’alumne sembli menys autònom o menys competent del que és.',
      'Pot coexistir amb dificultats d’atenció, funcions executives o lectoescriptura, però requereix una resposta específicament lingüística.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Donar temps de processament i resposta sense completar immediatament les frases de l’alumne.',
      'Comprovar què ha entès demanant-li que expliqui o mostri el primer pas, no només preguntant “ho has entès?”.',
      'Acceptar gestos, assenyalament, dibuix o paraules clau com a suport a la comunicació.',
      'Evitar corregir públicament cada error lingüístic; reformular amb naturalitat oferint un model correcte.',
      'Preparar la participació oral i evitar situacions improvisades que el deixin en evidència.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Utilitzar frases curtes, sintaxi simple i una velocitat de parla natural però pausada.',
      'Combinar sempre que calgui llenguatge oral amb gestos, imatges, esquemes, paraules clau i exemples.',
      'Anticipar vocabulari acadèmic, verbs de consigna i conceptes nous abans de l’activitat.',
      'Donar una instrucció cada vegada, repetir-la o reformular-la i mantenir-ne un suport visual.',
      'Modelar estructures de frase, inicis de resposta i organitzadors del discurs sense donar la resposta.',
      'Fer preguntes concretes o amb alternatives abans de passar a preguntes obertes.',
      'Treballar explícitament comprensió, expressió oral, lectura i ús funcional del vocabulari.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Reduir la complexitat lingüística de l’enunciat sense rebaixar el contingut que es vol avaluar.',
      'Facilitar glossaris visuals, bancs de paraules, esquemes de frase i models de resposta.',
      'Permetre respostes orals, visuals, guiades o digitals quan l’expressió lingüística no sigui l’objectiu.',
      'Valorar separadament el coneixement del contingut i la forma lingüística.',
      'Coordinar les estratègies de l’aula amb els professionals de llenguatge i el pla individualitzat, si n’hi ha.',
    ],
  },
]

const downSyndromeSections = [
  {
    title: 'Síndrome de Down · Descripció',
    tone: 'blue',
    items: [
      'La síndrome de Down és una condició genètica associada a un perfil d’aprenentatge propi, però amb una gran variabilitat entre persones.',
      'Sovint hi ha una fortalesa relativa en el processament visual i l’aprenentatge amb models, juntament amb més dificultat en llenguatge oral, memòria auditiva i abstracció.',
      'La resposta educativa s’ha de basar en les capacitats, els interessos i les necessitats observades de l’alumne, no en expectatives fixades pel diagnòstic.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Mantenir expectatives altes i realistes, amb objectius clars i adequats a l’edat.',
      'Promoure autonomia: donar temps per intentar-ho abans d’ajudar i retirar el suport gradualment.',
      'Afavorir la participació amb companys de la mateixa edat i evitar que el suport individual l’aïlli del grup.',
      'Comprovar si audició, visió, fatiga o dificultat motriu estan interferint abans d’atribuir una resposta a manca de comprensió.',
      'Ensenyar explícitament habilitats socials i rutines, sense infantilitzar ni sobreprotegir.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Presentar la informació amb suport visual estable: model, imatge, paraula escrita, seqüència o demostració.',
      'Dividir aprenentatges en passos petits, ensenyar-los explícitament i practicar-los en contextos reals.',
      'Utilitzar la lectura i la paraula escrita per reforçar el llenguatge oral i el vocabulari.',
      'Donar temps addicional per processar, respondre i executar, evitant repetir massa de pressa la pregunta.',
      'Preensenyar vocabulari i conceptes nous i revisar-los de manera espaiada.',
      'Afavorir aprenentatge cooperatiu, modelatge entre iguals i rols reals dins del grup.',
      'Generalitzar el que s’ha après practicant-ho amb persones, materials i situacions diferents.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Prioritzar objectius funcionals i essencials dins del currículum de referència de l’edat.',
      'Permetre demostrar l’aprenentatge assenyalant, ordenant, manipulant, parlant o amb suport visual.',
      'Reduir la càrrega verbal simultània i conservar una instrucció visual mentre es fa la tasca.',
      'Avaluar el progrés individual amb evidències freqüents i ajustar els suports sense limitar anticipadament les oportunitats.',
      'Coordinar adaptacions i objectius amb la família i els professionals del programa Progrés.',
    ],
  },
]

const highCapacitySections = [
  {
    title: 'Altes capacitats · Descripció',
    tone: 'blue',
    items: [
      'L’alumnat amb altes capacitats mostra un rendiment, o el potencial necessari, molt superior a la mitjana en una o diverses àrees.',
      'No és un grup homogeni: pot presentar perfils molt diversos a nivell cognitiu, emocional, social i motivacional.',
      'Superdotació: capacitat general elevada en diferents àrees.',
      'Talent: capacitat elevada en una àrea concreta.',
      'Precocitat: desenvolupament avançat en una etapa concreta, que cal seguir al llarg del temps.',
    ],
  },
  {
    title: 'Àmbit d’intervenció personal',
    tone: 'amber',
    items: [
      'Reconèixer i valorar les capacitats de l’alumne/a sense generar pressió excessiva.',
      'Evitar etiquetes com “superdotat” si poden generar aïllament o expectatives rígides.',
      'Acompanyar l’autoestima i l’autoconcepte, especialment si hi ha perfeccionisme, frustració o desmotivació.',
      'Valorar l’esforç, la perseverança i la capacitat d’aprendre dels errors.',
      'Ajudar-lo a gestionar la frustració quan una tasca no surt a la primera.',
      'Afavorir habilitats socials i afectives si hi ha dificultats de relació amb iguals.',
      'Oferir espais per expressar interessos, preguntes pròpies i projectes personals.',
    ],
  },
  {
    title: 'Estratègies metodològiques',
    tone: 'green',
    items: [
      'Aplicar compactació curricular quan ja domina una part del contingut, reduint temps dedicat a la repetició.',
      'Proposar metodologies obertes, flexibles i basades en la investigació.',
      'Incloure tasques d’ampliació, aprofundiment i transferència.',
      'Afavorir el pensament crític, creatiu i divergent.',
      'Permetre projectes interdisciplinaris o amb productes finals oberts.',
      'Oferir ritmes diferenciats quan l’alumne/a ja domina un contingut.',
      'Reduir tasques repetitives quan no aporten aprenentatge nou.',
      'Donar opcions de producte final: presentació, maqueta, text, vídeo, debat, infografia o prototip.',
      'Introduir reptes que impliquin recerca, argumentació i presa de decisions.',
      'Treballar també la dimensió social i emocional, no només la cognitiva.',
      'Afavorir que pugui ajudar altres alumnes sense convertir-lo sempre en professor auxiliar.',
      'Relacionar coneixement teòric amb aplicacions pràctiques i fonts diverses: articles, documentals, dades o debats.',
    ],
  },
  {
    title: 'Adaptacions específiques',
    tone: 'purple',
    items: [
      'Generar exercicis diversos i evitar la repetició mecànica d’activitats que ja domina.',
      'Plantejar activitats amb estructura clara però amb marge per a la creativitat.',
      'Incloure preguntes de major complexitat cognitiva: justificar, comparar, crear, transferir o valorar.',
      'Afavorir la metacognició: explicar com ha arribat a una resposta i quines estratègies ha utilitzat.',
      'Introduir tasques que promoguin pensament crític, originalitat i creativitat.',
    ],
  },
]

export const DIAGNOSIS_LIBRARY = {
  dyslexia: {
    id: 'dyslexia',
    title: 'Dislèxia',
    shortTitle: 'Dislèxia',
    tag: 'Lectura i escriptura',
    accent: 'blue',
    summary: [
      'Comprovar la comprensió dels enunciats de manera individual i no donar per fet que la lectura s’ha entès.',
      'Reduir còpia i pes de l’ortografia quan no és l’objectiu específic de l’activitat.',
      'Permetre suport d’àudio, lectura compartida o respostes orals quan calgui.',
      'Presentar textos amb format més accessible: lletra clara, més espaiat i menys sobrecàrrega visual.',
      'Valorar sobretot el contingut i les idees quan l’expressió escrita interfereix en la demostració d’aprenentatge.',
    ],
    description:
      'La dislèxia afecta principalment la lectura fluent de paraules i l’escriptura, amb especial impacte en consciència fonològica, memòria verbal i velocitat de processament verbal.',
    sections: dyslexiaSections,
  },
  dyscalculia: {
    id: 'dyscalculia',
    title: 'Discalcúlia',
    shortTitle: 'Discalcúlia',
    tag: 'Raonament numèric',
    accent: 'blue',
    summary: [
      'Representar visualment problemes i operacions amb esquemes, dibuixos o material manipulatiu.',
      'Donar temps extra i evitar la pressió del temps en activitats matemàtiques.',
      'Permetre calculadora, taules o fórmules quan l’objectiu no sigui memoritzar càlcul.',
      'Modelar verbalment el procediment i ajudar a verbalitzar els passos abans de corregir.',
      'Posar l’accent en entendre el procés, no només en la rapidesa o el resultat final.',
    ],
    description:
      'La discalcúlia és una dificultat específica d’aprenentatge que afecta la comprensió del sistema numèric, els càlculs i els conceptes matemàtics bàsics.',
    sections: dyscalculiaSections,
  },
  dysorthography: {
    id: 'dysorthography',
    title: 'Disortografia',
    shortTitle: 'Disortografia',
    tag: 'Ortografia i expressió escrita',
    accent: 'blue',
    summary: [
      'Separar l’avaluació del contingut de la correcció ortogràfica quan l’ortografia no sigui l’objectiu.',
      'Treballar pocs patrons o regles cada vegada, amb pràctica espaiada i exemples significatius.',
      'Utilitzar un registre personal d’errors i una llista breu de revisió.',
      'Permetre corrector, diccionari o text digital quan calgui mostrar coneixement d’una altra matèria.',
      'Corregir de manera selectiva i evitar marcar reiteradament el mateix tipus d’error.',
    ],
    description:
      'La disortografia afecta l’aprenentatge i l’aplicació estable de les convencions ortogràfiques. Pot aparèixer amb dislèxia, però necessita pautes pròpies centrades en l’escriptura.',
    sections: dysorthographySections,
  },
  tda: {
    id: 'tda',
    title: 'TDA · Perfil predominantment inatent',
    shortTitle: 'TDA',
    tag: 'Atenció, inici i organització',
    accent: 'green',
    summary: [
      'Assegurar el primer pas i deixar instruccions breus visibles durant la tasca.',
      'Fragmentar el treball i incorporar punts de control intermedis.',
      'Utilitzar agenda, llistes, temporitzadors i recordatoris externs.',
      'Reduir distractors sense aïllar i acordar un senyal privat per recuperar el fil.',
      'Donar més temps quan la lentitud atencional, i no el contingut, sigui la barrera.',
    ],
    description:
      'El TDA és el nom d’ús habitual per al perfil predominantment inatent: pot afectar l’inici, la continuïtat, la memòria de treball i l’organització sense hiperactivitat marcada.',
    sections: tdaSections,
  },
  tdah: {
    id: 'tdah',
    title: 'TDAH',
    shortTitle: 'TDAH',
    tag: 'Atenció i autoregulació',
    accent: 'green',
    summary: [
      'Donar instruccions breus, concretes i d’una en una.',
      'Dividir tasques llargues en parts curtes amb objectius visibles.',
      'Seure’l en una zona amb menys distractors i revisar que anoti tasques o deures.',
      'Permetre pauses, més temps o un espai amb menys estímuls si l’activitat ho demana.',
      'Reforçar positivament les conductes adequades i els petits progressos.',
      'Utilitzar senyals no verbals pactats per redirigir l’atenció sense exposar-lo.',
    ],
    description:
      'El TDAH afecta la regulació de l’atenció, la impulsivitat i l’activitat. Pot interferir en la planificació, la memòria de treball i la continuïtat de les tasques.',
    sections: tdahSections,
  },
  tea: {
    id: 'tea',
    title: 'TEA',
    shortTitle: 'TEA',
    tag: 'Comunicació i estructura',
    accent: 'yellow',
    summary: [
      'Donar consignes curtes, literals i concretes i comprovar-ne la comprensió.',
      'Anticipar canvis de rutina, espai o activitat i reduir sorpreses innecessàries.',
      'Utilitzar horaris visuals, esquemes i seqüències de passos.',
      'Regular estímuls sensorials i preveure espais de calma o pauses de regulació.',
      'Definir rols clars i opcions concretes en activitats cooperatives o socials.',
    ],
    description:
      'El TEA és un trastorn del neurodesenvolupament que pot afectar la comunicació, la interacció social, la flexibilitat i la manera de processar la informació.',
    sections: teaSections,
  },
  'qi-limit': {
    id: 'qi-limit',
    title: 'QI límit',
    shortTitle: 'QI límit',
    tag: 'Consolidació i transferència',
    accent: 'red',
    summary: [
      'Partir de situacions concretes i avançar cap a l’abstracció de manera molt gradual.',
      'Modelar, practicar amb ajuda i retirar el suport només quan l’aprenentatge estigui consolidat.',
      'Repetir continguts essencials en contextos diferents per afavorir la transferència.',
      'Prioritzar objectius essencials, reduir simultaneïtat i oferir més temps.',
      'Treballar autonomia i habilitats adaptatives sense infantilitzar materials ni tracte.',
    ],
    description:
      'El funcionament intel·lectual límit pot requerir més temps, estructura i pràctica per comprendre conceptes abstractes, consolidar aprenentatges i transferir-los a situacions noves.',
    sections: qiLimitSections,
  },
  tdl: {
    id: 'tdl',
    title: 'Trastorn del desenvolupament del llenguatge (TDL)',
    shortTitle: 'TDL',
    tag: 'Comprensió i expressió lingüística',
    accent: 'red',
    summary: [
      'Utilitzar frases curtes, sintaxi simple i suport visual per a la informació oral.',
      'Anticipar vocabulari i verbs de consigna abans de l’activitat.',
      'Donar temps de processament i comprovar la comprensió fent mostrar el primer pas.',
      'Modelar estructures de resposta i permetre gestos, esquemes o formats alternatius.',
      'Reduir la complexitat lingüística sense rebaixar el contingut que es vol avaluar.',
    ],
    description:
      'El TDL és una dificultat persistent del llenguatge que interfereix en la comunicació o l’aprenentatge i pot afectar comprensió, expressió, vocabulari, sintaxi i discurs.',
    sections: tdlSections,
  },
  'down-syndrome': {
    id: 'down-syndrome',
    title: 'Síndrome de Down',
    shortTitle: 'Síndrome de Down',
    tag: 'Programa Progrés',
    accent: 'red',
    summary: [
      'Combinar explicació oral amb models, imatges, paraules escrites i seqüències visuals.',
      'Ensenyar en passos petits, practicar i retirar l’ajuda gradualment per protegir l’autonomia.',
      'Donar temps de processament i permetre formes diverses de demostrar l’aprenentatge.',
      'Afavorir participació real amb iguals i evitar que el suport individual aïlli l’alumne.',
      'Mantenir expectatives altes i ajustar-les a les evidències de progrés individual.',
    ],
    description:
      'La síndrome de Down s’associa a un perfil d’aprenentatge amb gran variabilitat individual. Les pautes aprofiten les fortaleses visuals i reforcen llenguatge, memòria, autonomia i inclusió.',
    sections: downSyndromeSections,
  },
  'high-capacity': {
    id: 'high-capacity',
    title: 'Altes capacitats',
    shortTitle: 'Altes capacitats',
    tag: 'Aprofundiment i repte',
    accent: 'orange',
    summary: [
      'Aplicar compactació i enriquiment quan el contingut ja està dominat.',
      'Proposar tasques d’ampliació, aprofundiment i transferència.',
      'Afavorir pensament crític, creatiu i divergent amb reptes reals.',
      'Reduir tasques repetitives i permetre productes finals variats o projectes personals.',
      'Acompanyar perfeccionisme, frustració i dimensió social perquè el talent no es visqui amb pressió.',
    ],
    description:
      'L’alumnat amb altes capacitats mostra un rendiment o potencial molt superior a la mitjana en una o diverses àrees, amb perfils cognitius, emocionals i socials diversos.',
    sections: highCapacitySections,
  },
}

export const DIAGNOSIS_LIBRARY_ITEMS = Object.values(DIAGNOSIS_LIBRARY)
