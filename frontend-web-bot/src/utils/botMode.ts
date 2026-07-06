export type BotMode = 'portfolio' | 'standalone';

/** Portafolio (iframe / ?embed=portfolio) vs página propia del bot. */
export function getBotMode(): BotMode {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('embed') ?? params.get('mode');
  if (embed === 'portfolio' || embed === 'widget') return 'portfolio';
  if (embed === 'standalone') return 'standalone';

  try {
    if (window.self !== window.top) return 'portfolio';
  } catch {
    return 'portfolio';
  }

  return 'standalone';
}
