#!/usr/bin/env bash
# Repository descriptions, topics and the profile bio that match the specification.
# Nothing here has been run. Review it, then: gh auth login && bash scripts/repo-metadata.sh
set -euo pipefail
U=Janshafin

describe() {  # repo, description, topics...
  local repo=$1 desc=$2; shift 2
  gh repo edit "$U/$repo" --description "$desc"
  for t in "$@"; do gh repo edit "$U/$repo" --add-topic "$t"; done
}

describe flasharb \
  "Atomic flash arbitrage between Uniswap v4 and 1inch Aqua inside one PoolManager.unlock. ETHGlobal Mumbai 2026." \
  ethereum solidity uniswap-v4 flash-accounting 1inch arbitrage foundry huff

describe TrustLine \
  "Private solvency checks for agent payments: the enclave answers SETTLE or INSUFFICIENT, never the balance. ETHOnline 2026." \
  ethereum solidity chainlink tee ai-agents privy x402 mcp

describe Custodian \
  "Multi-agent treasury: models propose, a fail-closed policy engine decides, KeeperHub executes, an HMAC ledger audits." \
  ai-agents multi-agent ethereum treasury keeperhub policy-engine typescript

describe Blue-Carbon-MRV \
  "Mangrove restoration MRV: field evidence and Sentinel-2 NDVI scoring, recorded on an Ethereum Sepolia registry." \
  ethereum blue-carbon mrv sentinel-2 ndvi web3py fastapi react

describe ADGENT \
  "Ads inside AI shopping agents over MCP; merchants pay only when a PayPal sale settles. PayPal AI Hackathon 2026." \
  paypal mcp ai-agents advertising typescript

describe gigforce \
  "GigForge: an AI co-founder toolkit for freelancers, from lead discovery to proposals." \
  ai-agents freelancing typescript

gh repo edit "$U/$U" --description "Profile README: real-time Three.js scenes rendered to animated WebP."

gh api -X PATCH /user -f bio="I build Ethereum systems where autonomous agents can act — and can't cheat."

# Pinned repositories cannot be set through the API. On the profile page choose
# "Customize your pins": flasharb, TrustLine, Custodian, Blue-Carbon-MRV, ADGENT, gigforce.
