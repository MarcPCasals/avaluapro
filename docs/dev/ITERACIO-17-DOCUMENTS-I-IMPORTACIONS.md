# Iteració 17 — Vista documental, Word i importacions

Data de tancament: 19 de setembre de 2026

## Resultat

Cada UP disposa d'una vista documental pròpia que conserva l'estructura oficial del centre i adopta l'estil visual d'AvaluaPro. El document inclou informació general, currículum, recursos de competències específiques i transversals, seqüència per fases, atenció a la diversitat, comentaris d'aplicació, temps, materials, agrupaments, espais i indicadors.

La vista queda disponible tant a l'editor del propietari com a la programació compartida amb direcció. No rep notes personals, incidències individuals ni diagnòstics.

## Word editable i JSON versionat

- **Word editable** crea un document horitzontal amb taules reals, capçaleres repetibles, totals per fase i total de la UP.
- La generació es fa al navegador i no envia el contingut a cap servei extern.
- **JSON** conserva tota l'estructura pedagògica amb el format `avaluapro-planning-unit`, versió 1.
- L'exportació JSON exclou el propietari, els correus autoritzats, les concessions i els identificadors del curs.
- Qualsevol importació regenera els identificadors i crea una UP nova en esborrany; no substitueix cap UP existent ni hereta accessos.

Les llibreries de Word i lectura de plantilles es carreguen només quan es demanen. El paquet inicial d'AvaluaPro no incorpora aquest pes.

## Importació Word

El lector reconeix la plantilla de seqüència facilitada pel centre:

- codi, nivell, títol, situació complexa, producte i llengua;
- competències, aprenentatges esperats, criteris i indicadors quan el Word els exposa com a taules llegibles;
- recursos específics i transversals;
- fases, subfases, activitats, minuts, materials, agrupaments i indicadors;
- atenció a la diversitat i comentaris per a l'aplicació.

El fitxer **Taller 1.1 CFN.docx** s'ha llegit íntegrament dins del navegador. La previsualització ha detectat 3 fases, 14 subfases i 22 activitats. Com que aquella versió del Word no exposa els blocs curriculars a través de la seva estructura interna llegible, la pantalla ho avisa i deixa aquests camps pendents, sense inventar informació.

## Importació des d'Excel o Numbers

La pestanya **Enganxar taula** admet text tabulat amb una fila de capçaleres. Reconeix:

- Fase i Subfase;
- Activitat;
- Minuts;
- Materials;
- Agrupament i Espai;
- IA o Indicadors;
- Diversitat;
- Comentaris.

Abans de desar, mostra el nombre d'activitats i una previsualització. Les fases, subfases i indicadors que no existeixen encara es creen de manera coherent amb la UP oberta.

## Recursos i imatges pedagògiques

Els recursos oficials es conserven separats en:

- competències específiques;
- competències transversals;
- fets i conceptes;
- procediments;
- actituds i valors.

Cada activitat incorpora un tipus pedagògic normalitzat. La vista documental reserva un espai explícit per a la imatge original corresponent. Les imatges no s'han recreat: s'associaran quan es disposi dels fitxers originals facilitats un per un.

## Compatibilitat i seguretat

- Les UP anteriors continuen sent vàlides; les llistes antigues de recursos específics i transversals passen al bloc corresponent quan encara no existeix l'estructura nova, de manera que cap text desapareix.
- Firestore admet els nous blocs de recursos i el tipus pedagògic, però en rebutja formes inesperades.
- El coeditor pot modificar aquests camps sense rebre permisos de grup ni de compartició.
- La lectura d'un Word o JSON es fa localment i només persisteix després de la confirmació de crear la còpia.
- El canvi no amplia cap regla de lectura de direcció ni d'Agenda.

## Verificació

- vista documental comprovada a 1440 × 1000 i 1024 × 768;
- fluxos **Importar una UP** i **Enganxar taula** comprovats visualment;
- dos Word de prova generats, renderitzats i revisats en escenaris de 2 i 3 pàgines;
- estructura interna del document extens validada amb 201 nodes de text i 9 taules editables;
- importació real del Word del centre comprovada al navegador;
- cap error de consola durant la verificació visual;
- 42 proves del domini de Planificació;
- 18 proves de sincronització local de Planificació;
- 84 proves de regles de Firestore;
- suite completa de seguretat correcta;
- lint i construcció de producció correctes;
- `git diff --check` correcte.

L'auditoria de dependències continua mostrant avisos ja presents a la cadena de Firebase/Vite. `docx` utilitza una versió actual de `nanoid` i `mammoth` no afegeix cap dels paquets assenyalats; no s'ha aplicat una actualització forçada i aliena a aquesta iteració.

Commit funcional: `96ab9f1`.

## Publicació

Pendent de desplegar les regles de Firestore i Firebase Hosting.

## Pas següent

La iteració 18 revisarà de manera transversal ordinador i iPad, accessibilitat, teclat i focus, estats buits i d'error, rendiment i codi provisional abans d'iniciar el pilot amb una UP real.
