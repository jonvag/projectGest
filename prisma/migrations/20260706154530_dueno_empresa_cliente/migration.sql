-- AddColumn usuarioId to Cliente
ALTER TABLE "Cliente" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AddColumn userId to Cliente
ALTER TABLE "Cliente" ADD COLUMN "userId" TEXT;

-- CreateIndex on userId
CREATE UNIQUE INDEX "Cliente_userId_key" ON "Cliente"("userId");

-- AddForeignKey for usuarioId
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for userId
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
