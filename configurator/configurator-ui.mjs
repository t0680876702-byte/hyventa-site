/**
 * HYVENTA CONFIGURATOR — UI PROTOTYPE (presentation only)
 * ------------------------------------------------------------------
 * This module contains NO pricing / calculation logic. It only:
 *   1. maps the wizard selections to a ClientInput object
 *   2. calls the engine's buildEstimate()
 *   3. renders a clean, customer-facing result
 *
 * All money/complexity/Custom decisions come from engine.mjs.
 * Data (AGENTS + matchAgents) is imported READ-ONLY to know which
 * usage metrics a matched agent has — this is not calculation logic.
 */

import { buildEstimate, matchAgents } from './engine.mjs';

// ---------- Agent-creation request (STEP 17B) ----------
// n8n webhook that receives a configured-agent creation request, builds a TXT
// brief and emails it to the Hyventa owner. CONFIGURATION VALUE — points at the
// live "Agent Creation Request" webhook workflow. Update here if the path changes.
const AGENT_REQUEST_WEBHOOK_URL = 'https://achalex.app.n8n.cloud/webhook/agent-creation-request';

// English labels for the owner-facing brief (the operator reads one language;
// the visitor still sees fully localized UI). No pricing is computed here.
const REQ_TASK_LABEL_EN = { sales: 'Sales', support: 'Customer support', booking: 'Booking / reservations', lead_qualification: 'Lead qualification', recruiting: 'Recruiting', marketing: 'Marketing', translation: 'Translation', knowledge: 'Knowledge / FAQ', analysis: 'Business analysis', image: 'Images / design', audio: 'Audio', video: 'Video' };
const REQ_CHANNEL_LABEL_EN = { web_chat: 'Website / Web chat', web_form: 'Website form', telegram: 'Telegram', webhook: 'Connect another system', internal: 'For your team' };
const REQ_INTEGRATION_LABEL_EN = { crm: 'CRM', calendar: 'Calendar', ats: 'Recruiting system (ATS)', api: 'Connect another system' };

