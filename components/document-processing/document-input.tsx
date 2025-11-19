"use client";

import { useState, useEffect } from "react";
import TextInput from "./text-input";
import FileUpload from "./file-upload";

interface DocumentInputProps {
  category: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DocumentInput({ category }: DocumentInputProps) {
  const [textContent, setTextContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // UI State
  const [summary, setSummary] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMode, setErrorMode] = useState(false); // New state for styling

  // Clear state when category changes to avoid confusion
  useEffect(() => {
    setSummary(null);
    setModelUsed(null);
    setErrorMode(false);
    setTextContent("");
    setUploadedFile(null);
  }, [category]);

  async function handleProcessDocument() {
    // 1. Hard Reset
    setLoading(true);
    setSummary(null);
    setModelUsed(null);
    setErrorMode(false);

    // 2. Placeholder for "Other"
    if (category === "other") {
      setTimeout(() => {
        setSummary("🚧 This feature is currently under construction.");
        setLoading(false);
      }, 600);
      return;
    }

    let endpoint = "";
    if (category === "bills") endpoint = "/summarize/led_billsum";
    if (category === "judgements") endpoint = "/summarize/led_judgment";

    // 3. Request Logic
    try {
      let data;
      // Cache buster string to prevent browser from returning old 304 responses
      const cacheBuster = `?cb=${new Date().getTime()}`; 

      const headers = { 
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      };

      // ---- A: Text Input ----
      if (textContent.trim().length > 0) {
        const response = await fetch(`${BACKEND_URL}${endpoint}${cacheBuster}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...headers 
          },
          body: JSON.stringify({ text: textContent }),
        });
        data = await response.json();
      }
      // ---- B: File Upload ----
      else if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch(
          `${BACKEND_URL}/summarize/file/${category}${cacheBuster}`,
          {
            method: "POST",
            body: formData,
            headers: headers // Pass headers to prevent caching
          }
        );
        data = await response.json();
      } else {
        throw new Error("Please provide text or a file.");
      }

      // 4. Handle Response Data
      if (data) {
        // Check if backend explicitly flagged an error
        if (data.model_used === "error") {
            setErrorMode(true);
            setSummary(data.summary); // "❌ Something went wrong..."
            setModelUsed("error");
        } 
        // Check for the "Null Summary" hallucination issue
        else if (data.summary && data.summary.includes("This measure has not been amended")) {
            setErrorMode(true);
            setSummary("⚠️ The AI model could not generate a valid summary for this input. The text might be too short or unclear.");
            setModelUsed(data.model_used);
        }
        // Valid Success
        else {
            setSummary(data.summary || "No summary generated.");
            setModelUsed(data.model_used || "unknown");
            setErrorMode(false);
        }
      }

    } catch (err: any) {
      console.error("Summarization Error:", err);
      setErrorMode(true);
      setSummary("❌ Network Error: Unable to connect to the summarization server. It might be restarting or busy.");
      setModelUsed("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* INPUT SECTION */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Paste your text here
        </label>
        <TextInput
          value={textContent}
          onChange={(val) => {
            setTextContent(val);
            if (val) setUploadedFile(null); // Mutual exclusivity
          }}
          placeholder={`Paste your ${category} text here...`}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-border via-accent/30 to-border" />
        <span className="text-xs uppercase text-muted-foreground font-medium">Or</span>
        <div className="flex-1 h-px bg-gradient-to-r from-border via-accent/30 to-border" />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Or upload a document
        </label>
        <FileUpload
          uploadedFile={uploadedFile}
          onFileSelect={(file) => {
            setUploadedFile(file);
            if (file) setTextContent(""); // Mutual exclusivity
          }}
          acceptedFormats={[".txt", ".pdf", ".docx"]}
        />
      </div>

      {/* ACTION BUTTON */}
      <button
        onClick={handleProcessDocument}
        disabled={(!textContent.trim() && !uploadedFile) || loading}
        className={`
            w-full py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2
            ${loading 
                ? "bg-gray-700 text-gray-300 cursor-wait" 
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg hover:shadow-indigo-500/25"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            Processing...
          </>
        ) : (
          "Summarize Document"
        )}
      </button>

      {/* OUTPUT SECTION */}
      {summary && !loading && (
        <div className={`
            rounded-xl p-6 border shadow-sm transition-all duration-300
            ${errorMode 
                ? "bg-red-950/30 border-red-500/30 text-red-200" 
                : "bg-slate-900/50 border-slate-700/50 text-slate-100 backdrop-blur-sm"
            }
        `}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${errorMode ? "text-red-400" : "text-indigo-300"}`}>
              {errorMode ? "Error" : "Summary Result"}
            </h2>
            {modelUsed && (
              <div className={`text-xs px-2 py-1 rounded-full ${
                  errorMode ? "bg-red-900/50 text-red-300" : "bg-indigo-900/50 text-indigo-300"
              }`}>
                Model: {modelUsed}
              </div>
            )}
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base opacity-90">
              {summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
