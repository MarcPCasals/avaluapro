# Decisió 0002 — Model de domini de Programació i Agenda

Data: 18 de setembre de 2026
Estat: acceptada

## Context

Programació, Agenda i Mode aula han de compartir informació sense confondre tres realitats diferents:

1. la seqüència pedagògica ideal escrita a la UP;
2. l'adaptació d'aquesta seqüència a un grup concret;
3. el resultat real del que ha passat en una sessió.

L'Agenda Docent antiga permetia adaptar sessions, però l'intercanvi entre aplicacions era fràgil. AvaluaPro també conté dades individuals que no es poden exposar simplement perquè una persona tingui accés a una programació.

## Decisió

El domini es divideix en entitats petites, versionades i relacionades amb identificadors estables. La UP base, l'aplicació per grup i el resultat real no comparteixen el mateix document.

- La **UP base** conté el disseny pedagògic ideal.
- L'**aplicació per grup** enllaça una UP amb una classe i conserva només les excepcions del grup.
- La **sessió** situa el treball en una data i una franja horària.
- L'**element de sessió** enllaça la part prevista amb l'activitat original, encara que aquesta activitat es divideixi entre sessions.
- El **resultat** registra el temps i la reflexió pedagògica reals. No conté notes privades ni incidències individuals.

Cada entitat declara `entityType` i `schemaVersion`. Els identificadors no es calculen a partir de noms, dates ni posicions. Per això una activitat conserva la identitat quan es reordena o es canvia de nom.

## Abast dels canvis d'Agenda

Una modificació d'una activitat pot tenir tres abasts:

- `groupOnly`: crea una excepció a l'aplicació del grup i deixa intacta la UP base;
- `baseAndGroup`: actualitza la UP base conservant l'identificador de l'activitat;
- `groupAndProposal`: crea l'excepció del grup i una proposta pendent per als altres grups.

Aquesta distinció és una regla de domini, no una decisió del component visual.

## Permisos

Els permisos de Programació no amplien automàticament els permisos actuals d'AvaluaPro sobre alumnat.

- Direcció pot llegir la UP, l'aplicació real i les reflexions pedagògiques compartides.
- Direcció no pot editar ni llegir notes privades, incidències individuals o diagnòstics complets.
- Un editor de la UP no rep accés a l'Agenda ni als grups.
- Un col·laborador de Programació i Agenda només gestiona el grup si també té l'accés corresponent al grup.
- El propietari conserva tots els permisos sobre les seves dades.

Les regles de Firestore aplicaran aquestes mateixes capacitats a la iteració 4.

## Conseqüències

- Una adaptació de 1r C no modifica silenciosament la programació de 1r D.
- Les versions anuals poden copiar-se sense perdre la procedència ni alterar cursos anteriors.
- Els horaris nous poden entrar en vigor en una data concreta sense reescriure sessions passades.
- Les consultes de Firestore es podran limitar a una UP, un grup o un interval de dates.
- Hi haurà més documents relacionats, però cadascun tindrà una responsabilitat clara i una mida controlada.
