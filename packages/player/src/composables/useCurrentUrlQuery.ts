import { QueryKey } from '../utils/QueryKey';
import { SECOND } from '../utils/time';

/**
 * Returns a query containing the page's current URL.
 */
export default createGlobalState(() => {
  const { getEpisodeUrl } = usePlayerOptions();
  return useQuery(QueryKey.CurrentUrl, getEpisodeUrl, {
    // Removed refetchInterval: SECOND to prevent constant polling.
    // The URL will be fetched on mount and when invalidated.
  });
});
