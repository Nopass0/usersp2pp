# Fix Notification ID Handling for Large IDs

## Problem
Users are experiencing errors when trying to mark notifications as read. Specifically, the error occurs with large notification IDs like `1747238892200` which exceed the maximum value of standard INT data type in PostgreSQL.

Error message:
```
TRPCClientError: Failed to mark notification as read
```

## Solution
This PR changes the `CabinetNotification` ID column type from INT to BIGINT to support larger IDs from the Telegram API, and modifies how we handle IDs in the system.

### Changes:
1. Updated the Prisma schema to use `BigInt` for the CabinetNotification ID field
2. Created database migration to alter the table column type
   - Properly drops and recreates primary key constraints
3. Modified notification handlers to explicitly set IDs rather than using auto-increment
   - Uses message_id directly when it's numeric
   - Generates unique BigInt IDs when necessary
4. Updated client components to properly handle BigInt notification IDs:
   - NotificationBell component
   - NotificationAlert component
   - Notifications page
5. Updated the notification router to accept BigInt or string IDs

## Testing
- Verified that notifications with large IDs can be correctly marked as read
- Ensured existing functionality works for normal IDs
- Tested pagination on the notifications page
- Verified proper ID handling in both creation and retrieval flows

## Additional notes
- This approach avoids issues with auto-incrementing bigint in PostgreSQL
- Maintains backward compatibility with existing notification records
- Explicit notification IDs allow for more reliable deduplication