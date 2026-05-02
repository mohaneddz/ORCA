/// <reference types="vite/client" />

declare const __DUMMY_DATA__: string | undefined;

interface ImportMetaEnv {
  readonly GROQ_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_GROQ_BASE_URL?: string;
  readonly VITE_GROQ_CHAT_MODEL?: string;
  readonly PINECONE_API_KEY?: string;
  readonly PINECONE_INDEX_NAME?: string;
  readonly VITE_PINECONE_API_KEY?: string;
  readonly VITE_PINECONE_INDEX_NAME?: string;
  readonly VITE_PINECONE_NAMESPACE?: string;
  readonly VITE_PINECONE_TOP_K?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
