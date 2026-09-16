/**
 * HYVENTA CONFIGURATOR V1 — CALCULATION ENGINE
 * ------------------------------------------------------------------
 * Pure logic. NO prices hardcoded here — everything comes from
 * pricing-config.mjs (AGENTS + PricingRates).
 *
 * Pipeline:
 *   ClientInput -> matchAgents -> calculateComplexity -> calculateUsage
 *   -> calculateSetup -> calculateMonthly -> calculateMetered
 *   -> calculateBundle -> applyFloor -> evaluateCustom -> Estimate
 */

import {
  AGENTS, PricingRates, DISCLAIMER, CLASS_ORDINAL, ORDINAL_CLASS,
} from './pricing-config.mjs';

// ---------- helpers ----------
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (lo, hi, t) => lo + (hi - lo) * clamp(t, 0, 1);
const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => Math.round(x); // whole-dollar display
const range = (lo, hi) => ({ low: money(lo), high: money(hi) });
const addRange = (a, b) => ({ low: a.low + b.low, high: a.high + b.high });
const zeroR = () => ({ low: 0, high: 0 });

function agentById(id) { return AGENTS.find((a) => a.id === id); }

/** Build intent -> agents index once. */
const INTENT_INDEX = (() => {
  const idx = {};
  for (const a of AGENTS) for (const t of a.intent_tags) (idx[t] ||= []).push(a.id);
  return idx;
})();

// =====================================================================
// 1. matchAgents(input)
// =====================================================================
export function matchAgents(input) {
  const wanted = input.intent_tags || [];
  const matchedIds = new Set();
  const capability_gap = [];

  for (const tag of wanted) {
    const ids = INTENT_INDEX[tag];
    if (ids && ids.length) ids.forEach((id) => matchedIds.add(id));
    else capability_gap.push(tag);
  }

  // Deterministic order = AGENTS order
  const matched = AGENTS.filter((a) => matchedIds.has(a.id));
  return { matched, capability_gap };
}

// =====================================================================
// 2. calculateComplexity(input, agents)
//    class = max(agent inherent class), possibly bumped by config signals.
//    modifier ∈ [0,1] positions price within each agent's OWN range.
// =====================================================================
export function calculateComplexity(input, agents) {
  const channels = input.channels || [];
  const integrations = input.integrations || [];
  const media = input.media || [];
  const kb = input.knowledge_base && input.knowledge_base.present ? 1 : 0;

  const extraChannels = Math.max(0, channels.length - 1);

  // usage intensity across matched agents
  let intensity = 0;
  for (const a of agents) {
    for (const m of a.usage_metrics) {
      const expected = getExpected(input, m.name);
      if (m.included > 0 && expected > m.included) {
        intensity = Math.max(intensity, expected / m.included > 3 ? 1 : 0.5);
      }
    }
  }

  const signals = extraChannels + integrations.length + kb + media.length + intensity;
  const modifier = clamp(signals / 6, 0, 1);

  let ordinal = agents.length
    ? Math.max(...agents.map((a) => CLASS_ORDINAL[a.complexity_class]))
    : 0;
  if (modifier > 0.75) ordinal = Math.min(3, ordinal + 1);

  return { class: ORDINAL_CLASS[ordinal], modifier: r2(modifier) };
}

function getExpected(input, metric) {
  const by = (input.expected_usage && input.expected_usage.by_metric) || {};
  return typeof by[metric] === 'number' ? by[metric] : 0;
}

// =====================================================================
// 3. calculateUsage(input, agents)
//    overage units per metric = max(0, expected - included). Never re-adds included.
//    Aggregates across agents that share a metric name.
// =====================================================================
export function calculateUsage(input, agents) {
  const perMetric = {}; // name -> { included, expected, extra }
  for (const a of agents) {
    for (const m of a.usage_metrics) {
      const expected = getExpected(input, m.name);
      const entry = perMetric[m.name] || { included: 0, expected: 0, extra: 0, expensive: false };
      entry.included += m.included;
      entry.expected = Math.max(entry.expected, expected);
      entry.expensive = entry.expensive || a.expensive_operations.includes(m.name);
      perMetric[m.name] = entry;
    }
  }
  for (const name of Object.keys(perMetric)) {
    const e = perMetric[name];
    e.extra = Math.max(0, e.expected - e.included);
  }
  return perMetric;
}

