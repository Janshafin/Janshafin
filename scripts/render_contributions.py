#!/usr/bin/env python3
"""Appendix A: a year of real public contributions, engraved instead of coloured.

Reads the contribution levels GitHub publishes for the profile (0-4 per day)
and draws them as hatching: denser lines, more work. No counts are invented,
no third-party stats service is involved. Runs daily from
.github/workflows/editorial-contributions.yml.
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

from typeset import ITALIC, MONO, THEMES, W, Plate, Span, line

USERNAME = "Janshafin"
OUT = Path(__file__).resolve().parent.parent / "assets"


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.levels: dict[date, int] = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        raw_day, raw_level = a.get("data-date"), a.get("data-level")
        if not raw_day or raw_level is None:
            return
        try:
            day, level = date.fromisoformat(raw_day), int(raw_level)
        except (ValueError, TypeError):
            return
        if 0 <= level <= 4:
            self.levels[day] = level


def get_contributions() -> dict[date, int]:
    request = Request(f"https://github.com/users/{USERNAME}/contributions", headers={
        "User-Agent": "Mozilla/5.0 profile-appendix-renderer/2.0",
        "Accept": "text/html",
    })
    with urlopen(request, timeout=25) as response:
        html = response.read().decode("utf-8", errors="replace")
    parser = CalendarParser()
    parser.feed(html)
    if len(parser.levels) < 200:
        raise RuntimeError(f"parsed only {len(parser.levels)} days; keeping the last good figure")
    return parser.levels


# One hatch per level, drawn like an engraver would: 0 is bare paper.
HATCH = """<defs>
<pattern id="h1" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="hs" stroke-width="1.1" d="M0 0V7"/></pattern>
<pattern id="h2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="hs" stroke-width="1.3" d="M0 0V4"/></pattern>
<pattern id="h3" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="hs" stroke-width="1.3" d="M0 0V4M0 0H4"/></pattern>
</defs>"""
FILL = {0: "", 1: 'fill="url(#h1)"', 2: 'fill="url(#h2)"', 3: 'fill="url(#h3)"', 4: 'class="ink"'}
CSS = """.hs{stroke:var(--hatch)}.c0{fill:var(--paper);stroke:var(--rule);stroke-width:1}
.c{stroke:var(--ink2);stroke-width:.8}.col{animation:rise .6s ease-out both}
.today{stroke:var(--red);stroke-width:2.4;fill:none}"""


def cell(x: float, y: float, level: int, s: float = 16) -> str:
    if level == 0:
        return f'<rect class="c0" x="{x}" y="{y}" width="{s}" height="{s}"/>'
    return f'<rect {FILL[level]} x="{x}" y="{y}" width="{s}" height="{s}"/>' + \
        f'<rect class="c" fill="none" x="{x}" y="{y}" width="{s}" height="{s}"/>'


def draw(levels: dict[date, int], theme: str) -> str:
    today = max(levels)
    start = today - timedelta(days=364)
    start -= timedelta(days=(start.weekday() + 1) % 7)  # back to Sunday
    weeks = (today - start).days // 7 + 1
    window = [d for d in levels if start <= d <= today]
    active = sum(1 for d in window if levels[d] > 0)

    p = Plate(560, theme, f"Appendix A: Jan Shafin's public GitHub activity for the last {weeks} weeks, "
              f"{active} active days of {len(window)}, drawn as hatching. Updated {today.isoformat()}.",
              left="APPENDIX A", right="REGENERATED DAILY",
              foot_left=f"UPDATED {today.isoformat()}", foot_right="§A", css=CSS)
    p.add(HATCH)
    p.add(line(Span(f"Fig. A.  Observed activity, last {weeks} weeks.", ITALIC, 36), 70, 176))

    pitch, x0, y0 = (W - 140 - 16) / (weeks - 1), 70, 250
    last_month = None
    cols = []
    for w in range(weeks):
        x = round(x0 + w * pitch, 1)
        first = start + timedelta(days=7 * w)
        if first.month != last_month and (today - first).days > 7:
            if last_month is not None or first.day <= 7:
                p.add(line(Span(first.strftime("%b").upper(), MONO, 15, track=0.08, cls="ink2"), x, 232))
            last_month = first.month
        cells = []
        for wd in range(7):
            d = first + timedelta(days=wd)
            if d > today:
                continue
            cells.append(cell(x, y0 + wd * 20, levels.get(d, 0)))
        cols.append(f'<g class="col" style="animation-delay:{0.15 + w * 0.018:.3f}s">{"".join(cells)}</g>')
    p.add(*cols)

    # today, circled by the reviewer
    tx = round(x0 + (weeks - 1) * pitch, 1)
    ty = y0 + ((today.weekday() + 1) % 7) * 20
    p.add(f'<rect class="today" x="{tx - 4}" y="{ty - 4}" width="24" height="24"/>')
    p.add(line(Span("today", ITALIC, 21, cls="red"), tx + 18, y0 + 7 * 20 + 26, "end"))

    p.add(line(Span(f"{active} ACTIVE DAYS OF {len(window)}  ·  SOURCE: GITHUB'S PUBLIC CALENDAR",
                    MONO, 16, track=0.08, cls="ink2"), 70, 446))
    more = Span("MORE", MONO, 15, track=0.08, cls="ink2")
    lx = W - 70 - 52 - 5 * 22
    p.add(line(Span("LESS", MONO, 15, track=0.08, cls="ink2"), lx - 12, 446, "end"))
    for lvl in range(5):
        p.add(cell(lx + lvl * 22, 432, lvl))
    p.add(line(more, W - 70, 446, "end"))
    return p.svg()


def main() -> int:
    try:
        levels = get_contributions()
    except Exception as exc:  # network or markup change: never publish a broken figure
        print(f"skip: {exc}", file=sys.stderr)
        return 0
    for theme in THEMES:
        path = OUT / f"appendix-a-{theme}.svg"
        path.write_text(draw(levels, theme), encoding="utf-8")
        print(f"{path.name}  {path.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
