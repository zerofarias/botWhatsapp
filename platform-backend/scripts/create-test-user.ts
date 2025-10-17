import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/services/user.service.js';

async function main() {
  const email = 'test@example.com';
  const username = 'test';
  const password = 'Test1234!';

  const passwordHash = hashPassword(password);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      name: 'Test User',
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'Test User',
      username,
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log('Usuario de prueba listo:');
  console.log(user);
  console.log(`Credenciales -> usuario: ${username} | password: ${password}`);
}

main()
  .catch((error) => {
    console.error('Error creando usuario de prueba', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
