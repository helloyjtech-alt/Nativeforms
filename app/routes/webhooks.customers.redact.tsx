import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);
  console.log(payload);

  // Payload contains customer to be redacted.
  const email = payload.customer?.email;
  const phone = payload.customer?.phone;
  
  if (email || phone) {
    const orConditions: any[] = [];
    if (email) orConditions.push({ value: email });
    if (phone) orConditions.push({ value: phone });

    const values = await db.submissionValue.findMany({
      where: {
        OR: orConditions,
        submission: { form: { shop } }
      },
      select: { submissionId: true }
    });
    
    const subIds = values.map(v => v.submissionId).filter(Boolean);
    
    if (subIds.length > 0) {
      await db.submission.deleteMany({
        where: { id: { in: subIds } }
      });
      console.log(`[GDPR] Redacted ${subIds.length} submissions for customer in ${shop}`);
    }
  }

  return new Response(null, { status: 200 });
};
