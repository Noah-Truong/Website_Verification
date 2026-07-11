import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getProject, setDocuments } from "@/lib/db";
import { MAX_FILE_BYTES, parseUploadedFile } from "@/lib/parse/document";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await getProject(id, userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A document file is required." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Document exceeds the 20MB limit." },
      { status: 400 },
    );
  }

  try {
    const parsed = await parseUploadedFile(file);

    // Skip requirements that already exist on the project's checklist so
    // overlapping documents don't produce duplicate items.
    const existing = new Set(
      project.checklist.map((item) => item.text.toLowerCase()),
    );
    const newItems = parsed.items.filter(
      (item) => !existing.has(item.text.toLowerCase()),
    );

    const documents = [...project.documents, parsed.document];
    const checklist = [...project.checklist, ...newItems];

    await setDocuments(id, userId, documents, checklist);

    return NextResponse.json({
      document: parsed.document,
      addedItems: newItems.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the uploaded document. Try PDF, DOCX, TXT, or MD." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let documentId: string;
  try {
    const body = await req.json();
    documentId = String(body.documentId ?? "");
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const project = await getProject(id, userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = project.documents.filter((d) => d.id !== documentId);
  if (documents.length === project.documents.length) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Drop the checklist items that were extracted from this document. Items
  // from before multi-document support have no documentId and are kept.
  const checklist = project.checklist.filter(
    (item) => item.documentId !== documentId,
  );

  await setDocuments(id, userId, documents, checklist);

  return NextResponse.json({ ok: true });
}
