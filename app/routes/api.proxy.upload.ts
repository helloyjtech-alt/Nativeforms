import { json, unstable_parseMultipartFormData, unstable_createFileUploadHandler, NodeOnDiskFile } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from "fs";
import path from "path";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return json({ error: "Unauthorized proxy request" }, { status: 401 });
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Set up the local file upload handler
  const uploadHandler = unstable_createFileUploadHandler({
    directory: uploadDir,
    maxPartSize: 5 * 1024 * 1024, // 5MB limit
    file({ filename }) {
      const ext = path.extname(filename).toLowerCase();
      // Only allow safe extensions
      const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt", ".doc", ".docx"];
      if (!allowedExts.includes(ext)) {
        return undefined; // reject the file
      }
      return `${Math.random().toString(36).substring(2, 15)}-${Date.now()}${ext}`;
    },
  });

  try {
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "No valid file uploaded or file type unsupported." }, { status: 400 });
    }

    const nodeFile = file as NodeOnDiskFile;
    const fileUrl = `/uploads/${nodeFile.name}`;

    return json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return json({ error: "Upload failed. Max file size is 5MB." }, { status: 500 });
  }
};
