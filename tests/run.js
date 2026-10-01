// Checks the gate engine in index.html against brute-force matrix multiplication.
// Run with: node tests/run.js
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error("Could not find the core script in index.html"); process.exit(1); }
const Q = new Function(m[1] + "\nreturn Q;")();

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log("FAIL", msg); } };

// Full 2^n x 2^n operator built straight from the definition of each gate.
function brute(g, n) {
  const N = 1 << n, M = Q.matrixOf(g), B = q => 1 << (n - 1 - q), U = [];
  for (let col = 0; col < N; col++) {
    const v = Array.from({ length: N }, () => [0, 0]);
    const ctrlOk = (g.ctrl || []).every(q => col & B(q)) && (g.actrl || []).every(q => !(col & B(q)));
    if (!ctrlOk) { v[col] = [1, 0]; U.push(v); continue; }
    if (Q.BASE[g.base].kind === 1) {
      const t = B(g.targets[0]), b = col & t ? 1 : 0, base = col & ~t;
      v[base] = b ? M[1] : M[0]; v[base | t] = b ? M[3] : M[2];
    } else {
      const m1 = B(g.targets[0]), m2 = B(g.targets[1]);
      if (!!(col & m1) === !!(col & m2)) v[col] = [1, 0];
      else {
        const i = (col & ~m1) | m2, j = (col & ~m2) | m1, isJ = col === j;
        v[i] = isJ ? M[1] : M[0]; v[j] = isJ ? M[3] : M[2];
      }
    }
    U.push(v);
  }
  return U;
}
function mulU(U, st, N) {
  const out = new Float64Array(2 * N);
  for (let c = 0; c < N; c++) {
    const ar = st[2 * c], ai = st[2 * c + 1];
    for (let r = 0; r < N; r++) { const e = U[c][r]; out[2 * r] += e[0] * ar - e[1] * ai; out[2 * r + 1] += e[0] * ai + e[1] * ar; }
  }
  return out;
}

// 1. Random gates with random controls on 1 to 5 qubits.
const bases = Object.keys(Q.BASE);
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let trial = 0; trial < 3000; trial++) {
  const n = 1 + Math.floor(rnd() * 5), base = bases[Math.floor(rnd() * bases.length)], kind = Q.BASE[base].kind;
  if (kind === 2 && n < 2) continue;
  const qs = [...Array(n).keys()].sort(() => rnd() - .5), targets = qs.splice(0, kind), ctrl = [], actrl = [];
  qs.forEach(q => { const r = rnd(); if (r < .3) ctrl.push(q); else if (r < .45) actrl.push(q); });
  const g = { base, targets, ctrl, actrl, params: Q.BASE[base].params.map(() => Math.round(rnd() * 720 - 360)) };
  const N = 1 << n, st = Q.initState({ kind: "random", seed: trial + 5 }, n);
  const comp = Q.compile(g, n), a = Q.apply(st, comp), b = mulU(brute(g, n), st, N);
  let err = 0; for (let i = 0; i < 2 * N; i++) err = Math.max(err, Math.abs(a[i] - b[i]));
  ok(err < 1e-12, `apply ${JSON.stringify(g)} n=${n} err=${err}`);
  ok(Math.abs(Q.norm(a) - 1) < 1e-12, "norm preserved");
  const outs = Q.flows(comp, N); let e2 = 0;
  for (let o = 0; o < N; o++) {
    let r = 0, im = 0;
    for (const e of outs[o]) { r += e.c[0] * st[2 * e.k] - e.c[1] * st[2 * e.k + 1]; im += e.c[0] * st[2 * e.k + 1] + e.c[1] * st[2 * e.k]; }
    e2 = Math.max(e2, Math.abs(r - a[2 * o]), Math.abs(im - a[2 * o + 1]));
  }
  ok(e2 < 1e-12, `amplitude table matches for ${base}`);
}

