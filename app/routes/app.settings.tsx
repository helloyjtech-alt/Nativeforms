import { useState, useCallback } from "react";
import { Page, Layout, Card, Text, BlockStack, InlineStack, TextField, Button, FormLayout, Banner, Box, Toast, Frame, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({
    where: { shop: session.shop }
  });

  let settings = {
    recaptchaEnabled: false,
    recaptchaSiteKey: "",
    recaptchaSecretKey: ""
  };

  if (shop?.appSettings) {
    settings = { ...settings, ...JSON.parse(shop.appSettings) };
  }

  return json({ settings, plan: shop?.plan || "FREE" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    recaptchaEnabled: formData.get("recaptchaEnabled") === "true",
    recaptchaSiteKey: formData.get("recaptchaSiteKey"),
    recaptchaSecretKey: formData.get("recaptchaSecretKey"),
  };

  await prisma.shop.update({
    where: { shop: session.shop },
    data: { appSettings: JSON.stringify(settings) }
  });

  return json({ success: true });
};

export default function Settings() {
  const { settings, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [formState, setFormState] = useState(settings);
  const [toastActive, setToastActive] = useState(false);

  const isGrowth = plan === "GROWTH";

  if (actionData?.success && !toastActive && !isSaving) {
    setToastActive(true);
  }

  const handleChange = (value: string, id: string) => {
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleToggle = useCallback((value: boolean) => {
    setFormState(prev => ({ ...prev, recaptchaEnabled: value }));
  }, []);

  const handleSave = () => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    submit(formData, { method: "POST" });
  };

  return (
    <Frame>
      <Page 
        title="Settings" 
        subtitle="Manage global app configurations."
        primaryAction={{
          content: 'Save settings',
          onAction: handleSave,
          loading: isSaving
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd">Google reCAPTCHA v3</Text>
                        <Badge tone="info">Growth Plan</Badge>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Protect your forms from spam and abuse with invisible reCAPTCHA v3.
                      </Text>
                    </BlockStack>
                    <Button 
                      pressed={formState.recaptchaEnabled} 
                      onClick={() => handleToggle(!formState.recaptchaEnabled)}
                      disabled={!isGrowth}
                    >
                      {formState.recaptchaEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </InlineStack>

                  {!isGrowth && (
                    <Banner tone="warning">
                      <p>reCAPTCHA integration is a premium feature. Upgrade to the Growth plan to enable spam protection.</p>
                    </Banner>
                  )}

                  <Box opacity={!isGrowth ? "0.5" : "1"} pointerEvents={!isGrowth ? "none" : "auto"}>
                    <FormLayout>
                      <TextField
                        label="Site Key"
                        value={formState.recaptchaSiteKey}
                        onChange={(val) => handleChange(val, "recaptchaSiteKey")}
                        autoComplete="off"
                        helpText="Used in the storefront to generate a token."
                        disabled={!formState.recaptchaEnabled || !isGrowth}
                      />
                      <TextField
                        label="Secret Key"
                        value={formState.recaptchaSecretKey}
                        onChange={(val) => handleChange(val, "recaptchaSecretKey")}
                        autoComplete="off"
                        type="password"
                        helpText="Used on the server to verify the submission."
                        disabled={!formState.recaptchaEnabled || !isGrowth}
                      />
                    </FormLayout>
                  </Box>
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="Settings saved" onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}
