import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);
  console.log(payload);

  // Payload has customer details: email, phone, etc.
  // For MVP, simply return 200 OK to acknowledge receipt.
  
  return new Response(null, { status: 200 });
};
