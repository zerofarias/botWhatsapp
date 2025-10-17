import { prisma } from '../src/config/prisma.js';

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users MODIFY password_hash CHAR(64) NOT NULL`
  );
  console.log('password_hash column resized to 64 characters');
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
