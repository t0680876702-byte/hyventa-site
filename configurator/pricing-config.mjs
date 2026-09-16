/**
 * HYVENTA CONFIGURATOR V1 — DATA CONFIG
 * ------------------------------------------------------------------
 * Pure data. NO calculation logic here.
 * All prices/rates are editable WITHOUT touching engine.mjs.
 *
 * Source of truth for agents = the real n8n workflows (FINAL LOGIC AUDIT).
 * Ranges are ESTIMATES anchored to existing tiers ($99/$249/$499/Custom).
 *
 * NOTE: This module is browser- and Node-safe (ES module, no I/O).
 */

/** Agent inherent complexity classes. Class is a MODIFIER input, NOT the price source. */
export const CLASS_ORDINAL = { A: 0, B: 1, C: 2, D: 3 };
export const ORDINAL_CLASS = ['A', 'B', 'C', 'D'];

/**
 * usage_metrics[]:  { name, unit, included }   (included lives on the agent)
 * expensive_operations[]: metric names that FORCE metered billing
 * setup_range / monthly_range: the agent's OWN economics (the price source)
 * compatibility.native_channels / native_media: capabilities the agent ships with
 */
export const AGENTS = [
  {
    id: 'olivia', name: 'Olivia', role: 'Appointment Setter',
    complexity_class: 'A',
    native_channels: ['web_chat'], // informational metadata (future Boris/UI); NOT used in pricing/Custom
    triggers: ['web_chat'], channels: ['web_chat'],
    required_apis: ['openai'],
    available_skills: ['lead_qualification', 'meeting_booking_dialog', 'memory'],
    required_skills: ['lead_qualification'],
    usage_metrics: [{ name: 'conversations', unit: 'conv', included: 500 }],
    expensive_operations: [],
    setup_range: { low: 200, high: 500 },
    monthly_range: { low: 99, high: 149 },
    included_usage: { conversations: 500 },
    compatibility: { native_channels: ['web_chat'], native_media: [], requires: [] },
    intent_tags: ['booking', 'appointment_setting', 'lead_qualification'],
  },
  {
    id: 'emma', name: 'Emma', role: 'Receptionist',
    complexity_class: 'A',
    native_channels: ['web_chat'],
    triggers: ['web_chat'], channels: ['web_chat'],
    required_apis: ['openai'],
    available_skills: ['reception_qa', 'appointment_capture', 'memory'],
    required_skills: ['appointment_capture'],
    usage_metrics: [{ name: 'conversations', unit: 'conv', included: 500 }],
    expensive_operations: [],
    setup_range: { low: 300, high: 700 },
    monthly_range: { low: 99, high: 199 },
    included_usage: { conversations: 500 },
    compatibility: { native_channels: ['web_chat'], native_media: [], requires: ['calendar?'] },
    intent_tags: ['reception', 'appointment', 'front_desk'],
  },
  {
    id: 'sarah', name: 'Sarah', role: 'Sales Manager',
    complexity_class: 'B',
    native_channels: ['web_chat'],
    triggers: ['web_chat'], channels: ['web_chat'],
    required_apis: ['openai'],
    available_skills: ['lead_qualification', 'qa', 'lead_capture', 'memory'],
    required_skills: ['lead_qualification', 'lead_capture'],
    usage_metrics: [{ name: 'conversations', unit: 'conv', included: 500 }],
    expensive_operations: [],
    setup_range: { low: 300, high: 800 },
    monthly_range: { low: 149, high: 299 },
    included_usage: { conversations: 500 },
    compatibility: { native_channels: ['web_chat'], native_media: [], requires: [] },
    intent_tags: ['sales', 'lead_qualification', 'sales_chat'],
  },
  {
    id: 'alex', name: 'Alex', role: 'Support Agent',
    complexity_class: 'B',
    native_channels: ['web_form'],
    triggers: ['web_form'], channels: ['web_form'],
    required_apis: ['openai'],
    available_skills: ['ticket_classification', 'reply_drafting', 'escalation_flag'],
    required_skills: ['ticket_classification'],
    usage_metrics: [{ name: 'tickets', unit: 'ticket', included: 500 }],
    expensive_operations: [],
    setup_range: { low: 300, high: 800 },
    monthly_range: { low: 149, high: 299 },
    included_usage: { tickets: 500 },
    compatibility: { native_channels: ['web_form'], native_media: [], requires: ['intake_channel'] },
    intent_tags: ['support', 'ticket_triage'],
  },
  {
    id: 'sophia', name: 'Sophia', role: 'Marketing Manager',
    complexity_class: 'A',
    native_channels: ['internal'],
    triggers: ['schedule'], channels: ['internal'],
    required_apis: ['openai'],
    available_skills: ['content_idea_generation'],
    required_skills: ['content_idea_generation'],
    usage_metrics: [{ name: 'content_ideas', unit: 'idea', included: 90 }],
    expensive_operations: [],
    setup_range: { low: 300, high: 700 },
    monthly_range: { low: 99, high: 249 },
    included_usage: { content_ideas: 90 },
    compatibility: { native_channels: ['internal'], native_media: [], requires: [] },
    intent_tags: ['marketing', 'content'],
  },
  {
    id: 'daniel', name: 'Daniel', role: 'Recruiter',
    complexity_class: 'B',
    native_channels: ['webhook'],
    triggers: ['webhook'], channels: ['webhook'],
    required_apis: ['openai'],
    available_skills: ['application_screening', 'fit_scoring', 'stage_recommendation'],
    required_skills: ['application_screening'],
    usage_metrics: [{ name: 'applications', unit: 'app', included: 300 }],
    expensive_operations: [],
    setup_range: { low: 500, high: 1200 },
    monthly_range: { low: 249, high: 399 },
    included_usage: { applications: 300 },
    compatibility: { native_channels: ['webhook'], native_media: [], requires: ['ats_or_webhook'] },
    intent_tags: ['recruiting', 'screening'],
  },
  {
    id: 'nina', name: 'Nina', role: 'Translator',
    complexity_class: 'B',
    native_channels: ['telegram'],
    triggers: ['telegram'], channels: ['telegram'],
    required_apis: ['openai', 'google_gemini'],
    available_skills: ['text_translation', 'voice_transcription', 'translation_dialog'],
    required_skills: ['text_translation'],
    usage_metrics: [
      { name: 'messages', unit: 'msg', included: 1000 },
      { name: 'voice_minutes', unit: 'min', included: 60 },
    ],
    expensive_operations: ['voice_minutes'],
    setup_range: { low: 500, high: 1200 },
    monthly_range: { low: 249, high: 399 },
    included_usage: { messages: 1000, voice_minutes: 60 },
    compatibility: { native_channels: ['telegram'], native_media: ['voice'], requires: ['telegram'] },
    intent_tags: ['translation', 'voice'],
  },
  {
    id: 'max', name: 'Max', role: 'Knowledge Assistant',
    complexity_class: 'C',
    native_channels: ['web_chat'],
    triggers: ['web_chat'], channels: ['web_chat'],
    required_apis: ['openai', 'knowledge_base'],
    available_skills: ['kb_search', 'factual_answering', 'fact_add_update', 'memory'],
    required_skills: ['kb_search'],
    usage_metrics: [{ name: 'messages', unit: 'msg', included: 1000 }],
    expensive_operations: [],
    setup_range: { low: 800, high: 2000 },
    monthly_range: { low: 299, high: 599 },
    included_usage: { messages: 1000 },
    // Max CANNOT run without a populated KB -> forces KB setup line.
    compatibility: { native_channels: ['web_chat'], native_media: [], requires: ['knowledge_base'] },
    intent_tags: ['knowledge', 'faq', 'support_kb'],
  },
  {
    id: 'boris', name: 'Boris', role: 'Business Analyst',
    complexity_class: 'C',
    native_channels: ['telegram'],
    triggers: ['telegram'], channels: ['telegram'],
    required_apis: ['openrouter', 'serpapi'],
    available_skills: ['business_interview', 'web_research', 'report_generation', 'session_state'],
    required_skills: ['business_interview', 'report_generation'],
    usage_metrics: [
      { name: 'reports', unit: 'report', included: 40 },
      { name: 'web_searches', unit: 'search', included: 100 },
    ],
    expensive_operations: ['web_searches'],
    setup_range: { low: 800, high: 1800 },
    monthly_range: { low: 299, high: 599 },
    included_usage: { reports: 40, web_searches: 100 },
    compatibility: { native_channels: ['telegram'], native_media: [], requires: ['telegram'] },
    intent_tags: ['analysis', 'research', 'business_analysis'],
  },
  {
    id: 'leo', name: 'Leo', role: 'Designer',
    complexity_class: 'C',
    native_channels: ['web_form'],
    triggers: ['web_form'], channels: ['web_form'],
    required_apis: ['openrouter', 'recraft', 'cloudconvert'],
    available_skills: ['trend_research', 'batch_vector_generation', 'format_conversion'],
    required_skills: ['batch_vector_generation'],
    usage_metrics: [{ name: 'images', unit: 'image', included: 50 }],
    expensive_operations: ['images'],
    setup_range: { low: 1000, high: 2500 },
    monthly_range: { low: 399, high: 799 },
    included_usage: { images: 50 },
    compatibility: { native_channels: ['web_form'], native_media: ['image'], requires: ['recraft', 'cloudconvert'] },
    intent_tags: ['image', 'vector', 'design'],
  },
  {
    id: 'rooney', name: 'Rooney', role: 'Composer',
    complexity_class: 'C',
    native_channels: ['web_form'],
    triggers: ['web_form'], channels: ['web_form'],
    required_apis: ['piapi'],
    available_skills: ['song_generation'],
    required_skills: ['song_generation'],
    usage_metrics: [{ name: 'audio_minutes', unit: 'min', included: 10 }],
    expensive_operations: ['audio_minutes'], // Rooney is ALWAYS metered
    setup_range: { low: 1000, high: 2500 },
    monthly_range: { low: 399, high: 799 },
    included_usage: { audio_minutes: 10 },
    compatibility: { native_channels: ['web_form'], native_media: ['audio'], requires: ['piapi'] },
    intent_tags: ['audio', 'music', 'song'],
  },
  {
    id: 'vera', name: 'Vera', role: 'Video Producer',
    complexity_class: 'D',
    native_channels: ['web_form'],
    triggers: ['web_form'], channels: ['web_form'],
    required_apis: ['openrouter', 'piapi_veo3', 'google_drive'],
    available_skills: ['trend_research', 'vertical_video_generation', 'drive_delivery'],
    required_skills: ['vertical_video_generation'],
    // Vera monthly_range = BASE SERVICE ONLY. Video is credit-based, handled separately.
    usage_metrics: [{ name: 'video_credits', unit: 'credit', included: 0 }],
    expensive_operations: ['video_credits'], // credit-based, never flat
    setup_range: { low: 1500, high: 4000 },
    monthly_range: { low: 499, high: 900 }, // base service only (Drive + callback native)
    included_usage: { video_credits: 0 },
    is_credit_based: true,
    compatibility: { native_channels: ['web_form'], native_media: ['video'], requires: ['piapi_veo3', 'google_drive'] },
    intent_tags: ['video'],
  },
  {
    id: 'stella', name: 'Stella', role: 'Stylist',
    complexity_class: 'C',
    native_channels: ['web_form'],
    triggers: ['web_form'], channels: ['web_form'],
    required_apis: ['image_tryon'],
    available_skills: ['garment_tryon_render'],
    required_skills: ['garment_tryon_render'],
    usage_metrics: [{ name: 'renders', unit: 'render', included: 50 }],
    expensive_operations: ['renders'],
    setup_range: { low: 1000, high: 2200 },
    monthly_range: { low: 399, high: 699 },
    included_usage: { renders: 50 },
    compatibility: { native_channels: ['web_form'], native_media: ['image'], requires: ['image_tryon'] },
    intent_tags: ['styling', 'try_on'],
  },
];

