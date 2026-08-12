import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = params;
  if (!formId) return json({ error: "Missing formId" }, { status: 400 });

  const form = await prisma.form.findUnique({ where: { id: formId } });
  
  const fields = await prisma.formField.findMany({
    where: { formId },
    orderBy: { order: 'asc' }
  });

  const formattedFields = fields.map(f => ({
    ...JSON.parse(f.settings),
    id: f.id,
    type: f.type,
    label: f.label
  }));

  const globalStyles = form?.globalStyles ? JSON.parse(form.globalStyles) : {};

  return json({ fields: formattedFields, globalStyles });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = params;
  if (!formId) return json({ error: "Missing formId" }, { status: 400 });

  const body = await request.json();
  const newFields = body.fields || [];
  const globalStyles = body.globalStyles ? JSON.stringify(body.globalStyles) : null;

  // Ensure Form exists (upsert)
  await prisma.form.upsert({
    where: { id: formId },
    create: { id: formId, shop: session.shop, title: 'Theme Form', globalStyles },
    update: { globalStyles }
  });

  // Since it's a full replacement, delete all existing fields for this form
  await prisma.formField.deleteMany({
    where: { formId }
  });

  // Re-insert all fields
  const inserts = newFields.map((f: any, i: number) => {
    const { id, type, label, ...settings } = f;
    return {
      id: id || Math.random().toString(36).substring(7),
      formId,
      type: type || 'text',
      label: label || 'Field',
      settings: JSON.stringify(settings),
      order: i
    };
  });

  await prisma.formField.createMany({
    data: inserts
  });

  return json({ success: true, count: inserts.length });
};
