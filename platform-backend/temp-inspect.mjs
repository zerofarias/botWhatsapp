import { prisma } from '../src/config/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: 'test' },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      role: true,
      passwordHash: true,
    },
  });

  console.log(user);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
