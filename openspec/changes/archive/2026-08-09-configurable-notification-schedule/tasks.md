# Configurable Notification Schedule Tasks

- [x] 1.1 Add `notificationHour` column to `User` entity (`apps/backend/src/users/entities/user.entity.ts`). Default 20, range 0-23.
- [x] 1.2 Add `notificationHour` optional validation in `UpdateUserDto` (`apps/backend/src/users/dto/update-user.dto.ts`).
- [x] 2.1 Update `UsersService.update` (`apps/backend/src/users/users.service.ts`) to handle and persist `notificationHour`.
- [x] 2.2 Change `@Cron('0 20 * * *')` to `@Cron('0 * * * *')` in `RenewalScheduler` (`apps/backend/src/cron-job/cron-job.scheduler.ts`).
- [x] 2.3 Filter renewals by matching `currentHour` against `user.notificationHour` in `RenewalScheduler` (`apps/backend/src/cron-job/cron-job.scheduler.ts`) and `SubscriptionsService` (`apps/backend/src/subscriptions/subscriptions.service.ts`).
- [x] 3.1 Update frontend `User` interface in `apps/frontend/src/services/api.ts`.
- [x] 3.2 Update Profile UI in `apps/frontend/src/pages/Profile.tsx` to include notification hour selector (00:00 to 23:00).
- [x] 4.1 Unit tests for backend changes.
- [x] 4.2 Verify frontend changes.
- [x] 4.3 Verify full integration.
