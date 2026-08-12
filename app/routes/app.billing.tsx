import { ActionFunctionArgs, json } from "@remix-run/node";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Grid, Badge, ProgressBar, Box, Divider } from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN_STARTER, MONTHLY_PLAN_GROWTH } from "../shopify.server";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }: any) => {
  const { session, billing } = await authenticate.admin(request);
  
  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN_STARTER, MONTHLY_PLAN_GROWTH],
    isTest: true,
  });
  
  let currentPlan = "FREE";
  const subscription = billingCheck?.appSubscriptions?.[0];
  if (subscription?.name === MONTHLY_PLAN_STARTER) currentPlan = "STARTER";
  if (subscription?.name === MONTHLY_PLAN_GROWTH) currentPlan = "GROWTH";

  const shop = await prisma.shop.update({
    where: { shop: session.shop },
    data: { plan: currentPlan },
    include: { planUsage: true }
  });

  return json({ 
    plan: shop?.plan || "FREE",
    submissionsCount: shop?.planUsage?.submissionsCount || 0
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "STARTER") {
    await billing.require({
      plans: [MONTHLY_PLAN_STARTER],
      isTest: true,
      onFailure: async () => billing.request({ plan: MONTHLY_PLAN_STARTER, isTest: true, returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing` }),
    });
    return null;
  }
  
  if (intent === "GROWTH") {
    await billing.require({
      plans: [MONTHLY_PLAN_GROWTH],
      isTest: true,
      onFailure: async () => billing.request({ plan: MONTHLY_PLAN_GROWTH, isTest: true, returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing` }),
    });
    return null;
  }
  
  if (intent === "FREE") {
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN_STARTER, MONTHLY_PLAN_GROWTH],
      isTest: true,
      onFailure: () => { /* Already on free */ }
    });
    
    // @ts-ignore
    const subscription = billingCheck?.appSubscriptions?.[0];
    if (subscription?.id) {
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true
      });
      // Eager update
      await prisma.shop.update({
        where: { shop: session.shop },
        data: { plan: "FREE" }
      });
    }
    return json({ success: true, plan: "FREE" });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

export default function Billing() {
  const { plan, submissionsCount } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isFree = plan === "FREE";
  const isStarter = plan === "STARTER";
  const isGrowth = plan === "GROWTH";
  const isUpgrading = navigation.state === "submitting";

  const handlePlanSelection = (intent: string) => {
    submit({ intent }, { method: "POST" });
  };

  return (
    <Page title="Billing & Plan">
      <Layout>
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Current Plan & Usage</Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <BlockStack gap="200">
                    <Text as="p" tone="subdued">Current Plan</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingLg">{plan}</Text>
                      {isFree && <Badge tone="info">Free Forever</Badge>}
                      {isStarter && <Badge tone="success">Active</Badge>}
                      {isGrowth && <Badge tone="success">Active</Badge>}
                    </InlineStack>
                  </BlockStack>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 8, md: 8, lg: 8, xl: 8 }}>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">Submissions this month</Text>
                      <Text as="p" fontWeight="bold">
                        {submissionsCount} / {isFree ? "50" : isStarter ? "1000" : "10000"}
                      </Text>
                    </InlineStack>
                    <ProgressBar 
                      progress={(submissionsCount / (isFree ? 50 : isStarter ? 1000 : 10000)) * 100} 
                      tone={submissionsCount > (isFree ? 45 : isStarter ? 900 : 9000) ? "critical" : "primary"}
                    />
                    <Text as="p" variant="bodySm" tone="subdued">
                      Your billing cycle resets on the 1st of every month.
                    </Text>
                  </BlockStack>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Text as="h2" variant="headingLg">Available Plans</Text>
          <Box paddingBlockStart="400">
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                <Card padding="400" background={isFree ? "bg-surface-secondary" : "bg-surface"}>
                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">Free</Text>
                      <Text as="h3" variant="heading2xl">$0<Text as="span" variant="bodyMd" tone="subdued"> / month</Text></Text>
                      <Text as="p" tone="subdued">Perfect for getting started.</Text>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="200">
                      <Text as="p">• Up to 50 submissions/mo</Text>
                      <Text as="p">• 2 Forms max</Text>
                      <Text as="p">• Basic styling</Text>
                    </BlockStack>
                    <Box paddingBlockStart="400">
                      <Button 
                        fullWidth 
                        disabled={isFree || isUpgrading} 
                        onClick={() => handlePlanSelection("FREE")}
                      >
                        {isFree ? 'Current Plan' : 'Downgrade'}
                      </Button>
                    </Box>
                  </BlockStack>
                </Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                <Card padding="400" background={isStarter ? "bg-surface-secondary" : "bg-surface"}>
                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h2" variant="headingMd">Starter</Text>
                        <Badge tone="success">Most Popular</Badge>
                      </InlineStack>
                      <Text as="h3" variant="heading2xl">$9<Text as="span" variant="bodyMd" tone="subdued"> / month</Text></Text>
                      <Text as="p" tone="subdued">For growing businesses.</Text>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="200">
                      <Text as="p">• Up to 1,000 submissions/mo</Text>
                      <Text as="p">• 10 Forms max</Text>
                      <Text as="p">• Customer Auto-responders</Text>
                      <Text as="p">• Custom CSS & Advanced Styling</Text>
                    </BlockStack>
                    <Box paddingBlockStart="400">
                      <Button 
                        fullWidth 
                        variant={isStarter ? undefined : "primary"} 
                        disabled={isStarter || isUpgrading}
                        onClick={() => handlePlanSelection("STARTER")}
                      >
                        {isStarter ? 'Current Plan' : 'Upgrade to Starter'}
                      </Button>
                    </Box>
                  </BlockStack>
                </Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                <Card padding="400" background={isGrowth ? "bg-surface-secondary" : "bg-surface"}>
                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">Growth</Text>
                      <Text as="h3" variant="heading2xl">$29<Text as="span" variant="bodyMd" tone="subdued"> / month</Text></Text>
                      <Text as="p" tone="subdued">For high volume stores.</Text>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="200">
                      <Text as="p">• Up to 10,000 submissions/mo</Text>
                      <Text as="p">• Unlimited Forms</Text>
                      <Text as="p">• Priority Support</Text>
                      <Text as="p">• Third-party Integrations (Klaviyo, Zapier)</Text>
                    </BlockStack>
                    <Box paddingBlockStart="400">
                      <Button 
                        fullWidth 
                        disabled={isGrowth || isUpgrading}
                        onClick={() => handlePlanSelection("GROWTH")}
                      >
                        {isGrowth ? 'Current Plan' : 'Upgrade to Growth'}
                      </Button>
                    </Box>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
