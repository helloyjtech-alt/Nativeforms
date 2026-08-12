import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateStyles() {
  const formId = 'qa-all-fields-test-v1-8520';

  // Rich, high-class styling that will be visually obvious
  const globalStyles = JSON.stringify({
    fontFamily: "Inter, 'DM Sans', system-ui, sans-serif",
    fontSize: "15px",
    bg: "#ffffff",
    input_bg: "#f9fafb",
    input_border: "#6366f1",   // Vibrant indigo border — unmistakable
    radius: "10px",
    gap: "20px",
    labelColor: "#1e1b4b",     // Deep indigo label
    labelSize: "13px",
    labelWeight: "600",
    textColor: "#111827",
    helpColor: "#6b7280",
    accentColor: "#6366f1",    // Indigo accent for checkmarks / radio
    btnBg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    btnText: "#ffffff",
    btnRadius: "8px",
    btnWidth: "100%",
    maxWidth: "680px",
    titleColor: "#1e1b4b",
    titleSize: "28px",
    titleWeight: "700",
  });

  await prisma.form.update({
    where: { id: formId },
    data: { globalStyles }
  });

  console.log("✅ QA form global styles updated with rich indigo theme.");
}

updateStyles().catch(console.error).finally(() => prisma.$disconnect());
