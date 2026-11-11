"""Typeset text as SVG outlines (GitHub's sandboxed SVG <img> cannot load web fonts)."""
import re
from functools import lru_cache
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONTS = Path(__file__).parent / "fonts"


@lru_cache(None)
def _font(name):
    path = FONTS / f"{name}.ttf"
    blob = hb.Blob.from_file_path(str(path))
    face = hb.Face(blob)
    font = hb.Font(face)
    tt = TTFont(path)
    return font, tt, tt.getGlyphSet(), face.upem


def _num(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def shape(s, name, size, features=None, tracking=0.0):
    font, tt, gs, upem = _font(name)
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(font, buf, features or {"kern": True, "liga": True})
    order = tt.getGlyphOrder()
    scale = size / upem
    glyphs, x = [], 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        glyphs.append((order[info.codepoint], x + pos.x_offset * scale, pos.y_offset * scale))
        x += pos.x_advance * scale + tracking
    return glyphs, x - (tracking if glyphs else 0), scale


def width(s, name, size, features=None, tracking=0.0):
    return shape(s, name, size, features, tracking)[1]


_DEFS = {}


def defs():
    """Emit and reset glyph definitions used since the last call."""
    out = "".join(f'<path id="{k}" d="{d}"/>' for k, d in _DEFS.items())
    _DEFS.clear()
    return f"<defs>{out}</defs>"


def text(s, x, y, size, name="R", fill="#1E2A86", anchor="start", features=None,
         tracking=0.0, extra="", inline=False):
    """Return (svg markup, advance width). Glyphs are shared via <use> unless inline."""
    glyphs, w, scale = shape(s, name, size, features, tracking)
    _, _, gs, _ = _font(name)
    if anchor == "middle":
        x -= w / 2
    elif anchor == "end":
        x -= w
    if not inline:
        uses = []
        for g, gx, gy in glyphs:
            gid = f"{name}-{re.sub(r'[^A-Za-z0-9_.-]', '_', g)}"
            if gid not in _DEFS:
                p = SVGPathPen(gs, ntos=lambda v: str(round(v)))
                gs[g].draw(p)
                _DEFS[gid] = p.getCommands()
            if _DEFS[gid]:
                uses.append(f'<use href="#{gid}" transform="translate({_num(x + gx)} {_num(y - gy)}) '
                            f'scale({scale:.4f} -{scale:.4f})"/>')
        return f'<g fill="{fill}"{extra}>{"".join(uses)}</g>', w
    pen = SVGPathPen(gs, ntos=_num)
    for g, gx, gy in glyphs:
        tp = TransformPen(pen, (scale, 0, 0, -scale, x + gx, y - gy))
        gs[g].draw(tp)
    d = pen.getCommands()
    return f'<path d="{d}" fill="{fill}"{extra}/>', w


def wrap(s, name, size, max_w, features=None):
    words, lines, cur = s.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if cur and width(t, name, size, features) > max_w:
            lines.append(cur)
            cur = wd
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines
