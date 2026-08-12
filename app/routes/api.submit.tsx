import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

// Handle preflight requests for CORS
export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await request.json();
    const { formId, values, submitterIp, userAgent, sourceUrl } = payload;

    if (!formId) {
      return json({ error: "formId is required" }, { status: 400, headers: corsHeaders });
    }

    // Verify form exists
    const form = await prisma.form.findUnique({
      where: { id: formId }
    });

    if (!form) {
      return json({ error: "Form not found" }, { status: 404, headers: corsHeaders });
    }

    // Insert Submission
    const submission = await prisma.submission.create({
      data: {
        formId,
        submitterIp: submitterIp || null,
        userAgent: userAgent || request.headers.get("user-agent") || null,
        sourceUrl: sourceUrl || null,
        values: {
          create: Object.entries(values || {}).map(([fieldId, value]) => ({
            fieldId,
            value: typeof value === 'string' ? value : JSON.stringify(value)
          }))
        }
      }
    });

    return json({ 
      success: true, 
      submissionId: submission.id 
    }, { 
      headers: corsHeaders 
    });
  } catch (error: any) {
    console.error("Form submission error:", error);
    return json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
};
