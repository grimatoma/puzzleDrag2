import { bondBand } from "./bond.js";
import { NPC_DATA } from "./data.js";

export const DIALOG_POOLS = {
  mira: {
    reactive: [
      {
        id: "mira_hearth_unlit",
        text: "Mira: 'It's cold in here. We need that Hearth lit if we're going to survive the first frost.'",
        req: (s) => !s.story?.flags?.hearth_lit
      },
      {
        id: "mira_bakery_built",
        text: "Mira: 'The ovens are finally hot. The smell of fresh bread... it feels like a real home now.'",
        req: (s) => s.built?.home?._plots && Object.values(s.built.home._plots).includes("bakery")
      }
    ],
    spring: {
      Sour: [
        "Mira: 'The dough won't rise without help.'",
        "Mira: 'I'll bake when the order's filled, not before.'",
        "Mira: 'Spring comes slow without flour.'",
      ],
      Warm: [
        "Mira: 'The fields are waking. Bread soon.'",
        "Mira: 'A fair morning for a fair loaf.'",
        "Mira: 'I'll save you a heel of the rye.'",
      ],
      Liked: [
        "Mira: 'The fields are kind to us today.'",
        "Mira: 'Two more loaves and we'll have enough for the orphanage.'",
        "Mira: 'Spring's hand on the dough — nothing finer.'",
      ],
      Beloved: [
        "Mira: 'You've made this whole vale smell of bread.'",
        "Mira: 'I named the new oven after you. Don't laugh.'",
        "Mira: 'There's a basket on the sill. It's yours.'",
      ],
    },
    summer: {
      Sour: [
        "Mira: 'Hot ovens, cold help.'",
        "Mira: 'Bring flour or bring shade.'",
        "Mira: 'Summer wheat won't grind itself.'",
      ],
      Warm: [
        "Mira: 'The fields are kind today.'",
        "Mira: 'Honey-rolls by sundown if you're quick.'",
        "Mira: 'Good summer. Good bread.'",
      ],
      Liked: [
        "Mira: 'The harvest's been kind — I'll set aside a loaf.'",
        "Mira: 'Two more loaves and we'll feed the orphanage.'",
        "Mira: 'Summer's flour is the sweetest. Tell no one.'",
      ],
      Beloved: [
        "Mira: 'You walk in and the dough rises faster, I swear it.'",
        "Mira: 'There's a pie cooling for you. No, I won't take coin.'",
        "Mira: 'The whole vale eats well because of you.'",
      ],
    },
    autumn: {
      Sour: [
        "Mira: 'Rain on the rye. Rain on my mood.'",
        "Mira: 'Late harvest, late bread. Don't ask.'",
        "Mira: 'The grain's damp. I'm damp. Both unhappy.'",
      ],
      Warm: [
        "Mira: 'Autumn flour is heavy — good for the long loaves.'",
        "Mira: 'I'll set aside the seed-loaves for the festival.'",
        "Mira: 'Cool morning. Good baking.'",
      ],
      Liked: [
        "Mira: 'The oven runs all day this season — warm yourself by it.'",
        "Mira: 'The harvest's been kind. I'll set aside a loaf for you.'",
        "Mira: 'There'll be honey-rolls by Sunday.'",
      ],
      Beloved: [
        "Mira: 'You brought us through another harvest. Thank you.'",
        "Mira: 'The festival larder's filling fast. I'll bake double.'",
        "Mira: 'Walk with me to the orphanage — they should meet you.'",
      ],
    },
    winter: {
      Sour: [
        "Mira: 'The oven's cold. The flour's low. The mood's worse.'",
        "Mira: 'Don't bother me unless you've brought flour.'",
        "Mira: 'Frost in the rye-bin. I am not pleased.'",
      ],
      Warm: [
        "Mira: 'The oven's warm, at least. Thank you for the flour.'",
        "Mira: 'Cold work, but the bread keeps folks alive.'",
        "Mira: 'A loaf for the road — careful, it's hot.'",
      ],
      Liked: [
        "Mira: 'Half the vale eats my bread this winter. That's your doing.'",
        "Mira: 'Stay by the oven a moment — you look frozen.'",
        "Mira: 'I'll bake through the night if it keeps the children fed.'",
      ],
      Beloved: [
        "Mira: 'You kept us fed through the dark months.'",
        "Mira: 'There's a loaf with your name shaped into the crust.'",
        "Mira: 'The hearth's yours as much as anyone's.'",
      ],
    },
  },

  tomas: {
    spring: {
      Sour: [
        "Old Tomas: 'The hives are restless. Much like me.'",
        "Old Tomas: 'Bees don't care for excuses. Neither do I.'",
        "Old Tomas: 'Spring honey won't flow without the right feed.'",
      ],
      Warm: [
        "Old Tomas: 'The first blossoms are out. Good days ahead.'",
        "Old Tomas: 'Slow and steady, like the bees teach us.'",
        "Old Tomas: 'Spring is patient. I try to be likewise.'",
      ],
      Liked: [
        "Old Tomas: 'The hives hum a little louder when you're near.'",
        "Old Tomas: 'I set aside a jar of spring clover honey. Just for you.'",
        "Old Tomas: 'It's good to have someone who understands the slow work.'",
      ],
      Beloved: [
        "Old Tomas: 'You're the reason these hives are thriving.'",
        "Old Tomas: 'I'll teach you the old bee-songs, if you'd like.'",
        "Old Tomas: 'The vale hasn't seen this much honey in thirty years.'",
      ],
    },
    summer: {
      Sour: [
        "Old Tomas: 'Heat makes bees irritable. And bees make me irritable.'",
        "Old Tomas: 'Bring the goods before the hives swarm again.'",
        "Old Tomas: 'Too hot for philosophy. Just bring what's needed.'",
      ],
      Warm: [
        "Old Tomas: 'Summer honey is clover and wildflower. Fine work.'",
        "Old Tomas: 'The bees are content. I suppose I am too.'",
        "Old Tomas: 'Long days, full hives. Good summer.'",
      ],
      Liked: [
        "Old Tomas: 'I've been watching the hives a long time. Rarely felt this good.'",
        "Old Tomas: 'The summer honey's rich this year. Take a spoonful.'",
        "Old Tomas: 'You remind me a bit of myself at your age. Don't tell anyone.'",
      ],
      Beloved: [
        "Old Tomas: 'The bees know you now. They settle when you pass.'",
        "Old Tomas: 'I wrote your name in the old ledger. You belong here.'",
        "Old Tomas: 'Fifty summers watching these hives. Best one yet.'",
      ],
    },
    autumn: {
      Sour: [
        "Old Tomas: 'The harvest honey is thin. Like the help I've had.'",
        "Old Tomas: 'The bees are clustering. I understand the impulse.'",
        "Old Tomas: 'Autumn's arriving whether we're ready or not.'",
      ],
      Warm: [
        "Old Tomas: 'Autumn honey is dark and strong. Suits the season.'",
        "Old Tomas: 'The bees are sealing the hives for winter. Wise creatures.'",
        "Old Tomas: 'Harvest done. Time to rest a little.'",
      ],
      Liked: [
        "Old Tomas: 'The autumn yields were better than expected. Your doing.'",
        "Old Tomas: 'I've put up three extra jars for the winter. One's yours.'",
        "Old Tomas: 'Old bones, but the season was kind. Thank you.'",
      ],
      Beloved: [
        "Old Tomas: 'The hives remember a good year. So will I.'",
        "Old Tomas: 'You've given the old beekeeper hope, and that's no small thing.'",
        "Old Tomas: 'Walk the orchard with me before the leaves fall. Just once.'",
      ],
    },
    winter: {
      Sour: [
        "Old Tomas: 'Cold hives. Cold hands. Cold mood.'",
        "Old Tomas: 'The bees sleep. I wish I could.'",
        "Old Tomas: 'Winter is long when the stores are thin.'",
      ],
      Warm: [
        "Old Tomas: 'Winter honey is precious. I measure every drop.'",
        "Old Tomas: 'The hives are quiet. At least the vale is safe.'",
        "Old Tomas: 'A warm fire and a full hive. That's enough.'",
      ],
      Liked: [
        "Old Tomas: 'Winter's easier with someone worth talking to.'",
        "Old Tomas: 'I saved the last of the heather honey for you.'",
        "Old Tomas: 'The bees will wake in spring. So will we.'",
      ],
      Beloved: [
        "Old Tomas: 'You're as much a part of this vale as the oldest hive.'",
        "Old Tomas: 'I've made it to another winter. You helped.'",
        "Old Tomas: 'Come spring, I'll show you the queen cell. A privilege few share.'",
      ],
    reactive: [
      {
        id: "tomas_first_order",
        text: "Old Tomas: 'The Vale is talking. They see the smoke from your Hearth, and they're starting to hope.'",
        req: (s) => s.story?.flags?.first_order
      }
    ],
    },
  },

  bram: {
    spring: {
      Sour: [
        "Bram: 'Forge's cold without what I need. Sort it.'",
        "Bram: 'I don't do spring sentiment. Just bring the ore.'",
        "Bram: 'Spring or not, iron doesn't wait.'",
      ],
      Warm: [
        "Bram: 'Good steel weather. Not too hot, not too wet.'",
        "Bram: 'The forge is ready. You bring the materials.'",
        "Bram: 'Fair trade. Fair work.'",
      ],
      Liked: [
        "Bram: 'You keep the forge fed. I keep the vale armed.'",
        "Bram: 'Good work deserves a straight blade.'",
        "Bram: 'I made a spare hook. Take it.'",
      ],
      Beloved: [
        "Bram: 'The forge sings when you bring good ingot. I mean that.'",
        "Bram: 'I put your mark on the lintel. You've earned it.'",
        "Bram: 'Best apprentice I never had.'",
      ],
    },
    summer: {
      Sour: [
        "Bram: 'Hot forge, hotter temper. Bring more or get out.'",
        "Bram: 'Summer means sweat. At least bring the ingot.'",
        "Bram: 'I don't complain much. But today I'll make an exception.'",
      ],
      Warm: [
        "Bram: 'Summer's good for tempering. You bring good stock.'",
        "Bram: 'The forge is running well. So are we.'",
        "Bram: 'Good haul. Good work.'",
      ],
      Liked: [
        "Bram: 'The summer run's been strong. Credit where it's due.'",
        "Bram: 'I sharpened the town gates. You'll notice next time you pass.'",
        "Bram: 'A smith appreciates reliable supply. You're reliable.'",
      ],
      Beloved: [
        "Bram: 'The forge hasn't run this hot or this well in years.'",
        "Bram: 'I'm making you a proper knife. Not for trade — for keeps.'",
        "Bram: 'Hard to admit, but I'd be lost without your help.'",
      ],
    },
    autumn: {
      Sour: [
        "Bram: 'Autumn ore is stiff and cold. Like everything else.'",
        "Bram: 'Late deliveries slow the whole vale down.'",
        "Bram: 'I'll manage. But barely.'",
      ],
      Warm: [
        "Bram: 'Autumn's a good time to shore up the metalwork before winter.'",
        "Bram: 'Stock's holding. We're in fair shape.'",
        "Bram: 'Solid work this season.'",
      ],
      Liked: [
        "Bram: 'The autumn shipment was better than usual. Good.'",
        "Bram: 'I fortified the mill wheel. Told them you supplied the ingot.'",
        "Bram: 'We make a decent team, I'll say that much.'",
      ],
      Beloved: [
        "Bram: 'You've kept this forge going when I thought we'd have to close.'",
        "Bram: 'I carved your name into the anvil base. Only one other name's there.'",
        "Bram: 'Come winter, the vale's safe because of what we built together.'",
      ],
    },
    winter: {
      Sour: [
        "Bram: 'Cold forge. Worse mood. Bring what I asked for.'",
        "Bram: 'Winter and poor stock. Wonderful.'",
        "Bram: 'I'll keep the fire lit. You keep the ore coming.'",
      ],
      Warm: [
        "Bram: 'Winter forge work is slow but steady. As it should be.'",
        "Bram: 'The fire holds. So does the vale.'",
        "Bram: 'Cold doesn't stop a good smith.'",
      ],
      Liked: [
        "Bram: 'The forge kept warm all winter. Your supplies made that possible.'",
        "Bram: 'I made a few extra hinges. The orphanage needed them.'",
        "Bram: 'Winter's easier when the work's going well.'",
      ],
      Beloved: [
        "Bram: 'The forge has never gone cold while you've been here.'",
        "Bram: 'I don't say this often — thank you.'",
        "Bram: 'Spring will come. We'll be ready, because of what we did this winter.'",
      ],
    },
  },

  liss: {
    spring: {
      Sour: [
        "Sister Liss: 'The infirmary is understocked. As usual.'",
        "Sister Liss: 'Spring illnesses are early this year. Don't ask why.'",
        "Sister Liss: 'I can't heal what I can't supply.'",
      ],
      Warm: [
        "Sister Liss: 'Spring brings the coughs out but also the healing herbs.'",
        "Sister Liss: 'The children are recovering well. Thank you for the supplies.'",
        "Sister Liss: 'A fair season for the infirmary.'",
      ],
      Liked: [
        "Sister Liss: 'You've made my work easier this spring. I'm grateful.'",
        "Sister Liss: 'The Hartson child is finally well. Your supplies helped.'",
        "Sister Liss: 'I always know you'll come through when it matters.'",
      ],
      Beloved: [
        "Sister Liss: 'This vale heals faster because you care.'",
        "Sister Liss: 'I keep a jar of spring tincture just for you. Don't argue.'",
        "Sister Liss: 'The whole infirmary speaks well of you.'",
      ],
    },
    summer: {
      Sour: [
        "Sister Liss: 'Summer fevers are no joke. Neither is your supply delay.'",
        "Sister Liss: 'Heat and illness don't wait for better terms.'",
        "Sister Liss: 'I need what I need when I need it.'",
      ],
      Warm: [
        "Sister Liss: 'Summer berries make the best tinctures. Good timing.'",
        "Sister Liss: 'The infirmary is in decent shape. For now.'",
        "Sister Liss: 'Healthy people, healthy vale.'",
      ],
      Liked: [
        "Sister Liss: 'The summer stock held up. You're part of why.'",
        "Sister Liss: 'I've been able to take on more patients this season. Thank you.'",
        "Sister Liss: 'Your generosity shows up in the people who recover.'",
      ],
      Beloved: [
        "Sister Liss: 'The whole vale is healthier since you arrived. I have the records.'",
        "Sister Liss: 'I made you a special tincture. Guard it — it's the last of the summer batch.'",
        "Sister Liss: 'You are, without question, the best thing to happen to this infirmary.'",
      ],
    },
    autumn: {
      Sour: [
        "Sister Liss: 'Autumn colds starting early and stock is low. Splendid.'",
        "Sister Liss: 'The leaves are turning. The patients are multiplying.'",
        "Sister Liss: 'I will not run out of supplies. I will not.'",
      ],
      Warm: [
        "Sister Liss: 'Autumn is a busy season for healers. You've helped it be bearable.'",
        "Sister Liss: 'The preserves you delivered will last us through winter.'",
        "Sister Liss: 'Good work this season.'",
      ],
      Liked: [
        "Sister Liss: 'Autumn meant overtime, but your supplies meant I could manage.'",
        "Sister Liss: 'The older villagers are doing better than last year. That's you.'",
        "Sister Liss: 'I put your name in the record of benefactors. It belongs there.'",
      ],
      Beloved: [
        "Sister Liss: 'You've become indispensable to this infirmary and I don't say that lightly.'",
        "Sister Liss: 'The harvest festival will have healers present, thanks to your support.'",
        "Sister Liss: 'I don't know what we'd do without you. And I no longer need to find out.'",
      ],
    },
    winter: {
      Sour: [
        "Sister Liss: 'Winter is the hardest season for the sick. I'm not impressed by the delay.'",
        "Sister Liss: 'Cold air, thin stocks, worried patients.'",
        "Sister Liss: 'Bring the supplies or I'll find someone who will.'",
      ],
      Warm: [
        "Sister Liss: 'The infirmary stays warm. That matters more than you know.'",
        "Sister Liss: 'Winter patients need warmth and medicine. You've helped with both.'",
        "Sister Liss: 'We'll see the season through.'",
      ],
      Liked: [
        "Sister Liss: 'Nobody died in the infirmary this winter who didn't have to. You helped.'",
        "Sister Liss: 'I've been warmer this winter, somehow. Maybe it's the company.'",
        "Sister Liss: 'Spring is closer. We made it, together.'",
      ],
      Beloved: [
        "Sister Liss: 'You carried this infirmary through the hardest months. I won't forget.'",
        "Sister Liss: 'The vale will be here in spring because people like you didn't give up.'",
        "Sister Liss: 'Come spring, I want to show you what we're building with the new stocks.'",
      ],
    },
  },

  wren: {
    spring: {
      Sour: [
        "Wren: 'The roads are muddy and the trade routes aren't moving. Figures.'",
        "Wren: 'Spring flooding's blocked the south pass. I need those planks.'",
        "Wren: 'I scout, you supply. Let's get moving.'",
      ],
      Warm: [
        "Wren: 'The south road's clearing. Trade coming in.'",
        "Wren: 'Good spring for new routes. You've been a fair supplier.'",
        "Wren: 'The map grows warmer with each delivery.'",
      ],
      Liked: [
        "Wren: 'The routes I've opened this spring — your materials made it possible.'",
        "Wren: 'I added a new waypoint. Named it after the vale. Our vale.'",
        "Wren: 'You move fast and reliable. My kind of partner.'",
      ],
      Beloved: [
        "Wren: 'Every road I've walked this season, you were part of building it.'",
        "Wren: 'The northern traders know your name now. I made sure of it.'",
        "Wren: 'I don't say trust easily. But I trust you.'",
      ],
    },
    summer: {
      Sour: [
        "Wren: 'Hot road, bad mood, empty hands. That's my summer so far.'",
        "Wren: 'Summer trade is moving. I'm not. Fix that.'",
        "Wren: 'Keep up or I'll find another supplier.'",
      ],
      Warm: [
        "Wren: 'Summer roads are dry — good for travel, good for trade.'",
        "Wren: 'The caravan came through. You helped make that happen.'",
        "Wren: 'Long days and good trade. I'll take it.'",
      ],
      Liked: [
        "Wren: 'The summer route is my best yet. You're a big part of that.'",
        "Wren: 'Three new villages trading with us. Three. Because of the planks you sent.'",
        "Wren: 'I work better knowing someone steady is behind me.'",
      ],
      Beloved: [
        "Wren: 'The map of this region is fuller now than it's ever been. You made that possible.'",
        "Wren: 'I brought you back something from the eastern market. Don't say you don't want it.'",
        "Wren: 'I've had partners in the field. You're the best one I've had off it.'",
      ],
    },
    autumn: {
      Sour: [
        "Wren: 'Autumn rains flooding routes I spent all summer building. And the supplies are late.'",
        "Wren: 'The trade window closes fast in autumn. Keep up.'",
        "Wren: 'I've walked harder roads. But not with worse supply chains.'",
      ],
      Warm: [
        "Wren: 'Autumn's the last good trading season. We've used it well.'",
        "Wren: 'The routes are holding. Your planks made the difference.'",
        "Wren: 'Fair season. Good work from both sides.'",
      ],
      Liked: [
        "Wren: 'The autumn haul is the best in three years. Your name's on that.'",
        "Wren: 'I secured a winter trade deal. Wouldn't have happened without your supplies.'",
        "Wren: 'You've made me look good out there. I don't forget that.'",
      ],
      Beloved: [
        "Wren: 'The map I drew this autumn — half of it's possible because you kept the supply line moving.'",
        "Wren: 'I put your crest on the waypost at the crossroads. It belongs there.'",
        "Wren: 'Come winter, I'll be back. Always am, when someone's worth coming back to.'",
      ],
    },
    winter: {
      Sour: [
        "Wren: 'Frozen roads and empty carts. Not my favourite combination.'",
        "Wren: 'Winter travel is miserable. Don't make it worse.'",
        "Wren: 'I scout through cold for the vale. The least you can do is keep supplies moving.'",
      ],
      Warm: [
        "Wren: 'Winter road's rough but passable. Thanks to your planks, mostly.'",
        "Wren: 'The vale is warm and stocked. Good work this season.'",
        "Wren: 'Cold out there. Warm in here. I appreciate that.'",
      ],
      Liked: [
        "Wren: 'Winter's long on the road. Your supplies kept me going.'",
        "Wren: 'I mapped three winter routes nobody thought were possible. Your bridge planks helped.'",
        "Wren: 'The road's hard in winter. Good to know there's somewhere worth coming back to.'",
      ],
      Beloved: [
        "Wren: 'I've wandered far. But this vale — and you — are what I return for.'",
        "Wren: 'The winter routes are open because we made them. Don't forget that.'",
        "Wren: 'You'll see spring because of what we built. That's what scouts are for.'",
      ],
    },
    reactive: [
      {
        id: "wren_no_granary",
        text: "Wren: 'The Hearth is lit, but we've got nowhere to store the surplus. A Granary should be next on your list.'",
        req: (s) => s.story?.flags?.hearth_lit && !s.story?.flags?.granary_built
      },
      {
        id: "wren_village_growing",
        text: "Wren: 'Look at this place. A few weeks ago it was just ruins. Now... it's a settlement.'",
        req: (s) => Object.keys(s.built?.home?._plots || {}).length >= 4
      }
    ],
  },
};

