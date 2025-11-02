import { prisma } from '../config/prisma.js';
import { Bot } from '@prisma/client';

/**
 * Devuelve el bot por defecto (isDefault = true) o el primero si no hay ninguno marcado como default.
 */
export async function getDefaultBot(): Promise<Bot | null> {
  let bot = await prisma.bot.findFirst({ where: { isDefault: true } });
  if (!bot) {
    bot = await prisma.bot.findFirst();
  }
  return bot;
}
