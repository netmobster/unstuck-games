# assets/

Transparent SVGs, viewBox 0 0 64 64, anchored at the centre, no text baked in (counts are drawn live). Each state is a `<g id>` layer; state layers ship hidden (`display="none"`) — show the ones you need.

These mirror what board.js draws on canvas, in the same Burrow colours, so the game can use either. Still to draw in this style once the dialogs exist: tile-* variants (the board draws terrain procedurally), the 8 boon icons, spend-* button icons (the Burrow verbs are words, no icons) and the heirloom marks.

- warren-{C,S,D,N}-{deep,mid,shallow}.svg — layers: base · glyph · ring-current · ring-hover
- hunter-{sweeper,tracker,listener,hound}.svg — body · in-reach · on-trail · mustering
- troop.svg — body · body-hold · body-transit · located · besieged · dead
- decoy.svg — body · running · seen · caught · gone-to-ground
- rearguard.svg — body · waiting · fighting · held · fell
- ring.svg (scale to 7×7 cells) · track.svg (opacity animated by the game)
