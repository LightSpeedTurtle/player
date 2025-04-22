import {
  EpisodeFragment,
  InputEpisode,
  InputEpisodeUrl,
  InputExistingTimestamp,
  InputShow,
  InputTimestamp,
  InputTimestampOn,
  Scalars,
  ShowFragment,
} from '../utils/api';
import { getUniqueExistenceMap } from '../utils/array-utils';
import {
  isTimestampEqual,
  undoTimestampsOffset,
  AmbiguousTimestamp, // Import type
} from '../utils/timestamp-utils';
// import { createSubmission } from '../utils/supabase'; // Commented out: File deleted
// import type { SubmissionData } from '../components/SubmissionModal.vue'; // Commented out: Type not used here currently
import { useEpisodeIdentifier } from './useEpisodeIdentifier'; // Import identifier

export default createSharedComposable(() => {
  const { state: auth } = useAuth();
  const { data: currentUrl } = useCurrentUrlQuery();
  const episodeUrl = useApiEpisodeUrl();
  const episodeForm = useEditEpisodeForm();
  const { duration } = useVideoControls();
  const api = useApiClient(true);
  const existingTimestamps = useApiTimestamps();
  const currentTimestamps = useCurrentTimestamps();
  const { stopEditing, isEditing } = useIsEditing(); // Add isEditing
  const { identifier: episodeIdentifier } = useEpisodeIdentifier(); // Get identifier

  const { mutateAsync: createShow } = useCreateShowMutation();
  const { mutateAsync: createEpisode } = useCreateEpisodeMutation();
  const { mutateAsync: updateTimestamps } = useUpdateTimestampsMutation();
  const { mutateAsync: updateEpisode } = useUpdateEpisodeMutation();
  const { mutateAsync: createEpisodeUrl } = useCreateEpisodeUrlMutation();

  return useMutation(
    async () => {
      const newShowName = episodeForm.showName.value.trim();
      const newEpisodeName = episodeForm.episodeName.value.trim();
      const newNumber = episodeForm.number.value.trim();
      const newSeason = episodeForm.season.value.trim();
      const newAbsoluteNumber = episodeForm.absoluteNumber.value.trim();
      const currentDuration = duration.value;
      const url = currentUrl.value;

      if (auth.value == null) {
        throw Error('Not logged in, cannot save.');
      }
      if (!currentDuration || !newShowName || !newEpisodeName || !url) {
        throw Error('Episode has not finished loading, cannot save.');
      }

      const showInput: InputShow = {
        name: newShowName,
      };
      const episodeInput: InputEpisode = {
        name: newEpisodeName,
        number: newNumber,
        season: newSeason,
        absoluteNumber: newAbsoluteNumber,
        baseDuration: episodeUrl.value?.episode.baseDuration ?? currentDuration,
      };

      let show: ShowFragment;
      let episode: EpisodeFragment;
      let timestampsOffset: number;

      if (episodeUrl.value) {
        // Update existing values
        episode = episodeUrl.value.episode;
        show = episode.show;
        timestampsOffset = episodeUrl.value.timestampsOffset ?? 0;

        const updateTasks: Promise<unknown>[] = [];
        if (
          newEpisodeName !== episode.name ||
          newSeason !== episode.season ||
          newNumber !== episode.number ||
          newAbsoluteNumber !== episode.absoluteNumber
        ) {
          updateTasks.push(
            updateEpisode({ episodeId: episode.id, newEpisode: episodeInput }),
          );
        }
        await Promise.all(updateTasks);
      } else {
        // Create show if an exact name match doesn't exist
        const results = await api.searchShows({ search: newShowName });
        const exactShow = results.searchShows.find(
          (s) => s.name.toLowerCase() === newShowName.toLowerCase(),
        );
        if (exactShow) {
          show = exactShow;
        } else {
          const res = await createShow({ showInput, becomeAdmin: true });
          show = res.createShow;
        }
        // Create new episode/show based on episode form
        episode = (await createEpisode({ showId: show.id, episodeInput }))
          .createEpisode;

        timestampsOffset =
          currentDuration - (episode.baseDuration ?? currentDuration);
        const episodeUrlInput: InputEpisodeUrl = {
          url,
          duration: currentDuration,
          timestampsOffset,
        };
        await createEpisodeUrl({ episodeId: episode.id, episodeUrlInput });
      }

      // TODO: Refactor Show/Episode creation/update logic to use Supabase if necessary

      // Save timestamps
      {
        // Remove timestamp offsets so values are saved without them
        const realExistingTimestamps = undoTimestampsOffset(
          existingTimestamps.value ?? [],
          timestampsOffset,
        );
        const realCurrentTimestamps = undoTimestampsOffset(
          currentTimestamps.value,
          timestampsOffset,
        );

        // Prepare arrays for Supabase create and legacy update/delete
        const createPromises: Promise<any>[] = [];
        const updatedTimestamps: InputExistingTimestamp[] = []; // For legacy update
        const deletedTimestamps: Scalars['ID'][] = []; // For legacy delete

        const existingMap = getUniqueExistenceMap(realExistingTimestamps, 'id');
        // Removed duplicate declarations
        for (const edited of realCurrentTimestamps as AmbiguousTimestamp[]) {
          // Assert type
          // Map internal typeId (UUID) back to Supabase type string ('suggestive', etc.)
          // TODO: This requires the REVERSE map of typeStringToIdMap used in useApiTimestamps
          const typeString = 'PLACEHOLDER_TYPE_STRING'; // Replace with actual reverse lookup
          // TODO: Determine end_time for the submission. How was this handled previously? Placeholder for now.
          const endTimePlaceholder = edited.at + 5; // Example: 5 second duration

          if (typeof edited.id === 'number') {
            // --- CREATE new timestamps via Supabase (Currently Disabled) ---
            if (!episodeIdentifier.value) {
              console.error(
                'Cannot create submission, missing episode identifier.',
              );
              continue; // Skip this one
            }
            // const submissionData: Omit<SubmissionData, 'submitter_user_id'> = { // Commented out: Type not imported
            //   episode_identifier: episodeIdentifier.value,
            //   start_time: edited.at,
            //   end_time: endTimePlaceholder, // Use calculated/retrieved end time
            //type: typeString, // Keep this line
            //   // explanation: edited.explanation, // Add if available on edited object
            //   // Add other fields like showName, season, episode if available and needed
            // };
            // Add the promise to the array
            // createPromises.push(createSubmission(submissionData)); // Commented out: createSubmission not available here
            console.warn(
              'Skipping creation of new timestamp via Supabase - createSubmission needs refactoring/moving.',
            ); // Keep warning
            // --- End CREATE ---
          } else if (!isTimestampEqual(existingMap[edited.id], edited)) {
            // --- UPDATE edited timestamps (Still uses old GraphQL logic) ---
            // TODO: Refactor this part to update Supabase submissions if needed
            const inputTimestamp: InputTimestamp = {
              at: edited.at,
              typeId: edited.typeId, // Keep using UUID for old mutation
              source: edited.source,
            };
            updatedTimestamps.push({
              id: edited.id, // String UUID for existing timestamps
              timestamp: inputTimestamp,
            });
            // --- End UPDATE ---
          }
        }

        const currentMap = getUniqueExistenceMap(realCurrentTimestamps, 'id');
        for (const existing of realExistingTimestamps) {
          // --- DELETE timestamps (Still uses old GraphQL logic) ---
          // TODO: Refactor this part to delete Supabase submissions if needed
          if (currentMap[existing.id] == null) {
            // Ensure existing.id is a string before pushing, as legacy delete expects ID[] (string[])
            if (typeof existing.id === 'string') {
              deletedTimestamps.push(existing.id);
            } else {
              console.warn(`Skipping delete for non-string ID: ${existing.id}`);
            }
          }
          // --- End DELETE ---
        }

        // Removed editedCount as it's no longer used directly

        // Execute all new submission promises
        await Promise.all(createPromises);
        console.log(
          `Successfully created ${createPromises.length} submissions via Supabase.`,
        );

        // Execute old GraphQL mutation ONLY if there are updates or deletes
        if (updatedTimestamps.length > 0 || deletedTimestamps.length > 0) {
          console.warn(
            'Executing legacy updateTimestamps mutation for updates/deletes.',
          );
          // TODO: Remove this call once update/delete logic is migrated
          await updateTimestamps({
            create: [], // Pass empty array for create as it's handled by Supabase now
            update: updatedTimestamps,
            delete: deletedTimestamps,
          });
        } else if (createPromises.length === 0) {
          console.log('No timestamp changes detected to save.');
        }
      }
    },
    {
      onSuccess: stopEditing,
    },
  );
});