// 2. Every gate matrix is unitary.
for (const b of bases) {
  const [a, bb, c, d] = Q.matrixOf({ base: b, params: Q.BASE[b].params.map(() => 37) });
  const c0 = a[0] ** 2 + a[1] ** 2 + c[0] ** 2 + c[1] ** 2, c1 = bb[0] ** 2 + bb[1] ** 2 + d[0] ** 2 + d[1] ** 2;
  const dot = Math.hypot(a[0] * bb[0] + a[1] * bb[1] + c[0] * d[0] + c[1] * d[1], a[0] * bb[1] - a[1] * bb[0] + c[0] * d[1] - c[1] * d[0]);
  ok(Math.abs(c0 - 1) < 1e-12 && Math.abs(c1 - 1) < 1e-12 && dot < 1e-12, "unitary " + b);
}

// 3. Mover / rotator / mixer classification.
const cls = (g, n) => Q.classify(Q.flows(Q.compile(g, n), 1 << n));
const T = (base, t, c = [], p) => ({ base, targets: t, ctrl: c, actrl: [], params: p || (Q.BASE[base].def || []) });
[[T("X", [0]), 1, "mover"], [T("Y", [0]), 1, "mover + phase"], [T("Z", [0]), 1, "rotator"], [T("H", [0]), 1, "mixer"],
 [T("I", [0]), 1, "identity"], [T("X", [1], [0]), 2, "mover"], [T("Z", [1], [0]), 2, "rotator"], [T("SWAP", [0, 1]), 2, "mover"],
 [T("ISWAP", [0, 1]), 2, "mover + phase"], [T("SQSWAP", [0, 1]), 2, "mixer"], [T("Rx", [0], [], [180]), 1, "mover"],
 [T("Rz", [0], [], [60]), 1, "rotator"], [T("Rx", [1], [0], [180]), 2, "mover + phase"], [T("P", [0], [], [0]), 1, "identity"],
 [T("X", [2], [0, 1]), 3, "mover"]].forEach(([g, n, want]) => ok(cls(g, n) === want, `classify ${g.base}: got ${cls(g, n)}, want ${want}`));

// 4. Known circuits.
const G = (base, t, c = [], p) => ({ base, targets: t.map(x => x - 1), ctrl: c.map(x => x - 1), actrl: [], params: p || (Q.BASE[base].def || []).slice() });
const run = (n, init, c) => c.reduce((st, g) => Q.apply(st, Q.compile(g, n)), Q.initState(init, n));
let st = run(2, { kind: "zero" }, [G("H", [1]), G("X", [2], [1])]);
ok(Math.abs(st[0] - Math.SQRT1_2) < 1e-12 && Math.abs(st[6] - Math.SQRT1_2) < 1e-12, "Bell state");
ok(Q.qubitInfo(st, 2).every(q => q.r < 1e-9), "Bell qubits are fully entangled");
st = run(3, { kind: "basis", bits: "001" }, [G("H", [1]), G("P", [1], [2], [90]), G("P", [1], [3], [45]), G("H", [2]), G("P", [2], [3], [90]), G("H", [3]), G("SWAP", [1, 3])]);
let qerr = 0;
for (let x = 0; x < 8; x++) qerr = Math.max(qerr, Math.abs(st[2 * x] - Math.cos(2 * Math.PI * x / 8) / Math.sqrt(8)), Math.abs(st[2 * x + 1] - Math.sin(2 * Math.PI * x / 8) / Math.sqrt(8)));
ok(qerr < 1e-12, "QFT of |001⟩");
st = run(2, { kind: "zero" }, [G("H", [1]), G("H", [2]), G("Z", [2], [1]), G("H", [1]), G("H", [2]), G("X", [1]), G("X", [2]), G("Z", [2], [1]), G("X", [1]), G("X", [2]), G("H", [1]), G("H", [2])]);
ok(Math.abs(Math.hypot(st[6], st[7]) - 1) < 1e-12, "Grover finds |11⟩");

console.log(fails ? `${fails} of ${checks} checks failed` : `All ${checks} checks passed`);
process.exit(fails ? 1 : 0);