// =====================================================================
// 4. calculateSetup(input, agents, complexity)
//    SETUP = agent_base_setup(positioned) + unique integrations
//            + KB setup + non-native media setup
//    (integrations/KB come from input -> counted ONCE regardless of agent count)
// =====================================================================
export function calculateSetup(input, agents, complexity) {
  const { modifier } = complexity;
  const band = PricingRates.band;

  let base = zeroR();
  for (const a of agents) {
    const lo = lerp(a.setup_range.low, a.setup_range.high, clamp(modifier - band, 0, 1));
    const hi = lerp(a.setup_range.low, a.setup_range.high, clamp(modifier + band, 0, 1));
    base = addRange(base, range(lo, hi));
  }

  // integrations (unique, known only; unknown handled in evaluateCustom)
  let integrations_setup = 0;
  for (const key of uniqueKnownIntegrations(input)) {
    integrations_setup += PricingRates.integration[key].setup;
  }

  // KB (once). Max REQUIRES a KB even if the client forgot to declare it.
  let kb_setup = 0;
  const kb = resolveKB(input, agents);
  if (kb) kb_setup = PricingRates.knowledge_base[kb].setup;

  // non-native media setup (media agents already include their pipeline -> 0)
  const media_setup = 0;

  return { base, integrations_setup, kb_setup, media_setup };
}

// =====================================================================
// 5. calculateMonthly(input, agents, complexity)
//    MONTHLY = agent_base_monthly(positioned)
//            + extra_channels*fee + integration_monthly + KB_monthly
//            + support_upgrade  [+ Vera credit package handled in metered]
//    (usage_overage added later, NOT discounted)
// =====================================================================
export function calculateMonthly(input, agents, complexity) {
  const { modifier } = complexity;
  const band = PricingRates.band;

  let base = zeroR();
  for (const a of agents) {
    const lo = lerp(a.monthly_range.low, a.monthly_range.high, clamp(modifier - band, 0, 1));
    const hi = lerp(a.monthly_range.low, a.monthly_range.high, clamp(modifier + band, 0, 1));
    base = addRange(base, range(lo, hi));
  }

  const channels = input.channels || [];
  const extra_channels = Math.max(0, channels.length - 1);
  const channels_monthly = extra_channels * PricingRates.channel_fee_monthly;

  let integrations_monthly = 0;
  for (const key of uniqueKnownIntegrations(input)) {
    integrations_monthly += PricingRates.integration[key].monthly;
  }

  let kb_monthly = 0;
  const kb = resolveKB(input, agents);
  if (kb) kb_monthly = PricingRates.knowledge_base[kb].monthly;

  const tier = (input.support_pref || 'standard');
  const support_monthly = (PricingRates.support_tiers[tier] || PricingRates.support_tiers.standard).monthly;

  return { base, channels_monthly, integrations_monthly, kb_monthly, support_monthly, extra_channels };
}

// =====================================================================
// 6. calculateMetered(input, agents, usage)
//    Builds extra_usage lines. Video (Vera) is credit-based & separated:
//    base service + video credit package + extra credits.
// =====================================================================
export function calculateMetered(input, agents, usage) {
  const extra_usage = [];
  let metered_monthly = 0;

  const hasVera = agents.some((a) => a.id === 'vera');
  let credits = { package_monthly: 0, package_included: 0, extra_credits: 0, extra_cost: 0 };

  for (const name of Object.keys(usage)) {
    const e = usage[name];
    if (name === 'video_credits') continue; // handled below

    if (e.extra > 0) {
      const rate = PricingRates.usage_rates[name] || 0;
      const cost = r2(e.extra * rate);
      metered_monthly += cost;
      extra_usage.push({
        metric: name,
        included: e.included,
        expected: e.expected,
        extra_units: e.extra,
        rate,
        estimated_extra_cost: range(cost, cost),
      });
    } else if (e.expensive) {
      // expensive op within included -> still show the meter transparently
      extra_usage.push({
        metric: name,
        included: e.included,
        expected: e.expected,
        extra_units: 0,
        rate: PricingRates.usage_rates[name] || 0,
        estimated_extra_cost: range(0, 0),
      });
    }
  }

  if (hasVera) {
    const pkg = PricingRates.media.video_credit_package;
    credits.package_monthly = pkg.monthly;
    credits.package_included = pkg.credits_included;
    const requested = getExpected(input, 'video_credits');
    const extra = Math.max(0, requested - pkg.credits_included);
    credits.extra_credits = extra;
    credits.extra_cost = r2(extra * PricingRates.media.extra_video_credit);
    extra_usage.push({
      metric: 'video_credits',
      included: pkg.credits_included,
      expected: requested,
      extra_units: extra,
      rate: PricingRates.media.extra_video_credit,
      estimated_extra_cost: range(credits.extra_cost, credits.extra_cost),
      credit_based: true,
    });
    // credit package is a fixed monthly line (NOT flat usage, NOT discounted)
  }

  return { extra_usage, metered_monthly: r2(metered_monthly), credits };
}

