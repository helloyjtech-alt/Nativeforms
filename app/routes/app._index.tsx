import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Grid,
  Button,
  Box,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useLoaderData, useNavigate } from "@remix-run/react";
import prisma from "../db.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const totalForms = await prisma.form.count({
    where: { shop, status: { not: "ARCHIVED" } }
  });

  const totalSubmissions = await prisma.submission.count({
    where: { form: { shop } }
  });

  const recentSubmissions = await prisma.submission.findMany({
    where: { form: { shop } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { form: true, values: true }
  });

  const viewsAggregation = await prisma.form.aggregate({
    where: { shop },
    _sum: { views: true }
  });
  
  const totalViews = viewsAggregation._sum.views || 0;
  
  let conversionRate = "0.0%";
  if (totalViews > 0) {
    conversionRate = ((totalSubmissions / totalViews) * 100).toFixed(1) + "%";
  }

  // Mock chart data for now
  const chartData = [
    { name: 'Mon', submissions: 12 },
    { name: 'Tue', submissions: 19 },
    { name: 'Wed', submissions: 3 },
    { name: 'Thu', submissions: 5 },
    { name: 'Fri', submissions: 2 },
    { name: 'Sat', submissions: 20 },
    { name: 'Sun', submissions: 33 },
  ];

  return {
    totalForms,
    totalSubmissions,
    totalViews,
    conversionRate,
    recentSubmissions,
    chartData
  };
};

export default function Dashboard() {
  const { totalForms, totalSubmissions, totalViews, conversionRate, recentSubmissions, chartData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="Dashboard Overview">
      <Layout>
        {/* Metric Cards Row */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">Total Forms</Text>
                  <Text as="h2" variant="headingLg">{totalForms}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Active & Draft</Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">Submissions</Text>
                  <Text as="h2" variant="headingLg">{totalSubmissions}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">All time</Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">Form Views</Text>
                  <Text as="h2" variant="headingLg">{totalViews}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">All time</Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card padding="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">Conversion Rate</Text>
                  <Text as="h2" variant="headingLg">{conversionRate}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Avg. all forms</Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Submissions Chart */}
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Submissions Activity</Text>
                <InlineStack gap="200">
                  <Button size="micro" pressed>7 Days</Button>
                  <Button size="micro">30 Days</Button>
                  <Button size="micro">90 Days</Button>
                </InlineStack>
              </InlineStack>
              <Box minHeight="300px" paddingBlockStart="400">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E5E7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6D7175', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6D7175', fontSize: 12}} dx={-10} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'}} 
                    />
                    <Line type="monotone" dataKey="submissions" stroke="#008060" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Submissions Feed */}
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Recent Submissions</Text>
                <Button variant="plain" onClick={() => navigate('/app/submissions')}>View all</Button>
              </InlineStack>
              
              {recentSubmissions.length === 0 ? (
                <Box padding="400">
                  <Text as="p" tone="subdued" alignment="center">No submissions yet.</Text>
                </Box>
              ) : (
                <BlockStack gap="0">
                  {recentSubmissions.map((sub: any, i: number) => {
                    const firstTextVal = sub.values.find((v:any) => typeof v.value === 'string' && v.value.length > 0)?.value || "Anonymous";
                    const isUnread = sub.status === "UNREAD";
                    return (
                      <Box key={sub.id} paddingBlockStart={i === 0 ? "0" : "300"} paddingBlockEnd="300">
                        {i !== 0 && <Divider />}
                        <Box paddingBlockStart={i !== 0 ? "300" : "0"}>
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                              <Box style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: isUnread ? '#008060' : '#E4E5E7'}} />
                              <BlockStack gap="0">
                                <Text as="span" variant="bodyMd" fontWeight="semibold">{firstTextVal}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {sub.form.title} • {new Date(sub.createdAt).toLocaleDateString()}
                                </Text>
                              </BlockStack>
                            </InlineStack>
                            <Button size="micro" variant="plain" onClick={() => navigate(`/app/submissions`)}>View</Button>
                          </InlineStack>
                        </Box>
                      </Box>
                    );
                  })}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
