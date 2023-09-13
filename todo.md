# TODO

## Features 

- [ ] add elements: when creating a vertex or a link or ... data should include colors and cp and weights ...


## Refacto

- [ ] camelCase
- [ ] elementsKind should be an enum used in Modifications
- [ ] deleteElements: do not need maps for vertices and links as they contain their index
- [ ] MergeVertices EmitImplementation optimize
- [ ] on peut pas faire les modifs avec le addEvent parce que ça binde client.on avec le board créé initialement. Si on charge la page avec une autre roomId, ça change le board et du coup ça fait les modis sur le précédent board. Pour gérer ça faut créer une classe Client et réfléchir.
- [ ] ajouter automatiquement les Modifications en lisant le dossier

## Issues

- [ ] sensibilities of Modification

## Done

- [X] merge: control points disapear after meerge
- [X] only use boards, not graph
- [X] upgrade gramoloss to 1.6.0
- [X] board should has a roomId