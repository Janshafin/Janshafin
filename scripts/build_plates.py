#!/usr/bin/env python3
"""Build the static plates of the profile: python3 scripts/build_plates.py

Writes assets/<name>-light.svg and assets/<name>-dark.svg. Appendix A (the
activity figure) is built separately by render_contributions.py, daily.
"""
from __future__ import annotations

import math
from pathlib import Path

from typeset import (BOLD, ITALIC, MATH, MONO, MONO_MED, SERIF, THEMES, W, Plate, Span,
                     arrowhead, fit, line, measure, pencil_loop, pencil_stroke)

OUT = Path(__file__).resolve().parent.parent / "assets"


def pencil(d: str, delay: float = 0, dur: float = 1.1, extra: str = "") -> str:
    return (f'<path class="pencil draw" pathLength="1" style="animation-delay:{delay}s;'
            f'animation-duration:{dur}s{extra}" d="{d}"/>')


def sub(text: str, size: float, face: str = ITALIC) -> Span:
    return Span(text, face, size * 0.6, dy=size * 0.2)


# ================================================================= title ===
def masthead(theme: str) -> str:
    p = Plate(840, theme, "Jan Shafin — the collected invariants. Smart contracts, autonomous agents, "
              "and the invariants that keep them honest.",
              left="SPECIFICATION NO. 0", right="GITHUB.COM/JANSHAFIN",
              foot_left="REV. 2026.11  ·  FOUR INVARIANTS  ·  ONE APPENDIX", foot_right="§0  TITLE")
    p.add(line(Span("The collected invariants of", ITALIC, 36, cls="ink2"), 70, 198))
    p.add(line(Span("Jan Shafin", SERIF, 176, track=-0.012), 62, 360))
    p.add(line(Span("Smart contracts, autonomous agents, and the", ITALIC, 40), 70, 440))
    p.add(line(Span("invariants that keep them honest.", ITALIC, 40), 70, 490))

    # the Yellow Paper's state transition, then the line that matters
    s = 62
    eq1 = [Span("σ", MATH, s), sub("t+1", s), Span("  ≡  Υ(", MATH, s), Span("σ", MATH, s),
           sub("t", s), Span(", ", MATH, s), Span("T", ITALIC, s), Span(")", MATH, s)]
    eq2 = [Span("Inv(", SERIF, s), Span("σ", MATH, s), sub("t", s), Span(")  ⇒  Inv(", SERIF, s),
           Span("σ", MATH, s), sub("t+1", s), Span(")", SERIF, s)]
    p.add(line(eq1, 78, 610), line(eq2, 78, 700))
    p.add(line(Span("(1)", SERIF, 30, cls="ink2"), W - 70, 604, "end"),
          line(Span("(2)", SERIF, 30, cls="ink2"), W - 70, 694, "end"))
    w2 = measure(eq2)
    cx, cy = 78 + w2 / 2, 680
    p.add(pencil(pencil_loop(cx, cy, w2 / 2 + 20, 40, seed=7, turns=1.05, wobble=0.018), delay=0.6, dur=1.3))
    note_x = 78 + w2 + 120
    p.add(f'<g class="rise" style="animation-delay:1.7s">'
          + line(Span("the only line", ITALIC, 30, cls="red"), note_x, 640)
          + line(Span("that matters", ITALIC, 30, cls="red"), note_x, 674) + "</g>")
    tip = (cx + w2 / 2 + 40, cy - 6)
    p.add(pencil(pencil_stroke([(note_x - 10, 656), (note_x - 40, 662), tip], seed=3, wobble=0.8),
                 delay=1.6, dur=0.5))
    p.add(pencil(arrowhead(tip, math.atan2(tip[1] - 662, tip[0] - (note_x - 40))), delay=2.05, dur=0.2))
    return p.svg()


