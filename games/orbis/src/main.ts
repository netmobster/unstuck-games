import "./style.css";
import { debugEnabled, Game, isPhone } from "./game";
import { mountUI } from "./ui";
import { mountDebug } from "./debug";

const params = new URLSearchParams(location.search);
const root = document.getElementById("app")!;
const phone = isPhone();

const game = new Game(
  root,
  {
    trails: true,
    // provisional until profiled on a real phone
    trailScale: phone ? 0.5 : 1,
    dprCap: phone ? 1.5 : 2,
    sprites: true,
  },
  params.has("seed") ? Number(params.get("seed")) : undefined,
);

mountUI(game, root);
if (debugEnabled()) mountDebug(game, root);