// ---------- i18n bridge (presentation only, engine stays language-neutral) ----------
// All customer-facing configurator text lives here in the UI layer. The engine
// and pricing-config remain language-neutral; nothing here changes pricing.
export const CFG_I18N = {
  en: {
    kicker: 'Configure your team', title: 'Build your AI team',
    intro: "Answer a few quick questions and we'll recommend the right AI employee(s) with a transparent estimate.",
    s1_h: 'What does your business do?', s1_ph: 'Passenger transportation in Europe',
    s2_h: 'What do you need?', s2_hint: 'Tell us what you want your AI employee to do. Pick everything that applies.',
    in_sales: 'Sales', in_support: 'Customer support', in_booking: 'Booking / reservations', in_lead: 'Lead qualification',
    in_recruit: 'Recruiting', in_marketing: 'Marketing', in_translation: 'Translation', in_knowledge: 'Knowledge / FAQ',
    in_analysis: 'Business analysis', in_image: 'Images / design', in_audio: 'Audio', in_video: 'Video',
    s3_h: 'Where should it work?', s3_hint: 'Additional channels may affect the monthly price.',
    ch_webchat: 'Website / Web chat', ch_webform: 'Website form', ch_telegram: 'Telegram', ch_webhook: 'Connect another system', ch_internal: 'For your team',
    s4_h: 'How much do you expect to use it?', s4_hint: 'A rough level is enough \u2014 you can fine-tune later.',
    u_low: 'Low', u_normal: 'Normal', u_high: 'High', u_exact: 'Enter exact volume',
    s4_exact_hint: 'Use an exact number if you know your expected monthly volume.', s4_exact_ph: 'e.g. 1500',
    s5_h: 'Anything else?', s5_hint: 'All optional \u2014 open a section only if it applies to you.',
    s5_d1: 'Knowledge & integrations', s5_kb: 'Answer from our knowledge base', s5_kb_small: 'Small knowledge base', s5_kb_large: 'Large knowledge base',
    s5_int: 'Integrations', int_crm: 'CRM', int_calendar: 'Calendar', int_ats: 'Recruiting system (ATS)', int_api: 'Connect another system', s5_other_ph: 'Other integration (e.g. our ERP)',
    s5_d2: 'Media & support', s5_media: 'Media', m_image: 'Images', m_audio: 'Audio', m_video: 'Video',
    s5_trans: 'Translation / multiple languages', s5_support: 'Support level',
    sup_standard: 'Standard', sup_priority: 'Priority', sup_managed: 'Managed', sup_enterprise: 'Enterprise / SLA',
    submit: 'See my estimate', see_plans: 'See standard plans',
    match_one: 'Potential match:', match_many: 'Potential matches:',
    rec_one: 'Recommended AI employee', rec_team: 'Recommended AI team',
    setup_label: 'Estimated setup', setup_note: 'one-time', monthly_label: 'Estimated monthly', monthly_note: 'per month',
    add_usage: 'Additional usage', add_usage_note: 'Only charged if you go beyond the generous included allowance.',
    video_prod: 'Video production', video_pkg: 'Video credit package', credits_included: '{n} credits included',
    video_extra: 'Estimated extra video credits', video_none: 'none at this level',
    video_note: 'Extra video credits are billed separately from your monthly plan.',
    bundle: 'Team bundle: {pct}% off the base plan for {n} AI employees.',
    cta: 'Talk to Hyventa',
    disclaimer: 'Estimates are indicative and depend on your final configuration and usage. Final pricing is confirmed with Hyventa.',
    plan_relation: 'Estimated monthly cost for your configuration. The final price depends on the selected AI employee and configuration and is confirmed before payment.',
    custom_badge: 'Custom configuration', custom_h: 'Your requirements need a custom configuration.',
    custom_p: "We'll review the setup and prepare a tailored quote.", custom_team: 'Likely part of your team:',
    empty_h: "Let's find the right fit", empty_p: "Tell us a bit more about what you need and we'll match an AI employee for you.",
    ml_conversations: 'conversations', ml_messages: 'messages', ml_tickets: 'support tickets', ml_applications: 'applications',
    ml_content_ideas: 'content ideas', ml_voice_minutes: 'voice minutes', ml_web_searches: 'web searches', ml_images: 'images',
    ml_audio_minutes: 'audio minutes', ml_renders: 'try-on renders', ml_reports: 'reports', ml_video_credits: 'video credits',
  },
  es: {
    kicker: 'Configura tu equipo', title: 'Crea tu equipo de IA',
    intro: 'Responde unas preguntas r\u00e1pidas y te recomendaremos el/los empleado(s) de IA adecuados con una estimaci\u00f3n transparente.',
    s1_h: '\u00bfA qu\u00e9 se dedica tu negocio?', s1_ph: 'Transporte de pasajeros en Europa',
    s2_h: '\u00bfQu\u00e9 necesitas?', s2_hint: 'Dinos qu\u00e9 quieres que haga tu empleado de IA. Elige todo lo que corresponda.',
    in_sales: 'Ventas', in_support: 'Atenci\u00f3n al cliente', in_booking: 'Reservas', in_lead: 'Calificaci\u00f3n de leads',
    in_recruit: 'Reclutamiento', in_marketing: 'Marketing', in_translation: 'Traducci\u00f3n', in_knowledge: 'Conocimiento / FAQ',
    in_analysis: 'An\u00e1lisis de negocio', in_image: 'Im\u00e1genes / dise\u00f1o', in_audio: 'Audio', in_video: 'V\u00eddeo',
    s3_h: '\u00bfD\u00f3nde debe trabajar?', s3_hint: 'Los canales adicionales pueden afectar el precio mensual.',
    ch_webchat: 'Sitio web / Chat web', ch_webform: 'Formulario web', ch_telegram: 'Telegram', ch_webhook: 'Conectar otro sistema', ch_internal: 'Para tu equipo',
    s4_h: '\u00bfCu\u00e1nto esperas usarlo?', s4_hint: 'Un nivel aproximado es suficiente: puedes ajustarlo despu\u00e9s.',
    u_low: 'Bajo', u_normal: 'Normal', u_high: 'Alto', u_exact: 'Introducir volumen exacto',
    s4_exact_hint: 'Usa un n\u00famero exacto si conoces tu volumen mensual estimado.', s4_exact_ph: 'p. ej. 1500',
    s5_h: '\u00bfAlgo m\u00e1s?', s5_hint: 'Todo opcional: abre una secci\u00f3n solo si te aplica.',
    s5_d1: 'Conocimiento e integraciones', s5_kb: 'Responder desde nuestra base de conocimiento', s5_kb_small: 'Base de conocimiento peque\u00f1a', s5_kb_large: 'Base de conocimiento grande',
    s5_int: 'Integraciones', int_crm: 'CRM', int_calendar: 'Calendario', int_ats: 'Sistema de reclutamiento (ATS)', int_api: 'Conectar otro sistema', s5_other_ph: 'Otra integraci\u00f3n (p. ej. nuestro ERP)',
    s5_d2: 'Medios y soporte', s5_media: 'Medios', m_image: 'Im\u00e1genes', m_audio: 'Audio', m_video: 'V\u00eddeo',
    s5_trans: 'Traducci\u00f3n / varios idiomas', s5_support: 'Nivel de soporte',
    sup_standard: 'Est\u00e1ndar', sup_priority: 'Prioritario', sup_managed: 'Gestionado', sup_enterprise: 'Empresa / SLA',
    submit: 'Ver mi estimaci\u00f3n', see_plans: 'Ver planes est\u00e1ndar',
    match_one: 'Coincidencia potencial:', match_many: 'Coincidencias potenciales:',
    rec_one: 'Empleado de IA recomendado', rec_team: 'Equipo de IA recomendado',
    setup_label: 'Configuraci\u00f3n estimada', setup_note: 'pago \u00fanico', monthly_label: 'Mensual estimado', monthly_note: 'al mes',
    add_usage: 'Uso adicional', add_usage_note: 'Solo se cobra si superas la generosa cuota incluida.',
    video_prod: 'Producci\u00f3n de v\u00eddeo', video_pkg: 'Paquete de cr\u00e9ditos de v\u00eddeo', credits_included: '{n} cr\u00e9ditos incluidos',
    video_extra: 'Cr\u00e9ditos de v\u00eddeo extra estimados', video_none: 'ninguno en este nivel',
    video_note: 'Los cr\u00e9ditos de v\u00eddeo extra se facturan aparte de tu plan mensual.',
    bundle: 'Paquete de equipo: {pct}% de descuento en el plan base para {n} empleados de IA.',
    cta: 'Habla con Hyventa',
    disclaimer: 'Las estimaciones son indicativas y dependen de tu configuraci\u00f3n y uso finales. El precio final se confirma con Hyventa.',
    plan_relation: 'Coste mensual estimado para tu configuraci\u00f3n. El precio final depende del empleado de IA seleccionado y de la configuraci\u00f3n, y se confirma antes del pago.',
    custom_badge: 'Configuraci\u00f3n personalizada', custom_h: 'Tus requisitos necesitan una configuraci\u00f3n personalizada.',
    custom_p: 'Revisaremos la configuraci\u00f3n y prepararemos un presupuesto a medida.', custom_team: 'Probablemente parte de tu equipo:',
    empty_h: 'Encontremos la opci\u00f3n adecuada', empty_p: 'Cu\u00e9ntanos un poco m\u00e1s sobre lo que necesitas y te asignaremos un empleado de IA.',
    ml_conversations: 'conversaciones', ml_messages: 'mensajes', ml_tickets: 'tickets de soporte', ml_applications: 'solicitudes',
    ml_content_ideas: 'ideas de contenido', ml_voice_minutes: 'minutos de voz', ml_web_searches: 'b\u00fasquedas web', ml_images: 'im\u00e1genes',
    ml_audio_minutes: 'minutos de audio', ml_renders: 'renders de prueba', ml_reports: 'informes', ml_video_credits: 'cr\u00e9ditos de v\u00eddeo',
  },
  uk: {
    kicker: '\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0439\u0442\u0435 \u0441\u0432\u043e\u044e \u043a\u043e\u043c\u0430\u043d\u0434\u0443', title: '\u0421\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u0441\u0432\u043e\u044e AI-\u043a\u043e\u043c\u0430\u043d\u0434\u0443',
    intro: '\u0414\u0430\u0439\u0442\u0435 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c \u043d\u0430 \u043a\u0456\u043b\u044c\u043a\u0430 \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0445 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u044c, \u0456 \u043c\u0438 \u043f\u043e\u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0454\u043c\u043e \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e\u0433\u043e AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a\u0430 \u0437 \u043f\u0440\u043e\u0437\u043e\u0440\u043e\u044e \u043e\u0446\u0456\u043d\u043a\u043e\u044e \u0432\u0430\u0440\u0442\u043e\u0441\u0442\u0456.',
    s1_h: '\u0427\u0438\u043c \u0437\u0430\u0439\u043c\u0430\u0454\u0442\u044c\u0441\u044f \u0432\u0430\u0448 \u0431\u0456\u0437\u043d\u0435\u0441?', s1_ph: '\u041f\u0430\u0441\u0430\u0436\u0438\u0440\u0441\u044c\u043a\u0456 \u043f\u0435\u0440\u0435\u0432\u0435\u0437\u0435\u043d\u043d\u044f \u0432 \u0404\u0432\u0440\u043e\u043f\u0456',
    s2_h: '\u0429\u043e \u0432\u0430\u043c \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e?', s2_hint: '\u0420\u043e\u0437\u043a\u0430\u0436\u0456\u0442\u044c, \u0449\u043e \u043c\u0430\u0454 \u0440\u043e\u0431\u0438\u0442\u0438 \u0432\u0430\u0448 AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a. \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0443\u0441\u0435, \u0449\u043e \u043f\u0456\u0434\u0445\u043e\u0434\u0438\u0442\u044c.',
    in_sales: '\u041f\u0440\u043e\u0434\u0430\u0436\u0456', in_support: '\u041f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0430 \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432', in_booking: '\u0411\u0440\u043e\u043d\u044e\u0432\u0430\u043d\u043d\u044f', in_lead: '\u041a\u0432\u0430\u043b\u0456\u0444\u0456\u043a\u0430\u0446\u0456\u044f \u043b\u0456\u0434\u0456\u0432',
    in_recruit: '\u0420\u0435\u043a\u0440\u0443\u0442\u0438\u043d\u0433', in_marketing: '\u041c\u0430\u0440\u043a\u0435\u0442\u0438\u043d\u0433', in_translation: '\u041f\u0435\u0440\u0435\u043a\u043b\u0430\u0434', in_knowledge: '\u0411\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u044c / FAQ',
    in_analysis: '\u0411\u0456\u0437\u043d\u0435\u0441-\u0430\u043d\u0430\u043b\u0456\u0437', in_image: '\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f / \u0434\u0438\u0437\u0430\u0439\u043d', in_audio: '\u0410\u0443\u0434\u0456\u043e', in_video: '\u0412\u0456\u0434\u0435\u043e',
    s3_h: '\u0414\u0435 \u0432\u0456\u043d \u043c\u0430\u0454 \u043f\u0440\u0430\u0446\u044e\u0432\u0430\u0442\u0438?', s3_hint: '\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456 \u043a\u0430\u043d\u0430\u043b\u0438 \u043c\u043e\u0436\u0443\u0442\u044c \u0432\u043f\u043b\u0438\u043d\u0443\u0442\u0438 \u043d\u0430 \u0449\u043e\u043c\u0456\u0441\u044f\u0447\u043d\u0443 \u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044c.',
    ch_webchat: '\u0421\u0430\u0439\u0442 / \u0412\u0435\u0431-\u0447\u0430\u0442', ch_webform: '\u0412\u0435\u0431-\u0444\u043e\u0440\u043c\u0430', ch_telegram: 'Telegram', ch_webhook: '\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0438 \u0456\u043d\u0448\u0443 \u0441\u0438\u0441\u0442\u0435\u043c\u0443', ch_internal: '\u0414\u043b\u044f \u0432\u0430\u0448\u043e\u0457 \u043a\u043e\u043c\u0430\u043d\u0434\u0438',
    s4_h: '\u041d\u0430\u0441\u043a\u0456\u043b\u044c\u043a\u0438 \u0430\u043a\u0442\u0438\u0432\u043d\u043e \u043f\u043b\u0430\u043d\u0443\u0454\u0442\u0435 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0442\u0438\u0441\u044f?', s4_hint: '\u0414\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e \u043f\u0440\u0438\u0431\u043b\u0438\u0437\u043d\u043e\u0433\u043e \u0440\u0456\u0432\u043d\u044f \u2014 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u0438 \u043c\u043e\u0436\u043d\u0430 \u043f\u0456\u0437\u043d\u0456\u0448\u0435.',
    u_low: '\u041d\u0438\u0437\u044c\u043a\u0438\u0439', u_normal: '\u0421\u0435\u0440\u0435\u0434\u043d\u0456\u0439', u_high: '\u0412\u0438\u0441\u043e\u043a\u0438\u0439', u_exact: '\u0412\u0432\u0435\u0441\u0442\u0438 \u0442\u043e\u0447\u043d\u0438\u0439 \u043e\u0431\u0441\u044f\u0433',
    s4_exact_hint: '\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0442\u043e\u0447\u043d\u0435 \u0447\u0438\u0441\u043b\u043e, \u044f\u043a\u0449\u043e \u0437\u043d\u0430\u0454\u0442\u0435 \u043e\u0447\u0456\u043a\u0443\u0432\u0430\u043d\u0438\u0439 \u043c\u0456\u0441\u044f\u0447\u043d\u0438\u0439 \u043e\u0431\u0441\u044f\u0433.', s4_exact_ph: '\u043d\u0430\u043f\u0440. 1500',
    s5_h: '\u0429\u043e\u0441\u044c \u0456\u0449\u0435?', s5_hint: '\u0423\u0441\u0435 \u043d\u0435\u043e\u0431\u043e\u0432\u02bf\u044f\u0437\u043a\u043e\u0432\u0435 \u2014 \u0432\u0456\u0434\u043a\u0440\u0438\u0432\u0430\u0439\u0442\u0435 \u0440\u043e\u0437\u0434\u0456\u043b, \u043b\u0438\u0448\u0435 \u044f\u043a\u0449\u043e \u0446\u0435 \u0441\u0442\u043e\u0441\u0443\u0454\u0442\u044c\u0441\u044f \u0432\u0430\u0441.',
    s5_d1: '\u0417\u043d\u0430\u043d\u043d\u044f \u0442\u0430 \u0456\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0456\u0457', s5_kb: '\u0412\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u0442\u0438 \u0437 \u043d\u0430\u0448\u043e\u0457 \u0431\u0430\u0437\u0438 \u0437\u043d\u0430\u043d\u044c', s5_kb_small: '\u041d\u0435\u0432\u0435\u043b\u0438\u043a\u0430 \u0431\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u044c', s5_kb_large: '\u0412\u0435\u043b\u0438\u043a\u0430 \u0431\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u044c',
    s5_int: '\u0406\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0456\u0457', int_crm: 'CRM', int_calendar: '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440', int_ats: '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0440\u0435\u043a\u0440\u0443\u0442\u0438\u043d\u0433\u0443 (ATS)', int_api: '\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0438 \u0456\u043d\u0448\u0443 \u0441\u0438\u0441\u0442\u0435\u043c\u0443', s5_other_ph: '\u0406\u043d\u0448\u0430 \u0456\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0456\u044f (\u043d\u0430\u043f\u0440. \u043d\u0430\u0448 ERP)',
    s5_d2: '\u041c\u0435\u0434\u0456\u0430 \u0442\u0430 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0430', s5_media: '\u041c\u0435\u0434\u0456\u0430', m_image: '\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f', m_audio: '\u0410\u0443\u0434\u0456\u043e', m_video: '\u0412\u0456\u0434\u0435\u043e',
    s5_trans: '\u041f\u0435\u0440\u0435\u043a\u043b\u0430\u0434 / \u043a\u0456\u043b\u044c\u043a\u0430 \u043c\u043e\u0432', s5_support: '\u0420\u0456\u0432\u0435\u043d\u044c \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0438',
    sup_standard: '\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u0438\u0439', sup_priority: '\u041f\u0440\u0456\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0438\u0439', sup_managed: '\u041a\u0435\u0440\u043e\u0432\u0430\u043d\u0438\u0439', sup_enterprise: 'Enterprise / SLA',
    submit: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0438 \u043e\u0446\u0456\u043d\u043a\u0443', see_plans: '\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0443\u0442\u0438 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u0456 \u0442\u0430\u0440\u0438\u0444\u0438',
    match_one: '\u041c\u043e\u0436\u043b\u0438\u0432\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043d\u0442:', match_many: '\u041c\u043e\u0436\u043b\u0438\u0432\u0456 \u0432\u0430\u0440\u0456\u0430\u043d\u0442\u0438:',
    rec_one: '\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0438\u0439 AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a', rec_team: '\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0430 AI-\u043a\u043e\u043c\u0430\u043d\u0434\u0430',
    setup_label: '\u041e\u0440\u0456\u0454\u043d\u0442\u043e\u0432\u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f', setup_note: '\u043e\u0434\u043d\u043e\u0440\u0430\u0437\u043e\u0432\u043e', monthly_label: '\u041e\u0440\u0456\u0454\u043d\u0442\u043e\u0432\u043d\u043e \u0449\u043e\u043c\u0456\u0441\u044f\u0446\u044f', monthly_note: '\u043d\u0430 \u043c\u0456\u0441\u044f\u0446\u044c',
    add_usage: '\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0435 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u043d\u044f', add_usage_note: '\u0421\u0442\u044f\u0433\u0443\u0454\u0442\u044c\u0441\u044f \u043b\u0438\u0448\u0435 \u0437\u0430 \u043f\u0435\u0440\u0435\u0432\u0438\u0449\u0435\u043d\u043d\u044f \u0449\u0435\u0434\u0440\u043e\u0433\u043e \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e\u0433\u043e \u043b\u0456\u043c\u0456\u0442\u0443.',
    video_prod: '\u0412\u0438\u0440\u043e\u0431\u043d\u0438\u0446\u0442\u0432\u043e \u0432\u0456\u0434\u0435\u043e', video_pkg: '\u041f\u0430\u043a\u0435\u0442 \u0432\u0456\u0434\u0435\u043e\u043a\u0440\u0435\u0434\u0438\u0442\u0456\u0432', credits_included: '{n} \u043a\u0440\u0435\u0434\u0438\u0442\u0456\u0432 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e',
    video_extra: '\u041e\u0440\u0456\u0454\u043d\u0442\u043e\u0432\u043d\u0456 \u0434\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456 \u0432\u0456\u0434\u0435\u043e\u043a\u0440\u0435\u0434\u0438\u0442\u0438', video_none: '\u043d\u0435\u043c\u0430\u0454 \u043d\u0430 \u0446\u044c\u043e\u043c\u0443 \u0440\u0456\u0432\u043d\u0456',
    video_note: '\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456 \u0432\u0456\u0434\u0435\u043e\u043a\u0440\u0435\u0434\u0438\u0442\u0438 \u043e\u043f\u043b\u0430\u0447\u0443\u044e\u0442\u044c\u0441\u044f \u043e\u043a\u0440\u0435\u043c\u043e \u0432\u0456\u0434 \u0449\u043e\u043c\u0456\u0441\u044f\u0447\u043d\u043e\u0433\u043e \u043f\u043b\u0430\u043d\u0443.',
    bundle: '\u041a\u043e\u043c\u0430\u043d\u0434\u043d\u0438\u0439 \u043f\u0430\u043a\u0435\u0442: \u0437\u043d\u0438\u0436\u043a\u0430 {pct}% \u043d\u0430 \u0431\u0430\u0437\u043e\u0432\u0438\u0439 \u043f\u043b\u0430\u043d \u0434\u043b\u044f {n} AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a\u0456\u0432.',
    cta: '\u0417\u0432\u02bf\u044f\u0437\u0430\u0442\u0438\u0441\u044f \u0437 Hyventa',
    disclaimer: '\u041e\u0446\u0456\u043d\u043a\u0438 \u0454 \u043e\u0440\u0456\u0454\u043d\u0442\u043e\u0432\u043d\u0438\u043c\u0438 \u0442\u0430 \u0437\u0430\u043b\u0435\u0436\u0430\u0442\u044c \u0432\u0456\u0434 \u0432\u0430\u0448\u043e\u0457 \u0444\u0456\u043d\u0430\u043b\u044c\u043d\u043e\u0457 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u0457 \u0442\u0430 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u043d\u044f. \u0424\u0456\u043d\u0430\u043b\u044c\u043d\u0430 \u0446\u0456\u043d\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0454\u0442\u044c\u0441\u044f \u0437 Hyventa.',
    plan_relation: '\u041e\u0440\u0456\u0454\u043d\u0442\u043e\u0432\u043d\u0430 \u0449\u043e\u043c\u0456\u0441\u044f\u0447\u043d\u0430 \u0432\u0430\u0440\u0442\u0456\u0441\u0442\u044c \u0434\u043b\u044f \u0432\u0430\u0448\u043e\u0457 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u0457. \u0422\u043e\u0447\u043d\u0430 \u0446\u0456\u043d\u0430 \u0437\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434 \u043e\u0431\u0440\u0430\u043d\u043e\u0433\u043e AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a\u0430 \u0442\u0430 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u044c \u0456 \u0431\u0443\u0434\u0435 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u0430 \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u044e.',
    custom_badge: '\u0406\u043d\u0434\u0438\u0432\u0456\u0434\u0443\u0430\u043b\u044c\u043d\u0430 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u044f', custom_h: '\u0412\u0430\u0448\u0456 \u0432\u0438\u043c\u043e\u0433\u0438 \u043f\u043e\u0442\u0440\u0435\u0431\u0443\u044e\u0442\u044c \u0456\u043d\u0434\u0438\u0432\u0456\u0434\u0443\u0430\u043b\u044c\u043d\u043e\u0457 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u0457.',
    custom_p: '\u041c\u0438 \u0440\u043e\u0437\u0433\u043b\u044f\u043d\u0435\u043c\u043e \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u043f\u0456\u0434\u0433\u043e\u0442\u0443\u0454\u043c\u043e \u0456\u043d\u0434\u0438\u0432\u0456\u0434\u0443\u0430\u043b\u044c\u043d\u0443 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044e.', custom_team: '\u0419\u043c\u043e\u0432\u0456\u0440\u043d\u043e, \u0447\u0430\u0441\u0442\u0438\u043d\u0430 \u0432\u0430\u0448\u043e\u0457 \u043a\u043e\u043c\u0430\u043d\u0434\u0438:',
    empty_h: '\u0417\u043d\u0430\u0439\u0434\u0456\u043c\u043e \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0438\u0439 \u0432\u0430\u0440\u0456\u0430\u043d\u0442', empty_p: '\u0420\u043e\u0437\u043a\u0430\u0436\u0456\u0442\u044c \u0442\u0440\u043e\u0445\u0438 \u0431\u0456\u043b\u044c\u0448\u0435 \u043f\u0440\u043e \u0432\u0430\u0448\u0456 \u043f\u043e\u0442\u0440\u0435\u0431\u0438, \u0456 \u043c\u0438 \u043f\u0456\u0434\u0431\u0435\u0440\u0435\u043c\u043e AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a\u0430.',
    ml_conversations: '\u0440\u043e\u0437\u043c\u043e\u0432\u0438', ml_messages: '\u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f', ml_tickets: '\u0437\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0432 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0443', ml_applications: '\u0437\u0430\u044f\u0432\u043a\u0438',
    ml_content_ideas: '\u0456\u0434\u0435\u0457 \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0443', ml_voice_minutes: '\u0445\u0432\u0438\u043b\u0438\u043d\u0438 \u0433\u043e\u043b\u043e\u0441\u0443', ml_web_searches: '\u0432\u0435\u0431-\u043f\u043e\u0448\u0443\u043a\u0438', ml_images: '\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f',
    ml_audio_minutes: '\u0445\u0432\u0438\u043b\u0438\u043d\u0438 \u0430\u0443\u0434\u0456\u043e', ml_renders: '\u0440\u0435\u043d\u0434\u0435\u0440\u0438 \u043f\u0440\u0438\u043c\u0456\u0440\u043a\u0438', ml_reports: '\u0437\u0432\u0456\u0442\u0438', ml_video_credits: '\u0432\u0456\u0434\u0435\u043e\u043a\u0440\u0435\u0434\u0438\u0442\u0438',
  },
};

