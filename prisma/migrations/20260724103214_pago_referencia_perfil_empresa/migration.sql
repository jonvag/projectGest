-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "referencia" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banco" TEXT,
ADD COLUMN     "numeroCuenta" TEXT,
ADD COLUMN     "rif" TEXT;

