/*
  Warnings:

  - Made the column `description` on table `Club` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Club" ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '';
