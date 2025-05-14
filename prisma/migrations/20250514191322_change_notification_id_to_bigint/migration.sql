-- First, drop the primary key constraint (without changing the data)
ALTER TABLE "CabinetNotification" DROP CONSTRAINT IF EXISTS "CabinetNotification_pkey";

-- Change the column type to BIGINT
ALTER TABLE "CabinetNotification" ALTER COLUMN "id" TYPE BIGINT USING id::BIGINT;

-- Recreate the primary key constraint
ALTER TABLE "CabinetNotification" ADD PRIMARY KEY ("id");