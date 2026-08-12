import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({ message: "Storefront API: Submissions" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return json({ success: true });
};
