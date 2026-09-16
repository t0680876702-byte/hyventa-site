/**
 * HYVENTA CONFIGURATOR V1 — TEST SUITE (standalone, no UI)
 * Run: node hyventa-site/configurator/engine.test.mjs
 */
import { buildEstimate, applyFloor } from './engine.mjs';
import { PricingRates } from './pricing-config.mjs';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const failed = [];

function money(r) { return `$${r.low}–$${r.high}`; }
function agents(e) { return e.recommended_agents.map((a) => a.name).join(' + ') || '(none)'; }
function metered(e) {
  const lines = e.extra_usage.filter((u) => u.extra_units > 0 || u.credit_based);
  if (!lines.length) return 'none';
  return lines.map((u) =>
    `${u.metric}: ${u.extra_units}${u.credit_based ? ' credits' : ''} @ $${u.rate} = ${money(u.estimated_extra_cost)}`
  ).join('; ');
}

function show(title, input, e) {
  console.log(`\n──────── ${title} ────────`);
  console.log(`INPUT           → ${JSON.stringify(compact(input))}`);
  console.log(`MATCHED AGENTS  → ${agents(e)}`);
  console.log(`COMPLEXITY      → class ${e.complexity_class} (mod ${e.complexity_modifier})`);
  console.log(`SETUP           → ${money(e.setup_range)}${e.floor_applied.setup ? '  [floor]' : ''}`);
  console.log(`MONTHLY         → ${money(e.monthly_range)}${e.floor_applied.monthly ? '  [floor]' : ''}`);
  console.log(`METERED         → ${metered(e)}`);
  if (e.bundle.discount) console.log(`BUNDLE          → ${e.bundle.agent_count} agents, ${e.bundle.discount * 100}% off base`);
  if (e.breakdown.credits.package_monthly) {
    console.log(`CREDITS         → package $${e.breakdown.credits.package_monthly}/mo (${e.breakdown.credits.package_included} incl), extra ${e.breakdown.credits.extra_credits} = $${e.breakdown.credits.extra_cost}`);
  }
  console.log(`CUSTOM          → ${e.is_custom}`);
  console.log(`REASON          → ${e.custom_reasons.join(' | ') || '—'}`);
}

function compact(input) {
  const o = { intent: input.intent_tags };
  if (input.channels) o.channels = input.channels;
  if (input.integrations) o.integrations = input.integrations;
  if (input.knowledge_base) o.kb = input.knowledge_base;
  if (input.media) o.media = input.media;
  if (input.expected_usage) o.usage = input.expected_usage.by_metric;
  if (input.support_pref) o.support = input.support_pref;
  if (input.sla) o.sla = input.sla;
  return o;
}

function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; failed.push(msg); console.log(`   ❌ ASSERT FAILED: ${msg}`); }
}

// ============ TESTS ============

// 1. Olivia low usage
(() => {
  const input = { intent_tags: ['booking'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 100 } } };
  const e = buildEstimate(input); show('1. Olivia low usage', input, e);
  assert(agents(e) === 'Olivia', 'T1 agent Olivia');
  assert(!e.is_custom, 'T1 not custom');
  assert(metered(e) === 'none', 'T1 no metered (below included)');
})();

// 2. Emma + calendar
(() => {
  const input = { intent_tags: ['reception'], channels: ['web_chat'], integrations: ['calendar'], expected_usage: { by_metric: { conversations: 300 } } };
  const e = buildEstimate(input); show('2. Emma + calendar', input, e);
  assert(agents(e) === 'Emma', 'T2 agent Emma');
  assert(e.breakdown.integrations.setup.low === 200, 'T2 calendar setup $200');
  assert(!e.is_custom, 'T2 not custom');
})();

// 3. Sarah + CRM + 2 channels
(() => {
  const input = { intent_tags: ['sales'], channels: ['web_chat', 'telegram'], integrations: ['crm'], expected_usage: { by_metric: { conversations: 1500 } } };
  const e = buildEstimate(input); show('3. Sarah + CRM + 2 channels', input, e);
  assert(agents(e) === 'Sarah', 'T3 agent Sarah');
  assert(e.breakdown.channels.monthly.low === 29, 'T3 one extra channel = $29');
  assert(e.extra_usage.some((u) => u.metric === 'conversations' && u.extra_units === 1000), 'T3 overage 1000 conv');
  assert(!e.is_custom, 'T3 not custom');
})();

// 4. Max + large KB
(() => {
  const input = { intent_tags: ['knowledge'], channels: ['web_chat'], knowledge_base: { present: true, size: 'large' }, expected_usage: { by_metric: { messages: 1200 } } };
  const e = buildEstimate(input); show('4. Max + large KB', input, e);
  assert(agents(e) === 'Max', 'T4 agent Max');
  assert(e.breakdown.knowledge_base.setup.low === 500, 'T4 KB large setup $500');
  assert(e.breakdown.knowledge_base.monthly.low === 49, 'T4 KB large monthly $49');
  assert(!e.is_custom, 'T4 not custom');
})();

