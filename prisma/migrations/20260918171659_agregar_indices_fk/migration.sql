-- CreateIndex
CREATE INDEX "Cliente_usuarioId_idx" ON "Cliente"("usuarioId");

-- CreateIndex
CREATE INDEX "Notificacion_clienteId_idx" ON "Notificacion"("clienteId");

-- CreateIndex
CREATE INDEX "Notificacion_suscripcionId_idx" ON "Notificacion"("suscripcionId");

-- CreateIndex
CREATE INDEX "Pago_clienteId_idx" ON "Pago"("clienteId");

-- CreateIndex
CREATE INDEX "ReportePago_clienteId_idx" ON "ReportePago"("clienteId");

-- CreateIndex
CREATE INDEX "ReportePago_suscripcionId_idx" ON "ReportePago"("suscripcionId");

-- CreateIndex
CREATE INDEX "Suscripcion_clienteId_idx" ON "Suscripcion"("clienteId");
