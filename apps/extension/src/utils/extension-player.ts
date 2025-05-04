import {
  PlayerOptions,
  PlayerVisibility,
  createPlayer,
  useEpisodeIdentifier,
  IPlayerStorage,
} from '@anime-skip/player';
import { ContentScriptContext } from 'wxt/client';
// Import storage creators statically
import { createExtensionPlayerStorage } from './extension-storage';
// Removed static import of createSupabasePlayerStorage
// Import necessary functions/types statically
import { initKeyboardShortcutReciever } from './keyboard-shortcut-forwarder';
import logger from './logger'; // Correct: default import
import { messaging } from './messaging'; // Correct: named export
import { CLIENT_ID, TEST_API_URL, PROD_API_URL } from './constants';

export async function initExtensionPlayer(
  options: ExtensionPlayerOptions,
): Promise<void> {
  // Make async
  logger.log(`Mounted ${options.serviceName} player`);

  // Always use the extension's local storage
  const storageImplementation = createExtensionPlayerStorage();
  logger.log('Using local extension storage implementation.');

  const isDev = import.meta.env.MODE === 'development';

  initKeyboardShortcutReciever(options.ctx);

  const { setIdentifier } = useEpisodeIdentifier();

  const player = createPlayer({
    storage: storageImplementation, // Use the conditionally selected storage
    apiClientId: CLIENT_ID,
    apiUrl: isDev ? TEST_API_URL : PROD_API_URL,
    getEpisodeInfo() {
      // Send messsage to background
      return messaging.sendMessage('getEpisodeInfoFromHelper', undefined);
    },
    onVisibilityChange(visiblity) {
      const hideBuiltinPlayer =
        visiblity === PlayerVisibility.Visible ||
        visiblity === PlayerVisibility.Hidden;

      if (hideBuiltinPlayer) {
        document.documentElement.setAttribute(
          'anime-skip-hide-builtin-player',
          '',
        );
      } else {
        document.documentElement.removeAttribute(
          'anime-skip-hide-builtin-player',
        );
      }
    },
    async getEpisodeUrl() {
      const url = await messaging.sendMessage('getTopFrameUrl', undefined);
      logger.log(
        '[Crunchyroll Extension] getEpisodeUrl received url:',
        url,
        'type:',
        typeof url,
      );
      if (url == null) throw Error("Could not find episode's URL");

      // Optionally, log if url is not a string
      if (typeof url !== 'string') {
        logger.warn(
          '[Crunchyroll Extension] getEpisodeUrl: url is not a string!',
          url,
        );
      }

      logger.log(
        '[Crunchyroll Extension] getEpisodeUrl: transforming url with transformServiceUrl',
        url,
      );
      const episodeIdentifier =
        options.transformServiceUrl?.(url) ?? stripUrl(url);
      // Set the shared state *after* getting the identifier
      setIdentifier(episodeIdentifier);
      return episodeIdentifier;
    },
    disableContextMenu: true,
    ...options,
  });
  player.mount(options.parentElement);

  messaging.onMessage(
    'setPlayerVisibility',
    async ({ data }: { data: PlayerVisibility }) => {
      // Added type annotation
      player.setPlayerVisibility(data);
    },
  );
  messaging.onMessage(
    'sendScreenshotToTab',
    async ({ data }: { data: string }) => {
      // Added type annotation
      player.showScreenshot(data);
    },
  );

  options.ctx.onInvalidated(() => player.unmount());
}

// Helper function (if not imported elsewhere) - Keep this
function stripUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url; // Return original if parsing fails
  }
}

export interface ExtensionPlayerOptions
  extends Omit<PlayerOptions, 'apiClientId' | 'apiUrl' | 'storage'> {
  ctx: ContentScriptContext;
  parentElement: string | Element;
  transformServiceUrl?(url: string): string;
  isDisabled?(): boolean;
}
