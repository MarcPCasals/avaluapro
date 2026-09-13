## Inspiració

AvaluaPro va començar durant el meu primer any com a professor.

Tot va començar perquè en els primers mesos a les classes vaig veure que necessitava un lloc pràctic on registrar els resultats de les avaluacions, les tasques diàries i el progrés dels meus alumnes. Les eines digitals que teníem a l'abast estaven pensades principalment per a l'administració i els informes finals, i si volia alguna cosa més sofisticada que anés més enllà del paper, eren aplicacions de pagament sense estar adaptades al que jo necessitava. No s'havien creat pensant en les decisions que un professor ha de prendre cada dia: qui necessita ajuda, qui està perdent constància, si una dificultat és temporal o com estan canviant les dinàmiques d'una classe. Tampoc no estaven ben adaptades al sistema educatiu d'Andorra.

En aquell moment, jo no era desenvolupador. La meva professió és la docència i no tenia una formació convencional en enginyeria de programari. El febrer de 2026 vaig començar a aprendre a crear aplicacions amb IA. AvaluaPro va néixer i créixer completament gràcies a OpenAI Codex: jo aportava el problema de l'aula, els coneixements pedagògics, les idees i les decisions de producte, mentre que Codex m'ajudava a entendre la tecnologia i a convertir aquestes decisions en programari funcional.

Al principi, només volia un quadern de notes millor per al professorat. A mesura que vaig començar a registrar més informació, em vaig adonar que el valor real no consistia simplement a guardar notes. El progrés competencial, la constància, els hàbits de treball, el comportament, les observacions de tutoria i les relacions dins de l'aula podien revelar patrons que cap quadern de notes aïllat podia mostrar.

Aquests patrons són importants perquè els professors necessitem entendre els alumnes i el grup que tenim realment al davant. Com més aviat detectem un canvi, més aviat podem adaptar la nostra manera d'ensenyar i oferir un suport significatiu i individualitzat.

Per a l'OpenAI Build Week, això em va portar a una nova pregunta: com pot la IA ajudar els professors a raonar a partir de les dades de l'aula sense tractar la privacitat dels menors com una consideració secundària?

Aquesta pregunta va inspirar l'ampliació de la Build Week: un briefing docent amb IA conscient de la privacitat que prepara informació útil de l'aula per analitzar-la amb l'ajuda de la IA, alhora que manté les identitats dels alumnes i la informació sensible innecessària fora del paquet exportat.

## Què fa

AvaluaPro és un espai de treball d'intel·ligència d'aula creat per un professor i per als professors. Està dissenyat al voltant de les necessitats reals del dia a dia de la docència i del model educatiu competencial que s'utilitza a Andorra.

Reuneix:

- avaluació competencial;
- notes, criteris i progrés d'aprenentatge;
- tasques diàries i constància en el treball;
- seguiment del comportament;
- informació de tutoria;
- estadístiques de l'aula;
- sociogrames i dinàmiques de grup;
- planificació de grups cooperatius;
- distribucions de l'aula;
- col·laboració controlada entre professors.

El flux principal és pràctic: un professor crea una classe, hi afegeix els alumnes i els criteris d'avaluació, registra les notes i el treball diari al llarg del curs i observa com evolucionen les estadístiques generades automàticament.

En lloc d'esperar fins al final d'un trimestre, el professor pot detectar abans els canvis i adaptar l'ensenyament a un alumne concret o a tot el grup. AvaluaPro converteix informació que normalment es troba dispersa entre diferents eines en una visió més coherent i centralitzada.

L'espai de tutoria és especialment important. Combina el progrés individual amb informació de grup, sociometria, grups cooperatius i distribucions de l'aula. Això ajuda els tutors a entendre tant cada alumne com les dinàmiques socials de la classe. Els professors també poden compartir la informació adequada amb els companys, cosa que redueix feina repetida i millora la coordinació.

Durant l'OpenAI Build Week amb GPT-5.6 vaig ampliar AvaluaPro amb el **Briefing IA**, una capa de preparació per a la IA conscient de la privacitat.

La nova funció crea un paquet pseudonimitzat de la classe a partir de la informació que ja hi ha dins d'AvaluaPro. Els noms dels alumnes se substitueixen per àlies com ara `Alumne A`, `Alumne B` i `Alumne C`.

