-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'whatsapp',
    "estado" TEXT NOT NULL,
    "detalle" TEXT,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
