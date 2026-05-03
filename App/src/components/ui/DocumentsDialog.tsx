import { useState, useEffect, useRef } from "react";
import { Folder, X, Trash2, Plus, FileText, Loader2 } from "lucide-react";
import { listDocuments, deleteDocument, upsertDocumentChunks } from "@/lib/ragClient";
import { logger } from "@/lib/logger";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type DocumentItem = {
  name: string;
  chunks: number;
};

export default function DocumentsDialog({ onClose }: { onClose: () => void }) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      logger.error("documents.fetch.error", { message: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  const handleDelete = async (docName: string) => {
    setDeletingDoc(docName);
    try {
      await deleteDocument(docName);
      await fetchDocuments();
    } catch (error) {
      logger.error("documents.delete.error", { message: String(error) });
    } finally {
      setDeletingDoc(null);
    }
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();
      if (text) {
        pages.push(text);
      }
    }
    return pages.join("\n\n");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileNameLower = file.name.toLowerCase();
      const isPdf = file.type === "application/pdf" || fileNameLower.endsWith(".pdf");
      const text = isPdf ? await extractPdfText(file) : await file.text();
      if (!text.trim()) {
        throw new Error("No readable text found in file.");
      }
      
      // Chunking logic (~1000 chars)
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunkText = text.substring(i, i + chunkSize).trim();
        if (chunkText) {
          chunks.push({
            id: `${file.name}-chunk-${Math.floor(i / chunkSize)}`,
            chunkText,
            source: file.name,
            title: file.name,
          });
        }
      }

      if (chunks.length > 0) {
        // Pinecone max batch size is typically 100 or slightly more, but our ragClient uses upsertRecords which accepts up to 96
        const batchSize = 96;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          await upsertDocumentChunks(batch);
        }
      }
      await fetchDocuments();
    } catch (error) {
      logger.error("documents.upload.error", { message: String(error) });
      alert("Failed to upload document. For PDF files, ensure the PDF contains selectable text.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border shadow-2xl flex flex-col max-h-[80vh]" style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Folder size={18} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-lg font-semibold text-[var(--color-neutral-100)]">Documents</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: "var(--color-neutral-400)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#00c6c1]" size={24} />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--color-neutral-500)" }}>
              No documents found.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-3 rounded-lg border transition-colors"
                  style={{ background: "var(--color-surface-muted)", borderColor: "var(--color-border-subtle)" }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={16} className="shrink-0" style={{ color: "var(--color-neutral-400)" }} />
                    <div className="truncate text-sm font-medium" style={{ color: "var(--color-neutral-200)" }} title={doc.name}>
                      {doc.name}
                      <span className="ml-2 text-xs" style={{ color: "var(--color-neutral-500)" }}>({doc.chunks} chunks)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.name)}
                    disabled={deletingDoc === doc.name}
                    className="p-1.5 rounded-md transition-colors shrink-0 disabled:opacity-50"
                    style={{ color: "var(--color-neutral-500)" }}
                  >
                    {deletingDoc === doc.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
            accept=".txt,.md,.csv,.json,.pdf,application/pdf"
          />
          <button 
            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isUploading ? "Uploading..." : "Add Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
