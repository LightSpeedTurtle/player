// Removed import of PlayerVisibility from '@anime-skip/player';
// Removed Supabase client initialization from here

export default defineBackground(async () => {
  // Make async
  // Supabase config handling removed temporarily.
  // To re-enable, restore the logic for reading VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY
  // from import.meta.env and storing them in browser.storage.local.

  messaging.onMessage('getTopFrameUrl', async ({ sender, data }) => {
    return messaging.sendMessage('getTopFrameUrl', data, sender.tab?.id);
  });

  messaging.onMessage('getEpisodeInfoFromHelper', ({ sender }) => {
    // Send the message back to the tab, asking the helper to get the episode info
    return messaging.sendMessage(
      'getEpisodeInfoFromHelper',
      undefined,
      sender.tab?.id,
    );
  });

  // Setup screenshot process
  browser.contextMenus.create({
    id: 'screenshot',
    title: 'Take Screenshot',
  });
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'screenshot') return;

    try {
      await messaging.sendMessage(
        'setPlayerVisibility',
        2, // Use literal value for PlayerVisibility.Hidden
        tab?.id,
      );
      const res = await browser.tabs.captureVisibleTab(tab?.windowId, {
        format: 'jpeg',
        quality: 100,
      });
      await messaging.sendMessage('sendScreenshotToTab', res, tab?.id);
    } finally {
      await messaging.sendMessage(
        'setPlayerVisibility',
        0, // Use literal value for PlayerVisibility.Visible
        tab?.id,
      );
    }
  });

  // messaging.onMessage('takeScreenshot', async ({ data: bounds }) => {
  //   const full = await browser.tabs.captureVisibleTab(undefined, {
  //     format: 'jpeg',
  //     quality: 100,
  //     // rect: bounds,
  //   });
  //   return full;
  // });
});
