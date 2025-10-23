import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Aeonix01', 10);

  const user = await prisma.user.upsert({
    where: { email: 'lautarosistemas@gmail.com' },
    update: {
      name: 'lautaro',
      username: 'lautaro',
      passwordHash,
      isActive: true,
      role: 'ADMIN',
    },
    create: {
      name: 'lautaro',
      username: 'lautaro',
      email: 'lautarosistemas@gmail.com',
      passwordHash,
      isActive: true,
      role: 'ADMIN',
    },
  });

  console.log('Usuario creado/restaurado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