// 5. Boris + web search
(() => {
  const input = { intent_tags: ['analysis'], channels: ['telegram'], expected_usage: { by_metric: { web_searches: 300, reports: 40 } } };
  const e = buildEstimate(input); show('5. Boris + web search', input, e);
  assert(agents(e) === 'Boris', 'T5 agent Boris');
  assert(e.extra_usage.some((u) => u.metric === 'web_searches' && u.extra_units === 200), 'T5 overage 200 searches');
  assert(!e.is_custom, 'T5 not custom');
})();

// 6. Leo + image generation
(() => {
  const input = { intent_tags: ['image'], channels: ['web_form'], media: ['image'], expected_usage: { by_metric: { images: 200 } } };
  const e = buildEstimate(input); show('6. Leo + image generation', input, e);
  assert(agents(e) === 'Leo', 'T6 agent Leo');
  assert(e.extra_usage.some((u) => u.metric === 'images' && u.extra_units === 150), 'T6 overage 150 images');
  assert(!e.is_custom, 'T6 not custom');
})();

// 7. Rooney + audio
(() => {
  const input = { intent_tags: ['audio'], channels: ['web_form'], media: ['audio'], expected_usage: { by_metric: { audio_minutes: 30 } } };
  const e = buildEstimate(input); show('7. Rooney + audio', input, e);
  assert(agents(e) === 'Rooney', 'T7 agent Rooney');
  assert(e.extra_usage.some((u) => u.metric === 'audio_minutes' && u.extra_units === 20), 'T7 overage 20 min');
  assert(!e.is_custom, 'T7 not custom');
})();

// 8. Vera + video credits
(() => {
  const input = { intent_tags: ['video'], channels: ['web_form'], media: ['video'], expected_usage: { by_metric: { video_credits: 400 } } };
  const e = buildEstimate(input); show('8. Vera + video credits', input, e);
  assert(agents(e) === 'Vera', 'T8 agent Vera');
  assert(e.breakdown.credits.package_monthly === 150, 'T8 credit package $150');
  assert(e.breakdown.credits.extra_credits === 250, 'T8 extra 250 credits (400-150)');
  assert(!e.is_custom, 'T8 not custom (below top cap)');
})();

// 9. Emma + Sarah (bundle 2)
(() => {
  const input = { intent_tags: ['reception', 'sales'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 400 } } };
  const e = buildEstimate(input); show('9. Emma + Sarah', input, e);
  assert(e.recommended_agents.length === 2, 'T9 two agents');
  assert(e.bundle.discount === 0.10, 'T9 10% bundle');
  assert(!e.is_custom, 'T9 not custom');
})();

// 10. Emma + Sarah + Max (bundle 3)
(() => {
  const input = { intent_tags: ['reception', 'sales', 'knowledge'], channels: ['web_chat'], knowledge_base: { present: true, size: 'large' }, expected_usage: { by_metric: { conversations: 400, messages: 800 } } };
  const e = buildEstimate(input); show('10. Emma + Sarah + Max', input, e);
  assert(e.recommended_agents.length === 3, 'T10 three agents');
  assert(e.bundle.discount === 0.15, 'T10 15% bundle');
  assert(!e.is_custom, 'T10 not custom (compatible bundle)');
})();

// 11. Unknown integration -> Custom
(() => {
  const input = { intent_tags: ['sales'], channels: ['web_chat'], integrations: ['unknown_erp'] };
  const e = buildEstimate(input); show('11. Unknown integration', input, e);
  assert(e.is_custom, 'T11 custom');
  assert(e.custom_reasons.some((r) => r.startsWith('unknown_integration')), 'T11 reason unknown_integration');
})();

// 12. Unknown capability -> Custom
(() => {
  const input = { intent_tags: ['blockchain_audit'], channels: ['web_chat'] };
  const e = buildEstimate(input); show('12. Unknown capability', input, e);
  assert(e.is_custom, 'T12 custom');
  assert(e.custom_reasons.some((r) => r.startsWith('capability_gap')), 'T12 reason capability_gap');
})();

// 13. Managed support -> NOT custom
(() => {
  const input = { intent_tags: ['reception'], channels: ['web_chat'], support_pref: 'managed', expected_usage: { by_metric: { conversations: 300 } } };
  const e = buildEstimate(input); show('13. Managed support', input, e);
  assert(!e.is_custom, 'T13 managed NOT custom');
  assert(e.breakdown.support.monthly.low === 399, 'T13 managed +$399');
})();

// 14. 3 compatible agents -> NOT custom
(() => {
  const input = { intent_tags: ['reception', 'sales', 'knowledge'], channels: ['web_chat'], knowledge_base: { present: true, size: 'small' }, expected_usage: { by_metric: { conversations: 300, messages: 500 } } };
  const e = buildEstimate(input); show('14. 3 compatible agents', input, e);
  assert(e.recommended_agents.length === 3, 'T14 three agents');
  assert(!e.is_custom, 'T14 NOT custom');
})();

// 15. usage below included
(() => {
  const input = { intent_tags: ['booking'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 100 } } };
  const e = buildEstimate(input); show('15. usage below included', input, e);
  assert(metered(e) === 'none', 'T15 no metered');
  assert(!e.is_custom, 'T15 not custom');
})();

