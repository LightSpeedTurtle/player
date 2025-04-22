import { IPlayerStorage } from '@anime-skip/player';

// This file previously contained the Supabase storage implementation.
// It has been temporarily removed to simplify testing and development.
// The extension is currently configured to use local browser storage via
// './extension-storage.ts' as defined in './extension-player.ts'.

// To re-enable Supabase:
// 1. Restore the contents of this file from version control.
// 2. Update './extension-player.ts' to conditionally import and use
//    `createSupabasePlayerStorage` from this file again.
// 3. Ensure Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
//    are correctly set in the .env file and wxt.config.ts.
// 4. Restore Supabase credential handling in './entrypoints/background.ts'.

// Placeholder export to avoid breaking potential type imports elsewhere, though unlikely.
// You might consider removing this file entirely if it's confirmed to be unused.
export const createSupabasePlayerStorage: () => Promise<IPlayerStorage> =
  async () => {
    throw new Error('Supabase storage is currently disabled.');
  };
