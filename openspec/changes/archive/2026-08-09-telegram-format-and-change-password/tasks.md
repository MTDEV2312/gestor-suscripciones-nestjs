# Tasks for telegram-format-and-change-password

## 1. Telegram HTML Formatting Helper & Renewal Scheduler updates
- [x] 1.1 Add `escapeHtml` helper method in `NotificationsService` (`apps/backend/src/notifications/notifications.service.ts`)
- [x] 1.2 Update `RenewalScheduler` (`apps/backend/src/cron-job/cron-job.scheduler.ts`) to format notifications using rich HTML (`<b>`, `<code>`, `<i>`), emojis (🚨 for due/1-day, ⚠️ for 3-day, 📅 for 7-day, 💳 for details), section headers, and visual dividers (`━━━━━━━━━━━━━━━━━━━━━`), escaping subscription names and dynamic text.
- [x] 1.3 Update tests in `cron-job.scheduler.spec.ts` to verify rich HTML formatted messages.

## 2. Backend Change Password Endpoint & Service Logic
- [x] 2.1 Update/Create `PasswordUpdateDto` (`apps/backend/src/users/dto/password-update.dto.ts`) with `currentPassword`, `newPassword`, and `repeatPassword` fields and validation rules.
- [x] 2.2 Import `SecurityModule` in `UsersModule` (`apps/backend/src/users/users.module.ts`).
- [x] 2.3 Implement `changePassword` method in `UsersService` (`apps/backend/src/users/users.service.ts`) using `PasswordService` to verify `currentPassword` and hash `newPassword`.
- [x] 2.4 Expose `PATCH /users/change-password` endpoint in `UsersController` (`apps/backend/src/users/users.controller.ts`).

## 3. Frontend Change Password API & Profile Component UI
- [x] 3.1 Update frontend API client (`apps/frontend/src/services/api.ts`) to include `api.user.changePassword`.
- [x] 3.2 Add a "Cambiar Contraseña" card in `Profile.tsx` (`apps/frontend/src/pages/Profile.tsx`) with input fields (`currentPassword`, `newPassword`, `confirmPassword`), validation rules, error/success feedback, and clean styling.

## 4. Unit Tests and Verification
- [x] 4.1 Add unit tests for password change in `users.service.spec.ts`.
- [x] 4.2 Add unit tests for password change endpoint in `users.controller.spec.ts`.
- [x] 4.3 Verify backend tests pass (`npm run test`).
- [x] 4.4 Verify frontend builds and works correctly.
