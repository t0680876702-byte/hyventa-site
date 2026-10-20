/**
 * HYVENTA CONFIGURATOR V1 — TEST SUITE (standalone, no UI)
 * Run: node hyventa-site/configurator/engine.test.mjs
 */
import {
  buildEstimate, applyFloor, matchAgents, calculateUsage, calculateMetered, isAgentPublic,
} from './engine.mjs';
import { AGENTS, PricingRates } from './pricing-config.mjs';
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
  assert(e.breakdown.integrations.setup.low === 99, 'T2 calendar setup $99');
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
  assert(e.breakdown.knowledge_base.setup.low === 300, 'T4 KB large setup $300');
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

// 6. Leo (HIDDEN) — an image request must never reach a hidden agent
(() => {
  const input = { intent_tags: ['image'], channels: ['web_form'], media: ['image'], expected_usage: { by_metric: { images: 200 } } };
  const e = buildEstimate(input); show('6. Leo hidden — image becomes Custom', input, e);
  assert(e.recommended_agents.length === 0, 'T6 no public agent for image');
  assert(!e.recommended_agents.some((a) => a.id === 'leo'), 'T6 Leo never recommended');
  assert(e.is_custom, 'T6 image request is Custom');
  assert(e.custom_reasons.some((r) => r.startsWith('capability_gap')), 'T6 reason capability_gap');
})();

// 6b. Leo's overage math is preserved (unit level: hidden agent passed explicitly)
(() => {
  const leo = AGENTS.find((a) => a.id === 'leo');
  assert(!!leo && !isAgentPublic(leo), 'T6b Leo exists in data and is hidden');
  const input = { intent_tags: ['image'], channels: ['web_form'], media: ['image'], expected_usage: { by_metric: { images: 200 } } };
  const usage = calculateUsage(input, [leo]);
  const m = calculateMetered(input, [leo], usage);
  console.log(`\n──────── 6b. Leo overage (unit) ────────`);
  console.log(`EXTRA IMAGES    → ${usage.images.extra} @ $${PricingRates.usage_rates.images} = $${m.metered_monthly}`);
  assert(usage.images.extra === 150, 'T6b overage 150 images');
  assert(m.metered_monthly === 30, 'T6b 150 images x $0.20 = $30');
})();

// 7. Rooney (HIDDEN) — an audio request must never reach a hidden agent
(() => {
  const input = { intent_tags: ['audio'], channels: ['web_form'], media: ['audio'], expected_usage: { by_metric: { audio_minutes: 30 } } };
  const e = buildEstimate(input); show('7. Rooney hidden — audio becomes Custom', input, e);
  assert(e.recommended_agents.length === 0, 'T7 no public agent for audio');
  assert(!e.recommended_agents.some((a) => a.id === 'rooney'), 'T7 Rooney never recommended');
  assert(e.is_custom, 'T7 audio request is Custom');
})();

// 7b. Rooney's overage math is preserved (unit level)
(() => {
  const rooney = AGENTS.find((a) => a.id === 'rooney');
  assert(!!rooney && !isAgentPublic(rooney), 'T7b Rooney exists in data and is hidden');
  const input = { intent_tags: ['audio'], channels: ['web_form'], media: ['audio'], expected_usage: { by_metric: { audio_minutes: 30 } } };
  const usage = calculateUsage(input, [rooney]);
  const m = calculateMetered(input, [rooney], usage);
  console.log(`\n──────── 7b. Rooney overage (unit) ────────`);
  console.log(`EXTRA AUDIO MIN → ${usage.audio_minutes.extra} @ $${PricingRates.usage_rates.audio_minutes} = $${m.metered_monthly}`);
  assert(usage.audio_minutes.extra === 20, 'T7b overage 20 min');
  assert(m.metered_monthly === 12, 'T7b 20 min x $0.60 = $12');
})();