// =====================================================================
// 7. calculateBundle(setup, monthly, agentCount)
//    Discount applies to BASE only. Metered/integrations/KB/support untouched.
// =====================================================================
export function calculateBundle(setupBase, monthlyBase, agentCount) {
  const disc = PricingRates.bundle_discounts[agentCount] || 0;
  const factor = 1 - disc;
  return {
    discount: disc,
    setup_base: range(setupBase.low * factor, setupBase.high * factor),
    monthly_base: range(monthlyBase.low * factor, monthlyBase.high * factor),
  };
}

// =====================================================================
// 8. evaluateCustom(input, agents, capability_gap, usage)
//    Custom ONLY if a true blocker exists (audit §D). 2-3 agents / Managed
//    / normal video are NOT custom.
// =====================================================================
export function evaluateCustom(input, agents, capability_gap, usage) {
  const reasons = [];

  // 1. capability gap
  if (capability_gap.length) {
    reasons.push(`capability_gap: no agent covers [${capability_gap.join(', ')}]`);
  }

  // 2. unknown / nonstandard integration
  const unknown = (input.integrations || []).filter(
    (k) => !PricingRates.integration[k]
  );
  if (unknown.length) reasons.push(`unknown_integration: [${unknown.join(', ')}]`);

  // 3. usage above max standard package
  const mult = PricingRates.max_standard_usage_multiple;
  for (const name of Object.keys(usage)) {
    const e = usage[name];
    if (e.included > 0 && e.expected > e.included * mult) {
      reasons.push(`usage_exceeds_standard: ${name} ${e.expected} > ${e.included * mult}`);
    }
  }

  // 4. SLA / enterprise support
  const tier = input.support_pref || 'standard';
  if (input.sla === true || (PricingRates.support_tiers[tier] && PricingRates.support_tiers[tier].custom)) {
    reasons.push('enterprise_sla_required');
  }

  // 5. media/video above top credit package
  if (agents.some((a) => a.id === 'vera')) {
    const requested = getExpected(input, 'video_credits');
    if (requested > PricingRates.media.top_credit_package_cap) {
      reasons.push(`video_above_top_package: ${requested} > ${PricingRates.media.top_credit_package_cap}`);
    }
  }

  return { is_custom: reasons.length > 0, custom_reasons: reasons };
}

// =====================================================================
// 9. applyFloor(estimate)  — commercial minimums, applied LAST.
// =====================================================================
export function applyFloor(estimate) {
  const { setup_range, monthly_range } = estimate;
  const f = PricingRates.floors;
  setup_range.low = Math.max(setup_range.low, f.setup);
  setup_range.high = Math.max(setup_range.high, setup_range.low);
  monthly_range.low = Math.max(monthly_range.low, f.monthly);
  monthly_range.high = Math.max(monthly_range.high, monthly_range.low);
  estimate.floor_applied = {
    setup: setup_range.low === f.setup,
    monthly: monthly_range.low === f.monthly,
  };
  return estimate;
}

// ---------- shared resolvers ----------
function uniqueKnownIntegrations(input) {
  const set = new Set((input.integrations || []).filter((k) => PricingRates.integration[k]));
  return [...set];
}

/** KB size resolution. Max forces a KB even if not declared (defaults to 'large'). */
function resolveKB(input, agents) {
  const declared = input.knowledge_base && input.knowledge_base.present
    ? (input.knowledge_base.size || 'small')
    : null;
  const maxNeedsKB = agents.some((a) => a.id === 'max');
  if (declared) return declared;
  if (maxNeedsKB) return 'large';
  return null;
}

