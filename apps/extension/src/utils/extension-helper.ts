import { PlayerOptions } from '@anime-skip/player';
import type { ContentScriptContext } from 'wxt/client';
import logger from './logger';

export function initExtensionHelper(options: HelperOptions) {
  initKeyboardShortcutForwarder(options.ctx);
  messaging.onMessage('getEpisodeInfoFromHelper', () =>
    options.getEpisodeInfo(),
  );
  messaging.onMessage('getTopFrameUrl', () => {
    logger.log(
      '[Extension Helper] getTopFrameUrl handler called, returning:',
      location.href,
    );
    return location.href;
  });
}

export interface HelperOptions {
  ctx: ContentScriptContext;
  getEpisodeInfo: NonNullable<PlayerOptions['getEpisodeInfo']>;
}