// ---------- Agent-creation request strings (merged into CFG_I18N) ----------
const REQ_I18N = {
  en: {
    req_cta: 'Request Agent Creation',
    req_title: 'Request Agent Creation',
    req_for: 'For',
    req_name: 'Name',
    req_email: 'Email',
    req_note: 'Additional note (optional)',
    req_submit: 'Request Agent Creation',
    req_sending: 'Sending\u2026',
    req_close: 'Close',
    req_success: "Your agent creation request has been sent.\nWe'll review your configuration and contact you to confirm the details.",
    req_err_name: 'Please enter your name.',
    req_err_email: 'Please enter a valid email address.',
    req_err_generic: "We couldn't send your request. Please try again in a moment or contact us directly.",
    req_fail: "Your request could not be submitted automatically. Please email us at hellohyventa@gmail.com and include your business details. Hyventa will review your request and confirm the final price before payment.",
  },
  es: {
    req_cta: 'Solicitar creaci\u00f3n del agente',
    req_title: 'Solicitar creaci\u00f3n del agente',
    req_for: 'Para',
    req_name: 'Nombre',
    req_email: 'Correo electr\u00f3nico',
    req_note: 'Nota adicional (opcional)',
    req_submit: 'Solicitar creaci\u00f3n del agente',
    req_sending: 'Enviando\u2026',
    req_close: 'Cerrar',
    req_success: 'Tu solicitud de creaci\u00f3n del agente ha sido enviada.\nRevisaremos tu configuraci\u00f3n y nos pondremos en contacto contigo para confirmar los detalles.',
    req_err_name: 'Introduce tu nombre.',
    req_err_email: 'Introduce un correo electr\u00f3nico v\u00e1lido.',
    req_err_generic: 'No pudimos enviar tu solicitud. Int\u00e9ntalo de nuevo en un momento o cont\u00e1ctanos directamente.',
    req_fail: 'No pudimos enviar tu solicitud autom\u00e1ticamente. Escr\u00edbenos a hellohyventa@gmail.com e incluye los datos de tu negocio. Hyventa revisar\u00e1 tu solicitud y confirmar\u00e1 el precio final antes del pago.',
  },
  uk: {
    req_cta: '\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0430\u0433\u0435\u043d\u0442\u0430',
    req_title: '\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0430\u0433\u0435\u043d\u0442\u0430',
    req_for: '\u0414\u043b\u044f',
    req_name: "\u0406\u043c'\u044f",
    req_email: 'Email',
    req_note: '\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0430 \u043f\u0440\u0438\u043c\u0456\u0442\u043a\u0430 (\u043d\u0435\u043e\u0431\u043e\u0432\u02bf\u044f\u0437\u043a\u043e\u0432\u043e)',
    req_submit: '\u041d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0430 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0430\u0433\u0435\u043d\u0442\u0430',
    req_sending: '\u041d\u0430\u0434\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u2026',
    req_close: '\u0417\u0430\u043a\u0440\u0438\u0442\u0438',
    req_success: '\u0412\u0430\u0448\u0443 \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0430 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0430\u0433\u0435\u043d\u0442\u0430 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u043d\u043e.\n\u041c\u0438 \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0435\u043c\u043e \u0432\u0430\u0448\u0443 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u044e \u0442\u0430 \u0437\u0432\u02bf\u044f\u0436\u0435\u043c\u043e\u0441\u044f \u0437 \u0432\u0430\u043c\u0438 \u0434\u043b\u044f \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u043d\u044f \u0434\u0435\u0442\u0430\u043b\u0435\u0439.',
    req_err_name: "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0432\u0430\u0448\u0435 \u0456\u043c'\u044f.",
    req_err_email: '\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0443 \u0430\u0434\u0440\u0435\u0441\u0443 email.',
    req_err_generic: '\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438 \u0437\u0430\u044f\u0432\u043a\u0443. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0430\u0431\u043e \u0437\u0432\u02bf\u044f\u0436\u0456\u0442\u044c\u0441\u044f \u0437 \u043d\u0430\u043c\u0438 \u043d\u0430\u043f\u0440\u044f\u043c\u0443.',
    req_fail: '\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438 \u0432\u0430\u0448\u0443 \u0437\u0430\u044f\u0432\u043a\u0443 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e. \u041d\u0430\u043f\u0438\u0448\u0456\u0442\u044c \u043d\u0430\u043c \u043d\u0430 hellohyventa@gmail.com \u0456 \u0432\u043a\u0430\u0436\u0456\u0442\u044c \u0434\u0430\u043d\u0456 \u0432\u0430\u0448\u043e\u0433\u043e \u0431\u0456\u0437\u043d\u0435\u0441\u0443. Hyventa \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0435 \u0432\u0430\u0448\u0443 \u0437\u0430\u044f\u0432\u043a\u0443 \u0442\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u0443 \u0446\u0456\u043d\u0443 \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u044e.',
  },
};
for (const _l of Object.keys(REQ_I18N)) { if (CFG_I18N[_l]) Object.assign(CFG_I18N[_l], REQ_I18N[_l]); }

// ---------- client-preparation strings ("What we need from you", STEP 22G v2) ----------
// Shown in the CONFIGURATOR flow only (after the estimate/recommendation, before
// "Request Agent Creation"). Describes what the client must PROVIDE to Hyventa.
// No technical/implementation details are ever exposed to the visitor.
const PREP_I18N = {
  en: {
    prep_h: 'What we need from you',
    prep_sub: 'Before we start building your AI employee, please prepare the information and access needed for your selected setup.',
    prep_business_t: 'Business information',
    prep_access_t: 'Access',
    prep_calendar: 'Access to your calendar',
    prep_crm: 'Access to your CRM',
    prep_ats: 'Access to your recruiting system',
    prep_system: 'Access to the selected system',
    prep_none: "Nothing to prepare in advance \u2014 just send your request and we'll set everything up together.",
    prep_ack: 'I understand that I will need to provide the required information and access before implementation.',
    prep_ack_err: 'Please confirm you can provide the required information and access before we start.',
  },
  es: {
    prep_h: 'Qu\u00e9 necesitamos de ti',
    prep_sub: 'Antes de empezar a crear tu empleado de IA, prepara la informaci\u00f3n y los accesos necesarios para la configuraci\u00f3n seleccionada.',
    prep_business_t: 'Informaci\u00f3n del negocio',
    prep_access_t: 'Accesos',
    prep_calendar: 'Acceso a tu calendario',
    prep_crm: 'Acceso a tu CRM',
    prep_ats: 'Acceso a tu sistema de reclutamiento',
    prep_system: 'Acceso al sistema seleccionado',
    prep_none: 'No hay nada que preparar de antemano: solo env\u00eda tu solicitud y lo configuramos todo juntos.',
    prep_ack: 'Entiendo que tendr\u00e9 que proporcionar la informaci\u00f3n y los accesos necesarios antes de la implementaci\u00f3n.',
    prep_ack_err: 'Confirma que puedes proporcionar la informaci\u00f3n y los accesos necesarios antes de empezar.',
  },
  uk: {
    prep_h: '\u0429\u043e \u043d\u0430\u043c \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0432\u0456\u0434 \u0432\u0430\u0441',
    prep_sub: '\u041f\u0435\u0440\u0448 \u043d\u0456\u0436 \u043c\u0438 \u043f\u043e\u0447\u043d\u0435\u043c\u043e \u0441\u0442\u0432\u043e\u0440\u044e\u0432\u0430\u0442\u0438 \u0432\u0430\u0448\u043e\u0433\u043e AI-\u0441\u043f\u0456\u0432\u0440\u043e\u0431\u0456\u0442\u043d\u0438\u043a\u0430, \u043f\u0456\u0434\u0433\u043e\u0442\u0443\u0439\u0442\u0435 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0438, \u043d\u0435\u043e\u0431\u0445\u0456\u0434\u043d\u0456 \u0434\u043b\u044f \u043e\u0431\u0440\u0430\u043d\u043e\u0457 \u043a\u043e\u043d\u0444\u0456\u0433\u0443\u0440\u0430\u0446\u0456\u0457.',
    prep_business_t: '\u0406\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f \u043f\u0440\u043e \u0431\u0456\u0437\u043d\u0435\u0441',
    prep_access_t: '\u0414\u043e\u0441\u0442\u0443\u043f\u0438',
    prep_calendar: '\u0414\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u0432\u0430\u0448\u043e\u0433\u043e \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f',
    prep_crm: '\u0414\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u0432\u0430\u0448\u043e\u0433\u043e CRM',
    prep_ats: '\u0414\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u0432\u0430\u0448\u043e\u0457 \u0441\u0438\u0441\u0442\u0435\u043c\u0438 \u0440\u0435\u043a\u0440\u0443\u0442\u0438\u043d\u0433\u0443',
    prep_system: '\u0414\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u043e\u0431\u0440\u0430\u043d\u043e\u0457 \u0441\u0438\u0441\u0442\u0435\u043c\u0438',
    prep_none: '\u041d\u0456\u0447\u043e\u0433\u043e \u0433\u043e\u0442\u0443\u0432\u0430\u0442\u0438 \u0437\u0430\u0437\u0434\u0430\u043b\u0435\u0433\u0456\u0434\u044c \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u2014 \u043f\u0440\u043e\u0441\u0442\u043e \u043d\u0430\u0434\u0456\u0448\u043b\u0456\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443, \u0456 \u043c\u0438 \u0432\u0441\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0454\u043c\u043e \u0440\u0430\u0437\u043e\u043c.',
    prep_ack: '\u042f \u0440\u043e\u0437\u0443\u043c\u0456\u044e, \u0449\u043e \u043f\u0435\u0440\u0435\u0434 \u043f\u043e\u0447\u0430\u0442\u043a\u043e\u043c \u0432\u043f\u0440\u043e\u0432\u0430\u0434\u0436\u0435\u043d\u043d\u044f \u043c\u0435\u043d\u0456 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0431\u0443\u0434\u0435 \u043d\u0430\u0434\u0430\u0442\u0438 \u043d\u0435\u043e\u0431\u0445\u0456\u0434\u043d\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0438.',
    prep_ack_err: '\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u044c\u0442\u0435, \u0431\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0449\u043e \u0437\u043c\u043e\u0436\u0435\u0442\u0435 \u043d\u0430\u0434\u0430\u0442\u0438 \u043d\u0435\u043e\u0431\u0445\u0456\u0434\u043d\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0438 \u043f\u0435\u0440\u0435\u0434 \u043f\u043e\u0447\u0430\u0442\u043a\u043e\u043c.',
  },
};
for (const _l of Object.keys(PREP_I18N)) { if (CFG_I18N[_l]) Object.assign(CFG_I18N[_l], PREP_I18N[_l]); }

