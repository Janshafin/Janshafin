<!--
  SPECIFICATION No. 0 — github.com/Janshafin

  Every plate in this file is generated, never drawn by hand:
    python3 scripts/build_plates.py           title, invariants 1–4, closing
    python3 scripts/render_contributions.py   Appendix A (also runs daily in CI)
  Each plate ships in a light and a dark version and follows the viewer's GitHub theme.
-->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/title-dark.svg">
  <img src="./assets/title-light.svg" width="100%" alt="Jan Shafin — the collected invariants. Smart contracts, autonomous agents, and the invariants that keep them honest. Below the name, Ethereum's state transition σ(t+1) ≡ Υ(σ(t), T), and under it Inv(σ(t)) ⇒ Inv(σ(t+1)), circled in red pencil: the only line that matters.">
</picture>

**Abstract.** I build on Ethereum and with autonomous agents, mostly in Solidity, TypeScript and Python, and mostly against a hackathon clock. The work I keep returning to sits on one boundary: the point where something probabilistic (a language model, a market, a satellite reading) is allowed to touch something final (a transfer, a trade, a registry entry). Each plate below reduces one system to the single property it is built never to break, says plainly what is live and what is still simulated, and links to the code.

<br>

<a href="https://github.com/Janshafin/flasharb">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/invariant-1-dark.svg">
  <img src="./assets/invariant-1-light.svg" width="100%" alt="Invariant 1 of 4, flasharb: the sum of all deltas equals zero. Every delta inside one unlock nets to zero, or the trade never happened. Diagram: PoolManager.unlock runs four steps (swap on v4, SwapVM, take and push, settle) and ends in ΣΔ = 0, else revert.">
</picture>
</a>

**[flasharb ↗](https://github.com/Janshafin/flasharb)** · Atomic flash arbitrage between Uniswap v4 and 1inch Aqua, built at ETHGlobal Mumbai 2026. It borrows through v4 flash accounting, trades against an Aqua strategy priced by SwapVM, and keeps the spread inside a single `PoolManager.unlock`. Includes a searcher bot and a live dashboard; a Huff executor is in progress and matches the Solidity reference in 33 differential tests so far.

<br>

<a href="https://github.com/Janshafin/TrustLine">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/invariant-2-dark.svg">
  <img src="./assets/invariant-2-light.svg" width="100%" alt="Invariant 2 of 4, TrustLine: the enclave's output is either SETTLE or INSUFFICIENT. An agent shows it can cover a deal without anyone seeing what it holds. Diagram: inside the enclave, the balance is redacted; only SETTLE or INSUFFICIENT comes out.">
</picture>
</a>

**[TrustLine ↗](https://github.com/Janshafin/TrustLine)** · A private solvency check for agent-to-agent payments, built for ETHOnline 2026. A Chainlink CRE confidential workflow compares balance and price inside an enclave and publishes one bit; a Privy policy wallet pays only on `SETTLE`. *CRE runs in local simulation; live DON deployment is invite-only.*

<br>

<a href="https://github.com/Janshafin/Custodian">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/invariant-3-dark.svg">
  <img src="./assets/invariant-3-light.svg" width="100%" alt="Invariant 3 of 4, Custodian: execute(i) implies policy(i) = APPROVED. Language models may propose anything; only rules move money, and they fail closed. Diagram: Signal and Strategist agents are probabilistic; Policy, Execution and Audit are deterministic.">
</picture>
</a>

**[Custodian ↗](https://github.com/Janshafin/Custodian)** · A five-agent treasury for the DoraHacks Agent Economy hackathon. Signal and strategy agents propose; a fail-closed rules engine (caps, allowlists, cooldowns, velocity) decides; only the execution agent holds KeeperHub credentials; every stage lands in an HMAC-signed, append-only ledger. *The policy gate and audit ledger are live; the LLM side is still being wired in.*

<br>

<a href="https://github.com/Janshafin/Blue-Carbon-MRV">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/invariant-4-dark.svg">
  <img src="./assets/invariant-4-light.svg" width="100%" alt="Invariant 4 of 4, Blue Carbon MRV: record(c) implies score(c) ≥ 75 and flags(c) = 0. Mangrove restoration claims reach the chain only with satellite evidence behind them. Diagram: photo and EXIF, GPS and date, and Sentinel-2 NDVI feed a score; only a passing score is written to a registry on Sepolia.">
</picture>
</a>

**[Blue Carbon MRV ↗](https://github.com/Janshafin/Blue-Carbon-MRV)** · Measurement, reporting and verification for mangrove restoration: field photos with EXIF and GPS, Sentinel-2 NDVI change analysis, and a `BlueCarbonCredit` registry on Ethereum Sepolia. *Development mode can substitute clearly labelled mock NDVI.*

<br>

**Also on the desk.** [ADGENT](https://github.com/Janshafin/ADGENT): ads that run inside AI shopping agents over MCP, where merchants pay only when a PayPal sale settles (PayPal AI Hackathon 2026). [GigForge](https://github.com/Janshafin/gigforce): an AI co-founder toolkit for freelancers, from lead discovery to proposals.

**Materials.** Solidity, Foundry, Huff · Uniswap v4, 1inch Aqua & SwapVM, Chainlink CRE, Privy, KeeperHub · TypeScript, React, Node · Python, FastAPI, Web3.py · MCP and LLM agents.

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/appendix-a-dark.svg">
  <img src="./assets/appendix-a-light.svg" width="100%" alt="Appendix A: Jan Shafin's public GitHub activity for the last year, drawn as an engraved grid where denser hatching means more contributions. Regenerated daily from GitHub's public contribution calendar.">
</picture>

<a href="https://github.com/Janshafin?tab=repositories">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/closing-dark.svg">
  <img src="./assets/closing-light.svg" width="100%" alt="End of specification. Counterexamples welcome. Found a case where one of these breaks? Open an issue on the repository.">
</picture>
</a>

<sub>Set in STIX Two and JetBrains Mono (SIL Open Font License), shaped with HarfBuzz and drawn as outlines so the type survives GitHub's image proxy. Every plate is generated by the scripts in this repository; Appendix A redraws itself daily from GitHub's public calendar. Motion pauses for readers who prefer reduced motion.</sub>
