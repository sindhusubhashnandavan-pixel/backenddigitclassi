/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eraser, Send, RefreshCw, PenTool, BrainCircuit } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState<{ digit: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas with black background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath(); // Reset path
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      const rect = canvas.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setPrediction(null);
        setError(null);
      }
    }
  };

  const getPrediction = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setError(null);

    try {
      // Create a temporary canvas to resize image to 28x28
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 28;
      tempCanvas.height = 28;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) throw new Error('Could not create processing context');

      // Draw the main canvas onto the small one
      tCtx.drawImage(canvas, 0, 0, 28, 28);
      
      // Get pixel data
      const imageData = tCtx.getImageData(0, 0, 28, 28);
      const pixels = new Float32Array(28 * 28);
      
      // Convert to grayscale and normalize to [0, 1]
      // We only need the red channel since it's B/W
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = imageData.data[i * 4] / 255.0;
      }

      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: Array.from(pixels) }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Prediction failed');
      }

      const data = await response.json();
      setPrediction({
        digit: data.prediction,
        confidence: data.confidence,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700"
      >
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
            <BrainCircuit size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">MNIST Classifier</h1>
          <p className="text-slate-400 text-sm">Draw a digit (0-9) in the box below</p>
        </header>

        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            className="mx-auto block bg-black rounded-2xl cursor-crosshair border-4 border-slate-700 hover:border-indigo-500 transition-colors duration-300 shadow-inner"
            id="digit-canvas"
          />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-[10px] font-mono text-white/50">
              280x280 (Native 28x28)
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={clearCanvas}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-medium transition-all active:scale-95"
            id="clear-btn"
          >
            <Eraser size={18} />
            Clear
          </button>
          <button
            onClick={getPrediction}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 ${
              loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400'
            }`}
            id="predict-btn"
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={18} />
                Predict
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {prediction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-6 border-t border-slate-700 overflow-hidden"
              id="result-display"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Result</p>
                  <p className="text-5xl font-black text-indigo-400">{prediction.digit}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Confidence</p>
                  <p className="text-2xl font-mono">{(prediction.confidence * 100).toFixed(1)}%</p>
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.confidence * 100}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              id="error-msg"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <footer className="mt-8 text-center text-slate-500 text-sm max-w-md">
        <p>Built with React, FastAPI & Scikit-Learn</p>
        <p className="mt-1 text-[10px] uppercase tracking-widest opacity-50">Random Forest Classifier</p>
      </footer>
    </div>
  );
}