// ---------- per-employee client-preparation QUESTIONS (STEP 22J) ----------
// Real, customer-facing "What to prepare" questions per AI employee, grounded in
// each employee's actual role/configuration (see AGENT_BLURB / AGENTS data). These
// describe BUSINESS information and operating rules the client should be able to
// provide \u2014 never technical/implementation details, credentials, or unsupported
// capabilities. Fully written in EN / ES / UK (no mechanical fallback). Questions
// are combined & de-duplicated when several employees are recommended.
const AGENT_PREP_Q = {
  en: {
    sarah: [
      'What products or services does your business sell?',
      'What are your prices and payment terms?',
      'What questions do customers ask most often?',
      'Which customers should be treated as qualified or high-intent?',
      'What information should be collected before passing a lead to your team?',
      'What should happen when a customer is ready to order?',
    ],
    emma: [
      'What services do you offer?',
      'What are your prices and opening hours?',
      'What questions do visitors ask most often?',
      'What types of appointments can customers book, and how long does each take?',
      'What are your booking, cancellation and rescheduling rules?',
      'What information should be recorded for each booking?',
    ],
    olivia: [
      'What type of meetings or consultations should be booked?',
      'Who should qualify for a meeting?',
      'How long does each meeting take, and which days and times are available?',
      'What information should be collected before booking?',
      'What should happen after a meeting is booked?',
      'What reminders or follow-up messages should attendees receive?',
    ],
    alex: [
      'What products or services do customers contact you about?',
      'What problems or questions come up most often?',
      'What are your approved answers and policies for these cases?',
      'Which situations should always be handed over to a person?',
      'What information should be collected before escalating a request?',
    ],
    max: [
      'What source materials should answers be based on (documents, guides, policies)?',
      'What questions do people ask most often?',
      'What are the approved answers to these questions?',
      'Are there topics that should not be answered or should be redirected?',
    ],
    sophia: [
      'What does your brand do, and who is your target audience?',
      'What tone and style should your content follow?',
      'What topics or themes should the content focus on?',
      'Are there any subjects, words or claims to avoid?',
    ],
    daniel: [
      'What roles are you hiring for?',
      'What are the key requirements for each role?',
      'What questions should be used to screen candidates?',
      'What makes a candidate qualified or a strong fit?',
      'When should an application be passed to your team?',
    ],
    nina: [
      'Which languages do you need translations between?',
      'What type of content will be translated (messages, documents, voice)?',
      'Are there terms or names that must be translated a specific way?',
      'What tone or style should translations follow (formal or casual)?',
    ],
    boris: [
      'What business or topic should be analyzed?',
      'What goal or question should the analysis answer?',
      'What data or background information can you provide?',
      'What should the final report include?',
    ],
    leo: [
      'What should the illustrations show or promote?',
      'What visual style or brand look should they follow?',
      'Are there brand colors, references or assets to follow?',
      'How and where will the images be used?',
    ],
    rooney: [
      'What should the song be about, or do you already have lyrics?',
      'What musical style or mood are you looking for?',
      'How long should the track be?',
      'How will the song be used?',
    ],
    vera: [
      'What should the video be about or promote?',
      'Who is the video for, and where will it be published?',
      'What style, tone or message should it convey?',
      'Are there brand assets or references to follow?',
    ],
    stella: [
      'What garments or products should be shown?',
      'Do you have clear photos of each item?',
      'What look or presentation style do you want?',
      'How and where will the renders be used?',
    ],
  },
  es: {
    sarah: [
      '\u00bfQu\u00e9 productos o servicios vende tu negocio?',
      '\u00bfCu\u00e1les son tus precios y condiciones de pago?',
      '\u00bfQu\u00e9 preguntas hacen tus clientes con m\u00e1s frecuencia?',
      '\u00bfQu\u00e9 clientes deben considerarse cualificados o con alta intenci\u00f3n?',
      '\u00bfQu\u00e9 informaci\u00f3n debe recopilarse antes de pasar un lead a tu equipo?',
      '\u00bfQu\u00e9 debe ocurrir cuando un cliente est\u00e1 listo para comprar?',
    ],
    emma: [
      '\u00bfQu\u00e9 servicios ofreces?',
      '\u00bfCu\u00e1les son tus precios y tu horario de atenci\u00f3n?',
      '\u00bfQu\u00e9 preguntas hacen los visitantes con m\u00e1s frecuencia?',
      '\u00bfQu\u00e9 tipos de citas pueden reservar los clientes y cu\u00e1nto dura cada una?',
      '\u00bfCu\u00e1les son tus normas de reserva, cancelaci\u00f3n y cambio de cita?',
      '\u00bfQu\u00e9 informaci\u00f3n debe registrarse en cada reserva?',
    ],
    olivia: [
      '\u00bfQu\u00e9 tipo de reuniones o consultas deben agendarse?',
      '\u00bfQui\u00e9n debe cumplir los requisitos para una reuni\u00f3n?',
      '\u00bfCu\u00e1nto dura cada reuni\u00f3n y qu\u00e9 d\u00edas y horarios est\u00e1n disponibles?',
      '\u00bfQu\u00e9 informaci\u00f3n debe recopilarse antes de agendar?',
      '\u00bfQu\u00e9 debe ocurrir despu\u00e9s de agendar una reuni\u00f3n?',
      '\u00bfQu\u00e9 recordatorios o mensajes de seguimiento deben recibir los asistentes?',
    ],
    alex: [
      '\u00bfSobre qu\u00e9 productos o servicios te contactan los clientes?',
      '\u00bfQu\u00e9 problemas o preguntas surgen con m\u00e1s frecuencia?',
      '\u00bfCu\u00e1les son tus respuestas y pol\u00edticas aprobadas para estos casos?',
      '\u00bfQu\u00e9 situaciones deben derivarse siempre a una persona?',
      '\u00bfQu\u00e9 informaci\u00f3n debe recopilarse antes de escalar una solicitud?',
    ],
    max: [
      '\u00bfEn qu\u00e9 materiales deben basarse las respuestas (documentos, gu\u00edas, pol\u00edticas)?',
      '\u00bfQu\u00e9 preguntas hace la gente con m\u00e1s frecuencia?',
      '\u00bfCu\u00e1les son las respuestas aprobadas a estas preguntas?',
      '\u00bfHay temas que no deban responderse o que deban derivarse?',
    ],
    sophia: [
      '\u00bfA qu\u00e9 se dedica tu marca y qui\u00e9n es tu p\u00fablico objetivo?',
      '\u00bfQu\u00e9 tono y estilo debe seguir tu contenido?',
      '\u00bfEn qu\u00e9 temas debe centrarse el contenido?',
      '\u00bfHay asuntos, palabras o afirmaciones que se deban evitar?',
    ],
    daniel: [
      '\u00bfPara qu\u00e9 puestos est\u00e1s contratando?',
      '\u00bfCu\u00e1les son los requisitos clave de cada puesto?',
      '\u00bfQu\u00e9 preguntas deben usarse para filtrar a los candidatos?',
      '\u00bfQu\u00e9 hace que un candidato est\u00e9 cualificado o encaje bien?',
      '\u00bfCu\u00e1ndo debe pasarse una candidatura a tu equipo?',
    ],
    nina: [
      '\u00bfEntre qu\u00e9 idiomas necesitas traducciones?',
      '\u00bfQu\u00e9 tipo de contenido se traducir\u00e1 (mensajes, documentos, voz)?',
      '\u00bfHay t\u00e9rminos o nombres que deban traducirse de una forma concreta?',
      '\u00bfQu\u00e9 tono o estilo deben seguir las traducciones (formal o informal)?',
    ],
    boris: [
      '\u00bfQu\u00e9 negocio o tema debe analizarse?',
      '\u00bfQu\u00e9 objetivo o pregunta debe responder el an\u00e1lisis?',
      '\u00bfQu\u00e9 datos o informaci\u00f3n de contexto puedes proporcionar?',
      '\u00bfQu\u00e9 debe incluir el informe final?',
    ],
    leo: [
      '\u00bfQu\u00e9 deben mostrar o promocionar las ilustraciones?',
      '\u00bfQu\u00e9 estilo visual o imagen de marca deben seguir?',
      '\u00bfHay colores de marca, referencias o recursos que seguir?',
      '\u00bfC\u00f3mo y d\u00f3nde se usar\u00e1n las im\u00e1genes?',
    ],
    rooney: [
      '\u00bfDe qu\u00e9 debe tratar la canci\u00f3n o ya tienes la letra?',
      '\u00bfQu\u00e9 estilo musical o ambiente buscas?',
      '\u00bfCu\u00e1nto debe durar la pista?',
      '\u00bfC\u00f3mo se usar\u00e1 la canci\u00f3n?',
    ],
    vera: [
      '\u00bfDe qu\u00e9 debe tratar el v\u00eddeo o qu\u00e9 debe promocionar?',
      '\u00bfPara qui\u00e9n es el v\u00eddeo y d\u00f3nde se publicar\u00e1?',
      '\u00bfQu\u00e9 estilo, tono o mensaje debe transmitir?',
      '\u00bfHay recursos de marca o referencias que seguir?',
    ],
    stella: [
      '\u00bfQu\u00e9 prendas o productos deben mostrarse?',
      '\u00bfTienes fotos n\u00edtidas de cada art\u00edculo?',
      '\u00bfQu\u00e9 estilo o presentaci\u00f3n quieres?',
      '\u00bfC\u00f3mo y d\u00f3nde se usar\u00e1n los renders?',
    ],
  },
  uk: {
    sarah: [
      '\u042f\u043a\u0456 \u0442\u043e\u0432\u0430\u0440\u0438 \u0430\u0431\u043e \u043f\u043e\u0441\u043b\u0443\u0433\u0438 \u043f\u0440\u043e\u0434\u0430\u0454 \u0432\u0430\u0448 \u0431\u0456\u0437\u043d\u0435\u0441?',
      '\u042f\u043a\u0456 \u0443 \u0432\u0430\u0441 \u0446\u0456\u043d\u0438 \u0442\u0430 \u0443\u043c\u043e\u0432\u0438 \u043e\u043f\u043b\u0430\u0442\u0438?',
      '\u042f\u043a\u0456 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0438 \u0441\u0442\u0430\u0432\u043b\u044f\u0442\u044c \u043d\u0430\u0439\u0447\u0430\u0441\u0442\u0456\u0448\u0435?',
      '\u042f\u043a\u0438\u0445 \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432 \u0432\u0432\u0430\u0436\u0430\u0442\u0438 \u043a\u0432\u0430\u043b\u0456\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u0438\u043c\u0438 \u0430\u0431\u043e \u0437 \u0432\u0438\u0441\u043e\u043a\u0438\u043c \u043d\u0430\u043c\u0456\u0440\u043e\u043c?',
      '\u042f\u043a\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0441\u043b\u0456\u0434 \u0437\u0456\u0431\u0440\u0430\u0442\u0438 \u043f\u0435\u0440\u0435\u0434 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0435\u044e \u043b\u0456\u0434\u0430 \u0432\u0430\u0448\u0456\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u0456?',
      '\u0429\u043e \u043c\u0430\u0454 \u0432\u0456\u0434\u0431\u0443\u0432\u0430\u0442\u0438\u0441\u044f, \u043a\u043e\u043b\u0438 \u043a\u043b\u0456\u0454\u043d\u0442 \u0433\u043e\u0442\u043e\u0432\u0438\u0439 \u0437\u0440\u043e\u0431\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f?',
    ],
    emma: [
      '\u042f\u043a\u0456 \u043f\u043e\u0441\u043b\u0443\u0433\u0438 \u0432\u0438 \u043f\u0440\u043e\u043f\u043e\u043d\u0443\u0454\u0442\u0435?',
      '\u042f\u043a\u0456 \u0443 \u0432\u0430\u0441 \u0446\u0456\u043d\u0438 \u0442\u0430 \u0433\u043e\u0434\u0438\u043d\u0438 \u0440\u043e\u0431\u043e\u0442\u0438?',
      '\u042f\u043a\u0456 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u0432\u0456\u0434\u0432\u0456\u0434\u0443\u0432\u0430\u0447\u0456 \u0441\u0442\u0430\u0432\u043b\u044f\u0442\u044c \u043d\u0430\u0439\u0447\u0430\u0441\u0442\u0456\u0448\u0435?',
      '\u042f\u043a\u0456 \u0442\u0438\u043f\u0438 \u0437\u0430\u043f\u0438\u0441\u0456\u0432 \u043c\u043e\u0436\u0443\u0442\u044c \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u0442\u0438 \u043a\u043b\u0456\u0454\u043d\u0442\u0438 \u0439 \u0441\u043a\u0456\u043b\u044c\u043a\u0438 \u0442\u0440\u0438\u0432\u0430\u0454 \u043a\u043e\u0436\u0435\u043d?',
      '\u042f\u043a\u0456 \u0443 \u0432\u0430\u0441 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u043d\u043d\u044f, \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0435\u043d\u043d\u044f?',
      '\u042f\u043a\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0441\u043b\u0456\u0434 \u0444\u0456\u043a\u0441\u0443\u0432\u0430\u0442\u0438 \u0434\u043b\u044f \u043a\u043e\u0436\u043d\u043e\u0433\u043e \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u043d\u043d\u044f?',
    ],
    olivia: [
      '\u042f\u043a\u0456 \u0437\u0443\u0441\u0442\u0440\u0456\u0447\u0456 \u0430\u0431\u043e \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0456\u0457 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u0442\u0438?',
      '\u0425\u0442\u043e \u043c\u0430\u0454 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u0442\u0438 \u0432\u0438\u043c\u043e\u0433\u0430\u043c \u0434\u043b\u044f \u0437\u0443\u0441\u0442\u0440\u0456\u0447\u0456?',
      '\u0421\u043a\u0456\u043b\u044c\u043a\u0438 \u0442\u0440\u0438\u0432\u0430\u0454 \u043a\u043e\u0436\u043d\u0430 \u0437\u0443\u0441\u0442\u0440\u0456\u0447 \u0456 \u044f\u043a\u0456 \u0434\u043d\u0456 \u0442\u0430 \u0433\u043e\u0434\u0438\u043d\u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0456?',
      '\u042f\u043a\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0441\u043b\u0456\u0434 \u0437\u0456\u0431\u0440\u0430\u0442\u0438 \u043f\u0435\u0440\u0435\u0434 \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u043d\u043d\u044f\u043c?',
      '\u0429\u043e \u043c\u0430\u0454 \u0432\u0456\u0434\u0431\u0443\u0432\u0430\u0442\u0438\u0441\u044f \u043f\u0456\u0441\u043b\u044f \u0431\u0440\u043e\u043d\u044e\u0432\u0430\u043d\u043d\u044f \u0437\u0443\u0441\u0442\u0440\u0456\u0447\u0456?',
      '\u042f\u043a\u0456 \u043d\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043d\u043d\u044f \u0430\u0431\u043e \u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f \u043c\u0430\u044e\u0442\u044c \u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438 \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u0438?',
    ],
    alex: [
      '\u0429\u043e\u0434\u043e \u044f\u043a\u0438\u0445 \u0442\u043e\u0432\u0430\u0440\u0456\u0432 \u0430\u0431\u043e \u043f\u043e\u0441\u043b\u0443\u0433 \u0437\u0432\u0435\u0440\u0442\u0430\u044e\u0442\u044c\u0441\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0438?',
      '\u042f\u043a\u0456 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0438 \u0447\u0438 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u0432\u0438\u043d\u0438\u043a\u0430\u044e\u0442\u044c \u043d\u0430\u0439\u0447\u0430\u0441\u0442\u0456\u0448\u0435?',
      '\u042f\u043a\u0456 \u0443 \u0432\u0430\u0441 \u0437\u0430\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u0456 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0456 \u0442\u0430 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0434\u043b\u044f \u0446\u0438\u0445 \u0432\u0438\u043f\u0430\u0434\u043a\u0456\u0432?',
      '\u042f\u043a\u0456 \u0441\u0438\u0442\u0443\u0430\u0446\u0456\u0457 \u0441\u043b\u0456\u0434 \u0437\u0430\u0432\u0436\u0434\u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u0438 \u043b\u044e\u0434\u0438\u043d\u0456?',
      '\u042f\u043a\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0441\u043b\u0456\u0434 \u0437\u0456\u0431\u0440\u0430\u0442\u0438 \u043f\u0435\u0440\u0435\u0434 \u0435\u0441\u043a\u0430\u043b\u0430\u0446\u0456\u0454\u044e \u0437\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f?',
    ],
    max: [
      '\u041d\u0430 \u044f\u043a\u0438\u0445 \u043c\u0430\u0442\u0435\u0440\u0456\u0430\u043b\u0430\u0445 \u043c\u0430\u044e\u0442\u044c \u0491\u0440\u0443\u043d\u0442\u0443\u0432\u0430\u0442\u0438\u0441\u044f \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0456 (\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0438, \u0456\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0456\u0457, \u043f\u0440\u0430\u0432\u0438\u043b\u0430)?',
      '\u042f\u043a\u0456 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u0441\u0442\u0430\u0432\u043b\u044f\u0442\u044c \u043d\u0430\u0439\u0447\u0430\u0441\u0442\u0456\u0448\u0435?',
      '\u042f\u043a\u0456 \u0437\u0430\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u0456 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0456 \u043d\u0430 \u0446\u0456 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f?',
      '\u0427\u0438 \u0454 \u0442\u0435\u043c\u0438, \u043d\u0430 \u044f\u043a\u0456 \u043d\u0435 \u0441\u043b\u0456\u0434 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u0442\u0438 \u0430\u0431\u043e \u044f\u043a\u0456 \u0442\u0440\u0435\u0431\u0430 \u043f\u0435\u0440\u0435\u043d\u0430\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u0438?',
    ],
    sophia: [
      '\u0427\u0438\u043c \u0437\u0430\u0439\u043c\u0430\u0454\u0442\u044c\u0441\u044f \u0432\u0430\u0448 \u0431\u0440\u0435\u043d\u0434 \u0456 \u0445\u0442\u043e \u0432\u0430\u0448\u0430 \u0446\u0456\u043b\u044c\u043e\u0432\u0430 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0456\u044f?',
      '\u042f\u043a\u043e\u0433\u043e \u0442\u043e\u043d\u0443 \u0442\u0430 \u0441\u0442\u0438\u043b\u044e \u043c\u0430\u0454 \u0434\u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438\u0441\u044f \u043a\u043e\u043d\u0442\u0435\u043d\u0442?',
      '\u041d\u0430 \u044f\u043a\u0438\u0445 \u0442\u0435\u043c\u0430\u0445 \u043c\u0430\u0454 \u0437\u043e\u0441\u0435\u0440\u0435\u0434\u0436\u0443\u0432\u0430\u0442\u0438\u0441\u044f \u043a\u043e\u043d\u0442\u0435\u043d\u0442?',
      '\u0427\u0438 \u0454 \u0442\u0435\u043c\u0438, \u0441\u043b\u043e\u0432\u0430 \u0430\u0431\u043e \u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f, \u044f\u043a\u0438\u0445 \u0441\u043b\u0456\u0434 \u0443\u043d\u0438\u043a\u0430\u0442\u0438?',
    ],
    daniel: [
      '\u041d\u0430 \u044f\u043a\u0456 \u043f\u043e\u0441\u0430\u0434\u0438 \u0432\u0438 \u043d\u0430\u0439\u043c\u0430\u0454\u0442\u0435?',
      '\u042f\u043a\u0456 \u043a\u043b\u044e\u0447\u043e\u0432\u0456 \u0432\u0438\u043c\u043e\u0433\u0438 \u0434\u043e \u043a\u043e\u0436\u043d\u043e\u0457 \u043f\u043e\u0441\u0430\u0434\u0438?',
      '\u042f\u043a\u0456 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0432\u0430\u0442\u0438 \u0434\u043b\u044f \u0432\u0456\u0434\u0431\u043e\u0440\u0443 \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u0456\u0432?',
      '\u0429\u043e \u0440\u043e\u0431\u0438\u0442\u044c \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u0430 \u043a\u0432\u0430\u043b\u0456\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u0438\u043c \u0430\u0431\u043e \u0442\u0430\u043a\u0438\u043c, \u0449\u043e \u0434\u043e\u0431\u0440\u0435 \u043f\u0456\u0434\u0445\u043e\u0434\u0438\u0442\u044c?',
      '\u041a\u043e\u043b\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u0441\u043b\u0456\u0434 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u0438 \u0432\u0430\u0448\u0456\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u0456?',
    ],
    nina: [
      '\u041c\u0456\u0436 \u044f\u043a\u0438\u043c\u0438 \u043c\u043e\u0432\u0430\u043c\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0456 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0438?',
      '\u042f\u043a\u0438\u0439 \u0442\u0438\u043f \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0443 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0430\u0442\u0438\u043c\u0435\u0442\u0435 (\u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f, \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0438, \u0433\u043e\u043b\u043e\u0441)?',
      '\u0427\u0438 \u0454 \u0442\u0435\u0440\u043c\u0456\u043d\u0438 \u0430\u0431\u043e \u043d\u0430\u0437\u0432\u0438, \u044f\u043a\u0456 \u0442\u0440\u0435\u0431\u0430 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0430\u0442\u0438 \u043f\u0435\u0432\u043d\u0438\u043c \u0447\u0438\u043d\u043e\u043c?',
      '\u042f\u043a\u043e\u0433\u043e \u0442\u043e\u043d\u0443 \u0447\u0438 \u0441\u0442\u0438\u043b\u044e \u043c\u0430\u044e\u0442\u044c \u0434\u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438\u0441\u044f \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0438 (\u043e\u0444\u0456\u0446\u0456\u0439\u043d\u0438\u0439 \u0447\u0438 \u043d\u0435\u0444\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u0438\u0439)?',
    ],
    boris: [
      '\u042f\u043a\u0438\u0439 \u0431\u0456\u0437\u043d\u0435\u0441 \u0430\u0431\u043e \u0442\u0435\u043c\u0443 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0456\u0437\u0443\u0432\u0430\u0442\u0438?',
      '\u041d\u0430 \u044f\u043a\u0443 \u043c\u0435\u0442\u0443 \u0447\u0438 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f \u043c\u0430\u0454 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0441\u0442\u0438 \u0430\u043d\u0430\u043b\u0456\u0437?',
      '\u042f\u043a\u0456 \u0434\u0430\u043d\u0456 \u0430\u0431\u043e \u0434\u043e\u0432\u0456\u0434\u043a\u043e\u0432\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0432\u0438 \u043c\u043e\u0436\u0435\u0442\u0435 \u043d\u0430\u0434\u0430\u0442\u0438?',
      '\u0429\u043e \u043c\u0430\u0454 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043f\u0456\u0434\u0441\u0443\u043c\u043a\u043e\u0432\u0438\u0439 \u0437\u0432\u0456\u0442?',
    ],
    leo: [
      '\u0429\u043e \u043c\u0430\u044e\u0442\u044c \u0437\u043e\u0431\u0440\u0430\u0436\u0443\u0432\u0430\u0442\u0438 \u0430\u0431\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0443\u0432\u0430\u0442\u0438 \u0456\u043b\u044e\u0441\u0442\u0440\u0430\u0446\u0456\u0457?',
      '\u042f\u043a\u043e\u0433\u043e \u0432\u0456\u0437\u0443\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u0441\u0442\u0438\u043b\u044e \u0447\u0438 \u0432\u0438\u0433\u043b\u044f\u0434\u0443 \u0431\u0440\u0435\u043d\u0434\u0443 \u0432\u043e\u043d\u0438 \u043c\u0430\u044e\u0442\u044c \u0434\u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438\u0441\u044f?',
      '\u0427\u0438 \u0454 \u0444\u0456\u0440\u043c\u043e\u0432\u0456 \u043a\u043e\u043b\u044c\u043e\u0440\u0438, \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0438 \u0430\u0431\u043e \u043c\u0430\u0442\u0435\u0440\u0456\u0430\u043b\u0438, \u044f\u043a\u0438\u0445 \u0441\u043b\u0456\u0434 \u0434\u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438\u0441\u044f?',
      '\u042f\u043a \u0456 \u0434\u0435 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0432\u0430\u0442\u0438\u043c\u0443\u0442\u044c\u0441\u044f \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f?',
    ],
    rooney: [
      '\u041f\u0440\u043e \u0449\u043e \u043c\u0430\u0454 \u0431\u0443\u0442\u0438 \u043f\u0456\u0441\u043d\u044f, \u0447\u0438 \u0443 \u0432\u0430\u0441 \u0443\u0436\u0435 \u0454 \u0442\u0435\u043a\u0441\u0442?',
      '\u042f\u043a\u0438\u0439 \u043c\u0443\u0437\u0438\u0447\u043d\u0438\u0439 \u0441\u0442\u0438\u043b\u044c \u0430\u0431\u043e \u043d\u0430\u0441\u0442\u0440\u0456\u0439 \u0432\u0438 \u0448\u0443\u043a\u0430\u0454\u0442\u0435?',
      '\u042f\u043a\u043e\u044e \u043c\u0430\u0454 \u0431\u0443\u0442\u0438 \u0442\u0440\u0438\u0432\u0430\u043b\u0456\u0441\u0442\u044c \u0442\u0440\u0435\u043a\u0443?',
      '\u042f\u043a \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0432\u0430\u0442\u0438\u043c\u0435\u0442\u044c\u0441\u044f \u043f\u0456\u0441\u043d\u044f?',
    ],
    vera: [
      '\u041f\u0440\u043e \u0449\u043e \u043c\u0430\u0454 \u0431\u0443\u0442\u0438 \u0432\u0456\u0434\u0435\u043e \u0430\u0431\u043e \u0449\u043e \u0432\u043e\u043d\u043e \u043c\u0430\u0454 \u0440\u0435\u043a\u043b\u0430\u043c\u0443\u0432\u0430\u0442\u0438?',
      '\u0414\u043b\u044f \u043a\u043e\u0433\u043e \u0432\u0456\u0434\u0435\u043e \u0456 \u0434\u0435 \u0432\u043e\u043d\u043e \u0431\u0443\u0434\u0435 \u043e\u043f\u0443\u0431\u043b\u0456\u043a\u043e\u0432\u0430\u043d\u0435?',
      '\u042f\u043a\u0438\u0439 \u0441\u0442\u0438\u043b\u044c, \u0442\u043e\u043d \u0430\u0431\u043e \u043c\u0435\u0441\u0435\u0434\u0436 \u0432\u043e\u043d\u043e \u043c\u0430\u0454 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u0438?',
      '\u0427\u0438 \u0454 \u0444\u0456\u0440\u043c\u043e\u0432\u0456 \u043c\u0430\u0442\u0435\u0440\u0456\u0430\u043b\u0438 \u0430\u0431\u043e \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0438, \u044f\u043a\u0438\u0445 \u0441\u043b\u0456\u0434 \u0434\u043e\u0442\u0440\u0438\u043c\u0443\u0432\u0430\u0442\u0438\u0441\u044f?',
    ],
    stella: [
      '\u042f\u043a\u0456 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u0438 \u043e\u0434\u044f\u0433\u0443 \u0430\u0431\u043e \u0442\u043e\u0432\u0430\u0440\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0438?',
      '\u0427\u0438 \u0454 \u0443 \u0432\u0430\u0441 \u0447\u0456\u0442\u043a\u0456 \u0444\u043e\u0442\u043e \u043a\u043e\u0436\u043d\u043e\u0433\u043e \u0432\u0438\u0440\u043e\u0431\u0443?',
      '\u042f\u043a\u0438\u0439 \u043e\u0431\u0440\u0430\u0437 \u0430\u0431\u043e \u0441\u0442\u0438\u043b\u044c \u043f\u043e\u0434\u0430\u0447\u0456 \u0432\u0438 \u0445\u043e\u0447\u0435\u0442\u0435?',
      '\u042f\u043a \u0456 \u0434\u0435 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0432\u0430\u0442\u0438\u043c\u0443\u0442\u044c\u0441\u044f \u0440\u0435\u043d\u0434\u0435\u0440\u0438?',
    ],
  },
};

