export function logSystem(message: string) {
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[SYSTEM ${timestamp}] ${message}`);
}