# ============================================================ invariants ===
def invariant_plate(theme: str, n: int, repo: str, name: str, formula: list[Span], gloss: str,
                    facts: list[str], status: str, diagram: str, css: str = "") -> str:
    p = Plate(700, theme, f"Invariant {n} of 4: {name}. {gloss}",
              left=f"INVARIANT {n} / 4", right=f"{name.upper()}  ↗",
              foot_left=f"GITHUB.COM/JANSHAFIN/{repo.upper()}", foot_right=f"§{n}", css=css)
    # the claim, set as large as the measure allows
    k = min(1.0, (W - 140) / measure(formula))
    formula = [Span(**{**s.__dict__, "size": s.size * k, "dy": s.dy * k}) for s in formula]
    p.add(line(formula, 70, 222))
    p.add(line(fit(Span(gloss, ITALIC, 36, cls="ink2"), W - 140, 28), 70, 298))
    p.add('<path class="rule" stroke-width="1.2" stroke-dasharray="2 6" d="M70 344H1130"/>')
    # the evidence
    p.add(line(Span(name, BOLD, 46), 70, 436))
    y = 482
    for f in facts:
        p.add(line(fit(Span(f, MONO, 19, track=0.06, cls="ink2"), 470, 15), 70, y))
        y += 30
    p.add(line([Span("STATUS  ", MONO_MED, 19, track=0.06, cls="red"),
                fit(Span(status, MONO, 19, track=0.06, cls="ink2"), 380, 15)], 70, y))
    p.add(f'<g transform="translate(0 16)">{diagram}</g>')
    return p.svg()


def mono(t, x, y, size=17, cls="ink", anchor="start", face=MONO, track=0.04):
    return line(Span(t, face, size, track=track, cls=cls), x, y, anchor)


def box(x, y, w, h, dashed=False, cls="inks", sw=1.6):
    dash = ' stroke-dasharray="5 5"' if dashed else ""
    return f'<rect class="{cls}" stroke-width="{sw}"{dash} x="{x}" y="{y}" width="{w}" height="{h}"/>'


def arrow(x1, y1, x2, y2, cls="inks", sw=1.6, head=8):
    a = math.atan2(y2 - y1, x2 - x1)
    h = arrowhead((x2, y2), a, head)
    return f'<path class="{cls}" stroke-width="{sw}" stroke-linecap="round" d="M{x1} {y1}L{x2} {y2}{h}"/>'


# flasharb: one unlock, four steps, a verdict
def d_flasharb() -> str:
    o = [mono("PoolManager.unlock {", 600, 404, 18, "ink2")]
    o.append('<path class="inks" stroke-width="1.6" d="M612 446H1006"/>')
    steps = [(640, "swap v4"), (760, "SwapVM"), (880, "take·push"), (990, "settle")]
    for i, (x, label) in enumerate(steps):
        o.append(f'<circle class="paper" cx="{x}" cy="446" r="7" stroke="var(--ink)" stroke-width="1.6"/>')
        o.append(mono(f"{i + 1}", x, 425, 15, "ink2", "middle"))
        o.append(mono(label, x, 484, 16, "ink2", "middle"))
    o.append(mono("}", 1006, 404, 18, "ink2"))
    # the travelling delta: runs the unlock, then the verdict lands
    o.append('<circle class="red token" cx="612" cy="446" r="5"/>')
    o.append(line([Span("Σ", MATH, 34), Span("Δ", MATH, 34), Span(" = 0", MATH, 34)], 1078, 458, "middle"))
    o.append(pencil(pencil_loop(1078, 446, 56, 30, seed=11, turns=1.08), delay=2.6, dur=0.7))
    o.append(mono("else revert", 1078, 512, 16, "red", "middle"))
    return "".join(o)


FLASH_CSS = """.token{animation:run 4.8s cubic-bezier(.45,0,.2,1) .4s infinite}
@keyframes run{0%{transform:translateX(0);opacity:0}6%{opacity:1}55%{transform:translateX(394px);opacity:1}
62%,100%{transform:translateX(394px);opacity:0}}"""