let CUR = 'en';
let lastEstimate = null;
let lastSel = null;
const t = (k) => (CFG_I18N[CUR] && CFG_I18N[CUR][k] != null ? CFG_I18N[CUR][k] : (CFG_I18N.en[k] != null ? CFG_I18N.en[k] : k));
function resolveLang(l) { return CFG_I18N[l] ? l : 'en'; }

// ---------- customer-facing copy (presentation only) ----------

/** Localized role label per agent (presentation only; pricing stays neutral). */
export const AGENT_ROLE = {
  en: { olivia: 'Appointment Setter', emma: 'Receptionist', sarah: 'Sales Manager', alex: 'Support Agent', sophia: 'Marketing Manager', daniel: 'Recruiter', nina: 'Translator', max: 'Knowledge Assistant', boris: 'Business Analyst', leo: 'Designer', rooney: 'Composer', vera: 'Video Producer', stella: 'Stylist' },
  es: { olivia: 'Agendadora', emma: 'Recepcionista', sarah: 'Gerente de Ventas', alex: 'Agente de Soporte', sophia: 'Gerente de Marketing', daniel: 'Reclutador', nina: 'Traductora', max: 'Asistente de Conocimiento', boris: 'Analista de Negocio', leo: 'Diseñador', rooney: 'Compositor', vera: 'Productora de Vídeo', stella: 'Estilista' },
  uk: { olivia: 'Планувальник зустрічей', emma: 'Рецепціоніст', sarah: 'Менеджер продажів', alex: 'Агент підтримки', sophia: 'Менеджер маркетингу', daniel: 'Рекрутер', nina: 'Перекладач', max: 'Асистент знань', boris: 'Бізнес-аналітик', leo: 'Дизайнер', rooney: 'Композитор', vera: 'Відеопродюсер', stella: 'Стиліст' },
};

