import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);
  console.log(payload);

  // Shop is requesting to redact all data.
  // We should delete the Shop record and all associated data.
  // We can do this now since Prisma cascade will handle it, or log it.
  
  try {
    await db.shop.delete({ where: { shop } });
    console.log(`[GDPR] Deleted data for shop ${shop}`);
  } catch (error) {
    console.log(`[GDPR] Shop ${shop} not found or already deleted.`);
  }
  
  return new Response(null, { status: 200 });
};
