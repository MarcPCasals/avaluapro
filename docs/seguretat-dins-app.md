# Bloc 4: seguretat dins l'app

Aquest document resumeix les proteccions visibles dins d'Avaluapro perquè el docent entengui l'estat de les seves dades i pugui actuar amb seguretat.

## Pantalla principal

La pantalla **Estat de dades i seguretat** centralitza:

- usuari connectat amb Google;
- darrera sincronització amb Firebase;
- darrera còpia de seguretat al núvol;
- mida aproximada de les dades locals;
- explicació de què es desa al dispositiu i què es desa al núvol;
- còpia manual al dispositiu;
- còpies de seguretat al núvol;
- restauració d'una còpia;
- exportació/importació d'antecedents acadèmics;
- eliminació segura de dades.

## Dades locals

Avaluapro desa les dades reals localment a IndexedDB per poder funcionar de manera ràpida i conservar l'estat encara que es recarregui la pàgina.

Aquestes dades inclouen classes, alumnes, notes, tasques, registres de seguiment, comentaris pedagògics, diagnòstics, DOIPs, sociograma, grups cooperatius, disposicions d'aula, fotos i configuració de tutoria.

`localStorage` només s'hauria de fer servir per preferències petites, com l'última classe oberta, la pestanya activa o l'estat visual.

## Dades al núvol

Quan el docent inicia sessió amb Google, Avaluapro pot sincronitzar dades amb Firebase dins la ruta privada de l'usuari:

```text
users/<uid>/...
```

Les còpies històriques al núvol viuen en una ruta separada:

```text
users/<uid>/cloudBackups
```

Els paquets de notes entre docents viuen en una col·lecció pròpia i només els poden llegir l'emissor i el destinatari:

```text
teacherGradePackages
```

## Accions visibles per al docent

La pantalla ha de permetre:

- descarregar una còpia manual al dispositiu;
- crear una còpia al núvol;
- sincronitzar manualment;
- recuperar l'estat del núvol;
- restaurar una còpia històrica;
- importar una còpia manual;
- eliminar dades amb confirmació.

## Eliminació segura

El botó d'eliminació està pensat per reiniciar el curs o començar de zero.

Abans d'esborrar, la pantalla ofereix descarregar una còpia manual. L'acció destructiva no s'executa directament: cal obrir una confirmació i clicar explícitament el botó final d'eliminació.

Després de l'eliminació, Avaluapro torna a carregar la demo inicial.

## Missatges pedagògics i de protecció

La pantalla recorda que els camps oberts han de contenir observacions pedagògiques, concretes i necessàries.

S'ha d'evitar escriure informació mèdica, familiar o personal que no sigui imprescindible per a la funció docent.

## Limitacions actuals

- Les fotos encara es desen comprimides dins les dades. Quan l'ús creixi, convindrà migrar-les a Firebase Storage amb rules pròpies.
- La mida de dades és una estimació del navegador, no una auditoria exacta de cada document de Firestore.
- L'eliminació local no substitueix una política institucional de conservació o supressió de dades.
