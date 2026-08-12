/**
 * Seed: Multi-Step Form Demo (4 steps, purple theme)
 * Matches reference image: numbered dots, purple primary color
 *
 * Run: npx tsx scripts/seed-multistep-form.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const FORM_ID = 'multi-step-demo-v1';
const SHOP = 'knr-technical-test.myshopify.com';
const PURPLE = '#7c3aed';

async function main() {
  // Delete if exists so we can re-run idempotently
  await prisma.form.deleteMany({ where: { id: FORM_ID } });

  const globalStyles = JSON.stringify({
    // Container
    bg: '#ffffff',
    radius: '16px',
    padding: '40px',
    shadow: '0 8px 40px rgba(124,58,237,0.12)',
    'border-color': '#ede9fe',
    'max-width': '560px',
    // Typography
    'font-body': 'Inter, sans-serif',
    // Inputs
    'input-bg': '#faf8ff',
    'input-border': '#ddd6fe',
    'input-radius': '10px',
    'input-padding': '13px 16px',
    'input-font-size': '15px',
    'input-text': '#1e293b',
    'input-placeholder': '#a78bfa',
    'input-focus-border': PURPLE,
    'input-focus-ring': 'rgba(124,58,237,0.18)',
    'input-hover-border': '#a78bfa',
    'input-error-border': '#ef4444',
    // Labels
    'label-color': '#374151',
    'label-size': '13px',
    'label-weight': '600',
    // Help text
    'help-color': '#9ca3af',
    'help-size': '12px',
    // Buttons
    'btn-bg': PURPLE,
    'btn-text': '#ffffff',
    'btn-radius': '10px',
    'btn-padding': '13px 32px',
    'btn-font-size': '15px',
    'btn-weight': '700',
    'btn-shadow': '0 4px 14px rgba(124,58,237,0.35)',
    'btn-hover-bg': '#6d28d9',
    // Step navigation
    step_fillColor: PURPLE,
    step_trackColor: '#ede9fe',
    step_progressStyle: 'dots',
    step_transition: 'fade',
    step_continueLabel: 'Next',
    step_backLabel: 'Back',
    step_counterColor: PURPLE,
    step_counterSize: '22px',
    // Layout
    'row-gap': '20px',
    'col-gap': '16px',
    align: 'center',
    margin: '0 auto',
    // Success
    'success-bg': '#f0fdf4',
    'success-border': '#bbf7d0',
    'success-text': '#166534',
    // Title
    'title-color': '#1e293b',
    'title-size': '22px',
    'title-weight': '700',
    'title-align': 'center',
    // Choice
    'choice-checked-bg': PURPLE,
    'choice-checkmark': '#ffffff',
    'choice-border': '#ddd6fe',
  });

  const form = await prisma.form.create({
    data: {
      id: FORM_ID,
      shop: SHOP,
      title: 'Multi Step Form',
      status: 'ACTIVE',
      globalStyles,
      fields: {
        create: [
          // ── STEP 1 — Personal info ─────────────────────────────
          {
            id: `${FORM_ID}-first-name`,
            type: 'text',
            label: 'First Name',
            order: 1,
            settings: JSON.stringify({ required: true, placeholder: 'John' }),
            styles: JSON.stringify({ width: 50 }),
          },
          {
            id: `${FORM_ID}-last-name`,
            type: 'text',
            label: 'Last Name',
            order: 2,
            settings: JSON.stringify({ required: true, placeholder: 'Doe' }),
            styles: JSON.stringify({ width: 50 }),
          },
          {
            id: `${FORM_ID}-email`,
            type: 'email',
            label: 'Email Address',
            order: 3,
            settings: JSON.stringify({ required: true, placeholder: 'john@example.com' }),
          },

          // ── STEP BREAK 1 ──────────────────────────────────────
          {
            id: `${FORM_ID}-sb-1`,
            type: 'pagebreak',
            label: 'Step Break',
            order: 4,
            settings: JSON.stringify({
              stepTitle: 'Create your password',
              stepDescription: 'Choose a secure password for your account.',
              progressStyle: 'dots',
              continueLabel: 'Next',
              backLabel: 'Back',
            }),
          },

          // ── STEP 2 — Password ──────────────────────────────────
          {
            id: `${FORM_ID}-password`,
            type: 'password',
            label: 'Password',
            order: 5,
            settings: JSON.stringify({ required: true, placeholder: '••••••••', showStrength: true, showToggle: true }),
          },
          {
            id: `${FORM_ID}-confirm-password`,
            type: 'password',
            label: 'Confirm Password',
            order: 6,
            settings: JSON.stringify({ required: true, placeholder: '••••••••' }),
          },

          // ── STEP BREAK 2 ──────────────────────────────────────
          {
            id: `${FORM_ID}-sb-2`,
            type: 'pagebreak',
            label: 'Step Break',
            order: 7,
            settings: JSON.stringify({
              stepTitle: 'Your address',
              stepDescription: 'We need your address for shipping.',
              progressStyle: 'dots',
              continueLabel: 'Next',
              backLabel: 'Back',
            }),
          },

          // ── STEP 3 — Address ───────────────────────────────────
          {
            id: `${FORM_ID}-address`,
            type: 'text',
            label: 'Street Address',
            order: 8,
            settings: JSON.stringify({ required: true, placeholder: '123 Main St' }),
          },
          {
            id: `${FORM_ID}-city`,
            type: 'text',
            label: 'City',
            order: 9,
            settings: JSON.stringify({ required: true, placeholder: 'New York' }),
            styles: JSON.stringify({ width: 50 }),
          },
          {
            id: `${FORM_ID}-zip`,
            type: 'text',
            label: 'ZIP / Postal Code',
            order: 10,
            settings: JSON.stringify({ required: true, placeholder: '10001' }),
            styles: JSON.stringify({ width: 50 }),
          },
          {
            id: `${FORM_ID}-country`,
            type: 'dropdown',
            label: 'Country',
            order: 11,
            settings: JSON.stringify({
              required: true,
              options: [
                { label: 'United States', value: 'US' },
                { label: 'United Kingdom', value: 'GB' },
                { label: 'Canada', value: 'CA' },
                { label: 'Australia', value: 'AU' },
                { label: 'Pakistan', value: 'PK' },
                { label: 'Other', value: 'other' },
              ],
            }),
          },

          // ── STEP BREAK 3 ──────────────────────────────────────
          {
            id: `${FORM_ID}-sb-3`,
            type: 'pagebreak',
            label: 'Step Break',
            order: 12,
            settings: JSON.stringify({
              stepTitle: 'Almost done!',
              stepDescription: 'Review and accept our terms to complete your registration.',
              progressStyle: 'dots',
              continueLabel: 'Submit',
              backLabel: 'Back',
            }),
          },

          // ── STEP 4 — Review & Legal ────────────────────────────
          {
            id: `${FORM_ID}-phone`,
            type: 'phone',
            label: 'Phone Number (optional)',
            order: 13,
            settings: JSON.stringify({ required: false, placeholder: '+1 (555) 000-0000' }),
          },
          {
            id: `${FORM_ID}-how-heard`,
            type: 'dropdown',
            label: 'How did you hear about us?',
            order: 14,
            settings: JSON.stringify({
              required: false,
              options: [
                { label: 'Google Search', value: 'google' },
                { label: 'Social Media', value: 'social' },
                { label: 'Friend / Referral', value: 'referral' },
                { label: 'Shopify App Store', value: 'shopify' },
                { label: 'Other', value: 'other' },
              ],
            }),
          },
          {
            id: `${FORM_ID}-terms`,
            type: 'legal',
            label: 'I agree to the Terms of Service and Privacy Policy',
            order: 15,
            settings: JSON.stringify({ required: true }),
          },
        ],
      },
    },
  });

  console.log('\n✅ Multi Step Form created:', form.id);
  console.log('   Title    : Multi Step Form');
  console.log('   Steps    : 4 (Personal Info → Password → Address → Review)');
  console.log('   Progress : Purple numbered dots');
  console.log('   Status   : ACTIVE');
  console.log('\n   Embed with form ID:', form.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