/**
 * Pick a dialog phrase for (npcId, season, bond, rng).
 * Now checks for 'reactive' lines first if a state object is provided.
 * Pure: given the same rng function (and thus same seed), returns the same phrase.
 */
export function pickDialog(npcId, season, bond, rng, state = null) {
  // 1. Try reactive lines first if we have state
  if (state) {
    const reactivePool = DIALOG_POOLS?.[npcId]?.reactive;
    if (Array.isArray(reactivePool)) {
      const active = reactivePool.filter(entry => entry.req(state));
      // 30% chance to pick a reactive line if any are active
      const roll = typeof rng === "function" ? rng() : Math.random();
      if (active.length > 0 && roll < 0.35) {
        const idx = Math.floor((roll / 0.35) * active.length);
        return active[Math.max(0, Math.min(idx, active.length - 1))].text;
      }
    }
  }

  const bandName = bondBand(bond).name;
  const pool = DIALOG_POOLS?.[npcId]?.[season]?.[bandName];
  if (!Array.isArray(pool) || pool.length === 0) {
    const name = NPC_DATA[npcId]?.displayName ?? npcId;
    console.warn(`[dialog] missing ${npcId}.${season}.${bandName} — falling back`);
    return `${name}: '...'`;
  }
  const roll = typeof rng === "function" ? rng() : Math.random();
  const idx = Math.floor(roll * pool.length);
  return pool[Math.max(0, Math.min(idx, pool.length - 1))];
}
