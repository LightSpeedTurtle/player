import '~/assets/crunchyroll-player.scss';
import { ColorTheme } from '@anime-skip/player';

export default defineContentScript({
  matches: ['*://static.crunchyroll.com/vilos-v2/web/vilos/player.html'],
  allFrames: true,
  main(ctx) {
    // Load player
    initExtensionPlayer({
      ctx,
      serviceName: 'Crunchyroll',
      serviceTheme: ColorTheme.CrunchyrollOrange,
      parentElement: 'body',
      fullscreenElement: 'body',
      // Strip and remove -XXXXXX from end of url
      transformServiceUrl(inputUrl) {
        // Defensive logging for debugging
        console.debug(
          '[Crunchyroll Extension] transformServiceUrl input:',
          inputUrl,
          'type:',
          typeof inputUrl,
        );
        const stripped = stripUrl(inputUrl);
        if (typeof stripped !== 'string') {
          console.warn(
            '[Crunchyroll Extension] transformServiceUrl: stripUrl did not return a string:',
            stripped,
            'type:',
            typeof stripped,
          );
          return '';
        }
        const result = stripped.replace(/-[0-9]+$/, '');
        console.debug(
          '[Crunchyroll Extension] transformServiceUrl output:',
          result,
        );
        return result;
      },
      // Crunchyroll has two iframes, one for preloading and one for the actual video. This skips
      // the preloading one
      isDisabled() {
        return document.body.getBoundingClientRect().width === 0;
      },
    });
  },
});
