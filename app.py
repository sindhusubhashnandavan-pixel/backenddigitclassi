import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model_train import train_model

# Initialize FastAPI app
app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the request body schema
class PredictRequest(BaseModel):
    image_data: list  # Expecting a list of 784 pixel values (0-1)

# Global variable for the model
model = None

@app.on_event("startup")
def load_model():
    global model
    model_path = 'model.pkl'
    
    # Check if model exists, if not, train it
    if not os.path.exists(model_path):
        print("Model not found. Starting automatic training...")
        train_model()
    
    # Load the model
    print("Loading model...")
    model = joblib.load(model_path)
    print("Model loaded successfully.")

@app.get("/")
def read_root():
    return {"status": "Model ready" if model else "Loading..."}

@app.post("/predict")
def predict(request: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Convert list to numpy array and reshape for prediction
        data = np.array(request.image_data).reshape(1, -1)
        
        # Get prediction
        prediction = model.predict(data)[0]
        
        # Get probabilities for confidence (if supported by model)
        probabilities = model.predict_proba(data)[0]
        confidence = float(np.max(probabilities))
        
        return {
            "prediction": str(prediction),
            "confidence": confidence
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Use port 3000 as per environment constraints for internal testing if needed
    # But usually uvicorn is called via command line
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)