/** Friendly one-liner per agent, grounded in the real workflow audit. */
export const AGENT_BLURB = {
  en: {
    olivia: 'Qualifies inbound leads and books meetings automatically.',
    emma: 'Greets visitors and captures appointment requests at the front desk.',
    sarah: 'Engages website visitors, qualifies leads and captures sales opportunities.',
    alex: 'Triages support requests and drafts replies, flagging what needs a human.',
    sophia: 'Generates fresh marketing content ideas on a schedule.',
    daniel: 'Screens job applications and scores candidate fit.',
    nina: 'Translates text and voice messages between languages.',
    max: 'Answers questions from your knowledge base with reliable, sourced replies.',
    boris: 'Runs guided business analysis and produces research-backed reports.',
    leo: 'Researches trends and generates batches of vector illustrations.',
    rooney: 'Creates original songs from your lyrics and chosen style.',
    vera: 'Produces short vertical AI videos and delivers them ready to use.',
    stella: 'Creates virtual try-on renders of garments and products.',
  },
  es: {
    olivia: 'Califica leads entrantes y agenda reuniones automáticamente.',
    emma: 'Recibe a los visitantes y registra solicitudes de cita en recepción.',
    sarah: 'Interactúa con los visitantes, califica leads y capta oportunidades de venta.',
    alex: 'Clasifica solicitudes de soporte y redacta respuestas, marcando lo que necesita un humano.',
    sophia: 'Genera nuevas ideas de contenido de marketing de forma programada.',
    daniel: 'Revisa candidaturas y puntúa la idoneidad de cada candidato.',
    nina: 'Traduce mensajes de texto y de voz entre idiomas.',
    max: 'Responde preguntas desde tu base de conocimiento con respuestas fiables y con fuentes.',
    boris: 'Realiza análisis de negocio guiado y genera informes documentados.',
    leo: 'Investiga tendencias y genera lotes de ilustraciones vectoriales.',
    rooney: 'Crea canciones originales a partir de tu letra y estilo elegido.',
    vera: 'Produce vídeos verticales de IA cortos y los entrega listos para usar.',
    stella: 'Crea renders de prueba virtual de prendas y productos.',
  },
  uk: {
    olivia: 'Кваліфікує вхідні ліди й автоматично бронює зустрічі.',
    emma: 'Вітає відвідувачів і фіксує запити на запис на ресепшені.',
    sarah: 'Спілкується з відвідувачами сайту, кваліфікує ліди й фіксує можливості продажу.',
    alex: 'Сортує звернення в підтримку й готує відповіді, позначаючи те, що потребує людини.',
    sophia: 'Регулярно генерує нові ідеї маркетингового контенту.',
    daniel: 'Перевіряє заявки на роботу й оцінює відповідність кандидатів.',
    nina: 'Перекладає текстові та голосові повідомлення між мовами.',
    max: 'Відповідає на запитання з вашої бази знань надійно та з джерелами.',
    boris: 'Проводить кероване бізнес-аналізування й готує звіти з дослідженнями.',
    leo: 'Досліджує тренди й генерує партії векторних ілюстрацій.',
    rooney: 'Створює оригінальні пісні з ваших текстів і обраного стилю.',
    vera: 'Створює короткі вертикальні AI-відео й віддає їх готовими до використання.',
    stella: 'Створює віртуальні примірки одягу та товарів.',
  },
};

/** Pick a localized role/blurb, falling back to EN then the neutral field. */
function agentRole(a) { const m = AGENT_ROLE[CUR] || AGENT_ROLE.en; return (m && m[a.id]) || AGENT_ROLE.en[a.id] || a.role || ''; }
function agentBlurb(a) { const m = AGENT_BLURB[CUR] || AGENT_BLURB.en; return (m && m[a.id]) || AGENT_BLURB.en[a.id] || ''; }

/** Friendly metric labels — never expose raw metric keys/rates. */
const METRIC_LABEL = {
  conversations: 'conversations',
  messages: 'messages',
  tickets: 'support tickets',
  applications: 'applications',
  content_ideas: 'content ideas',
  voice_minutes: 'voice minutes',
  web_searches: 'web searches',
  images: 'images',
  audio_minutes: 'audio minutes',
  renders: 'try-on renders',
  reports: 'reports',
  video_credits: 'video credits',
};

// Usage presets for credit-style metrics whose "included" is 0 (e.g. video).
const CREDIT_LEVEL_DEFAULT = { low: 50, normal: 150, high: 400 };
// Multipliers applied to each metric's included allowance for Low/Normal/High.
const LEVEL_FACTOR = { low: 0.2, normal: 1, high: 3 };

// ---------- pure input builder (testable, no DOM) ----------

