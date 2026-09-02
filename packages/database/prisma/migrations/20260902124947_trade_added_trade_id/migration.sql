/*
  Warnings:

  - You are about to drop the column `buyerUserId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sellerUserId` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `buyUserId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellUserId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradeId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_buyerUserId_fkey";

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "buyerUserId",
DROP COLUMN "sellerUserId",
ADD COLUMN     "buyUserId" TEXT NOT NULL,
ADD COLUMN     "sellUserId" TEXT NOT NULL,
ADD COLUMN     "tradeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "filled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyUserId_fkey" FOREIGN KEY ("buyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellUserId_fkey" FOREIGN KEY ("sellUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
