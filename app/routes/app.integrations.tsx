import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Grid, Badge, Box, Divider, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({
    where: { shop: session.shop }
  });

  return json({ plan: shop?.plan || "FREE" });
};

export default function Integrations() {
  const { plan } = useLoaderData<typeof loader>();
  const isGrowth = plan === "GROWTH";

  const handleConnect = () => {
    shopify.toast.show('Integration coming soon!');
  };

  return (
    <Page title="Integrations" subtitle="Connect your forms to third-party services.">
      <Layout>
        <Layout.Section>
          {!isGrowth && (
            <Box paddingBlockEnd="400">
              <Banner tone="warning">
                <p>Third-party integrations require the Growth plan. Please upgrade your plan to connect these services.</p>
              </Banner>
            </Box>
          )}

          <BlockStack gap="400">
            <Card padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Klaviyo</Text>
                  <Text as="p" tone="subdued">Automatically sync new form submissions to a Klaviyo list.</Text>
                </BlockStack>
                <Button disabled={!isGrowth} onClick={handleConnect}>Connect Klaviyo</Button>
              </InlineStack>
            </Card>

            <Card padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Google Sheets</Text>
                  <Text as="p" tone="subdued">Append new form submissions directly to a Google Sheet.</Text>
                </BlockStack>
                <Button disabled={!isGrowth} onClick={handleConnect}>Connect Google Sheets</Button>
              </InlineStack>
            </Card>

            <Card padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Zapier</Text>
                  <Text as="p" tone="subdued">Connect to thousands of apps using Zapier webhooks.</Text>
                </BlockStack>
                <Button disabled={!isGrowth} onClick={handleConnect}>Connect Zapier</Button>
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
