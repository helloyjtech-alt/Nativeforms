import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);
  console.log(payload);

  // Payload contains customer to be redacted.
  // We can look up submissions with this customer's email and anonymize or delete them.
  // For MVP, simply return 200 OK.
  
  return new Response(null, { status: 200 });
};
