import os
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "process_malware_model.joblib")

_model = None

def get_model():
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
    return _model

def predict_process(cpu_percent, memory_mb, thread_count, is_signed):
    """
    Predict if a process is malicious using the trained model.
    """
    model = get_model()
    if model is None:
        return False

    # Format: cpu_percent, memory_mb, thread_count, is_signed (0 or 1)
    features = [[float(cpu_percent), float(memory_mb), int(thread_count), int(is_signed)]]
    try:
        prediction = model.predict(features)
        return bool(prediction[0])
    except Exception:
        return False

def train_and_save_model():
    """
    Train a simple scikit-learn Random Forest model on synthetic process data
    and save it to process_malware_model.joblib.
    """
    import random
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier

    X = []
    y = []

    # Generate synthetic data
    for _ in range(1000):
        # Benign process
        cpu = random.uniform(0.0, 10.0)
        mem = random.uniform(10.0, 500.0)
        threads = random.randint(1, 50)
        signed = 1
        X.append([cpu, mem, threads, signed])
        y.append(0)

        # Malicious process (high resource usage, unsigned)
        cpu = random.uniform(50.0, 99.0)
        mem = random.uniform(500.0, 2000.0)
        threads = random.randint(10, 200)
        signed = 0
        X.append([cpu, mem, threads, signed])
        y.append(1)

    X = np.array(X)
    y = np.array(y)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    joblib.dump(clf, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_and_save_model()
