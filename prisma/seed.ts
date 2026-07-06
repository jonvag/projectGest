import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHashEmpresaDemo = await bcrypt.hash("DemoEmpresa123!", 10);
  const empresaDemo = await prisma.user.create({
    data: {
      email: "empresa@demo.com",
      nombre: "Empresa Demo",
      passwordHash: passwordHashEmpresaDemo,
      rol: "EMPRESA",
    },
  });
  console.log("Empresa demo sembrada: empresa@demo.com / DemoEmpresa123!");

  const ana = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Ana Torres",
      empresa: "Torres Diseño",
      contactId: "+54 11 5555-0101",
      email: "ana@torresdiseno.com",
    },
  });
  const bruno = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Bruno Cabrera",
      empresa: "Cabrera Software",
      contactId: "+54 11 5555-0102",
      email: "bruno@cabrerasoftware.com",
    },
  });
  const carla = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Carla Núñez",
      empresa: "Núñez Studio",
      contactId: "+54 11 5555-0103",
      email: "carla@nunezstudio.com",
    },
  });
  const diego = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Diego Fernández",
      empresa: "Fernández Web",
      contactId: "+54 11 5555-0104",
      email: "diego@fernandezweb.com",
    },
  });
  const elena = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Elena Ríos",
      empresa: "Ríos Consulting",
      contactId: "+54 11 5555-0105",
      email: "elena@riosconsulting.com",
    },
  });
  const franco = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Franco Ibáñez",
      empresa: "Ibáñez Corp",
      contactId: "+54 11 5555-0106",
      email: "franco@ibanezcorp.com",
    },
  });

  await prisma.suscripcion.createMany({
    data: [
      {
        clienteId: ana.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-10),
      },
      {
        clienteId: bruno.id,
        servicio: "Mantenimiento mensual",
        monto: 150,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-3),
      },
      {
        clienteId: bruno.id,
        servicio: "Hosting",
        monto: 80,
        ciclo: "anual",
        proximoCobro: isoDateOffset(25),
      },
      {
        clienteId: carla.id,
        servicio: "App móvil",
        monto: 500,
        ciclo: "anual",
        proximoCobro: isoDateOffset(2),
      },
      {
        clienteId: diego.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: diego.id,
        servicio: "SEO",
        monto: 20,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: elena.id,
        servicio: "Mantenimiento mensual",
        monto: 90,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(20),
      },
      {
        clienteId: franco.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(40),
      },
    ],
  });

  const passwordHashSuperuser = await bcrypt.hash("wqrxOCAco1pP", 10);
  await prisma.user.upsert({
    where: { email: "jon.apiscope.empresa@gmail.com" },
    update: {},
    create: {
      email: "jon.apiscope.empresa@gmail.com",
      passwordHash: passwordHashSuperuser,
      rol: "SUPERUSER",
    },
  });
  console.log("Superuser sembrado: jon.apiscope.empresa@gmail.com");

  console.log("Seed completo: 1 empresa, 6 clientes, 8 suscripciones.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
