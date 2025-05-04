# User Info Modal & Session Management

## Purpose

This extension requires the user to provide a phone number for personalized filtering of timestamp submissions. If the phone number is missing from localStorage, the extension automatically prompts the user to enter it via a modal dialog.

## How It Works

- On mount, the extension checks if `sessionUserInfo.phone` exists in `localStorage`.
- If missing, a modal (`UserInfoModal.vue`) is displayed asking the user to enter their phone number.
- The phone number is validated (digits only, 7-15 digits) and saved to `localStorage` as `{ phone: '1234567890' }`.
- When the modal closes, the extension re-checks for the phone number and reloads the page if it is now present.
- This ensures the filtering logic always has the required user context and prevents silent failures.

## Developer Integration

- The modal is integrated in `SidePanel.vue`.
- The modal can be shown by setting `showUserModal.value = true`.
- The modal emits a `close` event when the user saves their phone number.

## Example

```js
// Check for session user info
const sessionUserInfo = JSON.parse(
  localStorage.getItem('sessionUserInfo') || '{}',
);
if (!sessionUserInfo.phone) {
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
