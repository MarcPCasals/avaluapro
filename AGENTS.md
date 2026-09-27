# Protocol obligatori per a assistents tècnics

Aquest repositori pot contenir codi que, a l'aplicació real, tracta dades personals d'alumnat. Qualsevol assistent tècnic que treballi en aquest directori ha de respectar permanentment aquestes regles.

## Entorn permès

- Treballar només amb el codi font, les proves, els emuladors i l'entorn local `AvaluaPro Assistència`.
- Per obrir una interfície al navegador, utilitzar exclusivament `npm run dev:assistance` o `npm run preview:assistance` i l'origen local que aquests comandaments indiquen.
- Utilitzar només el conjunt sintètic inclòs al repositori o un paquet segur que disposi d'un validador implementat i superat.
- Es poden executar compilacions estàtiques i proves que no iniciïn sessió ni llegeixin dades remotes.

## Prohibicions

- No obrir ni inspeccionar l'aplicació real autenticada, encara que el navegador ja tingui una sessió iniciada.
- No navegar a dominis de producció d'AvaluaPro per fer comprovacions funcionals o visuals.
- No llegir el DOM, l'arbre d'accessibilitat, la xarxa, la consola ni captures de pantalles que continguin dades reals.
- No obrir còpies de seguretat, exports, fulls de càlcul, PDF, JSON o imatges amb informació identificable o pseudonimitzada d'alumnat.
- No demanar noms, diagnòstics, observacions, identificadors ni exemples reals per reproduir una incidència.
- No executar proves de producció, scripts administratius, restauracions, supressions ni ordres de Firebase que puguin llegir o modificar dades reals.
- No reutilitzar credencials, tokens, comptes Google ni variables de servei de producció dins l'entorn d'assistència.
- No desplegar ni publicar res sense una petició explícita i separada de Marc. Una petició general de corregir, continuar o verificar no autoritza cap desplegament.

## Quan una incidència només apareix amb dades reals

1. Intentar reproduir-la amb el conjunt sintètic.
2. Demanar únicament estructura, recomptes o missatges d'error sense dades personals.
3. Si encara no és reproduïble, aturar-se i explicar a Marc quina comprovació manual ha de fer ell al compte real.
4. No relaxar aquestes regles per completar la tasca.

## Publicació i comprovació final

Si Marc demana explícitament una publicació, l'assistent pot preparar i executar el procés tècnic autoritzat, però la verificació funcional autenticada del compte real correspon a Marc. L'assistent només pot validar el paquet públic, la versió, els recursos estàtics i l'entorn d'assistència sense iniciar sessió ni exposar alumnat.