# TrustLine: the balance goes in, one bit comes out
def d_trustline() -> str:
    o = [box(600, 378, 330, 168, sw=1.6), box(607, 385, 316, 154, cls="rule", sw=1)]
    o.append(mono("ENCLAVE", 622, 412, 15, "ink2", track=0.16))
    o.append(mono("balance", 622, 452, 17, "ink2"))
    o.append(mono("12,480.55", 744, 452, 17))
    o.append('<rect class="ink redact" x="738" y="434" width="122" height="25"/>')
    o.append(mono("price", 622, 486, 17, "ink2"))
    o.append(mono("feed", 744, 486, 17))
    o.append(line([Span("≥ deal ?", MATH, 22)], 622, 522))
    o.append(arrow(930, 462, 992, 462))
    o.append(mono("SETTLE", 1004, 450, 18, face=MONO_MED))
    o.append(mono("INSUFFICIENT", 1004, 478, 18, face=MONO_MED))
    o.append(line(Span("the only output", ITALIC, 22, cls="red"), 1004, 520))
    o.append(pencil(pencil_stroke([(1004, 530), (1060, 532), (1128, 529)], seed=5, wobble=0.6), delay=1.9, dur=0.5))
    return "".join(o)


TRUST_CSS = """.redact{transform-box:fill-box;transform-origin:left;animation:redact .7s cubic-bezier(.7,0,.3,1) 1.1s both}
@keyframes redact{from{transform:scaleX(0)}to{transform:scaleX(1)}}"""


# Custodian: probabilistic on the left, deterministic on the right
def d_custodian() -> str:
    o, names, bw, gap, y = [], ["SIGNAL", "STRATEGIST", "POLICY", "EXECUTION", "AUDIT"], 98, 10, 430
    xs = [600 + i * (bw + gap) for i in range(5)]
    for i, (x, n) in enumerate(zip(xs, names)):
        o.append(box(x, y, bw, 44, dashed=i < 2, sw=2.2 if n == "POLICY" else 1.6))
        o.append(mono(n, x + bw / 2, y + 28, 13.5 if len(n) > 8 else 15, "ink", "middle",
                      face=MONO_MED if n == "POLICY" else MONO, track=0.02))
    o.append('<path class="ink2s" stroke-width="1.2" d="M600 494v8H804v-8M816 494v8H1128v-8"/>')
    o.append(line(Span("probabilistic", ITALIC, 21, cls="ink2"), 702, 530, "middle"))
    o.append(line(Span("deterministic", ITALIC, 21, cls="ink2"), 972, 530, "middle"))
    # the reject branch
    px = xs[2] + bw / 2
    o.append(pencil(pencil_stroke([(px, 428), (px + 6, 404), (px + 40, 390), (px + 86, 388)], seed=9, wobble=0.5),
                    delay=1.2, dur=0.6))
    o.append(pencil(arrowhead((px + 86, 388), 0), delay=1.75, dur=0.2))
    o.append(line(Span("fail-closed", ITALIC, 22, cls="red"), px + 98, 396))
    return "".join(o)


# Blue Carbon MRV: evidence in, one registry write out
def d_bluecarbon() -> str:
    o = []
    for i, t in enumerate(["photo + EXIF", "GPS + date", "Sentinel-2 NDVI"]):
        o.append(mono(t, 600, 412 + i * 38, 17, "ink2"))
    o.append('<path class="inks" stroke-width="1.6" d="M772 394q10 0 10 14v28q0 8 9 10q-9 2-9 10v28q0 14-10 14"/>')
    o.append(arrow(798, 446, 830, 446))
    o.append(box(838, 420, 168, 52, sw=1.6))
    o.append(line([Span("score ≥ 75", MATH, 21)], 922, 442, "middle"))
    o.append(mono("0 flags", 922, 463, 15, "ink2", "middle"))
    o.append(arrow(1006, 446, 1036, 446))
    for i in range(3):  # three chained blocks: the registry
        bx = 1044 + i * 29
        o.append(box(bx, 432, 22, 28, sw=1.6))
        if i:
            o.append(f'<path class="inks" stroke-width="1.6" d="M{bx - 7} 446h7"/>')
    o.append(mono("Sepolia", 1087, 486, 15, "ink2", "middle"))
    o.append(pencil(pencil_loop(922, 446, 93, 36, seed=21, turns=1.05, wobble=0.02), delay=1.0, dur=0.8))
    o.append(line(Span("no evidence, no credit", ITALIC, 22, cls="red"), 838, 527))
    return "".join(o)


def F(text, face=MATH, size=84):
    return Span(text, face, size)


