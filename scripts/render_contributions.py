#!/usr/bin/env python3
"""Generate a fashion-editorial animated SVG from real public GitHub contributions.

No third-party dependencies, no fabricated activity, no snake animation.
"""
from __future__ import annotations
from datetime import date, timedelta
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

USERNAME = "Janshafin"
OUTPUT = Path("assets/contribution-runway.svg")
COLORS = ("#E7E0D7", "#FAD3AF", "#F44877", "#3D3CDE", "#221F29")


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.levels = {}

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        raw_day, raw_level = attributes.get("data-date"), attributes.get("data-level")
        if not raw_day or raw_level is None:
            return
        try:
            day = date.fromisoformat(raw_day)
            level = int(raw_level)
        except (ValueError, TypeError):
            return
        if 0 <= level <= 4:
            self.levels[day] = level


def get_contributions():
    url = f"https://github.com/users/{USERNAME}/contributions"
    request = Request(url, headers={
        "User-Agent": "Mozilla/5.0 JanShafinEditorialContributionDisplay/1.0",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urlopen(request, timeout=25) as response:
        html = response.read().decode("utf-8", errors="replace")
    parser = CalendarParser()
    parser.feed(html)
    if len(parser.levels) < 200:
        raise RuntimeError(
            f"Could only parse {len(parser.levels)} days from GitHub; "
            "leaving the last good contribution visualization untouched."
        )
    return parser.levels


def draw_svg(levels):
    today = max(levels)
    start = today - timedelta(days=365)
    start -= timedelta(days=(start.weekday() + 1) % 7)  # Sunday
    num_weeks = ((today - start).days // 7) + 1
    x_start, y_start, gap = 56, 95, 18
    squares = []
    for week in range(num_weeks):
        for weekday in range(7):
            d = start + timedelta(days=week * 7 + weekday)
            if d > today:
                continue
            level = levels.get(d, 0)
            x, y = x_start + week * gap, y_start + weekday * gap
            delay = round(.025 * week, 3)
            squares.append(
                f'<rect x="{x}" y="{y}" width="13" height="13" rx="2.4" '
                f'fill="{COLORS[level]}" class="day" '
                f'style="animation-delay:{delay}s">'
                f'<title>{escape(d.isoformat())} · contribution level {level}</title></rect>'
            )
    last = today.isoformat()
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="275" viewBox="0 0 1200 275" role="img" aria-label="Animated year of Jan Shafin's actual GitHub contributions, updated {last}">
<style>
@keyframes print {{ from {{opacity:0;transform:translateY(5px)}} to {{opacity:1;transform:translateY(0)}} }}
@keyframes runway {{ from {{transform:translateX(-65px)}} to {{transform:translateX(1090px)}} }}
.day {{animation:print .45s ease-out both}}
.scan {{animation:runway 18s linear infinite}}
@media (prefers-reduced-motion:reduce) {{ .day,.scan {{animation:none!important}} }}
</style>
<rect width="1200" height="275" fill="#F9F2E7"/>
<rect x="18" y="18" width="1164" height="239" fill="none" stroke="#221F29" stroke-width="2"/>
<text x="49" y="55" fill="#3D3CDE" font-family="Arial,sans-serif" font-weight="900" font-size="18" letter-spacing="2">THE CONTRIBUTION RUNWAY  /  A YEAR OF MAKING THINGS</text>
<path d="M48 73H1152" stroke="#221F29" stroke-width="2"/>
{''.join(squares)}
<rect x="52" y="91" width="{num_weeks * gap + 3}" height="132" rx="3" fill="none" stroke="#221F29" stroke-width="1" opacity=".35"/>
<g class="scan"><rect x="49" y="89" width="3" height="139" fill="#F44877" opacity=".6"/></g>
<text x="50" y="247" fill="#221F29" font-family="Arial,sans-serif" font-weight="800" font-size="13">ACTUAL GITHUB ACTIVITY  •  UPDATED {last}  •  A VISUAL RECORD, NOT A SCOREBOARD</text>
</svg>'''


def main():
    levels = get_contributions()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(draw_svg(levels), encoding="utf-8")
    print(f"Wrote {OUTPUT} using {len(levels)} real public contribution days.")


if __name__ == "__main__":
    main()
