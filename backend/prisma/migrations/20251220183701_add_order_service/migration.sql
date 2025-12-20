-- AlterTable
ALTER TABLE `order` ADD COLUMN `servicePaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `serviceValue` DOUBLE NULL;
