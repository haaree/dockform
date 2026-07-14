// One-off maintenance script — deletes every response (and cascades to response_values,
// response_attachments) across every form/company. Requested to clear out test data that
// accumulated legacy embedded base64 photos, making per-form response loads very slow.
// Run with: npx tsx prisma/deleteAllResponses.ts
// Not wired into any npm script or API route on purpose — this is destructive and
// irreversible, so it should only ever be run deliberately from the command line.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const countBefore = await prisma.response.count();
  console.log(`About to delete ${countBefore} responses (cascades to their values/attachments)...`);
  const result = await prisma.response.deleteMany({});
  console.log(`Deleted ${result.count} responses.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
