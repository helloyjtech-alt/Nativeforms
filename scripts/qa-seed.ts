import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const shops = await prisma.shop.findMany();
  if (shops.length === 0) {
    console.error("No shops found in DB.");
    return;
  }
  
  const shop = shops.find((s: any) => s.shop.includes('knr-technical-test')) || shops[0];
  console.log("Using shop:", shop.shop);

  const formId = "qa-all-fields-test-v1-" + Math.floor(Math.random() * 10000);
  
  // Field settings templates
  const baseSettings = (label: string) => JSON.stringify({ required: false, helpText: `Help text for ${label}` });
  
  // Create Form
  const form = await prisma.form.create({
    data: {
      id: formId,
      shop: shop.shop,
      title: "QA — All Fields Test v1",
      status: "ACTIVE",
      globalStyles: JSON.stringify({
        fontFamily: "Inter, sans-serif",
        fontSize: "18px",
        input_bg: "#fefefe",
        input_border: "#3b82f6", // Distinct blue border
        radius: "8px",
        gap: "24px"
      }),
      fields: {
        create: [
          // Basic (8)
          { id: `f-text-${formId}`, type: 'text', label: 'QA Text (Required)', order: 1, settings: JSON.stringify({ required: true, minLength: 2, maxLength: 50 }), styles: JSON.stringify({ input_border: "#ef4444", radius: "20px", css_class: "qa-italic-label", custom_css: ".qa-italic-label label { font-style: italic; color: purple; }", focusBorderColor: "#10b981", errorBorderColor: "#dc2626" }) },
          { id: `f-email-${formId}`, type: 'email', label: 'QA Email', order: 2, settings: baseSettings('QA Email') },
          { id: `f-num-${formId}`, type: 'number', label: 'QA Number', order: 3, settings: JSON.stringify({ required: false, min: 10, max: 100 }) },
          { id: `f-phone-${formId}`, type: 'phone', label: 'QA Phone', order: 4, settings: baseSettings('QA Phone') },
          { id: `f-url-${formId}`, type: 'url', label: 'QA URL', order: 5, settings: baseSettings('QA URL') },
          { id: `f-textarea-${formId}`, type: 'textarea', label: 'QA Textarea', order: 6, settings: baseSettings('QA Textarea') },
          { id: `f-password-${formId}`, type: 'password', label: 'QA Password', order: 7, settings: baseSettings('QA Password') },
          { id: `f-hidden-${formId}`, type: 'hidden', label: 'QA Hidden', order: 8, settings: JSON.stringify({ defaultValue: 'secret-qa-value' }) },
          
          // Choice (6 + variants)
          { id: `f-dropdown-${formId}`, type: 'dropdown', label: 'QA Dropdown', order: 9, settings: JSON.stringify({ options: [{label: 'Opt 1', value: '1'}, {label: 'Opt 2', value: '2'}] }) },
          
          { id: `f-check-def-${formId}`, type: 'checkbox', label: 'QA Checkbox (Default)', order: 10, settings: JSON.stringify({ options: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}] }), styles: JSON.stringify({ displayMode: 'default' }) },
          { id: `f-check-btn-${formId}`, type: 'checkbox', label: 'QA Checkbox (Button)', order: 11, settings: JSON.stringify({ options: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}] }), styles: JSON.stringify({ displayMode: 'button' }) },
          { id: `f-check-img-${formId}`, type: 'checkbox', label: 'QA Checkbox (Image)', order: 12, settings: JSON.stringify({ options: [{label: 'A', value: 'a', image: 'gid://shopify/MediaImage/12345'}, {label: 'B', value: 'b', image: 'gid://shopify/MediaImage/67890'}] }), styles: JSON.stringify({ displayMode: 'image' }) },
          
          { id: `f-radio-def-${formId}`, type: 'radio', label: 'QA Radio (Default)', order: 13, settings: JSON.stringify({ options: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}] }), styles: JSON.stringify({ displayMode: 'default' }) },
          { id: `f-radio-btn-${formId}`, type: 'radio', label: 'QA Radio (Button)', order: 14, settings: JSON.stringify({ options: [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}] }), styles: JSON.stringify({ displayMode: 'button' }) },
          { id: `f-radio-img-${formId}`, type: 'radio', label: 'QA Radio (Image)', order: 15, settings: JSON.stringify({ options: [{label: 'A', value: 'a', image: 'gid://shopify/MediaImage/12345'}, {label: 'B', value: 'b', image: 'gid://shopify/MediaImage/67890'}] }), styles: JSON.stringify({ displayMode: 'image' }) },
          
          { id: `f-toggle-${formId}`, type: 'toggle', label: 'QA Toggle', order: 16, settings: baseSettings('QA Toggle') },
          { id: `f-switch-${formId}`, type: 'switch', label: 'QA Switch', order: 17, settings: baseSettings('QA Switch') },
          { id: `f-btn-group-${formId}`, type: 'buttongroup', label: 'QA Button Group', order: 18, settings: JSON.stringify({ options: [{label: 'Opt 1', value: '1'}, {label: 'Opt 2', value: '2'}] }) },
          
          // Advanced (8)
          { id: `f-date-${formId}`, type: 'date', label: 'QA Date', order: 19, settings: baseSettings('QA Date') },
          { id: `f-time-${formId}`, type: 'time', label: 'QA Time', order: 20, settings: baseSettings('QA Time') },
          { id: `f-datetime-${formId}`, type: 'datetime', label: 'QA DateTime', order: 21, settings: baseSettings('QA DateTime') },
          { id: `f-rating-${formId}`, type: 'rating', label: 'QA Rating', order: 22, settings: JSON.stringify({ npsScale: '1-5' }) },
          { id: `f-rangeslider-${formId}`, type: 'rangeslider', label: 'QA Range Slider', order: 23, settings: JSON.stringify({ min: 0, max: 100, step: 10 }) },
          { id: `f-colorpicker-${formId}`, type: 'colorpicker', label: 'QA Color Picker', order: 24, settings: baseSettings('QA Color Picker') },
          { id: `f-fileupload-${formId}`, type: 'fileupload', label: 'QA File Upload', order: 25, settings: baseSettings('QA File Upload') },
          { id: `f-signature-${formId}`, type: 'signature', label: 'QA Signature', order: 26, settings: baseSettings('QA Signature') },
          
          // Commerce (6)
          { id: `f-coupon-${formId}`, type: 'coupon', label: 'QA Coupon', order: 27, settings: baseSettings('QA Coupon') },
          { id: `f-quantity-${formId}`, type: 'quantity', label: 'QA Quantity', order: 28, settings: baseSettings('QA Quantity') },
          { id: `f-product-${formId}`, type: 'productpicker', label: 'QA Product Picker', order: 29, settings: JSON.stringify({ selectedProductId: 'gid://shopify/Product/123456789' }) },
          { id: `f-variant-${formId}`, type: 'variantpicker', label: 'QA Variant Picker', order: 30, settings: baseSettings('QA Variant Picker') },
          { id: `f-price-${formId}`, type: 'price', label: 'QA Price', order: 31, settings: JSON.stringify({ basePrice: 20 }) },
          { id: `f-donation-${formId}`, type: 'donation', label: 'QA Donation', order: 32, settings: baseSettings('QA Donation') },
        ]
      }
    }
  });

  console.log("Successfully created QA form with ID:", formId);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
