import React, { useState, useRef, useEffect } from 'react';
import heic2any from "heic2any";
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
  Image as ImageIcon,
  Zap,
  Globe,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const AI_ANALYSIS_MODEL = "gemini-2.0-flash";

interface DiagnosisResult {
  crop_name: string;
  disease_name: string;
  severity: {
    level: "Halki" | "Darmiyani" | "Shadeed";
    indicator: string;
  };
  symptoms: string[];
  root_cause: string;
  yield_loss_prediction: string;
  treatment: string[];
  nutrition_fix?: string;
  prevention: string[];
  weather_alert?: string;
  final_summary: string;
}

interface AppError {
  type: 'network' | 'server' | 'auth' | 'invalid_image' | 'generic' | 'timeout' | 'permission' | 'quota';
  message: string;
  urduMessage: string;
}

const ANALYSIS_PROMPT = `You are a senior plant pathologist and agriculture expert for Pakistan. 
Analyze the image provided and give a highly detailed, professional diagnosis in Roman Urdu.

YOUR RESPONSE MUST BE A STRICT JSON OBJECT:
{
  "crop_name": "Crop Name + (Botanical Name)",
  "disease_name": "Full Disease Name (Roman Urdu + English)",
  "severity": {
    "level": "Halki", "Darmiyani", or "Shadeed",
    "indicator": "🟢", "🟡", or "🔴"
  },
  "symptoms": ["Visible Symptom 1", "Visible Symptom 2", "Visible Symptom 3"],
  "root_cause": "Detailed technical explanation of whether it is fungal, bacterial, environmental, etc.",
  "yield_loss_prediction": "Estimated % percentage loss if untreated",
  "treatment": ["Step 1 with specific chemical/product name", "Step 2", "Step 3"],
  "nutrition_fix": "Specific fertilizer or nutrition recommendation if applicable",
  "prevention": ["Tip 1", "Tip 2", "Tip 3"],
  "weather_alert": "Climate warning if current weather increases risk",
  "final_summary": "Concise professional conclusion"
}

STRICT REQUIREMENTS:
- Use HIGH CONFIDENCE. If the image is not a plant, not clear, or does not show enough detail for a professional diagnosis, return exactly: {"error": "Tasveer wazeh nahi — Meherbani karke fasal ke mutasira hisse ki wazeh aur kareeb se tasveer upload karein."}
- All text must be in Roman Urdu for the farmer to understand clearly.
- Include specific product names or active ingredients in the treatment section.`;

/**
 * Mobile-first image preprocessing:
 * - HEIC to JPEG conversion
 * - High-quality compression
 * - Max 1024px dimension
 */
async function preprocessImage(file: File): Promise<File> {
  let processedFile = file;

  // 1. Handle HEIC (iOS)
  if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
    try {
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 }) as Blob;
      processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch (e) {
      // Failed to convert HEIC
    }
  }

  // 2. Compress and Resize
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
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
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], "processed.jpg", { type: "image/jpeg" }));
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          }, "image/jpeg", 0.7);
        } else {
          reject(new Error("Canvas context failed"));
        }
      };
    };
    reader.onerror = (e) => reject(e);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
}