// 16. usage above included
(() => {
  const input = { intent_tags: ['booking'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 2000 } } };
  const e = buildEstimate(input); show('16. usage above included', input, e);
  assert(e.extra_usage.some((u) => u.metric === 'conversations' && u.extra_units === 1500), 'T16 overage 1500');
  assert(!e.is_custom, 'T16 4x still within standard (not custom)');
})();

// 17. monthly floor (synthetic estimate)
(() => {
  const est = applyFloor({ setup_range: { low: 400, high: 500 }, monthly_range: { low: 30, high: 40 } });
  console.log(`\n──────── 17. monthly floor ────────`);
  console.log(`INPUT           → monthly {30,40}`);
  console.log(`MONTHLY         → $${est.monthly_range.low}–$${est.monthly_range.high} [floor ${est.floor_applied.monthly}]`);
  assert(est.monthly_range.low === 49, 'T17 monthly floor $49');
  assert(est.monthly_range.high === 49, 'T17 high not below low');
})();

// 18. setup floor (synthetic estimate)
(() => {
  const est = applyFloor({ setup_range: { low: 100, high: 150 }, monthly_range: { low: 99, high: 120 } });
  console.log(`\n──────── 18. setup floor ────────`);
  console.log(`INPUT           → setup {100,150}`);
  console.log(`SETUP           → $${est.setup_range.low}–$${est.setup_range.high} [floor ${est.floor_applied.setup}]`);
  assert(est.setup_range.low === 249, 'T18 setup floor $249');
  assert(est.setup_range.high === 249, 'T18 high not below low');
})();

// 19. (A) Sarah + second (non-native) channel -> add-on, NOT Custom
(() => {
  const input = { intent_tags: ['sales'], channels: ['web_chat', 'telegram'], expected_usage: { by_metric: { conversations: 300 } } };
  const e = buildEstimate(input); show('19. (A) Sarah + second channel', input, e);
  assert(agents(e) === 'Sarah', 'A agent Sarah');
  assert(!e.is_custom, 'A second channel is an add-on, NOT Custom');
  assert(e.breakdown.channels.monthly.low === 29, 'A channel add-on charged ($29 for 1 extra)');
  assert(!e.custom_reasons.some((r) => r.toLowerCase().includes('channel')), 'A no channel-based custom reason');
})();

// 20. (D) Vera extra credits separate from monthly_range
(() => {
  const low = buildEstimate({ intent_tags: ['video'], channels: ['web_form'], media: ['video'], expected_usage: { by_metric: { video_credits: 200 } } });
  const high = buildEstimate({ intent_tags: ['video'], channels: ['web_form'], media: ['video'], expected_usage: { by_metric: { video_credits: 400 } } });
  show('20. (D) Vera credits separation', { intent_tags: ['video'], media: ['video'], usage: { video_credits: 400 } }, high);
  assert(high.breakdown.credits.package_monthly === 150, 'D package_monthly exists in breakdown.credits');
  assert(high.breakdown.credits.extra_estimate && typeof high.breakdown.credits.extra_estimate.low === 'number', 'D breakdown.credits.extra_estimate is a stable structure');
  assert(high.breakdown.credits.extra_estimate.low === high.breakdown.credits.extra_cost, 'D extra_estimate matches extra_cost');
  assert(high.extra_usage.some((u) => u.metric === 'video_credits' && u.credit_based && u.extra_units === 250), 'D extra video credits are a separate metered line');
  assert(low.monthly_range.low === high.monthly_range.low && low.monthly_range.high === high.monthly_range.high, 'D extra credits are NOT included in monthly_range');
})();

// 21. (E) No commercial price literals embedded in engine.mjs
(() => {
  const collectNums = (obj, out) => {
    for (const v of Object.values(obj)) {
      if (typeof v === 'number') { if (v >= 10 && Number.isInteger(v)) out.add(v); }
      else if (v && typeof v === 'object') collectNums(v, out);
    }
    return out;
  };
  const commercial = [...collectNums(PricingRates, new Set())];
  const engineSrc = readFileSync(new URL('./engine.mjs', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
    .replace(/\/\/.*$/gm, '');        // strip line comments
  const leaked = commercial.filter((n) => new RegExp(`(?<![\\d.])${n}(?![\\d.])`).test(engineSrc));
  console.log(`\n──────── 21. (E) engine.mjs price-literal guard ────────`);
  console.log(`COMMERCIAL NUMS → [${commercial.join(', ')}]`);
  console.log(`LEAKED          → ${leaked.length ? leaked.join(', ') : 'none'}`);
  assert(leaked.length === 0, 'E no commercial price literals inside engine.mjs (leaked: ' + leaked.join(',') + ')');
})();

// ============ SUMMARY ============
console.log(`\n════════════════════════════════════`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (failed.length) { console.log('FAILED:'); failed.forEach((m) => console.log('  - ' + m)); }
console.log(`════════════════════════════════════`);
process.exit(fail ? 1 : 0);
