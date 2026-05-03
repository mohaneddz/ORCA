import { useState, useEffect, useRef } from "react";
import { Folder, X, Trash2, Plus, FileText, Loader2 } from "lucide-react";
import { listDocuments, deleteDocument, upsertDocumentChunks, preprocessDocument } from "@/lib/ragClient";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { logger } from "@/lib/logger";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type DocumentItem = {
  name: string;
  chunks: number;
};

export default function DocumentsDialog({ onClose }: { onClose: () => void }) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const { settings } = useAppSettings();
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
    logger.info("pdf.extract.start", { fileName: file.name, fileSize: file.size });
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: buffer,
      useWorkerFetch: false,
    });
    
    try {
      const pdf = await loadingTask.promise;
      logger.info("pdf.extract.loaded", { numPages: pdf.numPages });
      const pages: string[] = [];
      
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        
        // Group items by their vertical position (Y-coordinate) to maintain line structure
        // item.transform[5] is the Y-coordinate in pdf.js
        const items = content.items as any[];
        if (items.length === 0) {
          logger.warn("pdf.extract.page_empty", { pageNumber });
          continue;
        }

        // Simple approach: join by space, but handle potential missing 'str'
        const pageText = items
          .map((item) => (typeof item.str === "string" ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
          
        if (pageText) {
          pages.push(pageText);
        }
      }
      
      const fullText = pages.join("\n\n");
      logger.info("pdf.extract.success", { 
        textLength: fullText.length, 
        pageCount: pages.length 
      });
      return fullText;
    } catch (error) {
      logger.error("pdf.extract.error", { message: String(error) });
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileNameLower = file.name.toLowerCase();
      const isPdf = file.type === "application/pdf" || fileNameLower.endsWith(".pdf");

      let rawText = "";
      if (isPdf) {
        try {
          rawText = await extractPdfText(file);
        } catch (error) {
          logger.warn("pdf.extract.fallback_no_text", {
            fileName: file.name,
            message: String(error),
          });
        }
      } else {
        rawText = await file.text();
      }

      // Use Groq for semantic preprocessing and chunking
      let semanticChunks: string[] = [];
      if (rawText.trim()) {
        semanticChunks = await preprocessDocument(file.name, rawText, settings.language);
      }
      
      const finalChunks: any[] = [];
      
      if (semanticChunks.length > 0) {
        // Use semantic chunks
        semanticChunks.forEach((chunkText, i) => {
          finalChunks.push({
            id: `${file.name}-chunk-${i}`,
            chunkText,
            source: file.name,
            title: file.name,
          });
        });
      } else {
        // Fallback to basic chunking if semantic fails or returns nothing
        logger.info("documents.upload.fallback_chunking");
        if (rawText.trim()) {
          const chunkSize = 1000;
          for (let i = 0; i < rawText.length; i += chunkSize) {
            const chunkText = rawText.substring(i, i + chunkSize).trim();
            if (chunkText) {
              finalChunks.push({
                id: `${file.name}-chunk-${Math.floor(i / chunkSize)}`,
                chunkText,
                source: file.name,
                title: file.name,
              });
            }
          }
        } else {
          finalChunks.push({
            id: `${file.name}-chunk-0`,
            chunkText:
              `Document uploaded: ${file.name}. ` +
              "No selectable text was extracted from this file, so search quality may be limited.",
            source: file.name,
            title: file.name,
          });
        }
      }

      if (finalChunks.length > 0) {
        const batchSize = 96;
        for (let i = 0; i < finalChunks.length; i += batchSize) {
          const batch = finalChunks.slice(i, i + batchSize);
          await upsertDocumentChunks(batch);
        }
      }
      await fetchDocuments();
    } catch (error) {
      logger.error("documents.upload.error", { message: String(error) });
      alert("Failed to upload document. Please try again.");
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
