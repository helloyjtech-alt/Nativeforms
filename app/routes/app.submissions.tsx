import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  IndexTable,
  Badge,
  useIndexResourceState,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Modal,
  Divider,
  Icon,
  Tooltip
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import prisma from "../db.server";
import { EmailIcon, ViewIcon, ArchiveIcon, DeleteIcon, AlertTriangleIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const formId = url.searchParams.get("formId");

  const whereClause: any = { form: { shop: session.shop } };
  if (formId) {
    whereClause.formId = formId;
  }

  const submissions = await prisma.submission.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      form: true,
      values: {
        include: { field: true }
      }
    }
  });

  return json({ submissions });
};

export default function Submissions() {
  const { submissions } = useLoaderData<typeof loader>();
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(submissions);

  const getSubmitterName = (sub: any) => {
    // Try to find email first
    const emailVal = sub.values.find((v:any) => v.field.type === 'email');
    if (emailVal && emailVal.value) return emailVal.value;
    
    // Fall back to first text field
    const textVal = sub.values.find((v:any) => v.field.type === 'text' || v.field.type === 'string');
    if (textVal && textVal.value) return textVal.value;

    return "Anonymous";
  };

  const getPreviewText = (sub: any) => {
    const textVal = sub.values.find((v:any) => v.field.type === 'textarea' || v.field.type === 'text');
    const val = textVal?.value || "";
    return val.length > 60 ? val.substring(0, 60) + '...' : val;
  };

  const rowMarkup = submissions.map(
    (sub: any, index: number) => {
      const isUnread = sub.status === 'UNREAD';
      
      return (
        <IndexTable.Row
          id={sub.id}
          key={sub.id}
          position={index}
          selected={selectedResources.includes(sub.id)}
          onClick={() => setActiveSubmission(sub)}
        >
          <IndexTable.Cell>
            <Box style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: isUnread ? '#008060' : '#E4E5E7'}} />
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight={isUnread ? "bold" : "regular"} as="span">
              {getSubmitterName(sub)}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{sub.form.title}</IndexTable.Cell>
          <IndexTable.Cell>{new Date(sub.createdAt).toLocaleString()}</IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodySm" tone="subdued" as="span">{getPreviewText(sub)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
             <InlineStack gap="200" align="end">
                <Button size="micro" icon={ViewIcon} accessibilityLabel="View" onClick={() => setActiveSubmission(sub)} />
                <Button size="micro" icon={ArchiveIcon} accessibilityLabel="Archive" />
                <Button size="micro" icon={DeleteIcon} tone="critical" accessibilityLabel="Delete" />
             </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  const promotedBulkActions = [
    { content: 'Mark as read', onAction: () => console.log('Read', selectedResources) },
    { content: 'Archive', onAction: () => console.log('Archive', selectedResources) },
    { content: 'Delete', onAction: () => console.log('Delete', selectedResources) },
  ];

  return (
    <Page title="Submissions">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={{ singular: 'submission', plural: 'submissions' }}
              itemCount={submissions.length}
              selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              promotedBulkActions={promotedBulkActions}
              headings={[
                { title: '' },
                { title: 'Submitter' },
                { title: 'Form' },
                { title: 'Date' },
                { title: 'Preview' },
                { title: 'Actions', alignment: 'end' }
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Submission Detail Modal */}
      <Modal
        open={!!activeSubmission}
        onClose={() => setActiveSubmission(null)}
        title={`Submission from ${activeSubmission ? getSubmitterName(activeSubmission) : ''}`}
        primaryAction={{
          content: 'Close',
          onAction: () => setActiveSubmission(null),
        }}
        secondaryActions={[
          {
            content: 'Mark as read',
            onAction: () => console.log('Mark read', activeSubmission?.id),
          },
        ]}
        size="large"
      >
        <Modal.Section>
          {activeSubmission && (
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3">Form: {activeSubmission.form.title}</Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Submitted on {new Date(activeSubmission.createdAt).toLocaleString()}
                  </Text>
                </BlockStack>
                <Badge tone={activeSubmission.status === 'UNREAD' ? 'info' : undefined}>
                  {activeSubmission.status}
                </Badge>
              </InlineStack>

              <Divider />

              <BlockStack gap="400">
                {activeSubmission.values.map((val: any) => (
                  <Box key={val.id}>
                    <Text variant="headingXs" as="h4" tone="subdued">
                      {val.field.label.toUpperCase()}
                    </Text>
                    <Box paddingBlockStart="100">
                      <Text variant="bodyMd" as="p">{val.value}</Text>
                    </Box>
                  </Box>
                ))}
              </BlockStack>

              <Divider />

              <Box>
                <Text variant="headingSm" as="h3">Metadata</Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued" as="p">Submission ID: {activeSubmission.id}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">IP Address: {activeSubmission.submitterIp || 'Unknown'}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">User Agent: {activeSubmission.userAgent || 'Unknown'}</Text>
                  </BlockStack>
                </Box>
              </Box>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
