import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const formId = params.formId;
  if (!formId) return json({ error: "Missing formId" }, { status: 400 });

  try {
    // const { session } = await authenticate.public.appProxy(request);
    // const shop = session?.shop || new URL(request.url).searchParams.get("shop");
    // For MVP, just trust the request if proxy signature fails in Theme Editor
    const shop = new URL(request.url).searchParams.get("shop") || "unknown";

    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        fields: { orderBy: { order: 'asc' } }
      }
    });

    if (!form) {
      return json({ error: "Form not found" }, { status: 404 });
    }

    const rawGS = form.globalStyles ? JSON.parse(form.globalStyles) : {};

    // Map builder globalStyles keys → Liquid --nf-* CSS variable names
    const GSKeyMap: Record<string, string> = {
      fontFamily:        'font-body',
      fontSize:          'input-font-size',
      bg:                'bg',
      input_bg:          'input-bg',
      input_border:      'input-border',
      radius:            'input-radius',
      padding:           'input-padding',
      gap:               'row-gap',
      labelSize:         'label-size',
      labelColor:        'label-color',
      labelWeight:       'label-weight',
      textColor:         'text',
      helpColor:         'help-color',
      helpSize:          'help-size',
      borderColor:       'input-border',
      borderWidth:       'border-width',
      borderRadius:      'input-radius',
      boxShadow:         'shadow',
      accentColor:       'choice-checked-bg',
      btnBg:             'btn-bg',
      btnText:           'btn-text',
      btnRadius:         'btn-radius',
      btnWidth:          'btn-width',
      maxWidth:          'max-width',
      titleColor:        'title-color',
      titleSize:         'title-size',
      titleWeight:       'title-weight',
    };

    const globalStyles: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawGS)) {
      // step_* keys must pass through unchanged so the runtime can read gs.step_fillColor etc.
      if (k.startsWith('step_')) {
        globalStyles[k] = String(v);
      } else {
        const varName = GSKeyMap[k] || k.replace(/([A-Z])/g, '-$1').toLowerCase();
        globalStyles[varName] = String(v);
      }
    }

    const parsedFields = form.fields.map(f => ({
      id: f.id,
      type: f.type,
      label: f.label,
      width: (f as any).width,
      order: f.order,
      ...JSON.parse(f.settings),
      // Include per-field styles so runtime can apply overrides
      customStyleEnabled: !!(f as any).styles,
      styles: (f as any).styles ? JSON.parse((f as any).styles) : undefined,
      customClass: JSON.parse(f.settings)?.css_class,
      customCss: JSON.parse(f.settings)?.custom_css,
    }));

    const shopRecord = await db.shop.findUnique({ where: { shop: form.shop } });
    const settings = shopRecord?.appSettings ? JSON.parse(shopRecord.appSettings) : {};

    return json({ 
      fields: parsedFields,
      globalStyles,
      title: form.title,
      recaptchaSiteKey: settings.recaptchaEnabled ? settings.recaptchaSiteKey : null 
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("App Proxy Error:", error);
    return json({ error: "Server Error" }, { status: 500 });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formId = params.formId;
  if (!formId) return json({ error: "Missing formId" }, { status: 400 });

  try {
    // const { session } = await authenticate.public.appProxy(request);
    // const shop = session?.shop || new URL(request.url).searchParams.get("shop");
    // For MVP, just trust the request if proxy signature fails in Theme Editor
    const shop = new URL(request.url).searchParams.get("shop") || "unknown";

    const payload = await request.json();

    // 1. Design Mode: Saving Fields
    if (payload.fields) {
      // Upsert the shop first to satisfy foreign key constraint
      await db.shop.upsert({
        where: { shop },
        create: { shop, plan: "FREE" },
        update: {}
      });

      // Upsert the form first if it doesn't exist
      await db.form.upsert({
        where: { id: formId },
        create: { id: formId, shop, title: "Custom Form" },
        update: {}
      });

      // Clear existing fields and recreate (simple sync strategy for MVP)
      await db.formField.deleteMany({ where: { formId } });

      const createData = payload.fields.map((f: any, index: number) => {
        const { id, type, label, ...settings } = f;
        return {
          id: id || Math.random().toString(36).substr(2, 9),
          formId,
          type: type || 'text',
          label: label || 'Field',
          settings: JSON.stringify(settings || {}),
          order: index
        };
      });

      await db.formField.createMany({ data: createData });
      return json({ success: true, message: "Fields saved successfully" });
    }

    // 2. Runtime: Customer Submitting Form
    if (payload.submission) {
      // Spam Protection: Honeypot check
      if (payload.submission.a_password) {
        // Silently drop spam submissions to not tip off bots
        return json({ success: true, message: "Form submitted successfully" });
      }

      const shopRecord = await db.shop.findUnique({ where: { shop } });
      const settings = shopRecord?.appSettings ? JSON.parse(shopRecord.appSettings) : {};
      const plan = shopRecord?.plan || "FREE";

      // Server-side reCAPTCHA v3 Validation
      if (settings.recaptchaEnabled && plan === "GROWTH") {
        const token = payload.submission.recaptchaToken;
        if (!token) {
          return json({ success: false, errors: { form: "Spam protection token missing." } }, { status: 400 });
        }
        
        // Mocking the Google API call for MVP
        console.log(`[reCAPTCHA] Verifying token ${token} with secret ${settings.recaptchaSecretKey}`);
        const mockScore = 0.9; 
        if (mockScore < 0.5) {
           return json({ success: false, errors: { form: "Spam detected." } }, { status: 400 });
        }
      }
      
      // Server-side Validation
      const fields = await db.formField.findMany({ where: { formId } });
      const errors: Record<string, string> = {};
      
      for (const field of fields) {
        const settings = JSON.parse(field.settings);
        const value = payload.submission[field.id];
        
        if (settings.required && (!value || (Array.isArray(value) && value.length === 0))) {
          errors[field.id] = "This field is required";
        }
      }
      
      if (Object.keys(errors).length > 0) {
        return json({ success: false, errors }, { status: 400 });
      }

      const submission = await db.submission.create({
        data: {
          formId,
          submitterIp: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent"),
        }
      });

      const valuesData = Object.entries(payload.submission)
        .filter(([key]) => key !== 'a_password') // Ignore honeypot field
        .map(([fieldId, value]) => ({
          submissionId: submission.id,
          fieldId,
          value: Array.isArray(value) ? JSON.stringify(value) : String(value)
        }));

      for (const val of valuesData) {
        const fieldExists = fields.find(f => f.id === val.fieldId);
        if (fieldExists) {
          await db.submissionValue.create({ data: val });
        }
      }

      // Trigger Transactional Emails
      const notificationDefaults = shopRecord?.notificationDefaults ? JSON.parse(shopRecord.notificationDefaults) : null;
      
      if (notificationDefaults) {
         // Merchant Alert
         if (notificationDefaults.alertEmail) {
            console.log(`\n[EMAIL MOCK] To: Merchant (${notificationDefaults.alertEmail})`);
            console.log(`Subject: ${notificationDefaults.alertSubject}`);
            console.log(`Body:\nNew Submission Received!\n`);
         }

         // Customer Auto-Responder
         if (notificationDefaults.autoResponderEnabled && (plan === "STARTER" || plan === "GROWTH")) {
            // Find email field in submission
            const emailField = valuesData.find(v => {
               const f = fields.find(field => field.id === v.fieldId);
               return f?.type === "email";
            });
            if (emailField && emailField.value) {
               console.log(`\n[EMAIL MOCK] To: Customer (${emailField.value})`);
               console.log(`Subject: ${notificationDefaults.autoResponderSubject}`);
               console.log(`Body:\n${notificationDefaults.autoResponderBody}\n`);
            }
         }
      }

      return json({ success: true, message: "Form submitted successfully" });
    }

    return json({ error: "Invalid payload" }, { status: 400 });

  } catch (error) {
    console.error("App Proxy Action Error:", error);
    return json({ error: String(error) }, { status: 500 });
  }
};
