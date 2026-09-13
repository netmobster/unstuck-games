import "./style.css";
import { debugEnabled, Game, isPhone } from "./game";
import { mountUI } from "./ui";
import { mountDebug } from "./debug";

const params = new URLSearchParams(location.search);
const root = document.getElementById("app")!;
const phone = isPhone();
/** ?embed — the live world only (studio homepage card): no splash, no controls, no sound, light on pixels */
const embed = params.has("embed");

const game = new Game(
  root,
  {
    trails: true,
    // provisional until profiled on a real phone
    trailScale: phone || embed ? 0.5 : 1,
    dprCap: embed ? 1 : phone ? 1.5 : 2,
    sprites: true,
  },
  params.has("seed") ? Number(params.get("seed")) : undefined,
);

if (embed) {
  // a card preview should look lived-in immediately, not like a fresh seed
  game.skip(2);
} else {
  game.audio.prime();
  mountUI(game, root);
  if (debugEnabled()) mountDebug(game, root);
}
