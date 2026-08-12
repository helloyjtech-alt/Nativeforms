import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  FormLayout,
  InlineStack,
  Banner,
  Box,
  Divider,
  Toast,
  Frame
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({
    where: { shop: session.shop }
  });

  let defaults = {
    alertEmail: session.shop,
    replyTo: "",
    alertSubject: "New {{form.title}} submission — {{date}}",
    alertBody: "You received a new submission from {{form.title}}:\n\n{{fields.*}}",
    autoResponderEnabled: false,
    autoResponderSubject: "Thanks for contacting us!",
    autoResponderBody: "Hi,\n\nWe received your message and will get back to you shortly.\n\nThanks!"
  };

  if (shop?.notificationDefaults) {
    defaults = { ...defaults, ...JSON.parse(shop.notificationDefaults) };
  }

  return json({ defaults, plan: shop?.plan || "FREE" });
};

export const action = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const defaults = {
    alertEmail: formData.get("alertEmail"),
    replyTo: formData.get("replyTo"),
    alertSubject: formData.get("alertSubject"),
    alertBody: formData.get("alertBody"),
    autoResponderEnabled: formData.get("autoResponderEnabled") === "true",
    autoResponderSubject: formData.get("autoResponderSubject"),
    autoResponderBody: formData.get("autoResponderBody")
  };

  await prisma.shop.update({
    where: { shop: session.shop },
    data: { notificationDefaults: JSON.stringify(defaults) }
  });

  return json({ success: true });
};

export default function Notifications() {
  const { defaults, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [formState, setFormState] = useState(defaults);
  const [toastActive, setToastActive] = useState(false);

  // Show toast when action succeeds
  if (actionData?.success && !toastActive && !isSaving) {
    setToastActive(true);
  }

  const handleChange = (value: string, id: string) => {
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleToggle = useCallback((value: boolean) => {
    setFormState(prev => ({ ...prev, autoResponderEnabled: value }));
  }, []);

  const handleSave = () => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    submit(formData, { method: "POST" });
  };

  const isFreePlan = plan === "FREE";

  return (
    <Frame>
      <Page 
        title="Notifications" 
        subtitle="Set global default email templates for your forms."
        primaryAction={{
          content: 'Save defaults',
          onAction: handleSave,
          loading: isSaving
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Merchant Alert Email</Text>
                  <Text as="p" tone="subdued">
                    We'll send an email to this address whenever you receive a new submission. You can override these settings on individual forms.
                  </Text>
                  
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Recipient Email(s)"
                        value={formState.alertEmail}
                        onChange={(val) => handleChange(val, "alertEmail")}
                        autoComplete="email"
                        helpText="Separate multiple emails with commas."
                      />
                      <TextField
                        label="Reply-To"
                        value={formState.replyTo}
                        onChange={(val) => handleChange(val, "replyTo")}
                        autoComplete="email"
                        placeholder="e.g. info@yourstore.com"
                      />
                    </FormLayout.Group>
                    
                    <TextField
                      label="Email Subject"
                      value={formState.alertSubject}
                      onChange={(val) => handleChange(val, "alertSubject")}
                      autoComplete="off"
                      helpText="Supported variables: {{form.title}}, {{submission.id}}, {{date}}"
                    />
                    
                    <TextField
                      label="Email Body"
                      value={formState.alertBody}
                      onChange={(val) => handleChange(val, "alertBody")}
                      autoComplete="off"
                      multiline={6}
                      helpText="Supported variables: {{form.title}}, {{fields.*}}"
                    />
                  </FormLayout>

                  <InlineStack align="start">
                    <Button onClick={() => console.log('Send test email')}>Send test email</Button>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">Customer Auto-Responder</Text>
                      <Text as="p" tone="subdued">
                        Automatically send a confirmation email to the submitter if they provide an email address.
                      </Text>
                    </BlockStack>
                    <Button 
                      pressed={formState.autoResponderEnabled} 
                      onClick={() => handleToggle(!formState.autoResponderEnabled)}
                      disabled={isFreePlan}
                    >
                      {formState.autoResponderEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </InlineStack>

                  {isFreePlan && (
                    <Banner tone="warning">
                      <p>Customer auto-responder is a premium feature. Upgrade to the Starter plan to enable this feature.</p>
                    </Banner>
                  )}

                  <Box opacity={isFreePlan ? "0.5" : "1"} pointerEvents={isFreePlan ? "none" : "auto"}>
                    <BlockStack gap="400" paddingBlockStart="400">
                      <Divider />
                      <Box paddingBlockStart="400">
                        <FormLayout>
                          <TextField
                            label="Auto-Responder Subject"
                            value={formState.autoResponderSubject}
                            onChange={(val) => handleChange(val, "autoResponderSubject")}
                            autoComplete="off"
                            disabled={!formState.autoResponderEnabled || isFreePlan}
                          />
                          <TextField
                            label="Auto-Responder Body"
                            value={formState.autoResponderBody}
                            onChange={(val) => handleChange(val, "autoResponderBody")}
                            autoComplete="off"
                            multiline={6}
                            disabled={!formState.autoResponderEnabled || isFreePlan}
                          />
                        </FormLayout>
                      </Box>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="Global defaults saved" onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}
