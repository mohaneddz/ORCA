import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "@/lib/logger";
import { getApiConfig, type ApiKeysConfig } from "@/lib/apiKeysStore";

type RagResult = {
  answer: string;
  sources: string[];
};

type SearchHit = {
  _id?: string;
  _score?: number;
  fields?: Record<string, unknown>;
};

type UpsertChunkInput = {
  id: string;
  chunkText: string;
  source?: string;
  title?: string;
  path?: string;
};

const PINECONE_TEXT_FIELD = "chunk_text";

function required(name: string, value?: string): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name}`);
  }
  return value.trim();
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// ──────────────────────────────────────────────────────────────────
// Config-aware Pinecone builder (config resolved at call time)
// ──────────────────────────────────────────────────────────────────
function buildPineconeClient(config: ApiKeysConfig): Pinecone {
  return new Pinecone({
    apiKey: required("PINECONE_API_KEY", config.pineconeApiKey),
  });
}

function getPineconeIndex(config: ApiKeysConfig) {
  const pc = buildPineconeClient(config);
  const index = pc.index(config.pineconeIndexName);
  return config.pineconeNamespace
    ? index.namespace(config.pineconeNamespace)
    : index;
}

// ──────────────────────────────────────────────────────────────────
// Snippet / source helpers
// ──────────────────────────────────────────────────────────────────
function extractSnippet(hit: SearchHit): string {
  const fields = hit.fields ?? {};
  return (
    asText(fields[PINECONE_TEXT_FIELD]) ||
    asText(fields.text) ||
    asText(fields.content) ||
    asText(fields.document) ||
    "No snippet"
  );
}

function extractSource(hit: SearchHit): string {
  const fields = hit.fields ?? {};
  return (
    asText(fields.source) ||
    asText(fields.url) ||
    asText(fields.path) ||
    asText(fields.title) ||
    asText(hit._id) ||
    "unknown-source"
  );
}

// ──────────────────────────────────────────────────────────────────
// Pinecone search
// ──────────────────────────────────────────────────────────────────
async function searchPineconeByText(
  question: string,
  config: ApiKeysConfig
): Promise<SearchHit[]> {
  logger.info("rag.search.start", {
    questionLength: question.length,
    topK: config.pineconeTopK,
  });
  const index = getPineconeIndex(config);
  const response = await index.searchRecords({
    query: {
      topK: config.pineconeTopK,
      inputs: { text: question },
    },
    fields: [PINECONE_TEXT_FIELD, "source", "title", "path", "url"],
  });

  const hits = (response.result?.hits ?? []) as SearchHit[];
  logger.info("rag.search.success", { hitCount: hits.length });
  return hits;
}

// ──────────────────────────────────────────────────────────────────
// Groq completion helpers
// ──────────────────────────────────────────────────────────────────
async function answerWithGroq(
  question: string,
  hits: SearchHit[],
  config: ApiKeysConfig
): Promise<string> {
  const apiKey = required("GROQ_API_KEY", config.groqApiKey);

  const context = hits
    .map((hit, index) => {
      const source = extractSource(hit);
      const snippet = extractSnippet(hit);
      return `Source ${index + 1} (${source}):\n${snippet}`;
    })
    .join("\n\n");

  logger.info("rag.answer.start", {
    hitCount: hits.length,
    model: config.groqChatModel,
  });
  const response = await fetch(`${config.groqBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.groqChatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a security assistant. Answer only from the provided context. If context is insufficient, say that clearly.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${context}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logger.warn("rag.answer.failed", {
      status: response.status,
      body: errorBody.slice(0, 400),
    });
    throw new Error(`Groq chat completion failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer =
    data?.choices?.[0]?.message?.content?.trim() || "No answer returned.";
  logger.info("rag.answer.success", { answerLength: answer.length });
  return answer;
}

async function answerWithGroqNoContext(
  question: string,
  config: ApiKeysConfig
): Promise<string> {
  const apiKey = required("GROQ_API_KEY", config.groqApiKey);

  logger.info("rag.answer.fallback.start", { model: config.groqChatModel });
  const response = await fetch(`${config.groqBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.groqChatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a security assistant. Answer clearly and briefly.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logger.warn("rag.answer.fallback.failed", {
      status: response.status,
      body: errorBody.slice(0, 400),
    });
    throw new Error(
      `Groq fallback chat completion failed (${response.status})`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer =
    data?.choices?.[0]?.message?.content?.trim() || "No answer returned.";
  logger.info("rag.answer.fallback.success", { answerLength: answer.length });
  return answer;
}

// ──────────────────────────────────────────────────────────────────
// Public exports
// ──────────────────────────────────────────────────────────────────

export async function upsertDocumentChunks(
  chunks: UpsertChunkInput[]
): Promise<void> {
  if (!chunks.length) return;
  logger.info("rag.upsert.start", { chunkCount: chunks.length });
  const config = await getApiConfig();
  const index = getPineconeIndex(config);

  await index.upsertRecords({
    records: chunks.map((chunk) => ({
      id: chunk.id,
      [PINECONE_TEXT_FIELD]: chunk.chunkText,
      source: chunk.source || "local-document",
      title: chunk.title || "",
      path: chunk.path || "",
    })),
  });
  logger.info("rag.upsert.success", { chunkCount: chunks.length });
}

export async function deleteDocumentChunks(ids: string[]): Promise<void> {
  if (!ids.length) return;
  logger.info("rag.delete.start", { idCount: ids.length });
  const config = await getApiConfig();
  const index = getPineconeIndex(config);
  await index.deleteMany(ids);
  logger.info("rag.delete.success", { idCount: ids.length });
}

export async function listDocuments(): Promise<
  { name: string; chunks: number }[]
> {
  logger.info("rag.list_docs.start");
  const config = await getApiConfig();
  const index = getPineconeIndex(config);

  const docMap = new Map<string, number>();
  let paginationToken: string | undefined = undefined;

  do {
    const response = await index.listPaginated({
      limit: 100,
      paginationToken,
    });

    for (const vector of response.vectors || []) {
      if (!vector.id) continue;
      // IDs are in the format: filename-chunk-X
      const parts = vector.id.split("-chunk-");
      if (parts.length >= 2) {
        const docName = parts.slice(0, -1).join("-chunk-");
        docMap.set(docName, (docMap.get(docName) || 0) + 1);
      } else {
        docMap.set(vector.id, (docMap.get(vector.id) || 0) + 1);
      }
    }

    paginationToken = response.pagination?.next;
  } while (paginationToken);

  const results = Array.from(docMap.entries()).map(([name, chunks]) => ({
    name,
    chunks,
  }));
  logger.info("rag.list_docs.success", { docCount: results.length });
  return results;
}

export async function deleteDocument(docName: string): Promise<void> {
  logger.info("rag.delete_doc.start", { docName });
  const config = await getApiConfig();
  const index = getPineconeIndex(config);

  let paginationToken: string | undefined = undefined;
  const idsToDelete: string[] = [];

  do {
    const response = await index.listPaginated({
      prefix: `${docName}-chunk-`,
      limit: 100,
      paginationToken,
    });
    if (response.vectors) {
      idsToDelete.push(
        ...response.vectors
          .map((v) => v.id)
          .filter((id): id is string => id !== undefined)
      );
    }
    paginationToken = response.pagination?.next;
  } while (paginationToken);

  if (idsToDelete.length > 0) {
    for (let i = 0; i < idsToDelete.length; i += 1000) {
      const batch = idsToDelete.slice(i, i + 1000);
      await index.deleteMany(batch);
    }
  }

  logger.info("rag.delete_doc.success", {
    docName,
    deletedChunks: idsToDelete.length,
  });
}

export async function runRag(question: string): Promise<RagResult> {
  logger.info("rag.run.start", { questionLength: question.length });
  const config = await getApiConfig();

  try {
    let hits: SearchHit[] = [];
    try {
      hits = await searchPineconeByText(question, config);
    } catch (searchError) {
      logger.warn("rag.search.failed", {
        message:
          searchError instanceof Error
            ? searchError.message
            : String(searchError),
      });
    }

    if (!hits.length) {
      logger.info("rag.run.no_hits.fallback_to_groq");
      const answer = await answerWithGroqNoContext(question, config);
      return { answer, sources: [] };
    }

    const answer = await answerWithGroq(question, hits, config);
    const sources = Array.from(new Set(hits.map(extractSource))).filter(
      Boolean
    );
    logger.info("rag.run.success", { sourceCount: sources.length });
    return { answer, sources };
  } catch (error: unknown) {
    logger.error("rag.run.error", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