El paquet exportat pot contenir senyals educatius seleccionats, com ara:

- indicadors competencials i d'aprenentatge;
- patrons de constància i hàbits de treball;
- indicadors de comportament;
- context sociomètric i de grups cooperatius;
- necessitats concretes de suport pedagògic.

Exclou deliberadament:

- noms i cognoms;
- adreces de correu electrònic;
- fotografies;
- informació familiar;
- etiquetes diagnòstiques;
- observacions docents en text lliure sense tractar;
- la correspondència entre els àlies i els alumnes reals.

La funció no envia informació automàticament a OpenAI ni a cap altre proveïdor d'IA. Primer, el professor revisa el prompt exacte i el paquet JSON pseudonimitzat. Després decideix si els vol utilitzar en un entorn d'IA aprovat institucionalment.

El mapa local d'identitats es manté dins d'AvaluaPro perquè el professor pugui interpretar la resposta. No s'inclou mai en el paquet exportat.

Això és pseudonimització, no anonimització completa. AvaluaPro encara pot relacionar localment un àlies amb un alumne, de manera que la informació s'ha de continuar tractant responsablement com a dades personals educatives.

L'objectiu no és automatitzar les decisions educatives ni substituir el criteri professional. AvaluaPro ajuda els professors a detectar abans els patrons rellevants, mantenint la privacitat, el context i el professor fermament dins del procés.

## Com ho vaig construir

Vaig començar a aprendre a crear programari amb IA el febrer de 2026. Abans de començar aquest camí, no coneixia React, Firebase, l'arquitectura d'aplicacions ni les proves automatitzades. La meva feina diària és ensenyar, no programar.

AvaluaPro s'ha desenvolupat des del principi mitjançant una col·laboració iterativa amb OpenAI Codex. Jo defineixo el problema educatiu, explico com treballen realment els professors, trio les prioritats, provo el resultat i prenc les decisions finals de producte. Codex m'ajuda a inspeccionar el codi, entendre les opcions tècniques, implementar funcions, detectar problemes, escriure proves i desplegar l'aplicació.

No s'ha creat a partir d'un únic prompt. Aquest projecte porta creixent des del febrer a través de molts cicles d'iteracions i d'idees sorgides de l'aula, implementació, proves, errors, converses i millores. A mesura que el producte guanyava capacitats, Codex també em va ajudar a reorganitzar l'arquitectura i a entendre les conseqüències de les diferents decisions tècniques sobre la privacitat.

AvaluaPro està construït amb:

- React i Vite;
- JavaScript;
- Zustand per gestionar l'estat de l'aplicació;
- IndexedDB per disposar d'emmagatzematge local resilient;
- Firebase Authentication per a l'accés dels professors;
- Cloud Firestore per sincronitzar les dades;
- Firebase Hosting per al desplegament;
- regles de seguretat de Firebase i proves de seguretat automatitzades;
- proves amb Node.js per als comportaments crítics de privacitat.

AvaluaPro ja existia abans de l'OpenAI Build Week. Durant el repte, vaig utilitzar **GPT-5.6 a través d'OpenAI Codex** com a company d'enginyeria per dissenyar, implementar, provar i desplegar el nou briefing docent amb IA conscient de la privacitat.

Per a l'ampliació de la Build Week, GPT-5.6 a través de Codex em va ajudar a:

- inspeccionar l'arquitectura existent de React, Firebase i privacitat;
- dissenyar el flux de minimització de dades i pseudonimització;
- implementar el generador del briefing;
- construir i integrar la nova interfície de React;
- convertir les necessitats configurades en suports pedagògics útils sense exportar etiquetes diagnòstiques;
- crear proves automatitzades que comproven que no s'inclouen identificadors ni camps sensibles;
- provar el flux de producció i preparar documentació transparent per al jurat.

El meu paper va continuar sent essencial durant tot el procés. Vaig aportar el context educatiu i vaig decidir quina informació seria útil o inadequada. Vaig provar el flux des de la perspectiva d'un professor, vaig qüestionar les propostes poc clares o insegures i vaig aprovar el comportament final.

L'aplicació en producció està disponible a:

