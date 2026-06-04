export const DIAGNOSIS_LIBRARY = {
  dyslexia: {
    id: 'dyslexia',
    title: 'Dislèxia i discalcúlia',
    shortTitle: 'Dislèxia',
    summary: [
      'Simplificar els enunciats dels problemes: curts, clars i sense dades irrellevants.',
      'Oferir exemples resolts abans de demanar la resolució autònoma, sense donar la solució de l’exercici.',
      'Evitar l’aglomeració de números, dades o instruccions en una mateixa pregunta.',
      'Permetre respostes visuals, gràfiques o esquemàtiques en tasques numèriques.',
      'Evitar textos en majúscules o cursives.',
      'Utilitzar instruccions clares, concises i amb llenguatge simple.',
      'Separar visualment operacions, dades i passos.',
      'Destacar el més important en negreta.',
    ],
    description:
      'La dislèxia és un trastorn d’aprenentatge que afecta principalment les habilitats implicades en la lectura fluent de les paraules i en la seva escriptura, en absència d’alteracions neurològiques i/o sensorials que ho justifiquin i havent rebut prèviament oportunitats escolars per al seu aprenentatge.',
    sections: [
      {
        title: 'Descripció',
        items: [
          'Fonamentalment estan alterades les habilitats de consciència fonològica, memòria verbal i velocitat de processament verbal.',
          'La dislèxia es dona al marge de les habilitats intel·lectuals.',
          'La gravetat de les dificultats dependrà de la qualitat i precocitat amb què s’hagi donat suport a l’alumne/a tant en l’àmbit familiar com en l’escolar.',
          'Segons estudis, afecta entre un 5 i un 17% de la població, sense diferències significatives entre ambdós sexes.',
        ],
      },
      {
        title: 'Àmbit d’intervenció personal',
        items: [
          'Fer saber a l’alumne/a que coneixem les seves dificultats, ens interessem per ell/a i l’ajudarem perquè tingui les mateixes oportunitats que els companys/es.',
          'Comprendre que presentar dificultats en el llenguatge escrit pot provocar frustracions, estrès, pressió i cansament.',
          'Evitar expressions com “esforça’t més” o “fixa-t’hi més”, perquè sovint l’alumnat ja s’esforça però no obté els resultats esperats.',
          'Ser flexible amb allò relacionat amb el seu dèficit: oblidar coses que abans sabia, llegir malament o cometre molts errors ortogràfics.',
          'Evitar situacions que el deixin en evidència davant dels altres: llegir en veu alta, rapidesa de càlcul, escriure a la pissarra o correccions públiques.',
        ],
      },
      {
        title: 'Estratègies metodològiques',
        items: [
          'Evitar donar moltes ordres orals al mateix temps.',
          'Presentar els continguts curriculars amb suports variats: visuals i/o auditius.',
          'Facilitar l’ús de les TIC: lectors informàtics, llibres digitals o corrector ortogràfic.',
          'Centrar l’ensenyament en habilitats útils i transferibles més que en acumular informació innecessària.',
          'Ajudar en la gestió del temps i donar temps extra quan calgui.',
          'Oferir la lectura oral de preguntes, sobretot en tasques d’avaluació.',
          'Contemplar tasques d’avaluació orals o amb format més visual.',
          'Permetre complementar respostes amb dibuixos o gràfics.',
          'Permetre guies estructurades en redaccions.',
          'Evitar penalitzar l’ortografia quan s’avaluen altres competències.',
        ],
      },
      {
        title: 'Adaptacions específiques',
        items: [
          'Evitar textos en majúscules i/o cursives.',
          'Utilitzar instruccions clares, concises i amb llenguatge simple.',
          'Utilitzar enunciats curts, sense subordinades complexes.',
          'Separar visualment operacions i/o dades.',
          'Utilitzar una numeració clara, que no es confongui amb lletres.',
          'Evitar preguntes molt llargues o obertes quan cal organitzar moltes idees per escrit; millor preguntes concretes.',
          'Destacar el més important en negreta.',
        ],
      },
    ],
  },
}

export const DIAGNOSIS_LIBRARY_ITEMS = Object.values(DIAGNOSIS_LIBRARY)
