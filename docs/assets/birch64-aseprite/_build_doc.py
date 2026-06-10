#!/usr/bin/env python3
"""Build docs/birch-tree-64.html — a v1-vs-v2 birch showcase.

Images are REFERENCED by relative path, never base64-inlined — the HTML stays a
few KB so it is cheap to read/edit/diff. Assets live in
docs/assets/birch64-aseprite/out/ and resolve relative to docs/birch-tree-64.html.
(Supersedes the old inlined birch64-concept/_build_page.py output at this path.)"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.abspath(os.path.join(HERE, "..", ".."))   # repo docs/
OUT_HTML = os.path.join(DOCS, "birch-tree-64.html")
REL = "assets/birch64-aseprite/out"                      # relative to docs/birch-tree-64.html

SEASONS = [("spring", "Spring"), ("summer", "Summer"), ("autumn", "Autumn"), ("winter", "Winter")]
TRANS = [
    ("spring_summer", "Spring → Summer", "Fresh growth deepens into full summer green — a slow, passive sway."),
    ("summer_autumn", "Summer → Autumn", "Chlorophyll fades; the crown turns through gold to amber."),
    ("autumn_winter", "Autumn → Winter", "Leaves detach one by one and gather into a pile; then snow blankets the bare branches and finally buries the pile."),
]


def png(name):
    return f"{REL}/{name}"


def gif(name):
    return f"{REL}/{name}"


# ---- assemble inlined assets ----
still_cells = ""
for key, label in SEASONS:
    still_cells += f'<div class="scol"><div class="sname">{label}</div>' \
        f'<div class="tile"><img src="{png(f"birch_{key}.png")}" alt="v1 {label}"></div>' \
        f'<div class="tile"><img src="{png(f"birch_v2_{key}.png")}" alt="v2 {label}"></div></div>\n'

trans_cards = ""
for key, title, cap in TRANS:
    big = ' big' if key == 'autumn_winter' else ''
    trans_cards += f'''<article class="tcard{big}">
  <h3>{title}</h3>
  <div class="pair">
    <figure><img src="{gif(f"birch_trans_{key}.gif")}" alt="v1 {title}"><figcaption><span class="vtag v1">v1</span> ball-cluster crown</figcaption></figure>
    <figure><img src="{gif(f"birch_v2_trans_{key}.gif")}" alt="v2 {title}"><figcaption><span class="vtag v2">v2</span> textured foliage</figcaption></figure>
  </div>
  <p class="cap">{cap}</p>
</article>\n'''

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Birch — Seasonal Tile · v1 / v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg0:#171310; --bg1:#1f1a14; --panel:#241e17; --panel2:#2b2419;
    --line:#3c3225; --ink:#ece7db; --muted:#b1a48d; --faint:#8a7d68;
    --gold:#e0a32a; --amber:#cc6a26; --spring:#a6c83f; --leaf:#4f9a26; --snow:#dfe8f2;
    --shadow:0 18px 40px -22px rgba(0,0,0,.8), 0 2px 8px -4px rgba(0,0,0,.6);
  }}
  * {{ box-sizing:border-box; }}
  html {{ scroll-behavior:smooth; }}
  body {{
    margin:0; color:var(--ink); font-family:"IBM Plex Sans",system-ui,sans-serif;
    line-height:1.6; -webkit-font-smoothing:antialiased;
    background:
      radial-gradient(1100px 540px at 78% -8%, rgba(224,163,42,.10), transparent 60%),
      radial-gradient(900px 600px at 8% 4%, rgba(79,154,38,.09), transparent 55%),
      linear-gradient(180deg, var(--bg1), var(--bg0));
    background-attachment:fixed;
  }}
  .wrap {{ max-width:1000px; margin:0 auto; padding:clamp(28px,5vw,72px) clamp(18px,4vw,40px) 100px; }}

  header {{ position:relative; margin-bottom:54px; }}
  .eyebrow {{ font-family:"JetBrains Mono",monospace; font-size:12.5px; letter-spacing:.32em;
    text-transform:uppercase; color:var(--gold); margin-bottom:18px; }}
  h1 {{ font-family:"Fraunces",serif; font-weight:900; font-size:clamp(40px,7.5vw,78px);
    line-height:.98; letter-spacing:-.015em; margin:0 0 18px;
    background:linear-gradient(95deg,#fff 8%, var(--gold) 55%, var(--spring) 96%);
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }}
  .lede {{ max-width:60ch; font-size:clamp(16px,2.1vw,19px); color:var(--muted); margin:0 0 24px; }}
  .lede b {{ color:var(--ink); font-weight:600; }}
  .legend {{ display:flex; gap:10px; flex-wrap:wrap; }}
  .chip {{ font-family:"JetBrains Mono",monospace; font-size:12px; padding:5px 12px; border-radius:999px;
    border:1px solid var(--line); color:var(--muted); background:rgba(255,255,255,.02); }}
  .chip b {{ color:var(--ink); }}

  h2 {{ font-family:"Fraunces",serif; font-weight:600; font-size:clamp(24px,3.6vw,33px);
    letter-spacing:-.01em; margin:0 0 6px; }}
  .sub {{ color:var(--faint); font-size:14.5px; margin:0 0 26px; }}
  section {{ margin-top:60px; }}

  /* stills grid */
  .stills {{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }}
  .scol {{ display:flex; flex-direction:column; gap:14px; }}
  .sname {{ font-family:"JetBrains Mono",monospace; font-size:12.5px; letter-spacing:.16em;
    text-transform:uppercase; color:var(--muted); text-align:center; }}
  .tile {{ position:relative; aspect-ratio:1; border-radius:14px; display:grid; place-items:center;
    background:linear-gradient(160deg, var(--panel2), var(--panel)); border:1px solid var(--line);
    box-shadow:var(--shadow); overflow:hidden; }}
  .tile::after {{ content:""; position:absolute; inset:0;
    background:radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,.05), transparent 60%); }}
  .scol .tile:nth-of-type(2)::before {{ content:"v1"; }}
  .scol .tile:nth-of-type(3)::before {{ content:"v2"; }}
  .tile::before {{ position:absolute; top:8px; left:9px; z-index:2; font-family:"JetBrains Mono",monospace;
    font-size:10px; font-weight:700; color:var(--faint); letter-spacing:.1em; }}
  .scol .tile:nth-of-type(3)::before {{ color:var(--gold); }}
  .tile img {{ width:78%; height:78%; object-fit:contain; image-rendering:pixelated; position:relative; z-index:1; }}

  /* transitions */
  .tcard {{ background:linear-gradient(165deg, var(--panel2), var(--panel)); border:1px solid var(--line);
    border-radius:18px; padding:22px 24px 20px; box-shadow:var(--shadow); margin-bottom:20px; }}
  .tcard h3 {{ font-family:"Fraunces",serif; font-weight:600; font-size:21px; margin:0 0 16px; letter-spacing:-.01em; }}
  .pair {{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }}
  figure {{ margin:0; display:flex; flex-direction:column; align-items:center; gap:10px; }}
  figure img {{ width:100%; max-width:230px; aspect-ratio:1; image-rendering:pixelated; border-radius:12px;
    background:
      conic-gradient(from 0deg, rgba(255,255,255,.025) 0 25%, transparent 0 50%, rgba(255,255,255,.025) 0 75%, transparent 0) 0 0/22px 22px,
      linear-gradient(180deg, #20223044, #16120d);
    border:1px solid var(--line); padding:6px; }}
  figcaption {{ font-family:"JetBrains Mono",monospace; font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:7px; }}
  .vtag {{ font-weight:700; padding:2px 7px; border-radius:6px; font-size:10px; letter-spacing:.05em; }}
  .vtag.v1 {{ color:var(--faint); border:1px solid var(--line); }}
  .vtag.v2 {{ color:#1a1308; background:linear-gradient(120deg,var(--gold),var(--spring)); }}
  .cap {{ color:var(--muted); font-size:14.5px; margin:16px 2px 2px; max-width:64ch; }}
  .tcard.big {{ border-color:#5a4524; box-shadow:var(--shadow),0 0 0 1px rgba(224,163,42,.18) inset; }}
  .tcard.big figure img {{ max-width:300px; }}
  .tcard.big .pair {{ grid-template-columns:1fr 1fr; }}

  /* changes callout */
  .changes {{ background:linear-gradient(165deg, #2a2316, #211b14); border:1px solid var(--line);
    border-left:3px solid var(--gold); border-radius:16px; padding:24px 28px; box-shadow:var(--shadow); }}
  .changes h2 {{ margin-bottom:14px; }}
  .changes ul {{ margin:0; padding:0; list-style:none; display:grid; gap:14px; }}
  .changes li {{ display:flex; gap:13px; align-items:flex-start; font-size:15px; color:var(--muted); }}
  .changes li b {{ color:var(--ink); font-weight:600; }}
  .dot {{ flex:none; width:9px; height:9px; margin-top:7px; border-radius:50%;
    background:linear-gradient(120deg,var(--gold),var(--spring)); box-shadow:0 0 10px rgba(224,163,42,.5); }}

  footer {{ margin-top:64px; padding-top:24px; border-top:1px solid var(--line);
    color:var(--faint); font-size:13px; font-family:"JetBrains Mono",monospace; }}
  footer code {{ color:var(--muted); }}

  .reveal {{ opacity:0; transform:translateY(16px); animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards; }}
  @keyframes rise {{ to {{ opacity:1; transform:none; }} }}
  @media (max-width:640px) {{
    .stills {{ grid-template-columns:repeat(2,1fr); }}
    .pair {{ grid-template-columns:1fr 1fr; }}
  }}
  @media (prefers-reduced-motion:reduce) {{ .reveal {{ animation:none; opacity:1; transform:none; }} html {{ scroll-behavior:auto; }} }}
</style>
</head>
<body>
<div class="wrap">
  <header class="reveal">
    <div class="eyebrow">Procedural pixel tile · 64×64 · transparent</div>
    <h1>Birch,<br>Four Seasons</h1>
    <p class="lede">A single white-bark birch as a seasonal game tile — four still tiles and three season-to-season transitions. <b>v2</b> reworks the canopy into textured foliage, calms the motion to a passive drift, and gives autumn&nbsp;→&nbsp;winter a real leaf-fall: individual leaves detach, pile up, then snow buries the branches and the pile.</p>
    <div class="legend">
      <span class="chip"><b>v1</b> &nbsp;ball-cluster crown · gusty</span>
      <span class="chip"><b>v2</b> &nbsp;textured foliage · passive · leaf-pile</span>
      <span class="chip">shown at 3–4× · <b>image-rendering: pixelated</b></span>
    </div>
  </header>

  <section class="reveal" style="animation-delay:.06s">
    <h2>Season tiles</h2>
    <p class="sub">v1 (top) and v2 (bottom) for each season. Same silhouette and palette family; v2 trades smooth blobs for lit, dappled leaf-mass.</p>
    <div class="stills">
      {still_cells}
    </div>
  </section>

  <section class="reveal" style="animation-delay:.12s">
    <h2>Seasonal transitions</h2>
    <p class="sub">Each plays once and lands exactly on the next season's tile (seam-perfect). v2 motion is gentle; the autumn&nbsp;→&nbsp;winter beat is fully reworked.</p>
    {trans_cards}
  </section>

  <section class="reveal changes" style="animation-delay:.16s">
    <h2>What changed in v2</h2>
    <ul>
      <li><span class="dot"></span><span><b>Realistic foliage.</b> The crown is a textured leaf-mass — global top-left key light, shaded underside, 2-octave leaf dapple and a ragged leafy edge — instead of stacked smooth spheres.</span></li>
      <li><span class="dot"></span><span><b>Passive motion.</b> Breeze amplitude is cut and slowed to a soft settle/drift rather than a gust.</span></li>
      <li><span class="dot"></span><span><b>True leaf-fall → winter.</b> ~150 individual leaves detach in order, tumble, and stack bottom-up into a pile at the base; then snow accumulates on the branches and finally blankets the pile. The winter tile is that end state.</span></li>
    </ul>
  </section>

  <footer>
    64×64 transparent tiles · images referenced from <code>docs/assets/birch64-aseprite/out/</code> (not inlined) · renderers <code>_gen.py</code> (v1) / <code>_gen_v2.py</code> (v2) · page rebuilt by <code>_build_doc.py</code>
  </footer>
</div>
</body>
</html>"""

with open(OUT_HTML, "w", encoding="utf-8") as f:
    f.write(HTML)
print("wrote", os.path.relpath(OUT_HTML, DOCS), f"({len(HTML)//1024} KB)")
