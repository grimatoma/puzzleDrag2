// ─── The biome keepers (master doc Part 4 §IV / Part 2 §IV) ──────────────────
// Each settlement type has a guardian "made conscious by the founding bargain."
// Once a settlement is built up its keeper appears; the player chooses to
//   • Coexist — the keeper stays, the biome keeps its wild gifts → Embers
//   • Drive Out — the keeper withdraws, the biome goes orderly → Core Ingots
// The choice is final per settlement (found another of that type to try the
// other path). This config is the source of truth for the encounter dialogue
// and rewards, and is overridable via `balance.json`'s `keepers` section (the
// Balance Manager exposes it for editing).
//
// DEFERRED: per the doc, Drive Out should be a high-difficulty round with the
// keeper as a hazard to outlast — for now it's a direct claim. And facing the
// keeper doesn't yet gate `settlementCompleted` (still ≥half buildings);
// tighten that once the encounter is wired through the UI everywhere.

import { BALANCE_OVERRIDES } from "./constants.js";
import { applyKeeperOverrides } from "./config/applyOverrides.js";

export const KEEPERS = {
  farm: {
    id: "deer_spirit",
    name: "The Deer-Spirit",
    title: "Keeper of Field & Herd",
    icon: "🦌",
    // Buildings the settlement needs before the keeper makes itself known.
    appearsAfterBuildings: 4,
    intro: [
      "A tall, stag-headed figure walks the edge of the field at twilight, moving with the unhurried air of an old judge who has heard every excuse at least twice.",
      "Deer-Spirit: \"I have watched you work. You are not the first. You will not be the last. ...You are, however, the first to fix that fence properly. Credit where it's due.\"",
      "Deer-Spirit: \"I tend this place. Some lines have asked me to leave. Some have asked me to stay. I will accept either — but choose with your whole chest, as the young ones say. Speak.\"",
    ],
    coexist: {
      label: "Stay — tend the land with me.",
      pitch: [
        "The Deer-Spirit lowers its great head. The hearth flares a soft, mossy green.",
        "Deer-Spirit: \"Then we keep it together. The soil stays rich. The herds stay calm. The crows stay... mostly polite. Walk well, line-of-my-watching.\"",
      ],
      embers: 5,
    },
    driveout: {
      label: "Go — I'll tend it alone.",
      pitch: [
        "The Deer-Spirit nods once — the way a judge nods at a verdict it disagrees with but is obliged to record.",
        "Deer-Spirit: \"Then we should contest. ...Or we could not, and I simply leave, and you get a very tidy field and a faint, lifelong sense of having mislaid something. ...I'll allow it. The hearth is yours.\"",
      ],
      coreIngots: 5,
    },
  },
  mine: {
    id: "stone_knocker",
    name: "The Stone-Knocker",
    title: "Keeper of the Deep Ways",
    icon: "🪨",
    appearsAfterBuildings: 3,
    intro: [
      "Deep in the workings a stout figure of living rock raps its knuckles along the wall, listening for weak seams. Its voice is a copper kettle. It is older than the other keepers and does not enjoy small talk.",
      "Stone-Knocker: \"You've been here long enough that you can hear me. Good. Saves time.\"",
      "Stone-Knocker: \"We talk. Quick. The stone has no patience for speeches, and frankly neither do I. Pick.\"",
    ],
    coexist: {
      label: "Share the stone.",
      pitch: [
        "Stone-Knocker: \"Acceptable. I keep the props honest, you keep the carts moving, nobody gets buried who didn't earn it. Deal.\"",
        "It knocks once on the wall. Somewhere overhead, a seam that was thinking about collapsing quietly reconsiders.",
      ],
      embers: 5,
    },
    driveout: {
      label: "The stone is mine.",
      pitch: [
        "Stone-Knocker: \"...Bold. Wrong, but bold.\" It steps back into the rock the way a man steps behind a curtain.",
        "\"Mind the ceiling,\" it says, from somewhere inside the wall. The deep ways are yours now — quieter, steadier, and noticeably less lucky.",
      ],
      coreIngots: 5,
    },
  },
  harbor: {
    id: "tidesinger",
    name: "The Tidesinger",
    title: "Keeper of Wrecks & Runs",
    icon: "🌊",
    appearsAfterBuildings: 3,
    intro: [
      "On a strange, glassy grey morning the sea goes still and someone is singing. A thin, fluid figure sits on the breakwater with her feet in the foam, far too cheerful for the hour.",
      "Tidesinger: \"Hello, hello, line of my line's neighbours! The tide knows you. It says you're 'fine.' That's high praise — it called the last lot 'a bit much.'\"",
      "Tidesinger: \"So: sing with me, or send me off? Either way I do the harmony. Speak — and try to land on the beat.\"",
    ],
    coexist: {
      label: "Sing with me.",
      pitch: [
        "Tidesinger: \"Yesss. We do it properly, then — the fish run thick, the wrecks give up their secrets, the storms knock before they let themselves in.\"",
        "She holds a note that makes the gulls go quiet. \"...Mostly. I'm a keeper, not a miracle. Fair tides to you.\"",
      ],
      embers: 5,
    },
    driveout: {
      label: "The harbor is my charter.",
      pitch: [
        "Tidesinger: \"Ooh — 'charter.' Big word. The Hollow Folk *love* that word.\" She slides off the breakwater without a splash.",
        "\"Off I go, then. The harbour's yours: reliable, tidy, and roughly forty percent less interesting. Enjoy it!\"",
      ],
      coreIngots: 5,
    },
  },
};

applyKeeperOverrides(KEEPERS, BALANCE_OVERRIDES.keepers);

/** The keeper for a settlement type ('farm' | 'mine' | 'harbor'), or null. */
export function keeperForType(type) {
  return KEEPERS[type] ?? null;
}

/** Just the path-relevant slice (label, pitch, reward) for `path` ∈ {coexist, driveout}. */
export function keeperPathInfo(type, path) {
  const k = KEEPERS[type];
  if (!k) return null;
  return path === "coexist" ? k.coexist : path === "driveout" ? k.driveout : null;
}
