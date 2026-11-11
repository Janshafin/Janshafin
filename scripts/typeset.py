"""A tiny typesetter for GitHub-safe SVG.

GitHub renders README images through <img>, which cannot load web fonts.
So every word on the plates is shaped with HarfBuzz (real kerning and
ligatures) and written out as vector outlines: the type looks the same on
every operating system, in light and dark mode, on a phone or a 5K screen.

Fonts: STIX Two (Text + Math) and JetBrains Mono, SIL Open Font License,
subset into scripts/fonts/.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT_DIR = Path(__file__).resolve().parent / "fonts"
W = 1200  # every plate shares one width, so the README reads as one document

# ---------------------------------------------------------------- palette ---
# Light: archival paper, carbon ink, a reviewer's red pencil.
# Dark: the same sheet under a desk lamp at 2 a.m.
THEMES = {
    "light": {
        "paper": "#F2EDE2", "ink": "#1C1B18", "ink2": "#686255", "rule": "#CCC3AF",
        "faint": "#E5DECE", "red": "#C2341B", "hatch": "#1C1B18",
    },
    "dark": {
        "paper": "#141311", "ink": "#ECE5D4", "ink2": "#9C9584", "rule": "#3C3932",
        "faint": "#1F1D1A", "red": "#F25A3B", "hatch": "#ECE5D4",
    },
}


def _num(v: float) -> str:
    s = f"{v:.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    return "0" if s in ("-0", "-0.0") else s


# ------------------------------------------------------------------ faces ---
class Face:
    _cache: dict[str, "Face"] = {}

    def __init__(self, name: str):
        path = FONT_DIR / f"{name}.ttf"
        self.tt = TTFont(path)
        self.glyphs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.upem = self.tt["head"].unitsPerEm
        self.hb = hb.Font(hb.Face(path.read_bytes()))
        self.cmap = self.tt.getBestCmap()

    @classmethod
    def get(cls, name: str) -> "Face":
        if name not in cls._cache:
            cls._cache[name] = Face(name)
        return cls._cache[name]

    def covers(self, ch: str) -> bool:
        return ord(ch) in self.cmap or ch in " \n"

    def shape(self, text: str, features: dict | None = None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb, buf, features or {"kern": True, "liga": True})
        return buf.glyph_infos, buf.glyph_positions

    def outline(self, gid: int, size: float, x: float, y: float) -> str:
        s = size / self.upem
        pen = SVGPathPen(self.glyphs, ntos=_num)
        self.glyphs[self.order[gid]].draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
        return pen.getCommands()


SERIF, ITALIC, BOLD = "STIXTwoText-Regular", "STIXTwoText-Italic", "STIXTwoText-Bold"
MATH, MONO, MONO_MED = "STIXTwoMath-Regular", "JetBrainsMono-Regular", "JetBrainsMono-Medium"


@dataclass
class Span:
    text: str
    face: str = SERIF
    size: float = 32
    dy: float = 0.0          # baseline shift (positive = down), e.g. subscripts
    track: float = 0.0       # letter-spacing in em
    cls: str = "ink"
    features: dict | None = None


def _span_layout(span: Span, x: float, y: float):
    """Shape one span. Falls back to STIX Two Math for symbols the face lacks."""
    face = Face.get(span.face)
    runs, cur, cur_face = [], "", None
    for ch in span.text:
        f = span.face if face.covers(ch) else MATH
        if f != cur_face and cur:
            runs.append((cur_face, cur))
            cur = ""
        cur_face = f
        cur += ch
    if cur:
        runs.append((cur_face, cur))

    d_parts, pen_x = [], x
    for fname, text in runs:
        f = Face.get(fname)
        infos, poss = f.shape(text, span.features)
        s = span.size / f.upem
        for info, pos in zip(infos, poss):
            gx = pen_x + pos.x_offset * s
            gy = y + span.dy - pos.y_offset * s
            d = f.outline(info.codepoint, span.size, gx, gy)
            if d:
                d_parts.append(d)
            pen_x += pos.x_advance * s + span.track * span.size
    if span.text:
        pen_x -= span.track * span.size  # no tracking after the last glyph
    return "".join(d_parts), pen_x - x


def measure(spans: list[Span] | Span) -> float:
    spans = [spans] if isinstance(spans, Span) else spans
    return sum(_span_layout(sp, 0, 0)[1] for sp in spans)


def line(spans: list[Span] | Span, x: float, y: float, anchor: str = "start") -> str:
    """Set a line of mixed spans; returns <path> elements grouped by class."""
    spans = [spans] if isinstance(spans, Span) else spans
    total = measure(spans)
    if anchor == "middle":
        x -= total / 2
    elif anchor == "end":
        x -= total
    out, pen = [], x
    for sp in spans:
        d, w = _span_layout(sp, pen, y)
        if d:
            out.append(f'<path class="{sp.cls}" d="{d}"/>')
        pen += w
    return "".join(out)


def fit(span: Span, max_width: float, min_size: float) -> Span:
    """Shrink a span until it fits a measure, never below min_size."""
    while measure(span) > max_width and span.size > min_size:
        span = Span(**{**span.__dict__, "size": span.size - 1})
    return span


def wrap(text: str, face: str, size: float, max_width: float) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if measure(Span(trial, face, size)) <= max_width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ------------------------------------------------------------ red pencil ---
def _smooth(points: list[tuple[float, float]], closed: bool = False) -> str:
    """Catmull-Rom through the points, written as cubic Béziers."""
    pts = points + points[:3] if closed else [points[0]] + points + [points[-1]]
    d = f"M{_num(pts[1][0])} {_num(pts[1][1])}"
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{_num(c1[0])} {_num(c1[1])} {_num(c2[0])} {_num(c2[1])} {_num(p2[0])} {_num(p2[1])}"
    return d


def pencil_loop(cx, cy, rx, ry, seed=1, turns=1.12, wobble=0.035, tilt=-0.03) -> str:
    """A hand-drawn ellipse that overshoots its start, like a real circled mistake."""
    rnd = random.Random(seed)
    n = int(26 * turns)
    pts = []
    start = math.pi + rnd.uniform(-0.25, 0.1)  # start at the left, like a right-handed reviewer
    for i in range(n + 1):
        t = start + 2 * math.pi * turns * i / n
        grow = 1 + 0.05 * max(0.0, i / n - 0.88) / 0.12  # only the overshoot drifts outward
        r = 1 + rnd.uniform(-wobble, wobble)
        x = cx + rx * r * grow * math.cos(t)
        y = cy + ry * r * grow * math.sin(t)
        x, y = (cx + (x - cx) * math.cos(tilt) - (y - cy) * math.sin(tilt),
                cy + (x - cx) * math.sin(tilt) + (y - cy) * math.cos(tilt))
        pts.append((x, y))
    return _smooth(pts)


def pencil_stroke(points, seed=2, wobble=1.6) -> str:
    rnd = random.Random(seed)
    jittered = [(x + rnd.uniform(-wobble, wobble), y + rnd.uniform(-wobble, wobble))
                for x, y in points]
    jittered[0], jittered[-1] = points[0], points[-1]
    return _smooth(jittered)


def arrowhead(tip, angle, size=13) -> str:
    """Two short strokes at the tip of a pencil line; angle in radians."""
    x, y = tip
    a1, a2 = angle + math.radians(152), angle - math.radians(152)
    return (f"M{_num(x + size * math.cos(a1))} {_num(y + size * math.sin(a1))}"
            f"L{_num(x)} {_num(y)}L{_num(x + size * math.cos(a2))} {_num(y + size * math.sin(a2))}")


# ------------------------------------------------------------------ plate ---
BASE_CSS = """
.paper{fill:var(--paper)}.ink{fill:var(--ink)}.ink2{fill:var(--ink2)}.red{fill:var(--red)}
.rule{stroke:var(--rule);fill:none}.inks{stroke:var(--ink);fill:none}.ink2s{stroke:var(--ink2);fill:none}
.pencil{stroke:var(--red);fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.draw{stroke-dasharray:1;stroke-dashoffset:0;animation:draw 1.1s cubic-bezier(.6,.05,.3,1) both}
.rise{animation:rise .9s ease-out both}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
"""


@dataclass
class Plate:
    height: int
    theme: str
    title: str  # accessible name
    left: str = ""
    right: str = ""
    foot_left: str = ""
    foot_right: str = ""
    css: str = ""
    body: list[str] = field(default_factory=list)

    def add(self, *parts: str) -> "Plate":
        self.body.extend(p for p in parts if p)
        return self

    def svg(self) -> str:
        t = THEMES[self.theme]
        h = self.height
        vars_ = ";".join(f"--{k}:{v}" for k, v in t.items())
        chrome = [f'<rect class="paper" width="{W}" height="{h}"/>']
        # crop marks: a printer's register, the only ornament on the sheet
        for cx, cy, sx, sy in ((24, 24, 1, 1), (W - 24, 24, -1, 1), (24, h - 24, 1, -1), (W - 24, h - 24, -1, -1)):
            chrome.append(f'<path class="rule" stroke-width="1.2" d="M{cx} {cy + 14 * sy}V{cy}H{cx + 14 * sx}"/>')
        if self.left or self.right:
            chrome.append(line(Span(self.left, MONO_MED, 19, track=0.14, cls="ink2"), 70, 76))
            chrome.append(line(Span(self.right, MONO_MED, 19, track=0.14, cls="ink2"), W - 70, 76, "end"))
            chrome.append(f'<path class="inks" stroke-width="1.4" d="M70 96H{W - 70}"/>')
        if self.foot_left or self.foot_right:
            chrome.append(f'<path class="rule" stroke-width="1.2" d="M70 {h - 76}H{W - 70}"/>')
            chrome.append(line(Span(self.foot_left, MONO, 17, track=0.1, cls="ink2"), 70, h - 46))
            chrome.append(line(Span(self.foot_right, MONO, 17, track=0.1, cls="ink2"), W - 70, h - 46, "end"))
        title = self.title.replace("&", "&amp;").replace("<", "&lt;")
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{h}" viewBox="0 0 {W} {h}" '
            f'role="img" aria-label="{title}">\n<title>{title}</title>\n'
            f'<style>svg{{{vars_}}}{BASE_CSS}{self.css}</style>\n'
            + "\n".join(chrome + self.body) + "\n</svg>\n"
        )