// 8. Vera (HIDDEN) — a video request must never reach a hidden agent
(() => {
  const input = { intent_tags: ['video'], channels: ['web_form'], media: ['video'], expected_usage: { by_metric: { video_credits: 400 } } };
  const e = buildEstimate(input); show('8. Vera hidden — video becomes Custom', input, e);
  assert(e.recommended_agents.length === 0, 'T8 no public agent for video');
  assert(!e.recommended_agents.some((a) => a.id === 'vera'), 'T8 Vera never recommended');
  assert(e.breakdown.credits.package_monthly === 0, 'T8 no credit package without Vera');
  assert(e.is_custom, 'T8 video request is Custom');
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
  const est = applyFloor({ setup_range: { low: 100, high: 120 }, monthly_range: { low: 99, high: 120 } });
  console.log(`\n──────── 18. setup floor ────────`);
  console.log(`INPUT           → setup {100,120}`);
  console.log(`SETUP           → $${est.setup_range.low}–$${est.setup_range.high} [floor ${est.floor_applied.setup}]`);
  assert(est.setup_range.low === 149, 'T18 setup floor $149');
  assert(est.setup_range.high === 149, 'T18 high not below low');
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

// 20. (D) Vera credits stay a SEPARATE line, never folded into flat metered usage
(() => {
  const vera = AGENTS.find((a) => a.id === 'vera');
  assert(!!vera && !isAgentPublic(vera), 'D Vera exists in data and is hidden');
  const input = { intent_tags: ['video'], channels: ['web_form'], media: ['video'], expected_usage: { by_metric: { video_credits: 400 } } };
  const usage = calculateUsage(input, [vera]);
  const m = calculateMetered(input, [vera], usage);
  console.log(`\n──────── 20. (D) Vera credits separation (unit) ────────`);
  console.log(`PACKAGE         → $${m.credits.package_monthly}/mo (${m.credits.package_included} included)`);
  console.log(`EXTRA CREDITS   → ${m.credits.extra_credits} = $${m.credits.extra_cost}`);
  console.log(`FLAT METERED    → $${m.metered_monthly}`);
  assert(m.credits.package_monthly === 150, 'D package_monthly $150');
  assert(m.credits.extra_credits === 250, 'D extra 250 credits (400-150)');
  assert(m.credits.extra_cost === 250, 'D extra credits priced at $1 each');
  assert(m.metered_monthly === 0, 'D video credits are NOT flat metered usage');
  assert(m.extra_usage.some((u) => u.metric === 'video_credits' && u.credit_based && u.extra_units === 250), 'D extra video credits are a separate metered line');
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

// 22. STEP 35 — a request built ONLY from hidden intents yields no agents at all
(() => {
  const input = { intent_tags: ['image', 'audio', 'video'], channels: ['web_form'], media: ['image', 'audio', 'video'] };
  const e = buildEstimate(input); show('22. All hidden intents', input, e);
  assert(e.recommended_agents.length === 0, 'T22 hidden-only request matches no agent');
  assert(e.is_custom, 'T22 hidden-only request is Custom');
  assert(e.custom_reasons.some((r) => r.startsWith('capability_gap')), 'T22 capability_gap reported');
  assert(e.breakdown.credits.package_monthly === 0, 'T22 no credit package without a visible agent');
  assert(e.breakdown.credits.extra_estimate && e.breakdown.credits.extra_estimate.low === 0 && e.breakdown.credits.extra_estimate.high === 0, 'T22 breakdown.credits.extra_estimate is a stable zero structure');
})();

// 23. Stella (HIDDEN) — the 'styling' intent never resolves to an agent
(() => {
  const input = { intent_tags: ['styling'], channels: ['web_form'], expected_usage: { by_metric: { renders: 100 } } };
  const e = buildEstimate(input); show('23. Stella hidden — styling is Custom', input, e);
  assert(e.recommended_agents.length === 0, 'T23 Stella never recommended');
  assert(e.is_custom, 'T23 styling request is Custom');
})();

// 24. A hidden intent must not shift the price of a visible agent
(() => {
  const base = { intent_tags: ['booking'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 100 } } };
  const withHidden = { intent_tags: ['booking', 'image'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 100 } } };
  const a = buildEstimate(base);
  const b = buildEstimate(withHidden);
  console.log(`\n──────── 24. hidden intent must not shift a visible price ────────`);
  console.log(`OLIVIA ONLY     → ${money(a.setup_range)} / ${money(a.monthly_range)}`);
  console.log(`+ HIDDEN IMAGE  → ${money(b.setup_range)} / ${money(b.monthly_range)}`);
  assert(agents(b) === 'Olivia', 'T24 hidden intent adds no agent');
  assert(a.setup_range.low === b.setup_range.low && a.setup_range.high === b.setup_range.high, 'T24 setup unchanged by hidden intent');
  assert(a.monthly_range.low === b.monthly_range.low && a.monthly_range.high === b.monthly_range.high, 'T24 monthly unchanged by hidden intent');
  assert(b.is_custom, 'T24 uncovered hidden requirement is reported as Custom');
})();

// 25. Exhaustive sweep: no intent tag can ever surface a hidden agent
(() => {
  const hiddenIds = new Set(AGENTS.filter((a) => !isAgentPublic(a)).map((a) => a.id));
  const allTags = new Set();
  for (const a of AGENTS) for (const t of a.intent_tags) allTags.add(t);
  const leaked = [];
  for (const tag of allTags) {
    const { matched } = matchAgents({ intent_tags: [tag] });
    for (const a of matched) if (hiddenIds.has(a.id)) leaked.push(`${tag}->${a.id}`);
  }
  console.log(`\n──────── 25. exhaustive availability sweep ────────`);
  console.log(`INTENT TAGS     → ${allTags.size}`);
  console.log(`HIDDEN AGENTS   → ${[...hiddenIds].join(', ')}`);
  console.log(`LEAKED          → ${leaked.length ? leaked.join(', ') : 'none'}`);
  assert(hiddenIds.size === 4, 'T25 exactly 4 hidden agents');
  assert(AGENTS.length === 13, 'T25 all 13 agent definitions preserved in data');
  assert(leaked.length === 0, 'T25 no intent tag matches a hidden agent');
})();

// 26. STEP 35b — manually enabled hidden media options must not shift a visible price
(() => {
  const base = { intent_tags: ['sales'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 300 } } };
  const tampered = { intent_tags: ['sales'], channels: ['web_chat'], media: ['image', 'audio', 'video'], expected_usage: { by_metric: { conversations: 300 } } };
  const a = buildEstimate(base);
  const b = buildEstimate(tampered);
  console.log(`\n──────── 26. hidden media must not shift a visible price ────────`);
  console.log(`SARAH ONLY      → ${money(a.setup_range)} / ${money(a.monthly_range)} (mod ${a.complexity_modifier})`);
  console.log(`+ HIDDEN MEDIA  → ${money(b.setup_range)} / ${money(b.monthly_range)} (mod ${b.complexity_modifier})`);
  assert(agents(b) === 'Sarah', 'T26 hidden media adds no agent');
  assert(a.complexity_modifier === b.complexity_modifier, 'T26 modifier unchanged by hidden media');
  assert(a.setup_range.low === b.setup_range.low && a.setup_range.high === b.setup_range.high, 'T26 setup unchanged by hidden media');
  assert(a.monthly_range.low === b.monthly_range.low && a.monthly_range.high === b.monthly_range.high, 'T26 monthly unchanged by hidden media');
  assert(!b.is_custom, 'T26 media alone does not make a visible scenario Custom');
})();

// 27. STEP 35b — hidden media combined with a hidden intent leaves the price untouched
(() => {
  const base = { intent_tags: ['booking'], channels: ['web_chat'], expected_usage: { by_metric: { conversations: 100 } } };
  const tampered = { intent_tags: ['booking', 'video'], channels: ['web_chat'], media: ['video', 'audio'], expected_usage: { by_metric: { conversations: 100 } } };
  const a = buildEstimate(base);
  const b = buildEstimate(tampered);
  console.log(`\n──────── 27. hidden intent + hidden media ────────`);
  console.log(`OLIVIA ONLY     → ${money(a.setup_range)} / ${money(a.monthly_range)}`);
  console.log(`+ HIDDEN BOTH   → ${money(b.setup_range)} / ${money(b.monthly_range)}`);
  assert(agents(b) === 'Olivia', 'T27 Olivia remains the only matched agent');
  assert(a.setup_range.low === b.setup_range.low && a.setup_range.high === b.setup_range.high, 'T27 setup unchanged by hidden media+intent');
  assert(a.monthly_range.low === b.monthly_range.low && a.monthly_range.high === b.monthly_range.high, 'T27 monthly unchanged by hidden media+intent');
  assert(b.is_custom, 'T27 uncovered requirement is still reported as Custom');
})();

// ============ SUMMARY ============
console.log(`\n════════════════════════════════════`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (failed.length) { console.log('FAILED:'); failed.forEach((m) => console.log('  - ' + m)); }
console.log(`════════════════════════════════════`);
process.exit(fail ? 1 : 0);
