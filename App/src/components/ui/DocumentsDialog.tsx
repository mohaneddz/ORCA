import { useState, useEffect, useRef } from "react";
import { Folder, X, Trash2, Plus, FileText, Loader2 } from "lucide-react";
import { listDocuments, deleteDocument, upsertDocumentChunks } from "@/lib/ragClient";
import { logger } from "@/lib/logger";

type DocumentItem = {
  name: string;
  chunks: number;
};

export default function DocumentsDialog({ onClose }: { onClose: () => void }) {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Read text content
      const text = await file.text();
      
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
      alert("Failed to upload document. Please ensure it's a text-based file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#071225] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-[#00c6c1]" />
            <h2 className="text-lg font-semibold text-white">Documents</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
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
            <div className="text-center py-8 text-slate-500 text-sm">
              No documents found.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.name} 
                  className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="truncate text-sm font-medium text-slate-200" title={doc.name}>
                      {doc.name}
                      <span className="ml-2 text-xs text-slate-500">({doc.chunks} chunks)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.name)}
                    disabled={deletingDoc === doc.name}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors shrink-0 disabled:opacity-50"
                  >
                    {deletingDoc === doc.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
            accept=".txt,.md,.csv,.json"
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
