import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const node22 = await prisma.flow.findUnique({
    where: { id: 22 },
  });

  console.log('Node 22:', JSON.stringify(node22, null, 2));

  if (node22) {
    const meta = node22.metadata;
    console.log('\nmetadata.builder:', JSON.stringify(meta?.builder, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
