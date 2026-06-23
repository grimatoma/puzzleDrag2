# Tile Seasonal Art Grid

Every tile image is composed from three stacked layers. Build the generator prompt by concatenating them in order:

> **FINAL = BASE GROUND + CORE SUBJECT + SEASON**

The BASE and SEASON are identical for every tile. Only the CORE changes. This is what keeps the whole set visually consistent — same camera, same ground patch, same light, every time.

### Core principle — the tile is the *iconic raw item*, not the plant that grew it

From the **Tile → Resource Proposal**: a tile is the raw state. In art terms that means the CORE is the recognizable item by itself — **an apple stays an apple, corn is just a cob with no stalk, a carrot is just a carrot**. This does two things at once:

- **No overlap with trees.** Fruit tiles are the *fruit object*, never a fruiting bush or tree, so they can't be confused with the Tree tiles. **Trees are the only category that renders as a whole plant** — that's their identity and what keeps them distinct.
- **Seasons stay true filters.** Because the item keeps one fixed silhouette, a season only restains its surface (green→ripe→drying→frosted), exactly like your corn-husk example. (Trees are the lone exception: their foliage changes shape across seasons, which is inherent to a tree.)

---

## 1. Camera & canvas (locked, never varies)

- **Format:** square tile, **fully transparent background** — nothing fills the frame except the ground patch and the subject. Native pixel-art grid at **64×64**.
- **Perspective:** three-quarter view from a **shallow ~20° above the ground plane** — a low, near-side-on angle. The ground patch therefore reads as a **flat, strongly-flattened ellipse** (we see very little of its top), while the subject stands upright and front-facing. Orthographic (no vanishing-point distortion, no lens warp).
- **Light:** single soft key light from the **upper-left (~10–11 o'clock)**. Every subject casts one soft elliptical shadow onto the patch toward the **lower-right**.

## 2. BASE GROUND — "Ground Patch" (the same shape on every tile)

> *A single small **ground patch** drawn as a low, flat horizontal ellipse — **~48% of the tile wide, ~14% of the tile tall** (a wide, shallow oval, NOT a fat disc) — with its center at **50% across and ~66% down** the tile (lower-middle). The patch is a thin grass-topped clod: a grassy/seasonal top surface that domes up only slightly, with a soft tufted edge and a subtle shaded underside; it sits low and reads as a little turf pad floating on transparency. It casts one soft contact shadow just beneath it. **No grass floor, no square tile fill — everything outside the patch is transparent.***

This ground patch is the **stage** and the only background element. Plants grow out of its center; harvested items rest on it; animals stand on it. **The patch surface itself is seasonal** (see §4) — that is what carries the season when there is no surrounding floor.

## 3. CORE SUBJECT — placement rules (apply to every subject)

- **Anchor:** the subject is centered on the **ground patch (50% across, ~66% down)**. Grass, trees, and rooted veg **grow from** that point; harvested items (fruit, grain cob/ears, veg) **rest on** it; animals **stand on** it.
- **Footprint:** the subject's **base/contact** stays inside the small patch (**≤44% tile width** where it meets the ground). Upper parts may extend wider — a tree canopy or broad animal body can overhang the patch — but the point of contact never floats off it.
- **Height:** subject rises from the anchor to **~12% from the top edge** (≈78% of tile height max). Small loose items (a single apple, a cob) sit lower and fill ~40–55%, but stay centered on the same anchor.
- **Orientation:** items and plants are front-facing / symmetrical; animals stand in **front-¾, turned ~15–20° toward the lower-left**, head up, full body readable.
- **Fixed silhouette:** an item tile keeps the **same outline in all four seasons** — only its surface color and frost/snow change. The only exception is Trees, whose foliage shape changes seasonally.
- **Shadow:** one soft contact shadow pooled under the subject, offset lower-right onto the patch surface.

In the tables below, each **Core** cell only describes the subject's identity, footprint, and orientation — the framing above is always inherited.

## 4. SEASON — global filter (applied to the patch + subject)

With no surrounding floor, the season lives on the **ground patch surface** and on the subject. The per-tile season columns then add **only the subject-specific change** (husk drying, coat thickening, etc.); everything below is automatic.

| | Ground patch surface (grass-topped disc) | Soil rim | Light | Extras |
|---|---|---|---|---|
| **Spring** | bright lime-green grass top, dewy sheen | damp, dark | cool-bright daylight |
| **Summer** | saturated mid-green grass top | dry light tan | warm golden, strong shadows | peak vibrancy |
| **Fall** | olive-tan, browning grass top | medium brown | low amber | scattered fallen leaves on the patch |
| **Winter** | snow-covered top (white cap over muted grey-green), frost sparkle | snow-crusted rim | cool blue-grey, faint long shadow | snow on subject's upward surfaces; animals show breath fog |

---

## Grass

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Grass** — one dense raised tuft of upright blades fanning symmetrically from the patch center, taller/denser than the patch's grass top, ~55% width | lime new blades | lush deep green | golden-brown tips, a few bent | blades poking through snow |
| **Meadow Grass** — taller soft tuft with 3–4 slender seed stalks rising straight up from center | fresh green, young stalks | full soft green | amber drooping seed heads | bleached, snow-capped stalks |
| **Spiky Grass** — stiff olive clump of sharp blades radiating evenly from center | vivid new spikes | hard saturated olive | rust-tipped, brittle | frost-stiffened spikes |
| **Clover** — low rounded mound of trefoil leaves with a few white-pink puff blossoms, filling the ground patch | vivid leaves, fresh blossoms | lush full bloom | leaves browning, blossoms seeded | flattened, frosted |

## Grain

*The grain item only — no full stalk. Each is the harvested head/cob/ears resting upright on the patch center.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Wheat** — a small upright cluster of a few bearded wheat ears, no stalk | green soft ears | ripe gold, plump ears | pale-gold, drying, a few grains shedding | frosted, snow caps |
| **Corn** — a single corn cob standing on the patch, husk and silk on top, no stalk | tight green husk | husk peeling open, plump yellow kernels, golden silk | husk drying, curling brown, kernels dented | snow on the cob |
| **Buckwheat** — a short sprig of buckwheat: tiny white-pink flowers and dark triangular seeds | green budding sprig | full white-pink bloom | rusty sprig, brown seeds | bare frosted sprig |
| **Manna** — a small cluster of pale luminous manna grains/flakes, faint glow | soft pale sprout, faint shimmer | full pale-gold glow | dimming cream grains | faint cold-blue glow, snow |
| **Rice** — a small bundle of green-gold rice grain heads | bright green heads | golden plump heads | tan dried heads | frosted heads |

## Tree

*Tree sits dead-center, trunk base at the patch center, rounded canopy filling the upper ¾; the patch reads as the cleared earth around the trunk.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Oak** — broad oak, thick brown trunk, rounded dense canopy | new green leaves, buds | deep-green lush canopy | orange-amber-red, leaves falling | bare grey branches, snow on limbs |
| **Birch** — slender white-bark trunk, airy oval canopy | pale catkins, young leaves | full green airy canopy | bright golden-yellow | bare white trunk, snow |
| **Willow** — short trunk, weeping canopy of long trailing branches | pale green new fronds | full green cascade | trailing strands pale yellow | bare drooping strands, frost |
| **Fir** — conical evergreen, layered dark-green needles, narrow base | bright new needle tips | deep green | dusty green, brown cones | boughs heavy with snow |
| **Cypress** — tall narrow columnar evergreen, dark green | fresh green crown | saturated dark green | muted dusty green | snow-dusted spire |
| **Palm** — curved trunk, fan of green fronds at top | bright fresh fronds | lush vivid fronds | lower fronds browning | snow dusting on fronds |

## Fruit

*The fruit object only — never a bush or tree (that's the Tree category). One hero fruit (a couple where the fruit is small), with a single leaf for read, resting on the patch center. Same outline every season; only ripeness color and frost change.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Apple** — one round apple with a small stem leaf | small green unripe apple | full ripe red apple | deep red apple, leaf turning amber | frost-dusted apple, snow cap |
| **Pear** — one yellow-green pear with a leaf | small green pear | ripe yellow-green pear | golden-ripe pear | frosted pear |
| **Golden Apple** — one glowing golden apple, faint shimmer | small gold-green apple, faint shimmer | bright gold apple | rich glowing-gold apple | frost-rimmed golden apple |
| **Rambutan** — a small cluster of 2–3 red hairy spiky fruit | green spiky fruit | full red hairy fruit | deep crimson overripe | snow-dusted dull red fruit |
| **Starfruit** — one yellow star-shaped carambola | green starfruit | bright yellow ripe star | amber-ripe star | frosted starfruit |
| **Coconut** — one brown coconut (small green tuft for read) | green young coconut | green-brown coconut | full brown coconut | snow-capped coconut |
| **Lemon** — one bright yellow lemon with a leaf | small green lemon | bright yellow ripe lemon | deep-yellow ripe lemon | frosted lemon |
| **Jackfruit** — one big knobbly green-gold fruit | small green fruit | large ripe green-gold fruit | yellow-brown ripe fruit | snow-capped fruit |
| **Blackberry** — a small cluster of dark berries on a short sprig with a leaf | green unripe berries | plump glossy black berries | overripe dark berries, leaf reddening | frost-dusted berries |

## Vegetable

*The vegetable itself — The iconic item resting on the patch center (root veg keep their leafy top for read). Same outline every season; only color and frost change.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Carrot** — one orange carrot with a feathery green top | small pale carrot, ferny top | full ripe orange carrot, lush top | fat carrot, top yellowing | frost-dusted carrot |
| **Eggplant** — one glossy deep-purple eggplant with green cap | small pale-purple fruit | full glossy purple eggplant | deep purple ripe | frosted eggplant |
| **Turnip** — one white-and-magenta turnip with a small leafy top | small pale turnip | plump ripe turnip | fat mature turnip | frosted turnip |
| **Beet** — one crimson beet with dark red-veined leaves | small beet, young leaves | deep crimson ripe beet | fat mature beet | frosted beet |
| **Cucumber** — one ripe green cucumber (small yellow flower) | small young cucumber | full green cucumber | dulling deep-green cucumber | frosted cucumber |
| **Squash** — one plump golden squash | small green squash | full golden squash | deep amber ripe squash | snow-capped squash |
| **Mushroom** — a tight cluster of 2–3 red-capped white-spotted mushrooms | small button caps | open rounded caps | large mature caps (peak) | frost-rimmed drooping caps |
| **Pepper** — one glossy red bell pepper | green unripe pepper | full glossy red pepper | deep red ripe pepper | frosted pepper |
| **Broccoli** — one broccoli floret, thick stalk, dense blue-green head | small green head | full tight blue-green head | head loosening, yellowing | frosted head |

## Flower

*The bloom itself — a single flower or small posy on a short stem, centered on the patch. Same outline every season; only color and frost change.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Pansy** — one violet pansy bloom with a yellow center, short stem and a couple leaves | fresh bloom | saturated bloom | fading, edges browning | withered, frost |
| **Water Lily** — one pink-white lotus bloom on a round lily pad, the patch reading as still water | closed bud on new pad | open lotus, glossy pad | bloom closing, pad yellowing | iced water, frosted pad |
| **Heather** — one upright heather sprig of tiny purple-pink bell flowers | green budding tips | full purple bloom | rusty-brown faded bells | frosted sprig |

## Poultry (Bird)

*Bird stands centered on the patch in front-¾, turned ~15–20° lower-left, full body readable; the patch reads as a worn pen spot.*

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Turkey** — plump bronze turkey, fanned tail, red wattle | — | — | — | feathers fluffed |
| **Pheasant** — long-tailed coppery pheasant, green head | — | — | — | fluffed |
| **Chicken** — red-brown hen, small comb | small chick beside it | — | — | fluffed feathers |
| **Hen** — fluffed white-brown hen on a small nest with one egg | — | — | — | snow-rimmed nest |
| **Rooster** — tall red comb, glossy green-black tail, golden hackles | — | — | — | frosted comb |
| **Wild Goose** — grey-brown goose, long neck | — | — | — | fluffed |
| **Goose** — white domestic goose, orange bill | — | — | — | fluffed |
| **Parrot** — vivid red-green-blue parrot, on a low perch over the patch | — | — | — | fluffed (whimsical) |
| **Phoenix** — fiery orange-gold plumage, ember trail | — | — | — | embers melting the surrounding snow, steam |
| **Dodo** — round grey dodo, big hooked beak, stubby wings | — | — | — | fluffed |
| **Pig-in-Disguise** — pig in a feathered bird costume with a beak mask | — | — | costume slightly askew | adds a scarf |

## Livestock (Herd)

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Pig** — pink round pig, snout | — | — | — | thicker bristles |
| **Hog** — larger brown hog, coarse hair | — | — | — | shaggy coat |
| **Boar** — dark bristly wild boar, tusks | — | — | — | frost on bristles |
| **Warthog** — grey warthog, warts, curved tusks | — | — | — | dusted with snow |
| **Sheep** — fluffy white woolly sheep | lighter, recently-shorn coat | full coat | fuller coat | extra-thick wool, snow on back |
| **Alpaca** — tall fluffy cream alpaca, long neck | lighter coat | full coat | thickening coat | dense fluffed coat |
| **Goat** — white-tan goat, horns, beard | shedding coat | normal | fuller coat | shaggy winter coat |
| **Ram** — big curled horns, thick wool | lighter coat | full coat | fuller coat | heavy wool, frosted horns |

## Cattle

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Cow** — black-and-white dairy cow | — | — | — | thicker coat |
| **Longhorn** — tan longhorn, wide horns | — | — | — | frosted horns |
| **Triceratops** — green three-horned cattle, bony frill | — | — | — | snow on frill and back |

## Mount

| Core (subject, framed per §3) | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| **Horse** — brown horse, flowing mane | — | — | — | thicker coat |
| **Donkey** — grey donkey, long ears | — | — | — | fluffed coat |
| **Moose** — large brown moose, broad antlers | velvet antlers | full antlers | hard antlers | snow on back and antlers |
| **Mammoth** — woolly mammoth, long curved tusks, shaggy fur | shedding coat | lighter coat | full coat | heavy frosted coat, deep snow (its element) |

*(A "—" means no subject-specific change — only the global §4 season filter applies.)*