https://avaluapro.web.app/

## Reptes que vaig trobar

El repte més gran ha estat protegir les dades dels menors.

Firebase ofereix infraestructura professional, autenticació, xifratge i controls d'accés. Tot i això, vaig aprendre que utilitzar tecnologia professional al núvol no és suficient per si sol. La privacitat també exigeix minimització de dades, compartició controlada, rols clars, normes de conservació, supervisió humana i una comunicació honesta sobre allò que el sistema pot garantir i allò que no.

Per a la Build Week, el repte més gran va ser resistir-me a fer la demostració d'IA més fàcil.

Tècnicament, hauria estat més senzill afegir un botó que enviés totes les dades de l'aula directament a un model. Però AvaluaPro conté informació educativa, de comportament, de tutoria i sociomètrica sobre menors. En aquest context, la pregunta difícil no és com cridar una API d'IA. És decidir què s'hauria de permetre que sortís de l'aplicació.

Això va donar lloc a decisions deliberades que feien la funció menys automàtica però més responsable:

- cap nom ni identificador directe dins del paquet per a la IA;
- cap etiqueta diagnòstica;
- cap observació docent sense tractar;
- cap informació familiar;
- cap mapa d'identitats dins del paquet exportat;
- cap transmissió automàtica a un proveïdor extern;
- cap clau d'API d'IA desada al navegador;
- revisió del professor abans de qualsevol ús extern de la IA.

Un altre repte va ser entendre la diferència entre pseudonimització i anonimització. Substituir un nom per `Alumne A` redueix l'exposició, però les dades no són realment anònimes si el professor pot tornar a relacionar l'àlies amb un alumne real. Per això descrivim honestament el paquet com a pseudonimitzat.

També vaig haver de combinar senyals procedents d'àrees molt diferents del producte. Els resultats d'aprenentatge, els hàbits, el comportament i les relacions dins de l'aula s'havien de convertir en un paquet prou compacte per analitzar-lo amb IA, prou comprensible perquè un professor el pogués revisar i prou útil per donar suport a decisions reals d'aula.

L'espai de tutoria plantejava un repte de producte semblant. Havia de connectar informació individual i de grup, alhora que feia que la col·laboració entre professors fos útil, controlada i comprensible.

Finalment, havia de ser transparents amb el calendari de la Build Week. AvaluaPro és un producte que jo ja havia començat a construir. El treball presentat al repte és el nou Briefing IA i el seu flux de privacitat, no tota l'aplicació preexistent.

## Assoliments dels quals estic orgullós

Estic orgullós que una necessitat del meu primer any com a professor s'hagi convertit en un producte real i funcional.

Fa només uns mesos, no havia creat mai cap aplicació. Vaig començar a aprendre amb IA el febrer de 2026 i avui AvaluaPro és una plataforma d'aula desplegada que inclou avaluació, estadístiques, tutoria, sociometria, col·laboració, resiliència local, sincronització al núvol, regles de seguretat i proves automatitzades.

No n'estic orgullós perquè m'hagi convertit en un expert en programari d'un dia per l'altre, ni molt menys. N'estic orgullós perquè he après a combinar els meus coneixements professionals com a professor amb les capacitats d'enginyeria de Codex. Això m'ha permès crear una eina arrelada en la pràctica real de l'aula.

AvaluaPro ja s'ha utilitzat en fluxos de treball docents reals i s'ha presentat al Ministeri d'Educació d'Andorra. S'està explorant un possible pilot o model institucional. Això no representa cap suport oficial, però demostra que tant el problema com el producte són reals.

Estic especialment orgullós que la funció de la Build Week no sigui un afegit decoratiu d'IA. Estableix un flux responsable abans d'una integració directa amb IA.

Els assoliments que més m'importen són:

- construir un flux d'IA significatiu sense exposar cap clau d'API al navegador;
- mantenir el professor al control de tot allò que surt de l'aplicació;
- excloure identificadors directes i informació sensible innecessària;
- conservar necessitats útils de suport pedagògic sense exportar etiquetes diagnòstiques;
- separar el mapa local d'identitats del paquet per a la IA;
- afegir proves automatitzades de privacitat;
- documentar clarament què existia abans de la Build Week;
- desplegar l'ampliació a l'aplicació real en producció.

