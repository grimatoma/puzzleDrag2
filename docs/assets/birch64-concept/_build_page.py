#!/usr/bin/env python3
"""Build docs/birch-tree-64.html: a self-contained review page with all 8 of the new
64px birch GIFs base64-inlined (so it never 404s), themed as a sibling of the
grass/farm/more/birch-128 concept pages. Run: py -3 _build_page.py"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "birch-tree-64.html"))


def uri(name):
    with open(os.path.join(HERE, name + ".gif"), "rb") as f:
        return "data:image/gif;base64," + base64.b64encode(f.read()).decode("ascii")


PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Birch, Re-Drawn — A 64px Cartoony Seasonal Tile</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#161a14; --bg2:#1b2017; --panel:#222a1d; --panel2:#2b341f;
    --ink:#eef3e6; --muted:#bfccae; --faint:#8a9a78; --line:#3a4a2e;
    --accent:#8fbe4e;      /* birch-leaf green */
    --accent2:#e0991f;     /* autumn gold      */
    --accent3:#cdd8c0;     /* birch bark / snow */
    --accent4:#6fa3b0;     /* winter sky       */
    --good:#86b75a;
    --chip:#2a331f;
    --radius:14px;
    --shadow:0 10px 30px rgba(0,0,0,.38);
    --shadow-sm:0 4px 14px rgba(0,0,0,.32);
    --serif:"Fraunces",Georgia,"Times New Roman",serif;
    --sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --maxw:1180px;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0; color:var(--ink); font:400 16px/1.62 var(--sans);
    background:
      radial-gradient(1200px 600px at 82% -12%, rgba(143,190,78,.13), transparent 60%),
      radial-gradient(960px 540px at -10% 6%, rgba(111,163,176,.12), transparent 55%),
      radial-gradient(820px 520px at 112% 86%, rgba(224,153,31,.08), transparent 55%),
      linear-gradient(180deg,var(--bg),var(--bg2));
    background-attachment:fixed; background-color:var(--bg);
  }
  a{color:var(--accent);text-decoration:none;}
  a:hover{text-decoration:underline;}
  code{background:var(--chip);padding:.08rem .4rem;border-radius:5px;font:.84em var(--mono);color:#dceeb6;}
  .page{max-width:var(--maxw);margin:0 auto;padding:0 22px 6rem;}

  nav.anchors{
    position:sticky;top:0;z-index:20;
    display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;
    margin:0 -22px 0;padding:.55rem 22px;
    background:linear-gradient(180deg, rgba(22,26,20,.96), rgba(22,26,20,.82));
    backdrop-filter:blur(8px);border-bottom:1px solid var(--line);
  }
  nav.anchors .brand{font:800 .95rem/1 var(--serif);color:var(--accent);margin-right:.7rem;letter-spacing:-.01em;}
  nav.anchors a{font:600 .82rem/1 var(--sans);color:var(--muted);padding:.4rem .7rem;border-radius:8px;transition:background .15s,color .15s;}
  nav.anchors a:hover{background:var(--chip);color:var(--ink);text-decoration:none;}
  nav.anchors a.x-link{color:var(--accent2);}
  nav.anchors a.x-link.first{margin-left:auto;}
  nav.anchors a.x-link:hover{background:color-mix(in srgb,var(--accent2) 16%,transparent);color:var(--ink);}

  header.hero{
    position:relative;overflow:hidden;
    margin:1.4rem 0 1.6rem;padding:2.4rem 2.2rem 2rem;
    border:1px solid var(--line);border-radius:var(--radius);
    background:
      radial-gradient(680px 300px at 18% -10%, rgba(143,190,78,.20), transparent 70%),
      radial-gradient(520px 280px at 96% 120%, rgba(111,163,176,.18), transparent 70%),
      linear-gradient(180deg, rgba(43,52,31,.55), rgba(27,32,23,.4));
    box-shadow:var(--shadow);
  }
  header.hero::after{
    content:"";position:absolute;inset:0;opacity:.05;pointer-events:none;
    background-image:
      linear-gradient(rgba(238,243,230,.7) 1px,transparent 1px),
      linear-gradient(90deg,rgba(238,243,230,.7) 1px,transparent 1px);
    background-size:32px 32px;
    mask-image:radial-gradient(560px 260px at 72% 24%, #000, transparent 78%);
  }
  .kicker{font:600 12px/1 var(--mono);letter-spacing:.26em;text-transform:uppercase;color:var(--accent);margin:0 0 .8rem;}
  header.hero h1{
    position:relative;font:800 clamp(2.4rem,6vw,4.3rem)/1.03 var(--serif);letter-spacing:-.015em;margin:0;
    background:linear-gradient(94deg,#e9f3cf,#8fbe4e 38%,#e0991f 70%,#6fa3b0);
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .sub{position:relative;max-width:64ch;margin:1rem 0 0;color:var(--muted);font-size:1.12rem;}
  .intro{position:relative;max-width:72ch;margin:1.1rem 0 0;color:var(--muted);font-size:.98rem;}
  .chips{position:relative;display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1.4rem;}
  .chip{font:600 11.5px/1 var(--mono);letter-spacing:.04em;padding:.42rem .72rem;border-radius:999px;background:rgba(42,51,31,.62);color:var(--muted);border:1px solid var(--line);}
  .chip.go{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,var(--line));}
  .chip.au{color:var(--accent2);border-color:color-mix(in srgb,var(--accent2) 45%,var(--line));}
  .chip.wi{color:var(--accent4);border-color:color-mix(in srgb,var(--accent4) 45%,var(--line));}

  section{
    margin:0 0 2rem;padding:1.8rem 1.9rem 1.5rem;
    background:linear-gradient(180deg, rgba(34,42,29,.66), rgba(27,32,23,.5));
    border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);scroll-margin-top:4.2rem;
  }
  section > h2{font:800 clamp(1.5rem,3vw,2.15rem)/1.12 var(--serif);letter-spacing:-.01em;margin:0 0 .35rem;color:var(--ink);}
  section > h2 .num{font:600 .6em var(--mono);color:var(--accent);margin-right:.55em;vertical-align:middle;}
  .section-sub{color:var(--muted);margin:0 0 1.4rem;max-width:80ch;font-size:.98rem;}
  p{margin:.5rem 0;}

  .stage{
    display:grid;place-items:center;border-radius:12px;
    background:
      radial-gradient(62% 60% at 50% 30%, rgba(143,190,78,.12), transparent 72%),
      radial-gradient(120% 120% at 50% 122%, rgba(40,52,28,.6), transparent 70%),
      linear-gradient(180deg, #20271a, #161b12);
    border:1px solid var(--line);
    box-shadow:inset 0 1px 0 rgba(238,243,230,.05), inset 0 -16px 32px -18px rgba(0,0,0,.7);
  }
  .stage.hero-stage{padding:1.4rem 1.4rem 1rem;}
  .stage.card-stage{padding:.7rem .7rem .4rem;}

  img.sprite{
    image-rendering:pixelated;image-rendering:-moz-crisp-edges;image-rendering:crisp-edges;
    -ms-interpolation-mode:nearest-neighbor;display:block;
  }
  .px384{width:384px;height:384px;}   /* 6x */
  .px256{width:256px;height:256px;}   /* 4x */
  .px128{width:128px;height:128px;}   /* 2x */
  .px64{width:64px;height:64px;}      /* 1x = native */

  .actual{display:flex;align-items:center;gap:.75rem;margin-top:.6rem;justify-content:center;}
  .actual .label{font:600 11px/1.35 var(--mono);letter-spacing:.04em;color:var(--faint);text-transform:uppercase;}

  .hero-feature{display:flex;gap:1.6rem;align-items:center;flex-wrap:wrap;justify-content:center;}
  .hero-feature .blurb{max-width:42ch;}

  .seasons{display:grid;grid-template-columns:repeat(4,1fr);gap:1.1rem;margin:.3rem 0 0;}
  @media(max-width:1080px){.seasons{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:560px){.seasons{grid-template-columns:1fr;max-width:340px;margin-inline:auto;}}
  .trans-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.2rem;margin:.3rem 0 0;}
  @media(max-width:860px){.trans-grid{grid-template-columns:1fr;max-width:430px;margin-inline:auto;}}

  .card{
    display:flex;flex-direction:column;
    background:linear-gradient(180deg, rgba(43,52,31,.72), rgba(30,37,22,.6));
    border:1px solid var(--line);border-top:3px solid var(--accent);
    border-radius:var(--radius);padding:1rem 1rem 1.1rem;box-shadow:var(--shadow-sm);
    transition:transform .16s, box-shadow .16s, border-color .16s;
  }
  .card:hover{transform:translateY(-3px);box-shadow:var(--shadow);}
  .card.spring{border-top-color:#9fcf5a;} .card.summer{border-top-color:#4f9026;}
  .card.fall{border-top-color:#e0991f;} .card.winter{border-top-color:#bccad6;}
  .card .badge{font:600 10.5px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:0 0 .4rem;}
  .card h3{margin:.05rem 0 .5rem;font:800 1.5rem/1.05 var(--serif);color:var(--ink);}
  .card .stage-wrap{display:flex;justify-content:center;}
  .swatches{display:flex;flex-wrap:wrap;gap:.28rem;margin:.85rem 0 .2rem;}
  .swatches .sw{width:18px;height:18px;border-radius:5px;border:1px solid rgba(0,0,0,.45);box-shadow:inset 0 0 0 1px rgba(238,243,230,.07);}
  .note{margin:.75rem 0 0;}
  .note .lbl{display:inline-block;font:700 .7rem/1 var(--sans);letter-spacing:.04em;text-transform:uppercase;color:var(--accent2);margin:0 0 .2rem;}
  .note p{margin:.1rem 0 0;font-size:.9rem;color:var(--muted);}

  .box{background:color-mix(in srgb,var(--accent) 9%,transparent);border-left:4px solid var(--accent);padding:.85rem 1.1rem;margin:1.2rem 0;border-radius:0 9px 9px 0;box-shadow:var(--shadow-sm);}
  .box.au{background:color-mix(in srgb,var(--accent2) 10%,transparent);border-left-color:var(--accent2);}
  .box b{font-family:var(--serif);color:var(--ink);}
  .box p{margin:.2rem 0;color:var(--muted);font-size:.93rem;}
  ul.notes-list{margin:.4rem 0 .2rem;padding-left:1.15rem;}
  ul.notes-list li{margin:.55rem 0;color:var(--muted);font-size:.95rem;}
  ul.notes-list li b{color:var(--ink);font-family:var(--serif);font-weight:600;}

  .compare{display:flex;gap:1.4rem;align-items:center;flex-wrap:wrap;justify-content:center;margin-top:.4rem;}
  .compare figure{margin:0;text-align:center;}
  .compare figcaption{font:600 11px/1.4 var(--mono);letter-spacing:.03em;color:var(--faint);text-transform:uppercase;margin-top:.5rem;}

  footer{margin-top:2.6rem;padding:1.6rem 1.9rem;border:1px dashed var(--line);border-radius:var(--radius);background:linear-gradient(180deg, rgba(34,42,29,.4), rgba(27,32,23,.3));color:var(--muted);}
  footer h3{margin-top:0;color:var(--accent);font:600 1.28rem/1.25 var(--serif);}
  footer p{font-size:.92rem;}
  footer .dim{color:var(--faint);}

  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  header.hero{animation:fadeUp .6s cubic-bezier(.21,.61,.35,1) both;}
  main>section{animation:fadeUp .55s cubic-bezier(.21,.61,.35,1) both;}
  main>section:nth-of-type(1){animation-delay:.08s;}
  main>section:nth-of-type(2){animation-delay:.18s;}
  main>section:nth-of-type(n+3){animation-delay:.24s;}

  @media (max-width:820px){
    header.hero{padding:1.7rem 1.4rem;}
    section{padding:1.4rem 1.3rem 1.1rem;}
    nav.anchors{gap:.15rem;}
    nav.anchors a{padding:.35rem .55rem;font-size:.76rem;}
    nav.anchors a.x-link.first{margin-left:0;}
    .px384{width:288px;height:288px;}
    .px256{width:208px;height:208px;}
  }
  @media (prefers-reduced-motion:reduce){
    html{scroll-behavior:auto;}
    *{animation:none!important;transition:none!important;}
    .card:hover{transform:none;}
  }
  @media print{
    body{background:#fff;color:#161a14;}
    nav.anchors{display:none;}
    section,header.hero,.card,.stage,footer{box-shadow:none;background:#fff;border-color:#cbd3bf;}
    header.hero h1{-webkit-text-fill-color:initial;color:#3a5a1a;background:none;}
    a{color:inherit;}
    .card{break-inside:avoid;}
  }
</style>
</head>
<body>
<div class="page">

  <nav class="anchors" aria-label="Sections">
    <span class="brand">🌳 Birch · 64px</span>
    <a href="#tile">The tile</a>
    <a href="#seasons">Four seasons</a>
    <a href="#transitions">Transitions</a>
    <a href="#made">How it was made</a>
    <a class="x-link first" href="birch-tree-seasons.html">Birch (128px)</a>
    <a class="x-link" href="grass-tile-concepts.html">Grass</a>
    <a class="x-link" href="farm-tile-concepts.html">Farm</a>
    <a class="x-link" href="more-tile-concepts.html">More</a>
  </nav>

  <header class="hero">
    <p class="kicker">Pixel-art exploration · new attempt · concept only</p>
    <h1>Birch, Re-Drawn</h1>
    <p class="sub">A fresh <strong>64&times;64</strong> birch tile &mdash; cartoonier, to sit beside the game's own
      hand-drawn tile icons, and built so the <em>seasons actually transition</em>.</p>
    <p class="intro">
      A single slender white-bark trunk &mdash; black lenticels and a chevron knot &mdash; under a chunky, bumpy
      leaf-blob crown wrapped in a <strong>bold dark outline</strong>, so it reads like a sticker the way the in-game
      tiles do. It's drawn entirely <strong>in code</strong> (Python&nbsp;+&nbsp;Pillow) with the repo's
      <code>pixel-art-animation</code> skill. One continuous <em>season</em> value drives everything, and the
      between-season morphs are the point: in autumn the leaves <strong>physically let go</strong> &mdash; cluster by
      cluster &mdash; tumble down, and pile up before the snow buries them; in spring they bud and grow back. Nothing
      here is wired into the game &mdash; these are <strong>concepts only</strong>.
    </p>
    <div class="chips">
      <span class="chip">64&times;64</span>
      <span class="chip">bold outline</span>
      <span class="chip go">4 seasonal idles</span>
      <span class="chip au">4 transitions</span>
      <span class="chip au">leaves really fall</span>
      <span class="chip wi">light breeze</span>
      <span class="chip">concept only</span>
    </div>
  </header>

  <main>

    <section id="tile">
      <h2><span class="num">01</span>A cartoonier birch</h2>
      <p class="section-sub">
        The headline: a summer birch in a light breeze, sized and outlined to live on the board next to the game's own
        tile art. The trunk stays rooted; only the crown moves &mdash; branches and leaf clusters bend with the tips
        trailing the base (follow-through), neighbouring branches a beat out of phase, and a fine per-leaf flutter on
        top. The grass below catches the same wind.
      </p>
      <div class="hero-feature">
        <div>
          <div class="stage hero-stage"><img class="sprite px384" src="__IDLE_SUMMER__" alt="Birch tile swaying in a light summer breeze"></div>
          <div class="actual"><img class="sprite px64" src="__IDLE_SUMMER__" alt="actual size"><span class="label">&larr; actual size · 64&times;64</span></div>
        </div>
        <div class="blurb">
          <div class="box">
            <p><b>Real animation, not a slide.</b> Every frame the crown is <em>re-drawn</em> in its new pose &mdash; the
            bumpy silhouette genuinely re-forms. That's the difference between leaves rustling and a block of pixels
            shifting sideways.</p>
          </div>
          <p style="color:var(--muted);font-size:.93rem;">
            White birch bark with dark lenticels gives the tree its identity; the chunky canopy is lit from the
            upper-left with hue-shifted ramps (cool-green in shadow, warm at the highlights) and then a single dark ring
            is traced around the whole silhouette &mdash; the cartoony &ldquo;sticker&rdquo; read that matches the rest of
            the board.
          </p>
        </div>
      </div>
    </section>

    <section id="seasons">
      <h2><span class="num">02</span>Four seasons, idling</h2>
      <p class="section-sub">
        The same tile and the same breeze in four seasonal states. Each is a seamless loop; the only thing that changes
        between them is the <em>season</em> value driving foliage colour, crown fullness, snow and the drifting particles.
      </p>
      <div class="seasons">

        <div class="card spring">
          <p class="badge">Season 01</p>
          <h3>Spring</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__IDLE_SPRING__" alt="Birch tile in spring"></div></div>
          <div class="swatches"><span class="sw" style="background:#cce47a"></span><span class="sw" style="background:#b4d24a"></span><span class="sw" style="background:#7fae34"></span><span class="sw" style="background:#5fae3a"></span><span class="sw" style="background:#ece7db"></span></div>
          <div class="note"><span class="lbl">State</span><p>Fresh yellow-green leaf-out over bright new grass; pale blossom petals drift past on the breeze.</p></div>
        </div>

        <div class="card summer">
          <p class="badge">Season 02</p>
          <h3>Summer</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__IDLE_SUMMER__" alt="Birch tile in summer"></div></div>
          <div class="swatches"><span class="sw" style="background:#88c24a"></span><span class="sw" style="background:#54a02a"></span><span class="sw" style="background:#357018"></span><span class="sw" style="background:#4f922c"></span><span class="sw" style="background:#ece7db"></span></div>
          <div class="note"><span class="lbl">State</span><p>Full, rich-green crown at its densest &mdash; the canonical &ldquo;birch in the breeze.&rdquo; Deep summer grass below.</p></div>
        </div>

        <div class="card fall">
          <p class="badge">Season 03</p>
          <h3>Autumn</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__IDLE_FALL__" alt="Birch tile in autumn"></div></div>
          <div class="swatches"><span class="sw" style="background:#f0c24a"></span><span class="sw" style="background:#e3a022"></span><span class="sw" style="background:#d8741c"></span><span class="sw" style="background:#b39a55"></span><span class="sw" style="background:#b89a52"></span></div>
          <div class="note"><span class="lbl">State</span><p>Gold, amber and orange in per-cluster variety; a few leaves already loosen and drift down over a strawy ground.</p></div>
        </div>

        <div class="card winter">
          <p class="badge">Season 04</p>
          <h3>Winter</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__IDLE_WINTER__" alt="Birch tile in winter"></div></div>
          <div class="swatches"><span class="sw" style="background:#f4efe6"></span><span class="sw" style="background:#cfc7b6"></span><span class="sw" style="background:#8f8576"></span><span class="sw" style="background:#eef3fa"></span><span class="sw" style="background:#b9c6da"></span></div>
          <div class="note"><span class="lbl">State</span><p>Bare branches under snow caps, white trunk, a drifting flurry over a snow mound. Even bare, the boughs sway.</p></div>
        </div>

      </div>
    </section>

    <section id="transitions">
      <h2><span class="num">03</span>Season transitions &mdash; the point of this take</h2>
      <p class="section-sub">
        The four morphs around the year. Each plays once &mdash; the <em>season</em> value eases from one to the next
        while the breeze keeps blowing &mdash; then holds and loops. The whole cycle chains
        spring&rarr;summer&rarr;autumn&rarr;winter&rarr;spring.
      </p>
      <div class="box au">
        <p><b>Leaves that actually fall.</b> The old 128px birch just <em>faded</em> its leaves out where they hung.
        Here every leaf cluster has its own drop time: in autumn it browns, <em>detaches from its spot on the branch</em>,
        tumbles down with a bit of spin and side-to-side sway, lands, and rests as litter on the ground &mdash; until the
        rising snow covers it. The crown empties leaf-by-leaf instead of dissolving in place. Spring runs it in reverse.</p>
      </div>
      <div class="trans-grid">

        <div class="card spring">
          <p class="badge">Transition</p>
          <h3>Spring &rarr; Summer</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__TRANS_SPRING_SUMMER__" alt="Spring to summer"></div></div>
          <div class="note"><span class="lbl">What morphs</span><p>Pale leaf-out deepens and the crown fills out to a dense summer green; the last petals drift away.</p></div>
        </div>

        <div class="card fall">
          <p class="badge">Transition</p>
          <h3>Summer &rarr; Autumn</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__TRANS_SUMMER_FALL__" alt="Summer to autumn"></div></div>
          <div class="note"><span class="lbl">What morphs</span><p>Green sweeps to gold and orange, cluster by cluster &mdash; full crown still &mdash; while the grass tans below.</p></div>
        </div>

        <div class="card winter">
          <p class="badge">Transition · headline</p>
          <h3>Autumn &rarr; Winter</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__TRANS_FALL_WINTER__" alt="Autumn to winter — leaves fall away"></div></div>
          <div class="note"><span class="lbl">What morphs</span><p>Leaves brown, <strong>let go cluster-by-cluster and tumble to the ground</strong>, piling as litter; bare branches emerge as snow settles on the boughs and builds up below.</p></div>
        </div>

        <div class="card spring">
          <p class="badge">Transition</p>
          <h3>Winter &rarr; Spring</h3>
          <div class="stage-wrap"><div class="stage card-stage"><img class="sprite px256" src="__TRANS_WINTER_SPRING__" alt="Winter to spring"></div></div>
          <div class="note"><span class="lbl">What morphs</span><p>Snow melts off branch and ground and grass returns; buds swell at the branch tips, then fresh leaves grow back in &mdash; closing the loop.</p></div>
        </div>

      </div>
    </section>

    <section id="made">
      <h2><span class="num">04</span>How it was made</h2>
      <p class="section-sub">All eight GIFs come from one small generator, <code>_birch64_anim.py</code>, built with the
        <code>pixel-art-animation</code> skill. The point of the skill is that the motion is genuine animation, not a
        sprite being slid around &mdash; and here, that the defoliation is genuine too.</p>
      <ul class="notes-list">
        <li><b>One parameterized frame.</b> <code>compose_frame(season, breeze_phase)</code> draws the whole tile. An idle
          holds <code>season</code> fixed and loops the breeze; a transition eases <code>season</code> from one value to
          the next.</li>
        <li><b>Cartoony, outlined art.</b> Chunky leaf-blobs are shaded round with hue-shifted ramps and one upper-left
          light, then a single dark ring is traced around the silhouette &mdash; the &ldquo;sticker&rdquo; look that
          matches the game's tile icons, at a chunkier 64px.</li>
        <li><b>Cantilever canopy.</b> Branches and leaf clusters bend with displacement growing toward the tip, the tip
          phase-lagged behind the base (follow-through), and each branch offset in phase so a gust rolls across the
          crown. The trunk only barely sways at the very top.</li>
        <li><b>Per-cluster drop &amp; grow schedules.</b> Every leaf cluster carries its own <code>drop_order</code> and
          <code>grow_order</code>. Autumn&rarr;winter walks a defoliation value past each drop time, spawning a leaf that
          falls from the crown to a landing spot; winter&rarr;spring walks a growth value past each grow time, swelling a
          bud into a leaf. The seams between idles and transitions line up because presence is continuous across every
          season boundary.</li>
        <li><b>Verified by montage.</b> Every loop was laid out frame-by-frame and checked to confirm the crown
          <em>re-forms</em> each frame &mdash; and that the leaves come off the tree rather than fading in place.</li>
      </ul>
      <div class="box"><p><b>Concept only.</b> The game still draws its trees as static procedural icons
        (<code>src/textures/categories/trees.ts</code>). This is an exploration of what an animated, seasonal birch tile
        could look like &mdash; a cartoonier companion to the earlier <a href="birch-tree-seasons.html">128px birch</a>,
        not wired into the engine.</p></div>
    </section>

  </main>

  <footer>
    <h3>Sibling concept pages</h3>
    <p>Part of the animated pixel-art concept set:
      <a href="birch-tree-seasons.html">Birch (128px)</a> ·
      <a href="grass-tile-concepts.html">Grass</a> ·
      <a href="farm-tile-concepts.html">Farm</a> ·
      <a href="more-tile-concepts.html">More tiles</a>.</p>
    <p class="dim">64&times;64 looping GIFs, base64-inlined so this page is self-contained. Generated procedurally with
      the <code>pixel-art-animation</code> skill (Python&nbsp;+&nbsp;Pillow). Concept only &mdash; not wired into the game.</p>
  </footer>

</div>
</body>
</html>
"""

REPL = {
    "__IDLE_SPRING__": "idle-spring",
    "__IDLE_SUMMER__": "idle-summer",
    "__IDLE_FALL__": "idle-fall",
    "__IDLE_WINTER__": "idle-winter",
    "__TRANS_SPRING_SUMMER__": "trans-spring-summer",
    "__TRANS_SUMMER_FALL__": "trans-summer-fall",
    "__TRANS_FALL_WINTER__": "trans-fall-winter",
    "__TRANS_WINTER_SPRING__": "trans-winter-spring",
}

html = PAGE
for token, name in REPL.items():
    html = html.replace(token, uri(name))

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote", OUT, "(%.0f KB)" % (len(html.encode("utf-8")) / 1024))
