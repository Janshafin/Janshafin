"""Generate the 'Invariants' profile artwork. Run: python3 design/build.py"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from typeset import text, width, wrap, defs  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent.parent / "assets"
OUT.mkdir(parents=True, exist_ok=True)

PAPER, INK, GRAPH, HAIR, MARK = "#E6E9EC", "#1E2A86", "#59606E", "#B9C0CA", "#F3C623"
SC = {"kern": True, "smcp": True, "c2sc": False, "onum": True}
OS = {"kern": True, "liga": True, "onum": True}
W = 1200


def svg(h, body, label, style=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{h}" viewBox="0 0 {W} {h}" '
            f'role="img" aria-label="{label}"><title>{label}</title>'
            f'<style>{style}</style>{defs()}<rect width="{W}" height="{h}" fill="{PAPER}"/>{body}</svg>')


def t(*a, **k):
    return text(*a, **k)[0]


def arrow(x1, y1, x2, y2, c=INK, sw=2):
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    L = 11
    p1 = (x2 - L * math.cos(a - .42), y2 - L * math.sin(a - .42))
    p2 = (x2 - L * math.cos(a + .42), y2 - L * math.sin(a + .42))
    return (f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" stroke="{c}" stroke-width="{sw}" fill="none"/>'
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f}L{x2:.1f} {y2:.1f}L{p2[0]:.1f} {p2[1]:.1f}" stroke="{c}" '
            f'stroke-width="{sw}" fill="none" stroke-linejoin="round"/>')


MOTION = """
.hl{transform-box:fill-box;transform-origin:left center;animation:mark .9s cubic-bezier(.6,0,.2,1) both}
@keyframes mark{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.qed{animation:qed .5s 1.1s ease-out both}
@keyframes qed{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.hl,.qed{animation:none}}
"""

# ---------------------------------------------------------------- masthead
def masthead():
    h = 600
    b = []
    b.append(t("Working notes on Ethereum systems", 64, 88, 26, "I", GRAPH, features=OS))
    b.append(t("2026", W - 64, 88, 26, "I", GRAPH, anchor="end", features=OS))
    p, w = text("Invariants", 56, 318, 212, "SBI", INK)
    b.append(p)
    # the tombstone: a proof is complete
    b.append(f'<rect class="qed" x="{56 + w + 26:.0f}" y="268" width="50" height="50" fill="{MARK}"/>')
    y = 404
    for line in ["Four rules I have written into Ethereum and agent systems,",
                 "and the code that keeps each of them true."]:
        b.append(t(line, 64, y, 38, "R", INK, features=OS))
        y += 50
    p, w = text("Jan Shafin", 64, 540, 32, "B", INK)
    b.append(p)
    b.append(t("smart contracts and autonomous agents", 64 + w + 20, 540, 28, "I", GRAPH, features=OS))
    return svg(h, "".join(b), "Invariants. Four rules Jan Shafin has written into Ethereum and agent systems, "
               "and the code that keeps each of them true.", MOTION)


# ---------------------------------------------------------------- plates
def plate(n, statement, project, context, diagram, alt):
    h = 470
    b = []
    b.append(t(f"Invariant {n}.", 64, 92, 28, "B", INK, features=OS))
    lines = wrap(statement, "I", 54, 640)
    y = 168
    marks, words = [], []
    for i, line in enumerate(lines):
        p, w = text(line, 64, y, 54, "I", INK, features=OS)
        marks.append(f'<rect class="hl" style="animation-delay:{.35 + i * .45:.2f}s" x="58" y="{y - 22}" '
                     f'width="{w + 14:.0f}" height="30" fill="{MARK}"/>')
        words.append(p)
        y += 66
    b += marks + words
    b.append(t("Held by", 64, 372, 26, "I", GRAPH, features=OS))
    p, w = text(project, 64 + width("Held by", "I", 26, OS) + 12, 372, 34, "B", INK)
    b.append(p)
    cy = 406
    for line in context:
        b.append(t(line, 64, cy, 23, "R", GRAPH, features=OS))
        cy += 29
    b.append(f'<path d="M760 64V430" stroke="{HAIR}" stroke-width="1.5"/>')
    b.append(t("Proof sketch", 800, 92, 26, "I", GRAPH, features=OS))
    b.append(diagram)
    return svg(h, "".join(b), alt, MOTION)


def d_flasharb():
    b = []
    # bracket: everything happens inside one unlock()
    b.append(f'<rect x="800" y="122" width="336" height="206" fill="none" stroke="{HAIR}" stroke-width="1.5" stroke-dasharray="5 6"/>')
    b.append(t("inside one unlock()", 812, 148, 21, "I", GRAPH))
    b.append(t("v4 pool", 846, 238, 26, "SB", INK, anchor="middle"))
    b.append(t("Aqua", 1088, 238, 26, "SB", INK, anchor="middle"))
    b.append(f'<path d="M880 204C930 168 1010 168 1058 204" stroke="{INK}" stroke-width="2" fill="none"/>')
    b.append(arrow(1040, 192, 1058, 204))
    b.append(t("USDC", 969, 176, 20, "SB", INK, anchor="middle", features=SC))
    b.append(f'<path d="M1058 256C1010 292 930 292 880 256" stroke="{INK}" stroke-width="2" fill="none"/>')
    b.append(arrow(898, 268, 880, 256))
    b.append(t("WETH", 969, 302, 20, "SB", INK, anchor="middle", features=SC))
    b.append(t("Σ Δ = 0", 969, 246, 30, "M", INK, anchor="middle"))
    b.append(t("or the whole transaction reverts,", 800, 398, 22, "I", GRAPH))
    b.append(t("so a bad trade costs only gas.", 800, 426, 22, "I", GRAPH))
    return "".join(b)


def d_fealty():
    b = []
    rows = [("banish", True), ("decree", True), ("dissolve", False)]
    y = 160
    for name, gone in rows:
        b.append(f'<rect x="800" y="{y - 20}" width="22" height="22" fill="none" stroke="{INK}" stroke-width="2"/>')
        p, w = text(name, 840, y, 30, "SB", INK, features=SC)
        b.append(p)
        if gone:
            b.append(f'<path d="M834 {y - 10}H{848 + w:.0f}" stroke="{INK}" stroke-width="3"/>')
            b.append(t("revoked", 1136, y, 22, "I", GRAPH, anchor="end"))
        else:
            b.append(f'<rect x="805" y="{y - 15}" width="12" height="12" fill="{INK}"/>')
            b.append(t("still held", 1136, y, 22, "I", GRAPH, anchor="end"))
        y += 56
    b.append(f'<path d="M800 298H1136" stroke="{HAIR}" stroke-width="1.5"/>')
    b.append(t("Each power is a real ENSv2 role. Revoking", 800, 370, 22, "I", GRAPH))
    b.append(t("it drops the admin bit too, so no one,", 800, 398, 22, "I", GRAPH))
    b.append(t("not even the developers, can restore it.", 800, 426, 22, "I", GRAPH))
    return "".join(b)


def d_custodian():
    b = []
    b.append(t("signal agent", 800, 146, 26, "R", INK))
    b.append(arrow(812, 156, 812, 180))
    b.append(t("strategist", 800, 206, 26, "R", INK))
    b.append(arrow(812, 216, 812, 242))
    b.append(f'<rect x="800" y="246" width="200" height="66" fill="none" stroke="{INK}" stroke-width="2"/>')
    b.append(f'<rect x="806" y="252" width="188" height="54" fill="none" stroke="{INK}" stroke-width="1"/>')
    b.append(t("policy", 820, 278, 26, "B", INK))
    b.append(t("fail-closed", 820, 300, 19, "I", GRAPH))
    b.append(t("rejected", 1048, 266, 19, "I", GRAPH, anchor="middle"))
    b.append(arrow(1002, 279, 1090, 279))
    b.append(t("stop", 1098, 287, 26, "R", INK))
    b.append(arrow(812, 314, 812, 344))
    b.append(t("approved", 826, 336, 19, "I", GRAPH))
    b.append(t("executor", 800, 372, 26, "R", INK))
    b.append(t("Models reason freely. Money moves only", 800, 410, 21, "I", GRAPH))
    b.append(t("through rules that cannot be argued with.", 800, 436, 21, "I", GRAPH))
    return "".join(b)


def d_bluecarbon():
    b = []
    x0, x1, y = 800, 1136, 250

    def X(v):
        return x0 + (x1 - x0) * v / 100
    b.append('<defs><pattern id="hatch2" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
             f'<path d="M0 0V9" stroke="{INK}" stroke-width="1.6"/></pattern></defs>')
    b.append(f'<rect x="{X(75):.1f}" y="{y - 70}" width="{X(100) - X(75):.1f}" height="70" fill="url(#hatch2)" opacity=".55"/>')
    b.append(f'<path d="M{x0} {y}H{x1}" stroke="{INK}" stroke-width="2"/>')
    for v in (0, 25, 50, 75, 100):
        b.append(f'<path d="M{X(v):.1f} {y}V{y + 10}" stroke="{INK}" stroke-width="2"/>')
        b.append(t(str(v), X(v), y + 38, 22, "R", INK, anchor="middle", features=OS))
    b.append(f'<path d="M{X(75):.1f} {y - 92}V{y}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(t("recorded", X(87.5), y - 98, 22, "SB", INK, anchor="middle", features=SC))
    b.append(t("held back", X(37.5), y - 26, 22, "SB", GRAPH, anchor="middle", features=SC))
    b.append(t("MRV score", x0, 146, 22, "I", GRAPH))
    b.append(t("Score from satellite vegetation change and", 800, 370, 22, "I", GRAPH))
    b.append(t("photo evidence, plus high confidence and", 800, 398, 22, "I", GRAPH))
    b.append(t("zero flags, before a Sepolia write.", 800, 426, 22, "I", GRAPH))
    return "".join(b)


PLATES = [
    ("invariant-1-flasharb", 1, "Every delta nets to zero, or the trade never happened.", "flasharb",
     ["Solidity and Huff on Uniswap v4 and 1inch Aqua.", "ETHGlobal Mumbai 2026."], d_flasharb,
     "Invariant 1: every delta nets to zero, or the trade never happened. Held by flasharb, an atomic flash "
     "arbitrage executor on Uniswap v4 and 1inch Aqua."),
    ("invariant-2-fealty", 2, "A power taken by revolution can never be granted back.", "FEALTY",
     ["A political game on ENSv2 roles and World ID votes.", "ETHGlobal Mumbai 2026."], d_fealty,
     "Invariant 2: a power taken by revolution can never be granted back. Held by FEALTY, a game where "
     "each ruler power is a real ENSv2 role."),
    ("invariant-3-custodian", 3, "Agents may propose a payment. Only policy may send one.", "Custodian",
     ["A five-agent treasury that executes through KeeperHub.", "DoraHacks Agent Economy hackathon, 2026."], d_custodian,
     "Invariant 3: agents may propose a payment, only policy may send one. Held by Custodian, a multi-agent "
     "treasury with a fail-closed policy engine."),
    ("invariant-4-blue-carbon", 4, "No carbon credit is recorded until the evidence scores 75 or more.",
     "Blue Carbon MRV", ["Mangrove restoration evidence, Sentinel-2 analysis,", "and a registry contract on Ethereum Sepolia."], d_bluecarbon,
     "Invariant 4: no carbon credit is recorded until the evidence scores 75 or more. Held by Blue Carbon "
     "MRV, a mangrove restoration registry."),
]


def glyph_bank():
    """Pre-outlined strings for the contribution workflow, which runs without fonts."""
    bank = {}
    for m in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]:
        p, w = text(m, 0, 0, 22, "SB", GRAPH, features=SC, inline=True)
        bank[m] = [p, round(w, 1)]
    for k, s, f, sz, c, feat in [
        ("title", "Proof of work", "SBI", 54, INK, OS),
        ("sub", "every day of the last year, from GitHub's public contribution calendar", "I", 22, GRAPH, OS),
        ("note", "taller marks mean more contributions that day", "I", 20, GRAPH, OS),
        ("contrib", "contributions", "I", 26, GRAPH, OS),
    ]:
        p, w = text(s, 0, 0, sz, f, c, features=feat, inline=True)
        bank[k] = [p, round(w, 1)]
    for d in "0123456789,":
        p, w = text(d, 0, 0, 40, "B", INK, features={"kern": True, "lnum": True}, inline=True)
        bank["d" + d] = [p, round(w, 1)]
    return bank


if __name__ == "__main__":
    (OUT / "masthead.svg").write_text(masthead())
    for fn, n, st, pr, ctx, dg, alt in PLATES:
        (OUT / f"{fn}.svg").write_text(plate(n, st, pr, ctx, dg(), alt))
    (OUT.parent / "scripts" / "glyphs.json").write_text(json.dumps(glyph_bank()))
    print("built", OUT)
