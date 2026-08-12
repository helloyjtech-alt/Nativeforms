import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const sub = await prisma.submission.findFirst({
    where: { formId: { contains: 'qa-all-fields-test-v1' } },
    orderBy: { createdAt: 'desc' },
    include: { values: true }
  });
  if (sub) {
    console.log("Submission found:");
    console.log(JSON.stringify(sub, null, 2));
  } else {
    console.log("No submission found yet for the QA form.");
  }
  
  const form = await prisma.form.findFirst({ 
    where: { id: { contains: 'qa-all-fields-test-v1' } }, 
    include: { fields: true } 
  });
  console.log("\nQA Form fields count:", form?.fields?.length || 0);
  console.log("QA Form ID:", form?.id);
  console.log("QA Form status:", form?.status);
}

check().catch(console.error).finally(() => prisma.$disconnect());