function slug(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Estimate the expected usage per metric from the chosen level (or an exact
 * number). Reads AGENTS data only to discover which metrics apply — no pricing.
 */
export function buildUsage(input, level, exactNumber) {
  const { matched } = matchAgents(input);
  const by_metric = {};
  const factor = LEVEL_FACTOR[level] ?? LEVEL_FACTOR.normal;
  const exact = Number.isFinite(exactNumber) && exactNumber > 0 ? Math.round(exactNumber) : null;

  for (const a of matched) {
    for (const m of a.usage_metrics) {
      let val;
      if (exact != null) {
        val = exact;
      } else if (m.included > 0) {
        val = Math.round(m.included * factor);
      } else {
        // credit-style metric (included == 0), e.g. Vera video_credits
        val = CREDIT_LEVEL_DEFAULT[level] ?? CREDIT_LEVEL_DEFAULT.normal;
      }
      by_metric[m.name] = Math.max(by_metric[m.name] || 0, val);
    }
  }
  return by_metric;
}

/**
 * Map wizard selections -> engine ClientInput.
 * sel = {
 *   business, intents[], channels[], usageLevel, usageNumber,
 *   kb:{present,size}, integrations[], otherIntegration,
 *   media[], translation:bool, support
 * }
 */
export function buildInput(sel = {}) {
  const intents = [...(sel.intents || [])];
  if (sel.translation) intents.push('translation');

  const input = { intent_tags: [...new Set(intents)] };

  if (sel.business) { input.business_type = sel.business; input.task_text = sel.business; }
  if (sel.channels && sel.channels.length) input.channels = [...new Set(sel.channels)];

  const integrations = [...(sel.integrations || [])];
  if (sel.otherIntegration && sel.otherIntegration.trim()) integrations.push(slug(sel.otherIntegration));
  if (integrations.length) input.integrations = [...new Set(integrations)];

  if (sel.media && sel.media.length) input.media = [...new Set(sel.media)];

  if (sel.kb && sel.kb.present) input.knowledge_base = { present: true, size: sel.kb.size || 'small' };

  const support = sel.support || 'standard';
  if (support !== 'standard') input.support_pref = support;

  input.expected_usage = { by_metric: buildUsage(input, sel.usageLevel || 'normal', sel.usageNumber) };
  return input;
}

// ---------- result rendering (pure -> HTML string) ----------

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
const rng = (r) => (Math.round(r.low) === Math.round(r.high) ? fmt(r.low) : `${fmt(r.low)}–${fmt(r.high)}`);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Build the customer-facing result HTML for an estimate. No internals leaked. */
// ---------- client-preparation block ("What we need from you") ----------
// Which recommended employees need business knowledge and/or a calendar. Grounded
// in the AGENTS data (customer-facing Q&A / qualification / support / FAQ agents
// need business rules; reception + appointment setting use a calendar). Access
// requirements are otherwise driven by the integrations the user explicitly chose.
// Each recommended employee contributes real, role-grounded business questions
// (AGENT_PREP_Q) plus any access that the role inherently needs (reception and
// appointment setting always need a calendar). All other access comes from the
// integrations the user explicitly selected \u2014 never invented.
const AGENT_PREP = {
  sarah: { access: [] },
  emma: { access: ['calendar'] },
  olivia: { access: ['calendar'] },
  alex: { access: [] },
  max: { access: [] },
  sophia: { access: [] },
  daniel: { access: [] },
  nina: { access: [] },
  boris: { access: [] },
  leo: { access: [] },
  rooney: { access: [] },
  vera: { access: [] },
  stella: { access: [] },
};

/** Derive the customer-facing preparation checklist from the estimate + selections. */
export function buildPrep(estimate) {
  const sel = lastSel || {};
  const agents = (estimate && estimate.recommended_agents) || [];
  const qmap = AGENT_PREP_Q[CUR] || AGENT_PREP_Q.en;
  const qfallback = AGENT_PREP_Q.en;

  // Combine each recommended employee's questions, de-duplicating exact repeats
  // (same localized text) while preserving order of first appearance.
  const questions = [];
  const seen = new Set();
  for (const a of agents) {
    if (!AGENT_PREP[a.id]) continue;
    const list = (qmap && qmap[a.id]) || (qfallback && qfallback[a.id]) || [];
    for (const q of list) {
      const key = String(q).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      questions.push(q);
    }
  }

  const access = new Set();
  for (const a of agents) {
    const p = AGENT_PREP[a.id];
    if (!p) continue;
    (p.access || []).forEach((k) => access.add(k));
  }
  // explicitly selected integrations / systems (never invented)
  const integrations = sel.integrations || [];
  if (integrations.includes('calendar')) access.add('calendar');
  if (integrations.includes('crm')) access.add('crm');
  if (integrations.includes('ats')) access.add('ats');
  if (integrations.includes('api')) access.add('system');
  if (sel.otherIntegration && sel.otherIntegration.trim()) access.add('system');
  if ((sel.channels || []).includes('webhook')) access.add('system');
  const order = ['calendar', 'crm', 'ats', 'system'];
  return { questions, access: order.filter((k) => access.has(k)) };
}

const PREP_ACCESS_KEY = { calendar: 'prep_calendar', crm: 'prep_crm', ats: 'prep_ats', system: 'prep_system' };

/** Render the "What we need from you" block. Combined & de-duplicated checklist. */
export function renderPrep(estimate) {
  const prep = buildPrep(estimate);
  let groups = '';
  if (prep.questions && prep.questions.length) {
    const items = prep.questions.map((q) => `<li>${esc(q)}</li>`).join('');
    groups += `
      <div class="cfg-prep-group cfg-prep-business">
        <div class="cfg-prep-group-title">${esc(t('prep_business_t'))}</div>
        <ul class="cfg-prep-list">${items}</ul>
      </div>`;
  }
  if (prep.access.length) {
    const items = prep.access.map((k) => `<li>${esc(t(PREP_ACCESS_KEY[k]))}</li>`).join('');
    groups += `
      <div class="cfg-prep-group">
        <div class="cfg-prep-group-title">${esc(t('prep_access_t'))}</div>
        <ul class="cfg-prep-list">${items}</ul>
      </div>`;
  }
  if (!groups) groups = `<p class="cfg-prep-none">${esc(t('prep_none'))}</p>`;
  return `
    <div class="cfg-prep">
      <div class="cfg-prep-head">
        <h4 class="cfg-prep-h">${esc(t('prep_h'))}</h4>
        <p class="cfg-prep-sub">${esc(t('prep_sub'))}</p>
      </div>
      <div class="cfg-prep-groups">${groups}</div>
      <label class="cfg-prep-ack">
        <input type="checkbox" class="cfg-prep-ack-input" />
        <span>${esc(t('prep_ack'))}</span>
      </label>
      <p class="cfg-prep-ack-err" role="alert" hidden>${esc(t('prep_ack_err'))}</p>
    </div>`;
}

/** Inject the scoped styles for the preparation block once (keeps deploy atomic). */
function ensurePrepStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cfg-prep-styles')) return;
  const css = `
.cfg-prep{margin:22px 0 4px;padding:20px;border:1px solid rgba(120,140,200,.22);border-radius:16px;background:linear-gradient(180deg,rgba(20,26,44,.55),rgba(14,18,32,.35));}
.cfg-prep-h{margin:0 0 6px;font-size:16px;font-weight:800;letter-spacing:.2px;}
.cfg-prep-sub{margin:0 0 14px;font-size:13.5px;line-height:1.5;opacity:.82;}
.cfg-prep-groups{display:flex;flex-wrap:wrap;gap:14px 26px;}
.cfg-prep-group{flex:1 1 240px;min-width:220px;}
.cfg-prep-business{flex-basis:100%;}
.cfg-prep-business .cfg-prep-list{columns:2;column-gap:26px;}
.cfg-prep-business .cfg-prep-list li{break-inside:avoid;-webkit-column-break-inside:avoid;}
.cfg-prep-group-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.7;margin:0 0 8px;}
.cfg-prep-list{list-style:none;margin:0;padding:0;}
.cfg-prep-list li{position:relative;padding:0 0 0 24px;margin:0 0 8px;font-size:13.5px;line-height:1.5;}
.cfg-prep-list li:last-child{margin-bottom:0;}
.cfg-prep-list li::before{content:"\\2713";position:absolute;left:0;top:0;color:#6d8cff;font-weight:800;}
.cfg-prep-none{margin:0;font-size:13.5px;line-height:1.5;opacity:.82;}
.cfg-prep-ack{display:flex;align-items:flex-start;gap:10px;margin:16px 0 0;font-size:13px;line-height:1.45;cursor:pointer;}
.cfg-prep-ack input{margin-top:2px;width:16px;height:16px;flex:0 0 auto;accent-color:#6d8cff;cursor:pointer;}
.cfg-prep-ack-err{margin:8px 0 0;color:#ff8f8f;font-size:12.5px;}
@media (max-width:560px){.cfg-prep{padding:16px}.cfg-prep-groups{gap:12px}.cfg-prep-group{flex-basis:100%;min-width:0}.cfg-prep-business .cfg-prep-list{columns:1;}}
`;
  const s = document.createElement('style');
  s.id = 'cfg-prep-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

export function renderResult(estimate) {
  if (!estimate.recommended_agents || estimate.recommended_agents.length === 0) {
    return `
      <div class="cfg-result cfg-empty">
        <h3>${esc(t('empty_h'))}</h3>
        <p>${esc(t('empty_p'))}</p>
        ${renderPrep(estimate)}
        <div class="cfg-cta-row">
          <button type="button" class="cfg-cta cfg-req-cta">${esc(t('req_cta'))}</button>
          <a class="cfg-cta cfg-cta-secondary" href="#contact">${esc(t('cta'))}</a>
        </div>
      </div>`;
  }

  // CUSTOM: never expose custom_reasons / capability_gap / unknown_integration.
  if (estimate.is_custom) {
    const names = estimate.recommended_agents.map((a) => esc(a.name)).join(', ');
    return `
      <div class="cfg-result cfg-custom">
        <div class="cfg-badge">${esc(t('custom_badge'))}</div>
        <h3>${esc(t('custom_h'))}</h3>
        <p>${esc(t('custom_p'))}</p>
        ${names ? `<p class="cfg-muted">${esc(t('custom_team'))} ${names}</p>` : ''}
        ${renderPrep(estimate)}
        <div class="cfg-cta-row">
          <button type="button" class="cfg-cta cfg-req-cta">${esc(t('req_cta'))}</button>
          <a class="cfg-cta cfg-cta-secondary" href="#contact">${esc(t('cta'))}</a>
        </div>
        <p class="cfg-disclaimer">${esc(t('disclaimer'))}</p>
      </div>`;
  }

  const teamCards = estimate.recommended_agents.map((a) => `
    <div class="cfg-agent">
      <img class="cfg-agent-portrait" src="/images/${esc(a.id)}.png" alt="${esc(a.name)}" loading="lazy" onerror="this.style.display='none'" />
      <div class="cfg-agent-body">
        <div class="cfg-agent-head">
          <span class="cfg-agent-name">${esc(a.name)}</span>
          <span class="cfg-agent-role">${esc(agentRole(a))}</span>
        </div>
        <p class="cfg-agent-blurb">${esc(agentBlurb(a))}</p>
      </div>
    </div>`).join('');

  // additional usage (non-credit), only lines with real overage
  const usageLines = (estimate.extra_usage || [])
    .filter((u) => !u.credit_based && u.extra_units > 0)
    .map((u) => `
      <li>
        <span>${esc(cap(metricLabel(u.metric)))}</span>
        <span class="cfg-num">+${u.extra_units.toLocaleString('en-US')} · ${rng(u.estimated_extra_cost)}/mo</span>
      </li>`).join('');

  const usageBlock = usageLines ? `
    <div class="cfg-line-group">
      <div class="cfg-line-title">${esc(t('add_usage'))}</div>
      <ul class="cfg-usage">${usageLines}</ul>
      <p class="cfg-muted">${esc(t('add_usage_note'))}</p>
    </div>` : '';

  // Vera / video credits — package and extra shown SEPARATELY
  const c = estimate.breakdown && estimate.breakdown.credits;
  const hasCredits = c && c.package_monthly > 0;
  const creditsBlock = hasCredits ? `
    <div class="cfg-line-group">
      <div class="cfg-line-title">${esc(t('video_prod'))}</div>
      <ul class="cfg-usage">
        <li><span>${esc(t('video_pkg'))}</span><span class="cfg-num">${fmt(c.package_monthly)}/mo · ${esc(t('credits_included').replace('{n}', c.package_included))}</span></li>
        ${c.extra_credits > 0
      ? `<li><span>${esc(t('video_extra'))}</span><span class="cfg-num">+${c.extra_credits} · ${rng(c.extra_estimate)}/mo</span></li>`
      : `<li><span>${esc(t('video_extra'))}</span><span class="cfg-num cfg-muted">${esc(t('video_none'))}</span></li>`}
      </ul>
      <p class="cfg-muted">${esc(t('video_note'))}</p>
    </div>` : '';

  const bundle = estimate.bundle && estimate.bundle.discount
    ? `<div class="cfg-bundle">${esc(t('bundle').replace('{pct}', Math.round(estimate.bundle.discount * 100)).replace('{n}', estimate.bundle.agent_count))}</div>`
    : '';

  return `
    <div class="cfg-result">
      <div class="cfg-block">
        <div class="cfg-block-title">${esc(estimate.recommended_agents.length > 1 ? t('rec_team') : t('rec_one'))}</div>
        <div class="cfg-agents">${teamCards}</div>
        ${bundle}
      </div>

      <div class="cfg-prices">
        <div class="cfg-price">
          <div class="cfg-price-label">${esc(t('setup_label'))}</div>
          <div class="cfg-price-val">${rng(estimate.setup_range)}</div>
          <div class="cfg-price-note">${esc(t('setup_note'))}</div>
        </div>
        <div class="cfg-price">
          <div class="cfg-price-label">${esc(t('monthly_label'))}</div>
          <div class="cfg-price-val">${rng(estimate.monthly_range)}</div>
          <div class="cfg-price-note">${esc(t('monthly_note'))}</div>
        </div>
      </div>

      <p class="cfg-muted cfg-plan-relation">${esc(t('plan_relation'))}</p>

      ${usageBlock}
      ${creditsBlock}

      ${renderPrep(estimate)}

      <div class="cfg-cta-row">
        <button type="button" class="cfg-cta cfg-req-cta">${esc(t('req_cta'))}</button>
        <a class="cfg-cta cfg-cta-secondary" href="#contact">${esc(t('cta'))}</a>
      </div>
      <p class="cfg-disclaimer">${esc(t('disclaimer'))}</p>
    </div>`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function metricLabel(metric) { return t('ml_' + metric) !== ('ml_' + metric) ? t('ml_' + metric) : (METRIC_LABEL[metric] || metric); }

// ---------- DOM wiring (runs only in a browser) ----------

function collectSelections(root) {
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [...root.querySelectorAll(sel)];
  const checked = (name) => qa(`input[name="${name}"]:checked`).map((el) => el.value);

  const levelSel = (qa('input[name="usage"]:checked')[0] || {}).value || 'normal';
  const isExact = levelSel === 'exact';
  const num = parseFloat(q('#cfg-usage-number')?.value);
  const kbToggle = q('#cfg-kb')?.checked;
  const support = q('#cfg-support')?.value || 'standard';

  return {
    business: q('#cfg-business')?.value || '',
    intents: checked('intent'),
    channels: checked('channel'),
    // Low/Normal/High map straight through; "exact" falls back to a normal
    // baseline unless a real number is supplied. Engine logic is untouched.
    usageLevel: isExact ? 'normal' : levelSel,
    usageNumber: isExact && Number.isFinite(num) ? num : undefined,
    kb: { present: !!kbToggle, size: q('#cfg-kb-size')?.value || 'small' },
    integrations: checked('integration'),
    otherIntegration: q('#cfg-other-integration')?.value || '',
    media: checked('media'),
    translation: !!q('#cfg-languages')?.checked,
    support,
  };
}

export function runEstimate(root, out) {
  const sel = collectSelections(root);
  const input = buildInput(sel);
  const estimate = buildEstimate(input);
  lastEstimate = estimate;
  lastSel = sel;
  out.innerHTML = renderResult(estimate);
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return { input, estimate };
}

/**
 * Localize the whole configurator (static form DOM + any rendered result) into
 * `lang`. Exposed on window so the site's applyLang() can call it, mirroring
 * localizeDemo/localizeTrust/localizeRoi. Engine/pricing stay language-neutral.
 */
export function localizeConfigurator(lang) {
  if (typeof document === 'undefined') return;
  CUR = resolveLang(lang);
  const root = document.getElementById('configurator');
  if (!root) return;
  root.querySelectorAll('[data-cfg-i18n]').forEach((el) => {
    const k = el.getAttribute('data-cfg-i18n');
    if (CFG_I18N[CUR] && CFG_I18N[CUR][k] != null) el.textContent = CFG_I18N[CUR][k];
  });
  root.querySelectorAll('[data-cfg-i18n-ph]').forEach((el) => {
    const k = el.getAttribute('data-cfg-i18n-ph');
    if (CFG_I18N[CUR] && CFG_I18N[CUR][k] != null) el.setAttribute('placeholder', CFG_I18N[CUR][k]);
  });
  const form = document.getElementById('cfg-form');
  if (form) updateMatchHint(form);
  // re-render an existing result so it follows the language switch
  const out = document.getElementById('cfg-output');
  if (out && lastEstimate) out.innerHTML = renderResult(lastEstimate);
}

if (typeof window !== 'undefined') window.localizeConfigurator = localizeConfigurator;

/**
 * Before the "Talk to Hyventa" CTA scrolls to #contact, preselect the top
 * recommended agent in the existing #hv-contact-agent selector (rule 6).
 * For a Custom result the selector is left unchanged.
 */
function preselectContactAgent() {
  if (!lastEstimate || lastEstimate.is_custom) return;
  const rec = lastEstimate.recommended_agents && lastEstimate.recommended_agents[0];
  if (!rec) return;
  const sel = document.getElementById('hv-contact-agent');
  if (!sel) return;
  const match = [...sel.options].find((o) => o.value === rec.name);
  if (!match) return;
  sel.value = rec.name;
  sel.classList.add('hv-picked');
  setTimeout(() => sel.classList.remove('hv-picked'), 1600);
}

/**
 * Step 2 live "potential match" hint. Visual only: it reuses the engine's
 * matchAgents() for a preview and NEVER computes pricing or the final
 * recommendation — buildEstimate() stays authoritative.
 */
function updateMatchHint(root) {
  const box = root.querySelector('#cfg-match-hint');
  if (!box) return;
  const intents = [...root.querySelectorAll('input[name="intent"]:checked')].map((el) => el.value);
  if (!intents.length) { box.hidden = true; box.innerHTML = ''; return; }
  const { matched } = matchAgents({ intent_tags: intents });
  if (!matched.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.innerHTML = matched.length === 1
    ? `<span class="cfg-match-kicker">${esc(t('match_one'))}</span><strong>${esc(matched[0].name)}</strong> — ${esc(agentRole(matched[0]))}`
    : `<span class="cfg-match-kicker">${esc(t('match_many'))}</span><strong>${matched.map((a) => esc(a.name)).join(', ')}</strong>`;
  box.hidden = false;
}

// ---------- agent-creation request: payload + modal (STEP 17B) ----------

/**
 * Assemble the request payload from the LAST estimate + selections. Pricing is
 * read straight from the engine's estimate — never recalculated on the client.
 */
export function buildRequestPayload(name, email, note) {
  const est = lastEstimate || {};
  const sel = lastSel || {};
  const agents = est.recommended_agents || [];
  const top = agents[0] || null;
  const roleEn = top ? (AGENT_ROLE.en[top.id] || top.role || '') : '';

  const intents = [...(sel.intents || [])];
  if (sel.translation && !intents.includes('translation')) intents.push('translation');
  const tasks = intents.map((v) => REQ_TASK_LABEL_EN[v] || v);
  const channels = (sel.channels || []).map((v) => REQ_CHANNEL_LABEL_EN[v] || v);
  const integrations = (sel.integrations || []).map((v) => REQ_INTEGRATION_LABEL_EN[v] || v);
  if (sel.otherIntegration && sel.otherIntegration.trim()) integrations.push(sel.otherIntegration.trim());

  let kb = '';
  if (sel.kb && sel.kb.present) kb = sel.kb.size === 'large' ? 'Large knowledge base' : 'Small knowledge base';

  let usage;
  if (Number.isFinite(sel.usageNumber) && sel.usageNumber > 0) usage = 'Exact: ' + Math.round(sel.usageNumber) + '/mo';
  else usage = ({ low: 'Low', normal: 'Normal', high: 'High' }[sel.usageLevel] || 'Normal');

  const setup = est.setup_range || { low: 0, high: 0 };
  const monthly = est.monthly_range || { low: 0, high: 0 };

  return {
    name, email, note,
    language: CUR,
    agent: top ? top.name : '',
    role: roleEn,
    agents: agents.map((a) => a.name),
    is_custom: !!est.is_custom,
    business: sel.business || '',
    tasks, channels, integrations,
    knowledge_base: kb,
    usage,
    setup_low: Math.round(setup.low) || 0,
    setup_high: Math.round(setup.high) || 0,
    monthly_low: Math.round(monthly.low) || 0,
    monthly_high: Math.round(monthly.high) || 0,
    source: 'configurator',
    submitted_at: new Date().toISOString(),
  };
}

function closeRequestModal() {
  const el = document.getElementById('cfg-req-modal');
  if (el) el.remove();
  document.removeEventListener('keydown', onReqKeydown);
}
function onReqKeydown(e) { if (e.key === 'Escape') closeRequestModal(); }

/** Open the compact "Request Agent Creation" modal for the current estimate. */
function openRequestModal() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cfg-req-modal')) return;
  const est = lastEstimate;
  if (!est) return;
  const top = (est.recommended_agents && est.recommended_agents[0]) || null;
  const host = document.getElementById('configurator') || document.body;

  const overlay = document.createElement('div');
  overlay.id = 'cfg-req-modal';
  overlay.className = 'cfg-req-overlay';
  overlay.innerHTML = `
    <div class="cfg-req-card" role="dialog" aria-modal="true" aria-labelledby="cfg-req-title">
      <button type="button" class="cfg-req-close" aria-label="${esc(t('req_close'))}">&times;</button>
      <h3 id="cfg-req-title">${esc(t('req_title'))}</h3>
      ${top ? `<p class="cfg-req-sub">${esc(t('req_for'))} <strong>${esc(top.name)}</strong> — ${esc(agentRole(top))}</p>` : ''}
      <form class="cfg-req-form" novalidate>
        <label class="cfg-req-label">${esc(t('req_name'))}
          <input type="text" name="name" class="cfg-req-input" autocomplete="name" required />
        </label>
        <label class="cfg-req-label">${esc(t('req_email'))}
          <input type="email" name="email" class="cfg-req-input" autocomplete="email" required />
        </label>
        <label class="cfg-req-label">${esc(t('req_note'))}
          <textarea name="note" class="cfg-req-input cfg-req-textarea" rows="3"></textarea>
        </label>
        <div class="cfg-req-error" role="alert" hidden></div>
        <button type="submit" class="cfg-cta cfg-req-submit">${esc(t('req_submit'))}</button>
      </form>
      <div class="cfg-req-success" hidden>
        <div class="cfg-req-check">✓</div>
        <p class="cfg-req-success-text"></p>
        <button type="button" class="cfg-cta cfg-req-done">${esc(t('req_close'))}</button>
      </div>
    </div>`;
  host.appendChild(overlay);
  document.addEventListener('keydown', onReqKeydown);

  const card = overlay.querySelector('.cfg-req-card');
  const form = overlay.querySelector('.cfg-req-form');
  const errBox = overlay.querySelector('.cfg-req-error');
  const submitBtn = overlay.querySelector('.cfg-req-submit');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRequestModal(); });
  overlay.querySelector('.cfg-req-close').addEventListener('click', closeRequestModal);
  overlay.querySelector('.cfg-req-done').addEventListener('click', closeRequestModal);
  const firstInput = form.querySelector('input[name="name"]');
  if (firstInput) setTimeout(() => firstInput.focus(), 30);

  const showErr = (msg) => { errBox.textContent = msg; errBox.hidden = false; };
  let sending = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const name = (form.name.value || '').trim();
    const email = (form.email.value || '').trim();
    const note = (form.note.value || '').trim();
    errBox.hidden = true; errBox.textContent = '';
    if (!name) { showErr(t('req_err_name')); form.name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr(t('req_err_email')); form.email.focus(); return; }

    sending = true;
    submitBtn.disabled = true;
    const orig = submitBtn.textContent;
    submitBtn.textContent = t('req_sending');
    try {
      const payload = buildRequestPayload(name, email, note);
      const res = await fetch(AGENT_REQUEST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.hidden = true;
      const succ = overlay.querySelector('.cfg-req-success');
      succ.querySelector('.cfg-req-success-text').textContent = t('req_success');
      succ.hidden = false;
    } catch (err) {
      // Graceful fallback: never surface technical errors. Keep the user's data
      // on screen and offer a direct email path with their details pre-filled,
      // so an n8n/webhook outage never loses a lead or blocks a sale.
      const p = buildRequestPayload(name, email, note);
      const bodyLines = [
        'Name: ' + p.name,
        'Email: ' + p.email,
        p.business ? ('Business: ' + p.business) : '',
        p.agent ? ('AI employee: ' + p.agent) : '',
        (p.setup_low || p.setup_high) ? ('Setup estimate: $' + p.setup_low + '-$' + p.setup_high) : '',
        (p.monthly_low || p.monthly_high) ? ('Monthly estimate: $' + p.monthly_low + '-$' + p.monthly_high) : '',
        p.note ? ('Note: ' + p.note) : '',
      ].filter(Boolean);
      const href = 'mailto:hellohyventa@gmail.com?subject=' +
        encodeURIComponent('Hyventa agent request') + '&body=' + encodeURIComponent(bodyLines.join('\n'));
      errBox.textContent = '';
      const line = document.createElement('div');
      line.textContent = t('req_fail');
      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '8px';
      const mail = document.createElement('a');
      mail.href = href;
      mail.textContent = 'hellohyventa@gmail.com';
      mail.className = 'cfg-req-maillink';
      linkWrap.appendChild(mail);
      errBox.appendChild(line);
      errBox.appendChild(linkWrap);
      errBox.hidden = false;
      sending = false;
      submitBtn.disabled = false;
      submitBtn.textContent = orig;
    }
  });
}

