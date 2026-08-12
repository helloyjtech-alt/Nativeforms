import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  IndexTable,
  Badge,
  Modal,
  TextField,
  useIndexResourceState,
  InlineStack,
  BlockStack,
  Banner,
  Box,
  Icon,
  Tooltip
} from "@shopify/polaris";
import { ExternalIcon, DuplicateIcon, ArchiveIcon, DeleteIcon, EditIcon, ClipboardIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, Outlet, useSearchParams, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import prisma from "../db.server";

export const loader = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const forms = await prisma.form.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { submissions: true, fields: true }
      }
    }
  });
  return json({ forms, shop: session.shop });
};

export const action = async ({ request }: any) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");
  
  if (actionType === "delete") {
    const id = formData.get("id");
    await prisma.form.delete({ where: { id, shop: session.shop } });
  } else if (actionType === "archive") {
    const id = formData.get("id");
    await prisma.form.update({ where: { id, shop: session.shop }, data: { status: "ARCHIVED" } });
  } else if (actionType === "duplicate") {
    const id = formData.get("id");
    const form = await prisma.form.findUnique({ where: { id, shop: session.shop }, include: { fields: true } });
    if (form) {
      const newId = Math.random().toString(36).substring(7);
      await prisma.form.create({
        data: {
          id: newId,
          shop: form.shop,
          title: `${form.title} (Copy)`,
          status: "DRAFT",
          globalStyles: form.globalStyles,
          fields: {
            create: form.fields.map(f => ({
              id: Math.random().toString(36).substring(7),
              type: f.type,
              label: f.label,
              settings: f.settings,
              styles: f.styles,
              order: f.order
            }))
          }
        }
      });
    }
  } else if (actionType === "rename") {
    const id = formData.get("id");
    const title = formData.get("title");
    await prisma.form.update({ where: { id, shop: session.shop }, data: { title } });
  } else if (actionType === "bulkDelete") {
    const ids = JSON.parse(formData.get("ids"));
    await prisma.form.deleteMany({ where: { id: { in: ids }, shop: session.shop } });
  } else if (actionType === "bulkArchive") {
    const ids = JSON.parse(formData.get("ids"));
    await prisma.form.updateMany({ where: { id: { in: ids }, shop: session.shop }, data: { status: "ARCHIVED" } });
  }
  
  return json({ success: true });
};

export default function Forms() {
  const { forms, shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();

  const [renamingForm, setRenamingForm] = useState<any>(null);
  const [newName, setNewName] = useState("");

  const handleRename = useCallback(() => {
    if (renamingForm && newName) {
      submit({ action: "rename", id: renamingForm.id, title: newName }, { method: "post" });
    }
    setRenamingForm(null);
    setNewName("");
  }, [renamingForm, newName, submit]);

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(forms);

  const rowMarkup = forms.map(
    (form: any, index: number) => {
      const statusTone = form.status === 'ACTIVE' ? 'success' : form.status === 'DRAFT' ? undefined : 'warning';
      
      return (
        <IndexTable.Row
          id={form.id}
          key={form.id}
          position={index}
          selected={selectedResources.includes(form.id)}
        >
          <IndexTable.Cell>
            <InlineStack gap="200" align="start" blockAlign="center">
              <Button variant="plain" onClick={() => navigate(`/app/forms/${form.id}?${query}`)}>
                <Text variant="bodyMd" fontWeight="bold" as="span">{form.title}</Text>
              </Button>
              <Tooltip content="Rename Form">
                <Button variant="plain" icon={EditIcon} onClick={() => { setRenamingForm(form); setNewName(form.title); }} accessibilityLabel="Rename" />
              </Tooltip>
            </InlineStack>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Badge tone={statusTone}>{form.status}</Badge>
          </IndexTable.Cell>
          <IndexTable.Cell>{form._count.fields}</IndexTable.Cell>
          <IndexTable.Cell>
            <Button variant="plain" onClick={() => navigate(`/app/submissions?formId=${form.id}`)}>
              {form._count.submissions}
            </Button>
          </IndexTable.Cell>
          <IndexTable.Cell>{new Date(form.createdAt).toLocaleDateString()}</IndexTable.Cell>
          <IndexTable.Cell>
              <InlineStack gap="200" align="end">
                <Tooltip content="Live Preview (Theme Editor)">
                  <Button size="micro" icon={ExternalIcon} onClick={() => window.open(`https://${shop}/admin/themes/current/editor?context=apps`, '_blank')} accessibilityLabel="Edit in Theme Editor" />
                </Tooltip>
                <Tooltip content="Copy Form ID">
                  <Button size="micro" icon={ClipboardIcon} onClick={() => {
                    navigator.clipboard.writeText(form.id);
                    if (typeof shopify !== 'undefined') shopify.toast.show('Form ID copied to clipboard');
                  }} accessibilityLabel="Copy ID" />
                </Tooltip>
                <Tooltip content="Duplicate Form">
                  <Button size="micro" icon={DuplicateIcon} onClick={() => submit({ action: "duplicate", id: form.id }, { method: "post" })} accessibilityLabel="Duplicate" />
                </Tooltip>
                <Tooltip content="Archive Form">
                  <Button size="micro" icon={ArchiveIcon} onClick={() => submit({ action: "archive", id: form.id }, { method: "post" })} accessibilityLabel="Archive" />
                </Tooltip>
                <Tooltip content="Delete Form">
                  <Button size="micro" icon={DeleteIcon} tone="critical" onClick={() => submit({ action: "delete", id: form.id }, { method: "post" })} accessibilityLabel="Delete" />
                </Tooltip>
             </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  const promotedBulkActions = [
    {
      content: 'Archive selected',
      onAction: () => {
        submit({ action: "bulkArchive", ids: JSON.stringify(selectedResources) }, { method: "post" });
        clearSelection();
      },
    },
    {
      content: 'Delete selected',
      onAction: () => {
        submit({ action: "bulkDelete", ids: JSON.stringify(selectedResources) }, { method: "post" });
        clearSelection();
      },
    },
  ];

  return (
    <Page 
      title="Forms"
      subtitle="Your forms are created and edited in the Theme Editor."
      primaryAction={{ content: 'Open Theme Editor', onAction: () => console.log('Open Editor') }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="info" onDismiss={() => {}}>
              <Text as="p">
                To create a form, go to the Theme Editor {'>'} Add section {'>'} Apps {'>'} Custom Form Builder.
              </Text>
            </Banner>

            <Card padding="0">
              <IndexTable
                resourceName={{ singular: 'form', plural: 'forms' }}
                itemCount={forms.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                promotedBulkActions={promotedBulkActions}
                headings={[
                  { title: 'Form Name' },
                  { title: 'Status' },
                  { title: 'Fields' },
                  { title: 'Submissions' },
                  { title: 'Created' },
                  { title: 'Actions', alignment: 'end' }
                ]}
              >
                {rowMarkup}
              </IndexTable>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      <Outlet />
      
      {renamingForm && (
        <Modal
          open={!!renamingForm}
          onClose={() => setRenamingForm(null)}
          title="Rename Form"
          primaryAction={{
            content: 'Save',
            onAction: handleRename,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setRenamingForm(null),
            },
          ]}
        >
          <Modal.Section>
            <TextField
              label="Form Name"
              value={newName}
              onChange={setNewName}
              autoComplete="off"
            />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