El que espero que sorprengui el jurat és la quantitat de context útil de l'aula que AvaluaPro pot connectar sense perdre de vista el dia a dia del professor.

Una nota, una tasca no lliurada, un canvi en la constància o una relació dins de l'aula tenen un significat limitat per separat. Junts, aquests senyals poden ajudar un professor a entendre què pot estar canviant i a decidir on cal la seva atenció professional.

## Què vaig aprendre

Vaig aprendre que conèixer profundament el problema de l'aula és un avantatge tècnic real.

Tot i no tenir una formació convencional en programació, vaig poder prendre decisions de producte significatives perquè entenia els usuaris, el flux de treball i les conseqüències d'equivocar-nos. Codex em va donar accés a capacitats d'enginyeria, però la meva experiència docent va donar direcció al projecte.

Vaig aprendre a treballar amb un company d'enginyeria basat en IA. Això vol dir molt més que demanar codi. Vaig haver d'explicar la intenció educativa, qüestionar propostes, comparar alternatives, provar fluxos reals i continuar sent responsable de les decisions finals.

Tècnicament, vaig aprendre a estructurar una aplicació React en creixement, gestionar l'estat local i sincronitzat, utilitzar Firebase de manera segura, escriure proves automatitzades i desplegar canvis a producció.

També vaig aprendre que el xifratge i l'autenticació només són una part de la protecció de dades. Un sistema segur també ha de tenir en compte quina informació es recull, per què es necessita, qui hi pot accedir, com es comparteix i quan s'ha d'eliminar.

La principal lliçó de la Build Week és que la IA educativa no és només un problema de model. També és un problema d'arquitectura i governança de dades.

Una IA educativa útil necessita barreres de protecció abans dels prompts. Necessita minimització, claredat de rols, revisió humana i un límit clar entre la identitat interna i l'anàlisi externa.

Les restriccions de privacitat també van millorar la funció. En lloc de demanar a un sistema d'IA que ho sàpiga tot sobre un alumne, el briefing li demana que raoni sobre un conjunt seleccionat de senyals de l'aula i que retorni opcions pràctiques perquè un professor les revisi.

Sobretot, aquest projecte va canviar allò que jo creia que podia arribar a crear com a professor. Vaig començar al febrer amb necessitats sorgides de l'aula i sense cap formació en enginyeria de programari. Amb Codex, aquestes idees es van convertir en un producte funcional que puc provar, millorar i compartir.

## Quin és el següent pas per a AvaluaPro

El següent pas immediat és fer que AvaluaPro sigui prou intuïtiu perquè el pugui utilitzar qualsevol professor i, després, dur a terme una prova pilot controlada amb diversos docents.

Pel que fa a la capacitat d'IA, el següent pas és convertir el briefing de la Build Week en un flux aprovat institucionalment. La meva visió és que la IA analitzi una selecció deliberadament minimitzada i pseudonimitzada de senyals de l'aula i ajudi els professors a:

- identificar patrons abans;
- preparar converses de tutoria;
- planificar intervencions específiques;
- crear grups cooperatius;
- adaptar les classes següents;
- coordinar el suport entre professors.

La IA proposaria opcions. El professor interpretaria el context, revisaria els suggeriments i decidiria què cal fer.

El treball futur inclou:

- afegir un connector d'IA al servidor en lloc de posar una clau d'API al navegador;
- utilitzar una configuració de proveïdor aprovada, amb condicions clares de tractament i conservació de dades;
- registrar i auditar les peticions institucionals a la IA;
- mantenir la revisió humana abans que qualsevol decisió afecti un alumne;
- ampliar el briefing amb fluxos específics per als professors;
- completar la revisió jurídica i tècnica necessària per a una prova pilot educativa controlada.

A llarg termini, vull que AvaluaPro es converteixi en una plataforma d'intel·ligència d'aula conscient de la privacitat i construïda al voltant de la realitat de la docència.

No pretén substituir els professors. Pretén ajudar-los a detectar abans els patrons rellevants, donar suport als alumnes amb més precisió i aprofitar millor el seu temps limitat, mantenint el criteri professional i la privacitat al centre.
