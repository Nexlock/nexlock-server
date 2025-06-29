/*
  Warnings:

  - You are about to drop the column `endDate` on the `LockerRental` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LockerRental" DROP COLUMN "endDate",
ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '6 hours');

-- AlterTable
ALTER TABLE "RegistrationCode" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '1 day');