/**
 * PricingRates — every commercial number lives here.
 * Change these WITHOUT editing engine.mjs.
 */
export const PricingRates = {
  channel_fee_monthly: 29, // 2nd+ channel each

  // Only these integration keys are "known". Anything else -> Custom.
  integration: {
    crm: { setup: 300, monthly: 0 },
    calendar: { setup: 200, monthly: 0 },
    ats: { setup: 250, monthly: 0 },
    api: { setup: 200, monthly: 0 }, // generic documented API/webhook
  },

  knowledge_base: {
    small: { setup: 200, monthly: 0 },
    large: { setup: 500, monthly: 49 },
  },

  // Standard is $0 (already inside BASE.monthly). Only the DELTA is added.
  support_tiers: {
    standard: { monthly: 0, custom: false },
    priority: { monthly: 149, custom: false },
    managed: { monthly: 399, custom: false },
    enterprise: { monthly: 0, custom: true }, // SLA -> Custom
  },

  // Customer-facing metered rates (provider cost + margin already embedded).
  // Raw provider API cost is NEVER added on top of these.
  usage_rates: {
    conversations: 0.05,
    messages: 0.02,
    tickets: 0.50,
    applications: 0.75,
    content_ideas: 0.50,
    voice_minutes: 0.10,
    web_searches: 0.05,
    images: 0.20,
    audio_minutes: 0.60,
    renders: 0.25,
    reports: 3.00,
    video_credits: 1.00, // per extra credit
  },

  // Vera / video credit model (kept OUT of flat usage).
  media: {
    video_credit_package: { monthly: 150, credits_included: 150 },
    extra_video_credit: 1.00,
    top_credit_package_cap: 2000, // above this -> Custom (individual contract)
  },

  bundle_discounts: { 2: 0.10, 3: 0.15 }, // applied to BASE only

  floors: { setup: 249, monthly: 49 },

  // Beyond this multiple of included, config exceeds standard packages -> Custom.
  max_standard_usage_multiple: 20,

  // Guardrail: warn if estimated metered monthly exceeds this ratio of base monthly.
  soft_cap_ratio: 0.5,

  band: 0.15, // +/- band around the complexity-positioned point for ranges
};

export const DISCLAIMER =
  'Estimated only. Included usage and metered rates are indicative. ' +
  'A precise commercial quote is produced after a conversation.';
