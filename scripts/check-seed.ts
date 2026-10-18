import { buildSeed } from "../src/lib/data/seed";
import { analyzeTrial } from "../src/lib/verdict";
import { designTrial } from "../src/lib/agent/designer";
import { today } from "../src/lib/dates";
const s = buildSeed("demo");
for (const t of s.trials) {
  const p = s.products.find(p=>p.id===t.productId)!;
  const asOf = t.status === "closed" ? t.verdictAt! : today();
  const a = analyzeTrial(t, s.scans, asOf);
  console.log("\n==", p.name, t.status, "start", t.startedAt, "dur", t.durationDays, "deadline", t.returnDeadline, "days", JSON.stringify(t.scanDays), "targets", t.targetMetrics, "guards", t.guardMetrics, "purge", t.purgeWindow);
  console.log(" day", a.day, a.readiness, "VERDICT", a.verdict, a.confidence.toFixed(2), "|", a.headline);
  a.reasons.forEach(r=>console.log("   -", r));
  a.metrics.forEach(m=>console.log("   ", m.role, m.metric, "base", m.baseline.toFixed(1), "noise", m.noise.toFixed(1), "delta", m.delta?.toFixed(1), "z", m.z?.toFixed(2), m.state));
  console.log(" strip", a.strip.map(c=>`${c.day}:${c.state}`).join(" "));
}
const d = designTrial({ product: s.products[1], routine: s.products.filter(p=>p.id!=="p_nightshift"), goals: s.profile.goals, startDate: today() });
d.steps.forEach(st => { console.log("\n#", st.title); st.lines.forEach(l => console.log("  ", l.tone ?? "", l.text)); });