export function init() {
  if (typeof document === 'undefined') return;
  const form = document.getElementById('cfg-form');
  const out = document.getElementById('cfg-output');
  if (!form || !out) return;
  ensurePrepStyles();

  // enable KB size only when KB toggled
  const kb = document.getElementById('cfg-kb');
  const kbSize = document.getElementById('cfg-kb-size');
  const syncKb = () => { if (kbSize) kbSize.disabled = !(kb && kb.checked); };
  kb?.addEventListener('change', syncKb);
  syncKb();

  // Step 2: live potential-match hint
  form.querySelectorAll('input[name="intent"]').forEach((el) =>
    el.addEventListener('change', () => updateMatchHint(form)));
  updateMatchHint(form);

  // Step 4: reveal the exact-volume field only when "Enter exact volume" is chosen
  const exactField = document.getElementById('cfg-exact-field');
  const syncExact = () => {
    const v = (form.querySelector('input[name="usage"]:checked') || {}).value;
    if (exactField) exactField.hidden = v !== 'exact';
  };
  form.querySelectorAll('input[name="usage"]').forEach((el) =>
    el.addEventListener('change', syncExact));
  syncExact();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runEstimate(form, out);
  });

  // CTA -> preselect recommended agent, then let the #contact anchor scroll.
  out.addEventListener('click', (e) => {
    const reqBtn = e.target && e.target.closest ? e.target.closest('.cfg-req-cta') : null;
    if (reqBtn) {
      e.preventDefault();
      // Require the acknowledgement only at submission time (viewing the estimate stays open).
      const ack = out.querySelector('.cfg-prep-ack-input');
      if (ack && !ack.checked) {
        const err = out.querySelector('.cfg-prep-ack-err');
        if (err) err.hidden = false;
        const prep = out.querySelector('.cfg-prep');
        if (prep && prep.scrollIntoView) prep.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { ack.focus(); } catch (_e) {}
        return;
      }
      openRequestModal();
      return;
    }
    const cta = e.target && e.target.closest ? e.target.closest('a.cfg-cta') : null;
    if (cta) preselectContactAgent();
  });

  // Clear the acknowledgement error as soon as the visitor ticks the box.
  out.addEventListener('change', (e) => {
    const ack = e.target && e.target.closest ? e.target.closest('.cfg-prep-ack-input') : null;
    if (ack && ack.checked) { const err = out.querySelector('.cfg-prep-ack-err'); if (err) err.hidden = true; }
  });

  // initial localization (site applyLang runs before this deferred module loads)
  localizeConfigurator(document.documentElement.lang || 'en');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
