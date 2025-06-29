-- DropForeignKey
ALTER TABLE "Locker" DROP CONSTRAINT "Locker_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "LockerRental" DROP CONSTRAINT "LockerRental_lockerId_fkey";

-- DropForeignKey
ALTER TABLE "LockerRental" DROP CONSTRAINT "LockerRental_userId_fkey";

-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_adminId_fkey";

-- DropForeignKey
ALTER TABLE "RegistrationCode" DROP CONSTRAINT "RegistrationCode_adminId_fkey";

-- AlterTable
ALTER TABLE "LockerRental" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '6 hours');

-- AlterTable
ALTER TABLE "RegistrationCode" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '1 day');

-- AddForeignKey
ALTER TABLE "RegistrationCode" ADD CONSTRAINT "RegistrationCode_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locker" ADD CONSTRAINT "Locker_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerRental" ADD CONSTRAINT "LockerRental_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerRental" ADD CONSTRAINT "LockerRental_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
