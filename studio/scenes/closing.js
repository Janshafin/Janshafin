// Closing: the person behind the figurine. Real photo, the line from the portfolio, contact details,
// and the toolchain set as a garment size chart.
const W = 1200, H = 660;

const chart = [
  ["Onchain", "Ethereum", "Solidity", "Foundry", "Uniswap v4", "Chainlink CRE", "Huff"],
  ["Product", "TypeScript", "React", "Node.js", "Vite", "Python", "FastAPI"],
  ["Agents", "Claude", "MCP", "x402", "GitHub Actions", "", ""],
];
const contact = [
  ["Email", "janshafin09@gmail.com"],
  ["Phone", "+91 63690 56143"],
  ["Portfolio", "janshafin.github.io/My_Portfolio"],
  ["Based", "Chennai, India"],
];

export default {
  w: W, h: H, frames: 1, page: "#E882B4",
  under: `
    <div style="position:absolute;left:700px;bottom:22px;width:240px;height:30px;border-radius:50%;
      background:radial-gradient(closest-side,rgba(0,0,0,.3),rgba(0,0,0,0))"></div>
    <img id="me" src="/models/jan.webp" style="position:absolute;left:738px;bottom:30px;height:600px">`,
  html: `
    <div style="position:absolute;left:40px;top:40px;width:700px">
      <div class="caps" style="font-size:12px">Off the chain</div>
      <div class="wide" style="font-size:84px;margin-top:16px;line-height:.86">Code is<br>half the<br>outfit.</div>
      <p class="body" style="margin-top:22px;width:470px;font-size:15.5px;color:rgba(11,11,11,.82)">Away from the terminal I’m looking at clothes, type and how things get made. That eye comes back with me, so what I ship is meant to look as considered as it runs.</p>
    </div>
    <div style="position:absolute;left:40px;bottom:40px;width:420px">
      <div class="caps" style="font-size:16px;margin-bottom:12px">Let’s build something verifiable.</div>
      ${contact.map(([k, v]) => `<div style="display:grid;grid-template-columns:96px 1fr;gap:8px;padding:7px 0;border-top:1.5px solid var(--ink);font-size:13px;font-weight:600">
        <b style="font-stretch:115%;font-weight:800;font-size:11px;text-transform:uppercase">${k}</b><span>${v}</span></div>`).join("")}
    </div>
    <div style="position:absolute;right:36px;top:40px;width:200px;background:#F7F5EF;border-radius:8px;padding:16px 16px 12px;
      box-shadow:0 16px 28px -14px rgba(0,0,0,.35)">
      <div class="caps" style="font-size:11px;display:flex;justify-content:space-between"><span>Size chart</span><span>Fits all</span></div>
      ${chart.map(([k, ...v]) => `<div style="border-top:1.5px solid var(--ink);margin-top:10px;padding-top:7px">
        <b style="font-stretch:115%;font-weight:800;font-size:10.5px;text-transform:uppercase">${k}</b>
        <div style="font-size:11.5px;font-weight:560;line-height:1.35;margin-top:3px">${v.filter(Boolean).join(", ")}</div></div>`).join("")}
    </div>
    <div class="spray" style="position:absolute;left:520px;top:400px;font-size:46px;transform:rotate(-8deg)">Don’t trust,<br>verify</div>
    <div class="pill caps" style="position:absolute;right:28px;bottom:30px;font-size:13px">All repositories <span class="dot">↗</span></div>`,
  async setup(ctx) {
    await ctx.under.querySelector("#me").decode();
    return { frame() {} };
  },
};
