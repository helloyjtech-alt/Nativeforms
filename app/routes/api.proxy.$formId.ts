import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { sendEmail } from "../utils/email.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const formId = params.formId;
  if (!formId) return json({ error: "Missing formId" }, { status: 400 });

  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return json({ error: "Unauthorized proxy request" }, { status: 401 });
    }
    const shop = session.shop;

    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        fields: { orderBy: { order: 'asc' } }
      }
    });

    if (!form || form.shop !== shop) {
      return json({ error: "Form not found or unauthorized" }, { status: 404 });
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
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return json({ error: "Unauthorized proxy request" }, { status: 401 });
    }
    const shop = session.shop;

    const payload = await request.json();

    // Verify form belongs to the shop
    const form = await db.form.findUnique({ where: { id: formId } });
    if (!form || form.shop !== shop) {
      return json({ error: "Form not found or unauthorized" }, { status: 404 });
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

      const planLimit = plan === "FREE" ? 100 : plan === "STARTER" ? 1000 : Infinity;
      
      const planUsage = await db.planUsage.upsert({
        where: { shop },
        create: { shop, submissionsCount: 0 },
        update: {}
      });

      if (planUsage.submissionsCount >= planLimit) {
        return json({ success: false, errors: { form: "This form has reached its submission limit." } }, { status: 403 });
      }

      // Server-side reCAPTCHA v3 Validation
      if (settings.recaptchaEnabled && plan === "GROWTH") {
        const token = payload.submission.recaptchaToken;
        if (!token) {
          return json({ success: false, errors: { form: "Spam protection token missing." } }, { status: 400 });
        }
        
        try {
          const secretKey = settings.recaptchaSecretKey;
          const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
          const recaptchaRes = await fetch(verifyUrl, { method: "POST" });
          const recaptchaData = await recaptchaRes.json();

          if (!recaptchaData.success || recaptchaData.score < 0.5) {
            console.warn(`[reCAPTCHA] Failed: ${JSON.stringify(recaptchaData)}`);
            return json({ success: false, errors: { form: "Spam detected." } }, { status: 400 });
          }
        } catch (err) {
          console.error("reCAPTCHA Verification Error:", err);
          return json({ success: false, errors: { form: "Failed to verify spam protection." } }, { status: 400 });
        }
      }
      
      // Server-side Validation
      const fields = await db.formField.findMany({ where: { formId } });
      const errors: Record<string, string> = {};
      
      for (const field of fields) {
        const settings = JSON.parse(field.settings);
        const value = payload.submission[field.id];
        const isEmpty = !value || (Array.isArray(value) && value.length === 0);
        
        if (settings.required && isEmpty) {
          errors[field.id] = "This field is required";
          continue;
        }

        if (isEmpty) continue; // Skip further validation if empty and not required

        switch (field.type) {
          case 'email':
            if (typeof value !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
              errors[field.id] = "Please enter a valid email address.";
            }
            break;
          case 'url':
            try { new URL(value); } catch (_) { errors[field.id] = "Please enter a valid URL."; }
            break;
          case 'text':
          case 'textarea':
            if (settings.minLength && typeof value === 'string' && value.length < Number(settings.minLength)) {
              errors[field.id] = `Minimum ${settings.minLength} characters required.`;
            }
            if (settings.maxLength && typeof value === 'string' && value.length > Number(settings.maxLength)) {
              errors[field.id] = `Maximum ${settings.maxLength} characters allowed.`;
            }
            break;
          case 'dropdown':
          case 'radio':
            if (settings.options && Array.isArray(settings.options)) {
              if (!settings.options.includes(value)) {
                 errors[field.id] = "Invalid selection.";
              }
            }
            break;
          case 'checkbox':
            if (settings.options && Array.isArray(settings.options) && Array.isArray(value)) {
              const invalid = value.some(v => !settings.options.includes(v));
              if (invalid) {
                 errors[field.id] = "Invalid selection(s).";
              }
            }
            break;
        }
      }
      
      if (Object.keys(errors).length > 0) {
        return json({ success: false, errors }, { status: 400 });
      }

      const clientIp = request.headers.get("x-forwarded-for") || "unknown";
      
      // Rate limiting: max 10 submissions per minute per IP
      const rateLimitWindow = 60 * 1000;
      const rateLimitKey = `${formId}-submit`;
      
      const rateLimit = await db.rateLimit.upsert({
        where: { ip_endpoint: { ip: clientIp, endpoint: rateLimitKey } },
        create: {
          ip: clientIp,
          endpoint: rateLimitKey,
          hits: 1,
          resetAt: new Date(Date.now() + rateLimitWindow)
        },
        update: {
          hits: { increment: 1 }
        }
      });
      
      if (rateLimit.hits > 10 && rateLimit.resetAt > new Date()) {
         return json({ success: false, errors: { form: "Too many submissions. Please try again later." } }, { status: 429 });
      } else if (rateLimit.resetAt <= new Date()) {
         // Reset window
         await db.rateLimit.update({
           where: { id: rateLimit.id },
           data: { hits: 1, resetAt: new Date(Date.now() + rateLimitWindow) }
         });
      }

      const validValuesData = Object.entries(payload.submission)
        .filter(([key]) => key !== 'a_password') // Ignore honeypot field
        .filter(([fieldId]) => fields.find(f => f.id === fieldId))
        .map(([fieldId, value]) => ({
          fieldId,
          value: Array.isArray(value) ? JSON.stringify(value) : String(value)
        }));

      // Create submission and values safely within a Prisma nested write (atomic)
      const submission = await db.submission.create({
        data: {
          formId,
          submitterIp: clientIp,
          userAgent: request.headers.get("user-agent"),
          values: {
            create: validValuesData
          }
        },
        include: { values: true }
      });

      // Trigger Transactional Emails
      const notificationDefaults = shopRecord?.notificationDefaults ? JSON.parse(shopRecord.notificationDefaults) : null;
      
      if (notificationDefaults) {
         let customerEmail = "";
         // Find email field in submission to potentially reply to
         const emailField = validValuesData.find(v => {
            const f = fields.find(field => field.id === v.fieldId);
            return f?.type === "email";
         });
         if (emailField && typeof emailField.value === 'string') {
             customerEmail = emailField.value.replace(/"/g, ''); // strip JSON quotes if present
         }

         // Merchant Alert
         if (notificationDefaults.alertEmail) {
            let body = `<h3>New Submission for: ${form.title}</h3><ul>`;
            validValuesData.forEach(v => {
                const f = fields.find(field => field.id === v.fieldId);
                if (f) {
                    body += `<li><strong>${f.label}:</strong> ${v.value}</li>`;
                }
            });
            body += `</ul>`;
            
            await sendEmail({
              to: notificationDefaults.alertEmail,
              subject: notificationDefaults.alertSubject || `New Submission: ${form.title}`,
              html: body,
              replyTo: customerEmail || undefined
            });
         }

         // Customer Auto-Responder
         if (notificationDefaults.autoResponderEnabled && (plan === "STARTER" || plan === "GROWTH")) {
            if (customerEmail) {
               await sendEmail({
                 to: customerEmail,
                 subject: notificationDefaults.autoResponderSubject || `Thank you for your submission`,
                 html: `<p>${notificationDefaults.autoResponderBody || 'We have received your submission.'}</p>`
               });
            }
         }
      }

      // Increment usage count
      await db.planUsage.update({
         where: { shop },
         data: { submissionsCount: { increment: 1 } }
      });

      return json({ success: true, message: "Form submitted successfully" });
    }

    return json({ error: "Invalid payload" }, { status: 400 });

  } catch (error) {
    console.error("App Proxy Action Error:", error);
    return json({ error: String(error) }, { status: 500 });
  }
};
