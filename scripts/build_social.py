#!/usr/bin/env python3
"""Social-preview cards for the four featured repositories, in the plates' style.

    python3 scripts/build_social.py            -> social/<repo>.svg (1200x600, 2:1)

GitHub only accepts PNG/JPG for a social preview, uploaded by hand under
Settings -> General -> Social preview. Render each SVG at 1280x640, e.g.:

    chrome --headless=new --screenshot=social/flasharb.png \
           --window-size=1200,600 --force-device-scale-factor=1.0666667 social/flasharb.svg
"""
from __future__ import annotations

from pathlib import Path

import typeset
from build_plates import INVARIANTS
from typeset import ITALIC, BOLD, MONO, Plate, Span, fit, line, measure

OUT = Path(__file__).resolve().parent.parent / "social"


def card(inv: dict) -> str:
    p = Plate(600, "light", f"{inv['name']}: {inv['gloss']}",
              left=f"INVARIANT {inv['n']} / 4", right="JAN SHAFIN",
              foot_left=f"GITHUB.COM/JANSHAFIN/{inv['repo'].upper()}", foot_right=f"§{inv['n']}")
    p.add(line(Span(inv["name"], BOLD, 64), 70, 210))
    formula = inv["formula"]
    k = min(1.0, (typeset.W - 140) / measure(formula))
    p.add(line([Span(**{**s.__dict__, "size": s.size * k, "dy": s.dy * k}) for s in formula], 70, 360))
    p.add(line(fit(Span(inv["gloss"], ITALIC, 34, cls="ink2"), typeset.W - 140, 26), 70, 440))
    p.add(line(fit(Span(inv["facts"][0], MONO, 19, track=0.06, cls="ink2"), 700, 15), 70, 494))
    return p.svg()


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for inv in INVARIANTS:
        path = OUT / f"{inv['repo']}.svg"
        path.write_text(card(inv), encoding="utf-8")
        print(path.name)


if __name__ == "__main__":
    main()
