-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT true;
