# AI Notebook Pack

This folder contains one notebook per AI/ML component detected in the codebase.

## Run Order
1. `01_rag_pinecone_groq.ipynb`
2. `02_semantic_dlp_minilm.ipynb`
3. `03_risk_prediction_random_forest.ipynb`

## Prerequisites
- Python 3.10+
- Jupyter (Notebook or Lab)
- Install dependencies:

```bash
pip install -r notebooks/requirements.txt
```

## Environment Variables
The RAG notebook supports a safe mode when keys are missing. For live calls, set:

- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME` (default fallback: `ORCA`)
- `PINECONE_NAMESPACE` (notebook default: `notebook-demo`)
- `GROQ_API_KEY`
- `GROQ_BASE_URL` (default: `https://api.groq.com/openai/v1`)
- `GROQ_CHAT_MODEL` (notebook default: `openai/gpt-oss-20b`)

You can also use `VITE_`-prefixed vars from the app configuration.

## Mapping to Source Components
- `01_rag_pinecone_groq.ipynb`
  - Mirrors App RAG behavior from `App/src/lib/ragClient.ts`:
    - Pinecone retrieval
    - Groq `/chat/completions`
    - RAG-style answer composition
- `02_semantic_dlp_minilm.ipynb`
  - Mirrors Extension semantic DLP behavior from `Extension/background.js`:
    - Model id: `Xenova/all-MiniLM-L6-v2` (Python equivalent used)
    - Threshold: `0.65`
    - Max input chars: `12000`
    - Cosine similarity topic scoring
- `03_risk_prediction_random_forest.ipynb`
  - Mirrors backend risk prediction from `Backend/datawarehouse/views.py`:
    - `RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)`
    - Same feature list and risk-level flow

## Notes
- These notebooks are developer artifacts only; no production API surface is changed.
- The RAG notebook writes demo data only to the isolated namespace `notebook-demo` and provides a cleanup cell.
