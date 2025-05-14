# Migration `20250514191322_change_notification_id_to_bigint`

This migration changes the `CabinetNotification` table's ID column from an integer to a bigint to support larger notification IDs.

## Changes

- Changed the ID column type in CabinetNotification table from INT to BIGINT
- This allows support for larger notification IDs like 1747238892200

## Justification

The original implementation used standard INT type which has a maximum value of approximately 2.1 billion. The notification IDs coming from the Telegram API can be much larger than this, which was causing errors when trying to reference these notifications in the UI.