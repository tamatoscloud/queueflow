export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export const DEFAULT_TEMPLATES: Record<
  string,
  { en: string; ur?: string }
> = {
  QUEUE_JOINED_WHATSAPP: {
    en: 'Hi {{customerName}}, you joined {{queueName}}. Your token is {{displayCode}}. Position: {{position}}.',
  },
  QUEUE_JOINED_SMS: {
    en: '{{displayCode}} — position {{position}} in {{queueName}}.',
  },
  YOUR_TURN_WHATSAPP: {
    en: "It's your turn at {{queueName}}! Please proceed with token {{displayCode}}.",
  },
  YOUR_TURN_SMS: {
    en: 'Your turn: {{displayCode}} at {{queueName}}.',
  },
  POSITION_UPDATE_WHATSAPP: {
    en: 'Update for {{queueName}}: you are #{{position}}. Est. wait {{etaMinutes}} min.',
  },
  POSITION_UPDATE_SMS: {
    en: '{{queueName}}: position {{position}}, ~{{etaMinutes}} min wait.',
  },
  ALMOST_YOUR_TURN_WHATSAPP: {
    en: 'Almost your turn at {{queueName}}! You are #{{position}}.',
  },
  ALMOST_YOUR_TURN_SMS: {
    en: 'Almost your turn — #{{position}} at {{queueName}}.',
  },
  QUEUE_CANCELLED_WHATSAPP: {
    en: 'Your queue entry {{displayCode}} at {{queueName}} was cancelled.',
  },
  QUEUE_CANCELLED_SMS: {
    en: 'Entry {{displayCode}} cancelled at {{queueName}}.',
  },
  FEEDBACK_REQUEST_WHATSAPP: {
    en: 'Thanks for visiting {{queueName}}! Share feedback: {{feedbackUrl}}',
  },
  FEEDBACK_REQUEST_SMS: {
    en: 'Rate your visit: {{feedbackUrl}}',
  },
  QUEUE_PAUSED_WHATSAPP: {
    en: '{{queueName}} is temporarily paused. We will notify you when service resumes.',
  },
  QUEUE_PAUSED_SMS: {
    en: '{{queueName}} paused — we will update you soon.',
  },
  QUEUE_RESUMED_WHATSAPP: {
    en: '{{queueName}} has resumed. Your position: {{position}}.',
  },
  QUEUE_RESUMED_SMS: {
    en: '{{queueName}} resumed. Position {{position}}.',
  },
  QUEUE_CLOSED_WHATSAPP: {
    en: '{{queueName}} is now closed. Your entry {{displayCode}} is no longer active.',
  },
  QUEUE_CLOSED_SMS: {
    en: '{{queueName}} closed.',
  },
  CUSTOM_WHATSAPP: {
    en: '{{message}}',
  },
  CUSTOM_SMS: {
    en: '{{message}}',
  },
};
