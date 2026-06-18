#!/usr/bin/env python3
"""
Hand-drawn pixel-art building sprites for the Town Layout mock
(docs/town-layout/index.html).

Orientation: 3/4 top-down "billboard" — a front-facing elevation (gable roof
on top of a wall), light from the upper-left, designed to STAND on the flat
top-down ground and sit inside a plot footprint. Each sprite's ground-contact
point is the bottom-centre (anchor), so the mock can place it with the wall
base on the plot baseline and draw a cast shadow beneath it.

Outputs (PNG, transparent, NEAREST-friendly hard pixels):
  cottage.png   64x64  native
  bakery.png    64x64  native
  preview.png   montage: each sprite big + both dropped into plots on a
                3/4 top-down ground, matched to the mock's palette.
Run:  python generate.py
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- palette (hue-shifted ramps; warm light from upper-left) -----------------
def C(h):  # "#rrggbb" -> (r,g,b,255)
    h = h.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), 255)

# terracotta roof
RF_DK, RF_MD, RF_LT, RF_HI = C('7a2a1c'), C('b6422c'), C('cf5a38'), C('e07a4a')
# brown roof (bakery)
BR_DK, BR_MD, BR_LT, BR_HI = C('5e3a22'), C('8a5a30'), C('a8743f'), C('c08a52')
# cream wall
WL_SH, WL_MD, WL_LT = C('c6a878'), C('e8d3a8'), C('f5e6c2')
# ochre wall (bakery)
OC_SH, OC_MD, OC_LT = C('c79a55'), C('e6c27e'), C('f2d79a')
# wood
WD_DK, WD_MD, WD_LT = C('4a2f1a'), C('6e4a26'), C('946a3c')
# stone (chimney / foundation)
ST_DK, ST_MD, ST_LT = C('6c645c'), C('968e82'), C('bab2a4')
# glass (lit warm)
GL, GL_FR = C('ffd98a'), C('6e4a26')
# accents
OL  = C('3a2616')          # warm dark outline (not pure black)
OL2 = C('4a2f1a')          # softer outline (shadow side gets the darker OL)
SMOKE = (214, 210, 204, 255)
SHCOL = (16, 14, 26, 70)   # cast-shadow tint

def smoke(px, x, y):
    """a small wispy plume rising in a gentle S-curve, fading as it climbs."""
    puffs = ((0,0,2,150),(1,-4,2,120),(-1,-8,2,95),(0,-12,1,70),(1,-15,1,45))
    for (dx,dy,r,a) in puffs:
        col=(SMOKE[0],SMOKE[1],SMOKE[2],a)
        for yy in range(-r,r+1):
            for xx in range(-r,r+1):
                if xx*xx+yy*yy<=r*r:
                    ox,oy=x+dx+xx, y+dy+yy
                    cur=px.get(ox,oy)
                    if cur[3]==0: px.set(ox,oy,col)

W = H = 64

# ---- tiny pixel canvas -------------------------------------------------------
class Px:
    def __init__(s, w, h):
        s.im = Image.new('RGBA', (w, h), (0,0,0,0))
        s.p = s.im.load(); s.w=w; s.h=h
    def set(s, x, y, c):
        x=int(round(x)); y=int(round(y))
        if 0<=x<s.w and 0<=y<s.h: s.p[x,y]=c
    def rect(s, x0,y0,x1,y1,c):
        for y in range(int(y0),int(y1)+1):
            for x in range(int(x0),int(x1)+1): s.set(x,y,c)
    def hline(s,x0,x1,y,c):
        for x in range(int(x0),int(x1)+1): s.set(x,y,c)
    def vline(s,x,y0,y1,c):
        for y in range(int(y0),int(y1)+1): s.set(x,y,c)
    def get(s,x,y):
        if 0<=x<s.w and 0<=y<s.h: return s.p[x,y]
        return (0,0,0,0)
    def outline(s, c=OL):
        """1px outline around the opaque silhouette (drawn onto a copy)."""
        src = s.im.copy(); sp = src.load()
        for y in range(s.h):
            for x in range(s.w):
                if sp[x,y][3]==0:
                    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx,ny=x+dx,y+dy
                        if 0<=nx<s.w and 0<=ny<s.h and sp[nx,ny][3]>0:
                            # shadow side (right / bottom) gets the darker outline
                            s.set(x,y, OL if (dx<0 or dy<0) else c); break

def gable(px, apex, eaveY, halfAtEave, cx, shade_l, shade_m, shade_r, hi):
    """Fill a triangular front gable apex(=(cx,apexY)) down to the eave line,
    shingle banding + ridge highlight + AA on the slopes."""
    apexY = apex
    span = eaveY - apexY
    for y in range(apexY, eaveY+1):
        t = (y-apexY)/span
        hw = halfAtEave * t
        xl, xr = cx-hw, cx+hw
        for x in range(int(round(xl)), int(round(xr))+1):
            # left-lit / right-shaded across the ridge
            band = ((y-apexY)//3) % 2            # shingle rows
            if x < cx-1:   col = shade_l if not band else shade_m
            elif x > cx+1: col = shade_r if not band else shade_r
            else:          col = hi               # ridge highlight column
            px.set(x,y,col)
        # eave-edge darkening + ridge AA
        px.set(int(round(xl)), y, shade_m)
        px.set(int(round(xr)), y, shade_r)
    # bright ridge running down from the apex on the lit slope
    for y in range(apexY+1, eaveY):
        t=(y-apexY)/span; hw=halfAtEave*t
        px.set(int(round(cx-hw*0.45)), y, hi)

# ---- COTTAGE -----------------------------------------------------------------
def cottage():
    px = Px(W,H)
    # wall 12..52 x, 30..57 y
    px.rect(12,30,52,57, WL_MD)
    px.vline(12,30,57, WL_LT); px.vline(13,30,57, WL_LT)     # left light strip
    px.vline(51,30,57, WL_SH); px.vline(52,30,57, WL_SH)     # right shade strip
    px.rect(12,55,52,57, WL_SH)                              # grounded shadow at base
    # timber foundation beam
    px.rect(12,56,52,57, WD_MD)
    # chimney (poke through roof, right side -> shadow side)
    px.rect(43,15,48,31, ST_MD); px.vline(43,15,31, ST_LT); px.vline(48,15,31, ST_DK)
    px.rect(42,15,49,17, ST_DK)                              # cap
    # roof gable, slight overhang past the wall (eave 7..57)
    gable(px, apex=10, eaveY=30, halfAtEave=25, cx=32,
          shade_l=RF_LT, shade_m=RF_MD, shade_r=RF_DK, hi=RF_HI)
    px.hline(7,57,30, RF_DK)                                 # eave line
    px.hline(8,56,31, WD_DK)                                 # eave board shadow on wall
    # door 28..36
    px.rect(28,44,36,57, WD_MD); px.vline(28,44,57, WD_LT); px.vline(36,44,57, WD_DK)
    px.rect(29,44,35,45, WD_DK)                              # lintel
    px.set(34,51, C('caa24a'))                               # brass knob
    # windows (warm glow) + flower box
    for wx in (16,41):
        px.rect(wx,36,wx+7,43, GL_FR)
        px.rect(wx+1,37,wx+6,42, GL)
        px.vline(wx+3,37,42, GL_FR); px.hline(wx+1,wx+6,39, GL_FR)  # muntins
        px.rect(wx,43,wx+7,44, WD_MD)                        # sill / box
        for i,fx in enumerate((wx+1,wx+4,wx+6)):
            px.set(fx,43, (C('e2557f'),C('ffd24d'),C('fff0f2'))[i])
    smoke(px, 45, 13)
    px.outline(OL2)
    return px.im

# ---- BAKERY (a shop) ---------------------------------------------------------
def bakery():
    px = Px(W,H)
    # taller shopfront wall 10..54 x, 28..57 y, ochre
    px.rect(10,28,54,57, OC_MD)
    px.vline(10,28,57, OC_LT); px.vline(11,28,57, OC_LT)
    px.vline(53,28,57, OC_SH); px.vline(54,28,57, OC_SH)
    px.rect(10,56,54,57, WD_MD)                              # base beam
    # chimney left side this time, with an oven-smoke puff
    px.rect(16,13,21,29, ST_MD); px.vline(16,13,29,ST_LT); px.vline(21,13,29,ST_DK)
    px.rect(15,13,22,15, ST_DK)
    # brown hip-ish gable roof, wide eaves 5..59
    gable(px, apex=9, eaveY=28, halfAtEave=27, cx=32,
          shade_l=BR_LT, shade_m=BR_MD, shade_r=BR_DK, hi=BR_HI)
    px.hline(5,59,28, BR_DK)
    px.hline(6,58,29, WD_DK)
    # big shop window (left) with warm glow + display
    px.rect(14,34,27,46, GL_FR); px.rect(15,35,26,45, GL)
    px.vline(20,35,45,GL_FR); px.hline(15,26,40,GL_FR)
    px.rect(15,43,26,45, C('b6824a'))                        # loaves on display shelf
    for bx in (17,20,23): px.set(bx,43,C('e7b86a')); px.set(bx,42,C('caa24a'))
    # door (right) 38..47
    px.rect(38,40,47,57, WD_MD); px.vline(38,40,57,WD_LT); px.vline(47,40,57,WD_DK)
    px.rect(40,42,45,49, GL); px.rect(40,42,45,42, GL_FR)    # door window
    px.set(45,51,C('caa24a'))
    # striped awning over the shopfront
    ay=33
    for i in range(0,12):
        ax=14+i*3
        col = C('c0492f') if i%2==0 else C('f2e4c4')
        for j in range(3):
            px.set(ax+j, ay, col); px.set(ax+j, ay+1, col)
            if j<2: px.set(ax+1, ay+2, col)
    px.hline(14,49,ay-1, WD_DK)
    # scalloped awning fringe
    for i in range(0,12):
        ax=14+i*3
        if i%2==0: px.set(ax+1,ay+2,C('c0492f'))
    # hanging sign on a bracket (right eave) with a wheat/loaf emblem
    px.vline(56,30,33, WD_DK); px.hline(52,56,30, WD_DK)
    px.rect(50,33,57,41, WD_MD); px.rect(51,34,56,40, C('e8d3a8'))
    px.set(53,36,C('caa24a')); px.set(54,37,C('caa24a')); px.set(53,38,C('b6824a'))  # loaf glyph
    smoke(px, 18, 11)
    px.outline(OL2)
    return px.im

# ---- preview montage ---------------------------------------------------------
def rounded_rect(px,x0,y0,x1,y1,c):
    px.rect(x0+1,y0,x1-1,y1,c); px.rect(x0,y0+1,x1,y1-1,c)

def dashed_rect(px,x0,y0,x1,y1,c,dash=3,gap=2):
    i=0
    for x in range(x0,x1+1):
        if (i//1)%(dash+gap)<dash: px.set(x,y0,c); px.set(x,y1,c)
        i+=1
    i=0
    for y in range(y0,y1+1):
        if (i//1)%(dash+gap)<dash: px.set(x0,y,c); px.set(x1,y,c)
        i+=1

def base_shadow(im, cx, baseY, rx, ry):
    """soft elliptical cast shadow grounded under the building (offset toward
    the lower-right since light is upper-left); composited onto im."""
    sh = Image.new('RGBA', im.size, (0,0,0,0))
    p = sh.load()
    for yy in range(-ry,ry+1):
        for xx in range(-rx,rx+1):
            d=(xx/rx)**2 + (yy/ry)**2
            if d <= 1:
                x,y=cx+xx+2, baseY+yy
                if 0<=x<im.width and 0<=y<im.height:
                    a=int(SHCOL[3]*(1-d*0.55))      # soft falloff to the edge
                    p[x,y]=(SHCOL[0],SHCOL[1],SHCOL[2],a)
    im.alpha_composite(sh)

def preview(cot, bak):
    # native ground scene
    GW, GH = 360, 200
    g = Px(GW, GH)
    GRASS, GRASS2 = C('6f9a55'), C('7fae5a')
    DIRT, DIRTE   = C('c2a366'), C('a98a4f')
    PLOT, FRONT   = C('c7b280'), C('6abf3f')
    # grass with a little tonal variation
    g.rect(0,0,GW-1,GH-1, GRASS)
    for (gx,gy,r) in ((60,40,40),(250,150,55),(150,90,45),(310,60,40)):
        for yy in range(-r,r+1):
            for xx in range(-r,r+1):
                if xx*xx+yy*yy<=r*r and (xx+yy)%3==0: g.set(gx+xx,gy+yy,GRASS2)
    # horizontal dirt street
    g.rect(0,128,GW-1,150, DIRT)
    g.hline(0,GW-1,127,DIRTE); g.hline(0,GW-1,151,DIRTE)
    for x in range(6,GW,11): g.set(x,139,DIRTE)   # cobble speckle
    # two plots fronting the street (above it)
    plots = [(96,118), (250,118)]   # (cx of plot, baseline y = front edge near street)
    for (pcx,pby) in plots:
        x0,y0,x1,y1 = pcx-34,pby-58,pcx+34,pby
        rounded_rect(g, x0,y0,x1,y1, PLOT)
        dashed_rect(g, x0,y0,x1,y1, C('e0b352'))
        g.rect(x0+4,y1-2,x1-4,y1, FRONT)          # green frontage strip on street edge
        g.vline(pcx,y1,y1+6, FRONT)               # door-path stub to the street
    im = g.im
    # drop the buildings into the plots (scale 64->~78 so they fill the plot)
    for (pcx,pby),spr in zip(plots,(cot,bak)):
        scale = 1.18
        sw,sh = int(W*scale), int(H*scale)
        s = spr.resize((sw,sh), Image.NEAREST)
        # ground contact of the native sprite is ~y=57; map to plot baseline pby
        contactY = int(57*scale)
        ox = pcx - sw//2
        oy = pby - contactY
        base_shadow(im, pcx, pby, int(30*scale), 8)
        im.alpha_composite(s, (ox, oy))
    # upscale x4 crisp
    scene = im.resize((GW*4, GH*4), Image.NEAREST)

    # hero strip: each sprite big on a neutral card
    HS = 6
    card = Image.new('RGBA', (W*HS*2+60, H*HS+40), C('2b2c33'))
    for i,spr in enumerate((cot,bak)):
        big = spr.resize((W*HS,H*HS), Image.NEAREST)
        card.alpha_composite(big, (20 + i*(W*HS+20), 20))
    cw = scene.width
    card = card.resize((cw, int(card.height*cw/card.width)), Image.NEAREST)

    out = Image.new('RGBA', (cw, card.height+scene.height+8), (0,0,0,0))
    out.alpha_composite(card,(0,0))
    out.alpha_composite(scene,(0,card.height+8))
    return out

if __name__ == '__main__':
    cot, bak = cottage(), bakery()
    cot.save(os.path.join(HERE,'cottage.png'))
    bak.save(os.path.join(HERE,'bakery.png'))
    preview(cot,bak).save(os.path.join(HERE,'preview.png'))
    print('wrote cottage.png, bakery.png, preview.png to', HERE)
