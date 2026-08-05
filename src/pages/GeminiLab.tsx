import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Send, 
  User, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Upload, 
  Loader2,
  Sparkles,
  MessageSquare,
  History
} from "lucide-react";

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

const GeminiLab = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const chat = useRef<ReturnType<typeof ai.chats.create>>(ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a creative assistant for PromptFilmz, an AI-powered film production platform. You help users with scriptwriting, directing, and video analysis. Be concise, professional, and inspiring."
    }
  }));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    else { const lastM = [...messages].reverse().find(m => m.role === "model"); if (lastM) { speak(lastM.content); } }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    try {
      const resp: GenerateContentResponse = await chat.current.sendMessage({ message: userMsg.content });
      const modelMsg: Message = { role: "model", content: resp.text || "Sorry I couldn't respond.", timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
      if (isSpeaking) speak(modelMsg.content);
    } catch (e) {
      toast({ title: "Error", description: "Failed to get a Gemini response.", variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a video smaller than 20MB.", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setAnalysisResult(null);
  };

  const analyzeVideo = async () => {
    if (!videoFile) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL videoFile);
      reader.onload = async () => {
        const b64 = (reader.result as string).split(",")[1];
        const resp = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: "Analyze this video. Describe scene, lighting, camera movement, mood, and suggest cinematic improvements." }, { inlineData: { data: b64, mimeType: videoFile.type } }] }]
        });
        setAnalysisResult(resp.text || "No analysis generated.");
      };
    } catch (e) {
      toast({ title: "Analysis Failed", description: "Could not analyze the video.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight text-primary flex items-center gap-3">
              <Sparkles className="w-8 h-8" /> Gemini AI Lab
            </h1>
            <p className="text-muted-foreground mt-2">Experiment with multi-turn chat, voice interaction, and cinematic video analysis.</p>
          </div>
          <Badge variant="secondary" className="w-fit h-fit px-4 py-1 text-sm">Powered by Gemini 3 Flash</Badge>
        </div>
        <Tabs defaultValue="chat" className="w'