/** Headless scenario check for the UI prototype (no browser needed).
 *  Drives selections -> buildInput() -> buildEstimate(), prints customer-facing view.
 *  This file is a dev harness, not part of the product. */
import { buildInput } from './configurator-ui.mjs';
import { buildEstimate } from './engine.mjs';

const scen = [
  { t: '1. Passenger transportation + booking', sel: { business: 'Passenger transportation in Europe', intents: ['booking'], channels: ['web_chat'], usageLevel: 'normal' } },
  { t: '2. Sales + website', sel: { business: 'Online store', intents: ['sales'], channels: ['web_chat'], usageLevel: 'normal' } },
  { t: '3. Sales + Telegram', sel: { business: 'Online store', intents: ['sales'], channels: ['web_chat', 'telegram'], usageLevel: 'high' } },
  { t: '4. Customer support + knowledge base', sel: { business: 'SaaS', intents: ['support', 'knowledge'], channels: ['web_form', 'web_chat'], kb: { present: true, size: 'large' }, usageLevel: 'normal' } },
  { t: '5. Business analysis + web search', sel: { business: 'Consulting', intents: ['analysis'], channels: ['telegram'], usageLevel: 'high' } },
  { t: '6. Video requirement', sel: { business: 'Creator agency', intents: ['video'], channels: ['web_form'], media: ['video'], usageLevel: 'normal' } },
  { t: '7. Unknown requirement -> Custom', sel: { business: 'Logistics', intents: ['sales'], channels: ['web_chat'], otherIntegration: 'our ERP', usageLevel: 'normal' } },
  { t: '8. Multiple compatible agents', sel: { business: 'Clinic', intents: ['booking', 'sales', 'knowledge'], channels: ['web_chat'], kb: { present: true, size: 'small' }, usageLevel: 'normal' } },
];

const money = (r) => `$${r.low}-$${r.high}`;
let ok = 0, bad = 0;
const check = (c, m) => { if (c) ok++; else { bad++; console.log('   FAIL: ' + m); } };

for (const s of scen) {
  const input = buildInput(s.sel);
  const e = buildEstimate(input);
  console.log(`\n──── ${s.t} ────`);
  console.log('  input   :', JSON.stringify(input));
  console.log('  agents  :', e.recommended_agents.map((a) => a.name).join(', ') || '(none)');
  console.log('  custom  :', e.is_custom);
  if (!e.is_custom) {
    console.log('  setup   :', money(e.setup_range), '| monthly:', money(e.monthly_range));
    const extra = e.extra_usage.filter((u) => u.extra_units > 0 && !u.credit_based).map((u) => `${u.metric}+${u.extra_units}`);
    if (extra.length) console.log('  usage   :', extra.join(', '));
    if (e.breakdown.credits.package_monthly) console.log('  credits :', `pkg $${e.breakdown.credits.package_monthly}, extra ${e.breakdown.credits.extra_credits} = $${e.breakdown.credits.extra_cost}`);
  }
}

// targeted assertions per spec
console.log('\n──── assertions ────');
const A = buildEstimate(buildInput(scen[1].sel));
check(A.recommended_agents.some((a) => a.id === 'sarah') && !A.is_custom, '2 Sarah not custom');
const C = buildEstimate(buildInput(scen[2].sel));
check(C.breakdown.channels.monthly.low === 29 && !C.is_custom, '3 Telegram add-on charged, not custom');
const D = buildEstimate(buildInput(scen[3].sel));
check(D.breakdown.knowledge_base.setup.low > 0 && !D.is_custom, '4 KB setup present, not custom');
const E = buildEstimate(buildInput(scen[4].sel));
check(E.recommended_agents.some((a) => a.id === 'boris'), '5 Boris matched');
const F = buildEstimate(buildInput(scen[5].sel));
check(F.recommended_agents.some((a) => a.id === 'vera') && F.breakdown.credits.package_monthly === 150, '6 Vera credit package');
const G = buildEstimate(buildInput(scen[6].sel));
check(G.is_custom, '7 unknown integration -> custom');
const H = buildEstimate(buildInput(scen[7].sel));
check(H.recommended_agents.length === 3 && H.bundle.discount === 0.15, '8 three agents, 15% bundle');

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
