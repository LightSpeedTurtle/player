import { defineConfig } from 'wxt';
import dotenv from 'dotenv';

// Load .env file from the project root
dotenv.config({ path: '../../.env' }); // Load .env into process.env

// Supabase variables removed temporarily.

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  manifest: ({ mode, browser }) => {
    const manifest: any = {
      name: `Anime Skip Player${mode === 'development' ? ' (DEV)' : ''}`,
      description:
        'Custom video player for anime streaming websites. Skip intros, outros, and more.',
      permissions: ['storage', 'activeTab', 'contextMenus'],
    };
    if (browser === 'firefox') {
      manifest.browser_specific_settings = {
        gecko: {
          id: '{0442d98f-4ecc-4859-a65a-13e5969da46b}',
          strict_min_version: '109.0',
        },
      };
    }

    return manifest;
  },
  zip: {
    name: 'anime-skip-player',
    sourcesRoot: '../..',
    ignoredSources: ['apps/inspector', 'apps/embedded-demo', 'README.md'],
  },
  // Add Vite configuration
  vite: () => ({
    // Use define to replace process.env variables during build
    define: {
      // Supabase variables removed temporarily.
      // To re-enable, add back the definitions for
      // 'process.env.VITE_SUPABASE_URL' and 'process.env.VITE_SUPABASE_ANON_KEY'
      // after restoring the variable loading logic above.
    },
    // Removed external config block entirely
  }),
});
