const BUILT_IN_BOT_PATTERN = /(?:googlebot|bingbot|duckduckbot|baiduspider|yandexbot|yandeximages|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|applebot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|screaming frog|crawler|spider|headlesschrome|phantomjs)/i;

export function isKnownBotUserAgent(
  userAgent: string,
  additionalPattern?: RegExp
): boolean {
  if (BUILT_IN_BOT_PATTERN.test(userAgent)) return true;
  if (!additionalPattern) return false;

  // Global/sticky RegExp instances retain lastIndex, so reset before testing.
  additionalPattern.lastIndex = 0;
  return additionalPattern.test(userAgent);
}
