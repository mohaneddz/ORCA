import os
import glob
from dotenv import load_dotenv
from pinecone import Pinecone
import fitz

load_dotenv()

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("innov")

docs_path = "documents"
pdf_files = glob.glob(os.path.join(docs_path, "*.pdf"))

records = []
for file_path in pdf_files:
    doc_name = os.path.basename(file_path)
    print(f"Reading {doc_name}...")
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        
        chunk_size = 1000
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i+chunk_size].strip()
            if not chunk:
                continue
            
            record_id = f"{doc_name}-chunk-{i//chunk_size}"
            records.append({
                "_id": record_id,
                "text": chunk,
                "source": doc_name
            })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

print(f"Total chunks: {len(records)}")

if records:
    batch_size = 96
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        print(f"Upserting batch {i//batch_size + 1} of {len(records)//batch_size + 1}...")
        try:
            index.upsert_records("__default__", batch)
            print("Batch upserted successfully.")
        except Exception as e:
            print(f"Error upserting batch: {e}")
