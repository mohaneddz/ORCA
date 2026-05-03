import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Folder, ArrowUp } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { runRag } from "@/lib/ragClient";
import { logger } from "@/lib/logger";
import DocumentsDialog from "@/components/ui/DocumentsDialog";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export default function ChatPage() {
  const { t, settings } = useAppSettings();
  const [showDocs, setShowDocs] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: t("chat.welcome"),
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);

  const onSend = async () => {
    const question = input.trim();
    if (!question || isStreaming) return;
    logger.info("chat.send", { questionLength: question.length });

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsStreaming(true);

    try {
      const rag = await runRag(question, settings.language);
      logger.info("chat.response.received", { sourceCount: rag.sources.length });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: rag.answer || "No answer returned from Pinecone RAG.",
          sources: rag.sources,
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "RAG request failed";
      logger.error("chat.response.error", { message: errorMessage });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `In-app RAG failed: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <div className="chat-page relative flex flex-col h-full">
      <div className="absolute top-4 right-6 z-10">
        <button 
          onClick={() => setShowDocs(true)}
          className="btn-ghost text-xs uppercase tracking-wider flex items-center gap-2 px-3 py-1.5"
          style={{ background: "color-mix(in srgb, var(--color-surface-1) 80%, transparent)" }}
        >
          <Folder size={14} className="text-[#00c6c1]" />
          {t("chat.documents")}
        </button>
      </div>

      <div className="chat-thread flex-1 overflow-y-auto pt-14">
        <div className="chat-thread-inner">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "chat-message chat-message-user" : "chat-message chat-message-assistant"}
            >
              <div className="chat-role">{message.role === "assistant" ? t("chat.assistant") : t("chat.you")}</div>
              <div className="chat-markdown prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="chat-sources">Sources: {message.sources.join(" | ")}</div>
              )}
            </div>
          ))}
          {isStreaming && <p className="chat-streaming">{t("chat.thinking")}</p>}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      <div className="chat-composer-wrap">
        <div className="chat-composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={(event) => {
              const target = event.currentTarget;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            rows={1}
            placeholder={t("chat.placeholder")}
            className="chat-composer-input"
          />
          <button type="button" className="chat-send-btn" disabled={!canSend} onClick={() => void onSend()} aria-label="Send message">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      {showDocs && <DocumentsDialog onClose={() => setShowDocs(false)} />}
    </div>
  );
}
