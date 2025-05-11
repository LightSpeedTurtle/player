# User Info Modal & Session Management

## Purpose

This extension requires the user to provide a phone number for personalized filtering of timestamp submissions. If the phone number is missing from localStorage, the extension automatically prompts the user to enter it via a modal dialog.

## How It Works (2025+)

- User info (first name, phone) is managed via the `useSessionUserInfo` composable, which is the single source of truth for user info state.
- On mount, the app checks if `userInfo.value` exists (from the composable). If missing, the modal (`UserInfoModal.vue`) is shown to prompt for info.
- User info is validated and saved via the composable, which keeps both Vue state and `localStorage` in sync.
- All components should access user info via the composable, not directly from `localStorage`.
- The modal pre-fills fields with existing info (if any) and only resets to blank if no info is present.
- This ensures all user info is consistent, persistent, and reactively updates the UI wherever used.

## Developer Integration

- Import and use the composable in any component:

  ```js
  import { useSessionUserInfo } from '../composables/useSessionUserInfo';
  const { userInfo, saveUserInfo } = useSessionUserInfo();
  ```

- Show the modal by toggling the appropriate `showUserInfoModal` ref in your component.
- The modal emits a `close` event when the user saves their info.
- Always use the composable for reading and writing user info.

## Example

```js
import { useSessionUserInfo } from '../composables/useSessionUserInfo';
const { userInfo } = useSessionUserInfo();
if (!userInfo.value) {
  // Show modal
}
```

## Best Practices

- Always document user context requirements in your README and code comments.
- Use clear validation and error messages for user input.
- For multi-user or multi-field scenarios, expand the modal to collect more fields as needed.

## See Also

- `src/components/UserInfoModal.vue`
- `src/components/SidePanel.vue`
