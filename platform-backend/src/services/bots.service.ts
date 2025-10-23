import { prisma } from '../config/prisma.js';
import { Bot } from '@prisma/client';

// Ensure only one bot is the default
async function handleDefaultBot(botIdToMakeDefault: number) {
  await prisma.bot.updateMany({
    where: {
      isDefault: true,
      id: {
        not: botIdToMakeDefault,
      },
    },
    data: {
      isDefault: false,
    },
  });
}

export async function create(
  data: Omit<Bot, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Bot> {
  if (data.isDefault) {
    // If the new bot is default, unset other defaults first
    await prisma.bot.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const bot = await prisma.bot.create({ data });
  return bot;
}

export async function findAll(): Promise<Bot[]> {
  return prisma.bot.findMany();
}

export async function findById(id: number): Promise<Bot | null> {
  return prisma.bot.findUnique({ where: { id } });
}

export async function update(
  id: number,
  data: Partial<Bot>
): Promise<Bot | null> {
  if (data.isDefault) {
    await handleDefaultBot(id);
  }

  return prisma.bot.update({
    where: { id },
    data,
  });
}

export async function remove(id: number): Promise<Bot | null> {
  return prisma.bot.delete({ where: { id } });
}
