/*
  Warnings:

  - You are about to drop the `flow_classic` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `photo_url` LONGTEXT NULL;

-- DropTable
DROP TABLE `flow_classic`;
