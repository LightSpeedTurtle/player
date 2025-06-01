import { ref } from 'vue';
import usePlayerOptions from './usePlayerOptions'; // Corrected: Import default export

const EPISODE_LINKS_STORAGE_KEY = 'halalScreenEpisodeLinks';

export interface EpisodeLinkSet {
  crunchyrollLink?: string;
  hianimeLink?: string;
  animepaheLink?: string;
  nineAnimeLink?: string;
  netflixLink?: string;
}

interface AllEpisodeLinks {
  [episodeIdentifier: string]: EpisodeLinkSet;
}

export function useEpisodeLinks() {
  const options = usePlayerOptions(); // Call the imported default function
  const storage = options.storage; // Access storage from the options object

  async function getAllStoredLinks(): Promise<AllEpisodeLinks> {
    if (!storage) {
      console.warn('Storage not available in useEpisodeLinks');
      return {};
    }
    try {
      const links = await storage.getRawItem<AllEpisodeLinks>(
        EPISODE_LINKS_STORAGE_KEY,
      );
      return links ? (links as AllEpisodeLinks) : {};
    } catch (error) {
      console.error('Error fetching episode links from storage:', error);
      return {};
    }
  }

  async function saveAllStoredLinks(allLinks: AllEpisodeLinks): Promise<void> {
    if (!storage) {
      console.warn('Storage not available in useEpisodeLinks');
      return;
    }
    try {
      await storage.setRawItem<AllEpisodeLinks>(
        EPISODE_LINKS_STORAGE_KEY,
        allLinks,
      );
    } catch (error) {
      console.error('Error saving episode links to storage:', error);
    }
  }

  async function getLinksForEpisode(
    episodeIdentifier: string,
  ): Promise<EpisodeLinkSet | null> {
    if (!episodeIdentifier) return null;
    const allLinks = await getAllStoredLinks();
    return allLinks[episodeIdentifier] || null;
  }

  async function saveLinksForEpisode(
    episodeIdentifier: string,
    newLinks: EpisodeLinkSet,
  ): Promise<void> {
    if (!episodeIdentifier) return;
    const allLinks = await getAllStoredLinks();
    allLinks[episodeIdentifier] = {
      ...(allLinks[episodeIdentifier] || {}),
      ...newLinks,
    };
    await saveAllStoredLinks(allLinks);
  }

  return {
    getLinksForEpisode,
    saveLinksForEpisode,
  };
}
