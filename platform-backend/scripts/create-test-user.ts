import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

async function main() {
  const email = 'test@example.com';
  const password = 'Test1234!';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      name: 'Test User',
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  console.log('Usuario de prueba creado con éxito:');
  console.log(user);
  console.log(`Credenciales -> email: ${email} | password: ${password}`);
}

main()
  .catch((error) => {
    console.error('Error creando usuario de prueba', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
