import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({ select: { id: true, email: true, rol: true } });
const clientes = await p.cliente.count();
const susc = await p.suscripcion.count();
const pagos = await p.pago.count();
console.log(JSON.stringify({ users, clientes, susc, pagos }, null, 2));
await p.$disconnect();
