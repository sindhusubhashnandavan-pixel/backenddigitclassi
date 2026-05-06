import os
import joblib
import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Function to train and save the model
def train_model():
    print("Loading MNIST dataset... (this may take a minute)")
    # Load data from https://www.openml.org/d/554
    X, y = fetch_openml('mnist_784', version=1, return_X_y=True, as_frame=False)
    
    # Scale the data to [0, 1]
    X = X / 255.0
    
    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier...")
    # Use a simpler model for faster training in this environment
    model = RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate the model
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Model accuracy: {accuracy * 100:.2f}%")
    
    # Save the trained model
    print("Saving model to model.pkl...")
    joblib.dump(model, 'model.pkl')
    print("Training complete!")

if __name__ == "__main__":
    train_model()
