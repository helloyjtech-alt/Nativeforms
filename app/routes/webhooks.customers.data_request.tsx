import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);
  console.log(payload);

  // Payload has customer details: email, phone, etc.
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
    
    const subIds = values.map(v => v.submissionId).filter(Boolean) as string[];
    
    if (subIds.length > 0) {
      const exportData = await db.submission.findMany({
        where: { id: { in: subIds } },
        include: { values: true }
      });
      console.log(`[GDPR] Exported ${exportData.length} submissions for customer in ${shop}. Sending to merchant...`);
      // Here you would typically email `exportData` to the merchant or customer.
    }
  }
  
  return new Response(null, { status: 200 });
};