function confidenceOf(input) {
  let score = 0.4;
  if (input.business_type) score += 0.1;
  if (input.task_text) score += 0.1;
  if ((input.channels || []).length) score += 0.1;
  if (input.expected_usage && input.expected_usage.by_metric) score += 0.2;
  if (typeof input.boris_confidence === 'number') score = input.boris_confidence;
  return r2(clamp(score, 0, 1));
}

// =====================================================================
// 10. buildEstimate(input)  — orchestrates the whole pipeline.
// =====================================================================
export function buildEstimate(input) {
  const { matched, capability_gap } = matchAgents(input);
  const complexity = calculateComplexity(input, matched);
  const usage = calculateUsage(input, matched);

  const setup = calculateSetup(input, matched, complexity);
  const monthly = calculateMonthly(input, matched, complexity);
  const metered = calculateMetered(input, matched, usage);

  // bundle on BASE only
  const bundle = calculateBundle(setup.base, monthly.base, matched.length);
  const setupBase = bundle.setup_base;
  const monthlyBase = bundle.monthly_base;

  // -------- assemble breakdown --------
  const breakdown = {
    base: {
      setup: setupBase,
      monthly: monthlyBase,
    },
    usage: { monthly: range(metered.metered_monthly, metered.metered_monthly) },
    channels: { monthly: range(monthly.channels_monthly, monthly.channels_monthly) },
    integrations: {
      setup: range(setup.integrations_setup, setup.integrations_setup),
      monthly: range(monthly.integrations_monthly, monthly.integrations_monthly),
    },
    knowledge_base: {
      setup: range(setup.kb_setup, setup.kb_setup),
      monthly: range(monthly.kb_monthly, monthly.kb_monthly),
    },
    support: { monthly: range(monthly.support_monthly, monthly.support_monthly) },
    credits: {
      monthly: range(metered.credits.package_monthly, metered.credits.package_monthly),
      package_monthly: metered.credits.package_monthly,
      package_included: metered.credits.package_included,
      extra_credits: metered.credits.extra_credits,
      extra_cost: metered.credits.extra_cost,
      // Stable metered-line structure for future Boris/UI. Extra video credits are
      // a SEPARATE line and are NEVER folded into monthly_range.
      extra_estimate: range(metered.credits.extra_cost, metered.credits.extra_cost),
    },
  };

  // -------- totals --------
  const setup_total = {
    low: setupBase.low + setup.integrations_setup + setup.kb_setup + setup.media_setup,
    high: setupBase.high + setup.integrations_setup + setup.kb_setup + setup.media_setup,
  };
  const monthly_fixed =
    monthly.channels_monthly + monthly.integrations_monthly +
    monthly.kb_monthly + monthly.support_monthly + metered.credits.package_monthly;
  const monthly_total = {
    low: monthlyBase.low + monthly_fixed + metered.metered_monthly,
    high: monthlyBase.high + monthly_fixed + metered.metered_monthly,
  };
  breakdown.total = { setup: range(setup_total.low, setup_total.high), monthly: range(monthly_total.low, monthly_total.high) };

  // included usage snapshot
  const included_usage = {};
  for (const name of Object.keys(usage)) included_usage[name] = usage[name].included;
  if (metered.credits.package_included) included_usage.video_credits = metered.credits.package_included;

  // guardrail: metered spike warning
  const warnings = [];
  const baseMid = (monthlyBase.low + monthlyBase.high) / 2 || 1;
  if (metered.metered_monthly > baseMid * PricingRates.soft_cap_ratio) {
    warnings.push('metered_usage_high: consider a larger included package or a conversation');
  }

  // custom detection
  const custom = evaluateCustom(input, matched, capability_gap, usage);

  let estimate = {
    recommended_agents: matched.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    complexity_class: complexity.class,
    complexity_modifier: complexity.modifier,
    setup_range: range(setup_total.low, setup_total.high),
    monthly_range: range(monthly_total.low, monthly_total.high),
    included_usage,
    extra_usage: metered.extra_usage,
    is_custom: custom.is_custom,
    custom_reasons: custom.custom_reasons,
    confidence: confidenceOf(input),
    bundle: { agent_count: matched.length, discount: bundle.discount },
    breakdown,
    warnings,
    disclaimer: DISCLAIMER,
  };

  estimate = applyFloor(estimate);
  return estimate;
}

export default { buildEstimate };