// Phonetic conversion function for Roman Urdu TTS fallback
function convertToPhoneticRomanUrdu(text: string): string {
  if (!text) return "";
  
  // Normalize: lowercase and remove extra spaces
  let cleanText = text.toLowerCase().trim();
  
  // 1. Remove Emojis and special symbols
  cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  cleanText = cleanText.replace(/[#*(){}[\]]/g, ' ');
  
  // 2. Phonetic adjustments for Roman Urdu to be spoken naturally
  const rules = [
    { rec: /\bhai\b/gi, rep: "hay" },
    { rec: /\bho\b/gi, rep: "hoh" },
    { rec: /\bhun\b/gi, rep: "hoon" },
    { rec: /\brahi\b/gi, rep: "raa-hee" },
    { rec: /\braha\b/gi, rep: "raa-haa" },
    { rec: /\bkar\b/gi, rep: "kur" },
    { rec: /\bke\b/gi, rep: "kay" },
    { rec: /\bki\b/gi, rep: "kee" },
    { rec: /\bka\b/gi, rep: "kaa" },
    { rec: /\bmein\b/gi, rep: "mayn" },
    { rec: /\bhain\b/gi, rep: " hain " },
    { rec: /\bnahi\b/gi, rep: "na-hee" },
    { rec: /\byeh\b/gi, rep: " yeh " },
    { rec: /\bwo\b/gi, rep: "woh" },
    { rec: /\baur\b/gi, rep: "orr" },
    { rec: /\bse\b/gi, rep: "say" },
    { rec: /\bpar\b/gi, rep: "pur" },
    { rec: /\bzyada\b/gi, rep: "zyaa-daa" },
    { rec: /\bkam\b/gi, rep: "kum" },
    // App-specific terms
    { rec: /\bfasal\b/gi, rep: "fuh-sal" },
    { rec: /\bbimari\b/gi, rep: "beemari" },
    { rec: /\bilaj\b/gi, rep: "ilaaj" },
    { rec: /\bkarein\b/gi, rep: "karay" },
    { rec: /\bpaani\b/gi, rep: "pa-ni" },
    { rec: /\bkisaan\b/gi, rep: "kissaan" },
    { rec: /\bmushahida\b/gi, rep: "moo-sha-hida" },
    { rec: /\bzaia\b/gi, rep: "zaya" },
    { rec: /\bdein\b/gi, rep: "dei" },
    { rec: /\baap\b/gi, rep: "aap" },
    { rec: /\buri\b/gi, rep: "poori" }
  ];

  rules.forEach(rule => {
    cleanText = cleanText.replace(rule.rec, rule.rep);
  });

  // Final cleanup of extra spaces
  return cleanText.replace(/\s+/g, ' ').trim();
}

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'finalizing'>('idle');
  const [loadingStatus, setLoadingStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionState | 'unsupported' | 'checking'>('checking');
  const isSpeakingRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const phaseMessages = {
    uploading: "Tasveer tyaar ho rahi hai...",
    analyzing: "AI fasal ka bariki se jaiza ley raha hai...",
    finalizing: "Report ko mukammal kiya ja raha hai..."
  };

  // Check Camera Permission on mount
  useEffect(() => {
    if ('permissions' in navigator && (navigator.permissions as any).query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then((result) => {
          setCameraPermission(result.state);
          result.onchange = () => setCameraPermission(result.state);
        }).catch(() => setCameraPermission('unsupported'));
    } else {
      setCameraPermission('unsupported');
    }
  }, []);

  // Load voices correctly
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    // Split text into manageable chunks
    const chunks = text.split(/[.।?;!:]+/).filter(t => t.trim().length > 2);

    const speakNextChunk = (idx: number) => {
      if (idx >= chunks.length || !isSpeakingRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }

      const rawChunk = chunks[idx].trim();
      // Use phonetic conversion if it's Roman Urdu to improve pronunciation
      const processedChunk = convertToPhoneticRomanUrdu(rawChunk);
      const utterance = new SpeechSynthesisUtterance(processedChunk);
      
      const v = window.speechSynthesis.getVoices();
      // Prioritize Hindi (hi-IN) as it's acoustically closest to Urdu and widely available
      const selectedVoice = 
        v.find(voice => voice.lang === 'hi-IN') || 
        v.find(voice => voice.lang.includes('hi-IN')) ||
        v.find(voice => voice.lang === 'ur-PK') ||
        v.find(voice => voice.lang.includes('ur-PK')) ||
        v[0];
      
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 0.85; 
      utterance.pitch = 1.0;
      utterance.lang = 'hi-IN'; // Explicitly set as requested
      
      utterance.onend = () => {
        if (isSpeakingRef.current) {
          setTimeout(() => speakNextChunk(idx + 1), 400);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk(0);
  };

  const speakResult = (customText?: string) => {
    if (!result && !customText) return;

    if (isSpeaking && !customText) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    const rawText = customText || `
      Diagnosis Report:
      Fasal ka naam hay, ${result?.crop_name}.
      Bimari ka naam hay, ${result?.disease_name}. 
      Shiddat, ${result?.severity.level}. 
      Alamaat, ${result?.symptoms.join(". ")}. 
      Wajah, ${result?.root_cause}.
      Nuqsan ka andaza, ${result?.yield_loss_prediction}. 
      Ilaj ke iqdamat, ${result?.treatment.join(". ")}.
      ${result?.nutrition_fix ? 'Ghiza ka mashwara, ' + result.nutrition_fix : ''}
      Ehtiyati tadabeer, ${result?.prevention.join(". ")}.
      ${result?.weather_alert ? 'Mosam ki itla, ' + result.weather_alert : ''}
      Khulasa, ${result?.final_summary}.
    `;

    speak(rawText);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith(".heic")) {
      setError({
        type: 'invalid_image',
        message: 'Invalid file type',
        urduMessage: 'Meherbani karke sirf tasveer upload karein (JPG, PNG, ya HEIC).'
      });
      return;
    }

    try {
      setLoading(true);
      setProcessingPhase('uploading');
      setLoadingStatus("Fasal ki tasveer tyaar ho rahi hai...");
      setProgress(40);
      
      const processed = await preprocessImage(file);
      setImageFile(processed);
      setImagePreview(URL.createObjectURL(processed));
      setProgress(100);
      
      setStep(2);
      setResult(null);
    } catch (err: any) {
      setError({
        type: 'generic',
        message: err.message || 'Compression failed',
        urduMessage: 'Tasveer process karne mein masla hua. Dobara koshish karein.'
      });
    } finally {
      setLoading(false);
      setProcessingPhase('idle');
      setProgress(0);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;

    setLoading(true);
    setProcessingPhase('analyzing');
    setLoadingStatus(phaseMessages.analyzing);
    setError(null);
    setProgress(30);

    try {
      const base64Data = await fileToBase64(imageFile);
      setProgress(50);

      // Retry logic for transient errors like 503
      let response;
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          response = await ai.models.generateContent({
            model: AI_ANALYSIS_MODEL,
            contents: [
              {
                parts: [
                  { text: ANALYSIS_PROMPT },
                  { inlineData: { data: base64Data, mimeType: imageFile.type } }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });
          break; // Success, break retry loop
        } catch (err: any) {
          const isRetryable = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE');
          if (isRetryable && retries < maxRetries) {
            retries++;
            setLoadingStatus(`AI masroof hai. Dobara koshish ho rahi hai (Try ${retries})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
            continue;
          }
          throw err;
        }
      }

      if (!response) throw new Error("No response from AI");

      setProcessingPhase('finalizing');
      setLoadingStatus(phaseMessages.finalizing);
      setProgress(90);

      const responseText = response.text || "";
      const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());

      if (parsed.error) {
        setError({
          type: 'invalid_image',
          message: 'AI rejected content',
          urduMessage: parsed.error
        });
        setStep(1);
      } else {
        setResult(parsed);
        setStep(3);
        setProgress(100);
        
        setTimeout(() => {
          const summary = `Report Taiyar Hai. ${parsed.crop_name}. ${parsed.final_summary}. Meherbani karke puri tafseel sunein.`;
          speakResult(summary);
        }, 500);
      }
    } catch (err: any) {
      let appErr: AppError;
      
      const msg = err.message || '';
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
        appErr = { type: 'quota', message: 'Quota exceeded', urduMessage: 'Aaj ki limit khatam ho chuki hai. Kal dobara koshish karein.' };
      } else if (msg.toLowerCase().includes('503') || msg.toLowerCase().includes('demand') || msg.toLowerCase().includes('unavailable')) {
        appErr = { type: 'server', message: 'High demand', urduMessage: 'AI per is waqt bohot load hai. Meherbani karke 1 minute baad dobara koshish karein.' };
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('internet')) {
        appErr = { type: 'network', message: 'Network error', urduMessage: 'Internet ka masla hai. Meherbani karke signal check karein aur dobara koshish karein.' };
      } else {
        appErr = { 
          type: 'server', 
          message: msg, 
          urduMessage: msg.length < 150 
            ? `AI Error: ${msg}. Meherbani karke dobara koshish karein.`
            : 'AI process mein masla hua hai. Meherbani karke internet check karein aur dobara koshish karein.'
        };
      }
      setError(appErr);
    } finally {
      setLoading(false);
      setProcessingPhase('idle');
      setProgress(0);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-[#F9FAF8] px-4 py-6 md:p-8 flex flex-col gap-4 md:gap-6 font-sans text-[#1A2E1A] max-w-[1200px] mx-auto pb-24 md:pb-20">
      <header className="w-full flex flex-col md:flex-row justify-between items-center bg-white p-4 sm:p-5 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-sage-border gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-center md:justify-start">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 bg-forest-primary rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner cursor-pointer hover:scale-105 transition-transform" 
            onClick={reset}
          >
            <Leaf className="w-6 h-6 sm:w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-forest-dark !leading-tight">Kisaan Dost AI</h1>
            <p className="text-[8px] sm:text-[9px] md:text-xs text-forest-text font-bold uppercase tracking-widest leading-none">Field Diagnostic Expert</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 bg-sage-bg p-1.5 sm:p-2 rounded-full border border-sage-muted px-4 sm:px-5 w-full md:w-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-all ${
                step === s ? 'bg-forest-primary text-white scale-110 shadow-lg' : 
                step > s ? 'bg-forest-primary/20 text-forest-primary' : 'bg-white text-forest-text border border-sage-border'
              }`}>
                {step > s ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 h-4" /> : s}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] ${
                step === s ? 'text-forest-primary' : 'text-forest-text opacity-50'
              } ${s === step ? 'block' : 'hidden sm:block'}`}>
                {s === 1 ? 'Media' : s === 2 ? 'Analysis' : 'Results'}
              </span>
              {s < 3 && <div className="w-3 h-[1px] bg-sage-muted hidden sm:block" />}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-4 sm:py-10 md:py-16 space-y-8 md:space-y-10 text-center"
            >
              <div className="space-y-3 sm:space-y-4 px-2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-black text-forest-dark leading-[1.1] md:leading-[1.1] text-center">
                  Fasal ki <span className="text-forest-primary">Bimari Ka Hal</span> <br className="hidden sm:block" /> Foran Payein
                </h2>
                <p className="text-sm sm:text-base md:text-xl text-forest-text font-medium max-w-xl mx-auto opacity-80 px-4">
                  Tasveer dein, AI aap ki fasal ka mushahida karey ga aur behtareen mashwara dey ga.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl px-4">
                <div 
                  onClick={() => cameraInputRef.current?.click()}
                  className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border-2 flex flex-col items-center justify-center gap-4 sm:gap-6 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm w-full h-full min-h-[160px] ${
                    cameraPermission === 'denied' ? 'bg-red-50 border-red-100 opacity-80' : 'border-sage-border hover:border-forest-primary hover:bg-sage-accent/30'
                  }`}
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center transition-transform ${
                    cameraPermission === 'denied' ? 'bg-red-100 text-red-600' : 'bg-forest-primary/10 text-forest-primary'
                  }`}>
                    {cameraPermission === 'denied' ? <Camera className="w-7 h-7 sm:w-8 h-8 md:w-10 h-10 opacity-50" /> : <Camera className="w-7 h-7 sm:w-8 h-8 md:w-10 h-10" />}
                  </div>
                  <div className="text-center">
                    <span className="block text-xl sm:text-2xl font-black text-forest-dark tracking-tight">Camera Se Scan</span>
                    <p className={`text-[10px] sm:text-[11px] uppercase tracking-widest font-black mt-1 sm:mt-2 ${
                      cameraPermission === 'denied' ? 'text-red-500' : 'text-forest-text opacity-60'
                    }`}>
                      {cameraPermission === 'denied' ? 'Access blocked' : 'Live Field Scan'}
                    </p>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                </div>

                <div 
                  onClick={() => galleryInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border-2 border-dashed flex flex-col items-center justify-center gap-4 sm:gap-6 cursor-pointer transition-all shadow-sm active:scale-95 w-full h-full min-h-[160px] ${
                    isDragging ? 'border-forest-primary bg-sage-accent/30 scale-[1.02]' : 'border-sage-muted hover:border-forest-primary hover:bg-sage-accent/30'
                  }`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#E6AF2E]/10 text-[#E6AF2E] flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 sm:w-8 h-8 md:w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <span className="block text-xl sm:text-2xl font-black text-forest-dark tracking-tight">Gallery Se Upload</span>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black text-forest-text opacity-60 mt-1 sm:mt-2">Photo or Library</p>
                  </div>
                  <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-md w-full bg-red-50 border border-red-100 text-red-900 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-xl mx-4"
                >
                  <div className="flex items-center gap-4">
                    <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    <p className="font-black text-base text-left">{error.urduMessage}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-8 py-4 opacity-40 grayscale pointer-events-none px-4">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Across Pakistan</span></div>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Instant Analysis</span></div>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-4 sm:py-8 space-y-8 sm:space-y-10 text-center px-4"
            >
              <div className="relative group w-full flex justify-center">
                <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-square rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-4 sm:border-8 border-white shadow-2xl">
                  <img src={imagePreview!} alt="Preview" className="w-full h-full object-cover" />
                  
                  {loading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                      <div className="w-full max-w-[150px] sm:max-w-[180px] bg-white/10 rounded-full h-2 overflow-hidden mb-6">
                        <motion.div 
                          className="h-full bg-[#2D5A27] shadow-[0_0_15px_#2D5A27]"
                          animate={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="relative z-20 flex flex-col items-center gap-4 bg-white/10 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/20 w-full">
                        <div className="w-10 h-10 sm:w-12 sm:h-12">
                          <Loader2 className="w-full h-full text-white animate-spin" />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <p className="text-[#2D5A27] font-black text-[8px] sm:text-[9px] uppercase tracking-[0.3em] sm:tracking-[0.4em]">
                            {processingPhase}
                          </p>
                          <p className="text-white font-bold text-xs sm:text-sm">
                            {loadingStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {!loading && (
                <div className="flex flex-col items-center gap-5 sm:gap-6 w-full max-w-sm">
                  <div className="space-y-2">
                    <h3 className="text-3xl sm:text-4xl font-serif font-black text-[#0D1A0D] tracking-tight">Tasveer Taiyaar!</h3>
                    <p className="text-[#4A5D4A] font-bold opacity-60 text-sm sm:text-base">Ab AI iska bariki se jaiza ley ga.</p>
                  </div>
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full bg-red-50 border border-red-100 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex items-center gap-3 sm:gap-4"
                    >
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                      <p className="text-red-900 font-bold text-xs sm:text-sm text-left">{error.urduMessage}</p>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 w-full gap-3">
                    <button 
                      onClick={analyzeImage}
                      disabled={loading}
                      className="w-full bg-[#2D5A27] hover:bg-[#1E3D1A] disabled:bg-[#DCE3D4] disabled:cursor-not-allowed text-white py-5 sm:py-6 rounded-2xl sm:rounded-[2.5rem] font-black text-lg sm:text-xl uppercase tracking-[0.2em] shadow-xl shadow-[#2D5A27]/20 transition-all flex items-center justify-center gap-3 active:scale-95 group touch-manipulation"
                    >
                      Diagnose Karein
                      <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button 
                      onClick={reset}
                      className="text-[#4A5D4A] font-black uppercase tracking-widest text-[9px] hover:text-[#2D5A27] transition-colors flex items-center justify-center gap-2 px-6 py-4 border border-[#DCE3D4] rounded-xl sm:rounded-full hover:bg-white touch-manipulation"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Tasveer Badlein
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-32 px-3 sm:px-4 overflow-x-hidden"
            >
              {/* Main Result Card */}
              <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] md:rounded-[3.5rem] p-4 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-sage-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-sage-bg rounded-bl-[60px] md:rounded-bl-[120px] -z-10 opacity-50" />
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start relative z-10">
                  {/* Plant Image Thumbnail */}
                  <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 rounded-[1.5rem] sm:rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border-4 md:border-8 border-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex-shrink-0">
                    <img src={imagePreview!} alt="Plant" className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6 w-full">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-forest-primary/10 text-forest-primary rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
                        <Activity className="w-3.5 h-3.5" /> Report Taiyar Hai
                      </div>
                      
                      <h3 className="text-[clamp(1.5rem,5vw,3rem)] font-serif font-black text-forest-dark leading-[1.1] mb-1">
                        {result?.disease_name}
                      </h3>
                      
                      <p className="text-forest-text font-bold text-sm sm:text-base md:text-lg opacity-80 italic">
                        {result?.crop_name}
                      </p>
                    </div>
                      
                    <div className="flex flex-wrap justify-center md:justify-start gap-2.5 sm:gap-3">
                      <div className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm ${
                        result?.severity.level === 'Shadeed' ? 'bg-[#D94E4E] text-white border-[#D94E4E]' :
                        result?.severity.level === 'Darmiyani' ? 'bg-[#E6AF2E] text-white border-[#E6AF2E]' :
                        'bg-forest-primary text-white border-forest-primary'
                      }`}>
                        <span className="text-sm">{result?.severity.indicator}</span>
                        {result?.severity.level}
                      </div>
                      
                      <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest bg-forest-dark text-white border border-forest-dark flex items-center gap-2 shadow-sm">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Loss: {result?.yield_loss_prediction}
                      </div>
                    </div>

                    <div className="pt-4 md:pt-6">
                      <button 
                        onClick={() => speakResult()}
                        className={`group relative flex items-center justify-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl md:rounded-[2.5rem] font-black text-[11px] sm:text-[13px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl hover:shadow-forest-primary/30 min-h-[52px] w-full sm:w-auto ${
                          isSpeaking 
                          ? 'bg-[#D94E4E] text-white shadow-red-100' 
                          : 'bg-forest-primary text-white'
                        }`}
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />}
                        <span>{isSpeaking ? 'Awaaz Band Karein' : 'Awaz Mein Sunein'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-1 md:px-2">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-sage-border flex flex-col gap-6"
                >
                  <div className="w-12 h-12 bg-sage-bg text-forest-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-forest-dark tracking-tight">Alamaat (Symptoms)</h4>
                    <ul className="space-y-4">
                       {result?.symptoms.map((v, i) => (
                         <li key={i} className="text-forest-text font-bold text-sm sm:text-base flex gap-3 leading-relaxed">
                           <span className="text-forest-primary mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-forest-primary" /> 
                           <span className="flex-1">{v}</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-sage-border flex flex-col gap-6"
                >
                  <div className="w-12 h-12 bg-[#FEF4F4] text-[#D94E4E] rounded-2xl flex items-center justify-center shadow-inner">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-5">
                    <h4 className="text-xl font-black text-forest-dark tracking-tight">Wajoohat & Nuqsan</h4>
                    <div className="space-y-4">
                      <p className="text-forest-text font-bold text-sm sm:text-base leading-relaxed opacity-90">
                        {result?.root_cause}
                      </p>
                      <div className="mt-4 p-5 bg-red-50/50 rounded-2xl border border-red-100 text-center">
                        <span className="block text-[10px] font-black text-red-800 uppercase tracking-widest mb-1 opacity-60">Yield Loss Prediction</span>
                        <span className="text-2xl font-black text-red-600 font-serif italic">{result?.yield_loss_prediction}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-sage-border flex flex-col gap-6"
                >
                  <div className="w-12 h-12 bg-sage-accent/50 text-[#E6AF2E] rounded-2xl flex items-center justify-center shadow-inner">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-forest-dark tracking-tight">Parhez (Prevention)</h4>
                    <ul className="space-y-4">
                       {result?.prevention.map((p, i) => (
                         <li key={i} className="text-forest-text font-bold text-sm sm:text-base flex gap-3 leading-relaxed">
                           <span className="text-[#E6AF2E] mt-2 flex-shrink-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#E6AF2E]" />
                           </span> 
                           <span className="flex-1 italic">{p}</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                </motion.div>

                {/* Nutrition Fix Card (Conditional) */}
                {result?.nutrition_fix && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-sage-border flex flex-col gap-6"
                  >
                    <div className="w-12 h-12 bg-forest-primary/10 text-forest-primary rounded-2xl flex items-center justify-center shadow-inner">
                      <Leaf className="w-6 h-6" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-black text-forest-dark tracking-tight">Ghiza (Nutrition Fix)</h4>
                      <p className="text-forest-text font-bold text-sm sm:text-base leading-relaxed">
                        {result.nutrition_fix}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Weather Alert Card (Conditional) */}
                {result?.weather_alert && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-sage-border flex flex-col gap-6 lg:col-span-1"
                  >
                    <div className="w-12 h-12 bg-[#FEF4F4] text-[#D94E4E] rounded-2xl flex items-center justify-center shadow-inner">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-black text-forest-dark tracking-tight">Mosam Alert</h4>
                      <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                        <p className="text-forest-text font-bold text-sm leading-relaxed italic">
                          {result.weather_alert}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
                   {/* Action Plan Section */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-forest-dark text-white p-6 sm:p-10 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 md:w-[500px] bg-forest-primary/10 rounded-full blur-[60px] md:blur-[120px] -mr-32 -mt-32 md:-mr-60 md:-mt-60" />
                
                <div className="relative z-10 space-y-10 md:space-y-14">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-14 h-14 md:w-20 md:h-20 bg-forest-primary text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-2xl">
                        <Zap className="w-8 h-8 md:w-10 md:h-10 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-3xl sm:text-4xl md:text-6xl font-serif font-black tracking-tight">Action Plan</h4>
                        <p className="text-forest-primary font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] mt-1 sm:mt-2">Professional Recommendations</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                    {result?.treatment.map((step, i) => (
                      <div key={i} className="flex gap-4 sm:gap-6 p-6 sm:p-8 bg-white/5 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 hover:bg-white/[0.08] transition-all group hover:scale-[1.01]">
                        <span className="flex-grow-0 flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-forest-primary flex items-center justify-center text-lg md:text-2xl font-black shadow-lg">
                          {i + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-forest-primary opacity-60">Step {i + 1}</p>
                          <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed opacity-95">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 md:mt-16 pt-10 border-t border-white/10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <div className="flex-1 max-w-2xl">
                      <h5 className="text-forest-primary font-black uppercase tracking-[0.3em] text-[10px] mb-3 md:mb-5">Report Khulasa (Executive Summary)</h5>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight md:leading-snug italic">
                        "{result?.final_summary}"
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                      <button 
                        onClick={reset}
                        className="bg-white text-forest-dark px-10 sm:px-14 py-5 sm:py-6 rounded-full font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-sage-bg transition-all active:scale-95 flex-shrink-0 touch-manipulation min-h-[56px] w-full"
                      >
                        <RefreshCcw className="w-5 h-5" />
                        Nayi Tasveer
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Expert Help Toast-like footer */}
              <div className="bg-sage-accent/30 p-6 sm:p-8 rounded-[2.5rem] border border-sage-muted flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-2xl">👨‍🌾</span>
                  </div>
                  <div>
                    <h5 className="font-black text-forest-dark text-lg">Zari Mahir Se Mashwara?</h5>
                    <p className="text-forest-text text-sm font-medium">Mazeed malumat ke liye apne kareebi Zari Markaz se rabta karein.</p>
                  </div>
                </div>
                <div className="w-full md:w-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-forest-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    <Globe className="w-3 h-3" /> Across Pakistan
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full bg-white/90 backdrop-blur-lg border-t border-sage-border py-4 px-6 md:px-8 flex flex-col sm:flex-row justify-between items-center z-50 gap-3 mt-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-black text-forest-text uppercase tracking-[0.1em]">
            System Online 
          </p>
        </div>
        <p className="text-[10px] font-black text-forest-text uppercase tracking-widest opacity-60 text-center">
          © {new Date().getFullYear()} KISAAN DOST AI
        </p>
      </footer>
    </div>
  );
}
