/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Leaf, 
  AlertCircle, 
  Activity,
  RefreshCcw, 
  ChevronRight,
  Info,
  Volume2,
  VolumeX,
  Phone,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Model Configuration
// Note: In this environment, we use gemini-flash-latest.
const AI_MODEL = "gemini-flash-latest";
const MODEL_NAME_REFERENCE = "gemini-1.5-flash";

interface DiagnosisResult {
  title: string;
  confidence: string;
  visual_evidence: string[];
  possible_causes: string[];
  risk_level: "High Risk" | "Medium Risk" | "Low Risk";
  action_plan: string[];
  preventive_advice?: string;
  final_summary: string;
}

/**
 * Optimizes image for AI processing:
 * - Resizes to max 1024px while maintaining aspect ratio
 * - Ensures RGB quality
 */
async function optimizeImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1024;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Tasveer ka jaiza liya ja raha hai...");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const treatmentRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const statusMessages = [
    "Tasveer ka jaiza liya ja raha hai...",
    "Patton ki sakht check ho rahi hai...",
    "Bimari ke nishanaat dhoonday ja rahay hain...",
    "Agricultural database se mawazna ho raha hai...",
    "Aakhri report banai ja rahi hai..."
  ];

  // Load voices correctly
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Update loading messages during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let idx = 0;
      setLoadingStatus(statusMessages[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % statusMessages.length;
        setLoadingStatus(statusMessages[idx]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Fix scrolling: Move to top on step change or loading change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (loading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [loading]);

  const speakResult = (customText?: string) => {
    if (!result && !customText) return;

    if (isSpeaking && !customText) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    // Ensure customText is actually a string (ignore event objects from onClick)
    const validCustomText = typeof customText === 'string' ? customText : undefined;

    const fullText = validCustomText || `
      Report ki mukammal tafseelat ye hain.
      Tajveez, ${result?.title}. 
      Yaqeen, ${result?.confidence}. 
      Mushahidaat, ${result?.visual_evidence.join(". ")}. 
      Wajoohat, ${result?.possible_causes.join(". ")}.
      Risk, ${result?.risk_level}. 
      Agla la-e-amal ye hain. ${result?.action_plan.join(". ")}.
      Ehtiyati tadabeer, ${result?.preventive_advice || 'Koi makhsoos ehtiyati tadabeer nahi'}.
      Khulasa, ${result?.final_summary}.
    `;

    window.speechSynthesis.cancel(); 
    isSpeakingRef.current = true;

    // Split into smaller chunks to prevent timeout in some browsers
    const chunks = fullText.split(/[.।?;!]+/).filter(t => t.trim().length > 2);

    const speakNextChunk = (idx: number) => {
      if (idx >= chunks.length || !isSpeakingRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[idx].trim());
      const selectedVoice = voices.find(v => v.lang.startsWith('ur')) || 
                           voices.find(v => v.lang.startsWith('hi'));
      
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 0.85;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        // Small delay between chunks for more natural flow
        setTimeout(() => speakNextChunk(idx + 1), 250);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk(0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const optimized = await optimizeImage(reader.result as string);
        setImage(optimized);
        setStep(2);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const base64Data = image.split(',')[1];
      
      const prompt = `You are an expert Agricultural AI Diagnostic System (Field-level Crop Expert) for Pakistan.
Analyze this crop image and provide practical agricultural advice in Roman Urdu.

YOUR CORE TASK:
1. Detect Disease, Nutritional deficiency, Pest damage, or Healthy condition.
2. If image is unclear, return the error structure below.

STRICT RULES:
- NEVER give fake precision (95% accuracy).
- ALWAYS show uncertainty when needed.
- Respond ONLY in Roman Urdu (short, clear sentences).
- If multiple diseases are possible, mention all.

STRICT JSON OUTPUT FORMAT:
{
  "title": "Fasal Name: Condition (e.g. Tomato Leaf: Early Blight Suspected)",
  "confidence": "Choose ONE: Zyada Mumkin, Darmiyani Imkaan, Kam Yaqeen, Tasveer wazeh nahi",
  "visual_evidence": ["Explain what you SEE specifically, e.g. Leaf par brown daagh"],
  "possible_causes": ["List causes like Fungal infection, Nutrient deficiency, etc."],
  "risk_level": "Choose ONE: High Risk, Medium Risk, Low Risk",
  "action_plan": ["Practical step 1", "Practical step 2"],
  "preventive_advice": "Seasonal warning or crop rotation hint (Optional)",
  "final_summary": "1-2 lines simple conclusion for the farmer"
}

If image is NOT a crop/plant or is too blurry:
{
  "error": "Tasveer wazeh nahi — Meherbani karke fasal ki saaf tasveer upload karein."
}

CONTEXT: Consider Pakistan's seasonal climate and regional diseases.`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Khali jawab mila.");
      
      const parsed = JSON.parse(responseText);

      if (parsed.error) {
        setError(parsed.error);
        setStep(1);
      } else {
        const formattedResult = parsed as DiagnosisResult;
        // Add a final completion message and a brief delay for professionalism
        setLoadingStatus("AI Report Taiyar Hai! Bas ek lamha...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        setResult(formattedResult);
        setStep(3);
        setLoading(false);
        
        // Auto-play the summary for the farmer
        setTimeout(() => {
          const summary = `Report Taiyar Hai. ${formattedResult.title}. ${formattedResult.final_summary}. Meherbani karke puri tafseel sunein.`;
          speakResult(summary);
        }, 500);
      }
    } catch (err) {
      console.error(err);
      setError("Sarvar mein masla hai ya internet slow hai. Meherbani karke dobara koshish karein.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setImage(null);
    setResult(null);
    setError(null);
    setStep(1);
  };

  const scrollToTreatment = () => {
    treatmentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-sage-bg p-4 md:p-8 flex flex-col gap-6 font-sans text-forest-dark max-w-[1200px] mx-auto pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-sage-border gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-forest-primary rounded-2xl flex items-center justify-center text-white text-2xl shadow-inner cursor-pointer" onClick={reset}>
            <Leaf className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-forest-heading">Kisaan Dost AI</h1>
            <p className="text-sm text-forest-text font-medium italic">Agriculture Expert System</p>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 md:gap-4 bg-sage-accent/30 p-2 rounded-full border border-sage-muted px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-forest-primary text-white' : 
                step > s ? 'bg-forest-primary/20 text-forest-primary' : 'bg-white text-forest-text'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${
                step === s ? 'text-forest-primary' : 'text-forest-text opacity-50'
              }`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Analyze' : 'Result'}
              </span>
              {s < 3 && <div className="w-4 h-[1px] bg-sage-muted hidden sm:block" />}
            </div>
          ))}
        </div>
      </header>

      <main ref={mainRef} className="flex-1">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 space-y-8 text-center"
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-forest-heading leading-tight">
                  Khushamdeed! <br /> <span className="text-forest-primary">Fasal ki Report Payein</span>
                </h2>
                <p className="text-lg text-forest-text font-medium max-w-md mx-auto">
                  Apni fasal ya patte ki saaf tasveer upload karein taake hum bimari ka hal bata sakein.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md bg-white rounded-[40px] p-16 border-4 border-dashed border-sage-muted flex flex-col items-center justify-center gap-8 cursor-pointer hover:border-forest-primary/40 hover:bg-sage-accent/20 transition-all group shadow-sm active:scale-95"
              >
                <div className="w-24 h-24 rounded-full bg-sage-accent flex items-center justify-center text-forest-primary group-hover:scale-110 transition-transform shadow-md">
                  <Camera className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <span className="block text-2xl font-black text-forest-dark tracking-tight uppercase">Tasveer Lein</span>
                  <p className="text-forest-text font-bold opacity-60">Mobile camera ya gallery se</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </div>

              {error && (
                <div className="max-w-md w-full bg-red-50 border border-red-100 text-red-900 p-6 rounded-3xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <p className="font-medium text-sm leading-relaxed">{error}</p>
                </div>
              )}
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center py-8 space-y-8 text-center px-4"
            >
              <div className="relative group">
                <div className="relative w-80 h-80 rounded-[40px] overflow-hidden border-8 border-white shadow-2xl transition-transform group-hover:scale-[1.02]">
                  <img src={image!} alt="Preview" className="w-full h-full object-cover" />
                  
                  {/* Decorative High-Tech Corners */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-forest-primary rounded-tl-lg z-30 opacity-70" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-forest-primary rounded-tr-lg z-30 opacity-70" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-forest-primary rounded-bl-lg z-30 opacity-70" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-forest-primary rounded-br-lg z-30 opacity-70" />

                  {loading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] flex flex-col items-center justify-center">
                      <motion.div 
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ 
                          duration: 2.5, 
                          repeat: Infinity, 
                          ease: "easeInOut"
                        }}
                        className="absolute left-0 right-0 h-1 bg-forest-primary shadow-[0_0_20px_rgba(45,90,39,1)] z-10"
                      />
                      
                      <div className="relative z-20 flex flex-col items-center gap-6 bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/30 shadow-2xl">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 border-[6px] border-white/20 rounded-full" />
                          <div className="absolute inset-0 border-[6px] border-t-forest-primary rounded-full animate-spin shadow-[0_0_10px_rgba(45,90,39,0.5)]" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] opacity-60">Scanning</p>
                          <p className="text-white font-bold text-sm leading-tight max-w-[220px]">
                            {loadingStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!loading && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-4 -right-4 w-12 h-12 bg-forest-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white animate-bounce"
                  >
                    <span className="font-black text-sm">✓</span>
                  </motion.div>
                )}
              </div>
              
              {!loading && (
                <div className="flex flex-col items-center gap-6 w-full max-w-md">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-serif font-bold text-forest-heading uppercase tracking-tighter">Tasveer Taiyaar!</h3>
                    <p className="text-forest-text font-medium opacity-80 italic">Ab AI iska bariki se jaiza ley ga.</p>
                  </div>
                  <button 
                    onClick={analyzeImage}
                    className="w-full bg-forest-primary hover:bg-forest-primary/90 text-white py-6 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-forest-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                  >
                    Diagnose Karein
                    <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={reset}
                    className="text-forest-text font-black uppercase tracking-widest text-[10px] hover:text-forest-primary transition-colors flex items-center gap-2 px-6 py-3 border border-sage-border rounded-full hover:bg-white"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Dobara Tasveer Lein
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl mx-auto space-y-8 pb-32"
            >
              {/* Modern Result Header */}
              <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-forest-primary/5 border border-sage-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-forest-primary/5 rounded-bl-[100px] transition-transform group-hover:scale-110" />
                
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                  <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden border-4 border-[#F2F4EF] shadow-2xl flex-shrink-0 group-hover:scale-[1.02] transition-transform">
                    <img src={image!} alt="Plant" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-forest-primary/10 text-forest-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                        Analysis Complete
                      </div>
                      <h3 className="text-4xl md:text-5xl font-serif font-bold text-forest-heading leading-tight mb-2">
                        {result?.title}
                      </h3>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          result?.risk_level === 'High Risk' ? 'bg-red-600 text-white border-red-600' :
                          result?.risk_level === 'Medium Risk' ? 'bg-orange-500 text-white border-orange-500' :
                          'bg-forest-primary text-white border-forest-primary'
                        }`}>
                          {result?.risk_level}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <button 
                        onClick={() => speakResult()}
                        className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                          isSpeaking 
                          ? 'bg-[#D94E4E] text-white shadow-red-200' 
                          : 'bg-forest-primary text-white shadow-forest-primary/20'
                        }`}
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4 shadow-inner" /> : <Volume2 className="w-4 h-4" />}
                        {isSpeaking ? 'Awaaz Band Karein' : 'Puri Report Sunein'}
                      </button>
                      
                      <div className="px-5 py-3 bg-sage-accent/30 rounded-2xl border border-sage-muted flex flex-col items-center md:items-start">
                        <span className="text-[8px] font-black text-forest-text uppercase tracking-[0.2em] mb-1">Yaqeen (Confidence)</span>
                        <span className="text-sm font-black text-forest-primary">{result?.confidence}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-forest-primary/5 border border-sage-border flex flex-col gap-5 hover:shadow-2xl transition-shadow"
                >
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-forest-heading mb-2">Tasveer ka Mushahida</h4>
                    <ul className="space-y-2">
                       {result?.visual_evidence.map((v, i) => (
                         <li key={i} className="text-forest-text font-medium opacity-90 flex gap-2 text-sm">
                           <span className="text-forest-primary">•</span> {v}
                         </li>
                       ))}
                    </ul>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-forest-primary/5 border border-sage-border flex flex-col gap-5 hover:shadow-2xl transition-shadow"
                >
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-forest-heading mb-2">Mumkin Wajoohat</h4>
                    <ul className="space-y-2">
                       {result?.possible_causes.map((c, i) => (
                         <li key={i} className="text-forest-text font-medium opacity-90 flex gap-2 text-sm">
                           <span className="text-red-500">•</span> {c}
                         </li>
                       ))}
                    </ul>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-forest-primary/5 border border-sage-border flex flex-col gap-5 hover:shadow-2xl transition-shadow"
                >
                  <div className="w-14 h-14 bg-sage-accent text-forest-primary rounded-2xl flex items-center justify-center shadow-sm">
                    <Info className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-forest-heading mb-2">Ehtiyati Tadabeer</h4>
                    <p className="text-forest-text leading-relaxed font-medium opacity-90 text-sm">
                      {result?.preventive_advice || "Fasal ki munasib dekh bhaal jari rakhein."}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-forest-dark text-white p-10 rounded-[3rem] shadow-2xl col-span-1 md:col-span-2 lg:col-span-3 overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-forest-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                  
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-forest-primary/20 text-forest-primary rounded-2xl flex items-center justify-center shadow-inner">
                        <Leaf className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-bold">Action Plan (Agla Qadam)</h4>
                        <p className="text-forest-primary/80 font-black text-[10px] uppercase tracking-widest mt-1">AI Recommended Steps</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {result?.action_plan.map((step, i) => (
                        <div key={i} className="flex gap-4 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/[0.08] transition-colors group">
                          <span className="flex-grow-0 flex-shrink-0 w-10 h-10 rounded-2xl bg-forest-primary flex items-center justify-center text-sm font-black shadow-lg group-hover:scale-110 transition-transform">
                            {i + 1}
                          </span>
                          <p className="text-base font-medium leading-relaxed opacity-90">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                      <div className="flex-1">
                        <h5 className="text-forest-primary font-black uppercase tracking-[0.2em] text-[10px] mb-3">Pura Khulasa (Summary)</h5>
                        <p className="text-2xl font-medium leading-tight">{result?.final_summary}</p>
                      </div>
                      <button 
                        onClick={reset}
                        className="bg-white text-forest-dark px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-sage-accent transition-all active:scale-95 flex-shrink-0"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Nayi Report
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Mobile FAB */}
              <div className="fixed bottom-24 right-8 z-50 md:hidden">
                <button 
                  onClick={reset}
                  className="w-16 h-16 bg-forest-dark text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-transform"
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-sage-border py-4 px-8 flex justify-between items-center z-50">
        <p className="text-[10px] font-black text-forest-text uppercase tracking-widest">
          © 2026 Kisaan Dost AI
        </p>
        <div className="flex gap-4">
          <p className="text-[10px] font-black text-forest-primary uppercase tracking-widest">
            {step === 1 ? 'Step 1: Upload' : step === 2 ? 'Step 2: Analysis' : 'Step 3: Result'}
          </p>
        </div>
      </footer>
    </div>
  );
}
