-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "linkToken" TEXT;

-- CreateTable
CREATE TABLE "ReportePago" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "referencia" TEXT,
    "comprobante" BYTEA NOT NULL,
    "comprobanteTipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEn" TIMESTAMP(3),

    CONSTRAINT "ReportePago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_linkToken_key" ON "Suscripcion"("linkToken");

-- AddForeignKey
ALTER TABLE "ReportePago" ADD CONSTRAINT "ReportePago_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportePago" ADD CONSTRAINT "ReportePago_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