INVARIANTS = [
    dict(n=1, repo="flasharb", name="flasharb",
         formula=[F("Σ"), F("Δ"), sub("i", 84), F("  =  0")],
         gloss="Every delta inside one unlock nets to zero, or the trade never happened.",
         facts=["SOLIDITY · HUFF · UNISWAP V4 · 1INCH AQUA", "ETHGLOBAL MUMBAI 2026",
                "FLASH ACCOUNTING, NO FLASH-LOAN FEE"],
         status="END-TO-END ON A LOCAL CHAIN", diagram=d_flasharb, css=FLASH_CSS),
    dict(n=2, repo="TrustLine", name="TrustLine",
         formula=[F("out(", SERIF), F("E", ITALIC), F(")  ∈  { ", SERIF),
                  Span("SETTLE", SERIF, 60, track=0.04),
                  F(" , ", SERIF), Span("INSUFFICIENT", SERIF, 60, track=0.04), F(" }", SERIF)],
         gloss="An agent shows it can cover a deal without anyone seeing what it holds.",
         facts=["SOLIDITY · TYPESCRIPT · CHAINLINK CRE", "PRIVY POLICY WALLET · x402",
                "ETHONLINE 2026"],
         status="CRE RUNS IN LOCAL SIMULATION", diagram=d_trustline, css=TRUST_CSS),
    dict(n=3, repo="Custodian", name="Custodian",
         formula=[F("execute(", SERIF), F("i", ITALIC), F(")  ⇒  policy(", SERIF), F("i", ITALIC),
                  F(") = ", SERIF), Span("APPROVED", SERIF, 60, track=0.04)],
         gloss="Language models may propose anything. Only rules move money, and they fail closed.",
         facts=["TYPESCRIPT · KEEPERHUB · ETHEREUM SEPOLIA", "HMAC-SIGNED APPEND-ONLY AUDIT LEDGER",
                "DORAHACKS AGENT ECONOMY, SEP 2026"],
         status="POLICY + AUDIT LIVE · 19 TESTS", diagram=d_custodian),
    dict(n=4, repo="Blue-Carbon-MRV", name="Blue Carbon MRV",
         formula=[F("record(", SERIF), F("c", ITALIC), F(")  ⇒  score(", SERIF), F("c", ITALIC),
                  F(") ≥ 75  ∧  flags(", SERIF), F("c", ITALIC), F(") = 0", SERIF)],
         gloss="Mangrove restoration claims reach the chain only with satellite evidence behind them.",
         facts=["PYTHON · WEB3.PY · REACT · SENTINEL-2", "BLUECARBONCREDIT ON ETHEREUM SEPOLIA",
                "NDVI + EXIF CONSISTENCY SCORING"],
         status="DEV MODE CAN MOCK NDVI", diagram=d_bluecarbon),
]


# =============================================================== closing ===
def closing(theme: str) -> str:
    p = Plate(420, theme, "End of specification. Counterexamples welcome.",
              left="END OF SPECIFICATION", right="∎",
              foot_left="SET IN STIX TWO & JETBRAINS MONO  ·  EVERY FIGURE IS HAND-BUILT SVG",
              foot_right="§∎")
    p.add('<rect class="red qed" x="70" y="182" width="46" height="46"/>')
    p.add(line(Span("Counterexamples welcome.", ITALIC, 64), 146, 228))
    p.add(line(Span("Found a case where one of these breaks? Open an issue on the repository.",
                    SERIF, 28, cls="ink2"), 146, 284))
    return p.svg()


CLOSE_CSS = ""


def write(name: str, build) -> None:
    for theme in THEMES:
        path = OUT / f"{name}-{theme}.svg"
        path.write_text(build(theme), encoding="utf-8")
        print(f"{path.relative_to(OUT.parent)}  {path.stat().st_size / 1024:.0f} KB")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    write("title", masthead)
    for inv in INVARIANTS:
        args = dict(inv)
        diagram = args.pop("diagram")
        n = args["n"]
        write(f"invariant-{n}", lambda t, a=args, d=diagram: invariant_plate(t, diagram=d(), **a))
    write("closing", closing)


if __name__ == "__main__":
    main()
