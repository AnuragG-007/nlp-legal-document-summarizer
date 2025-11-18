"use client";

import { useState } from "react";
import TextInput from "./text-input";
import FileUpload from "./file-upload";

interface DocumentInputProps {
  category: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DocumentInput({ category }: DocumentInputProps) {
  const [textContent, setTextContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleProcessDocument() {
    setLoading(true);
    setSummary(null);
    setModelUsed(null);

    // ------ CASE: OTHER DOCUMENTS ------
    if (category === "other") {
      setSummary("🚧 This feature is currently under construction.");
      setLoading(false);
      return;
    }

    let endpoint = "";
    if (category === "bills") endpoint = "/summarize/led_billsum";
    if (category === "judgements") endpoint = "/summarize/led_judgment";

    try {
      let data;

      // ---- CASE 1: User entered text ----
      if (textContent.trim().length > 0) {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textContent }),
        });

        data = await response.json();
      }

      // ---- CASE 2: File upload ----
      else if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch(
          `${BACKEND_URL}/summarize/file/${category}`,
          {
            method: "POST",
            body: formData,
          }
        );

        data = await response.json();
      }

      if (data) {
        setSummary(data.summary || "❌ No summary returned.");
        setModelUsed(data.model_used || "unknown"); // ⭐ NEW
      }
    } catch (err) {
      setSummary("❌ Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Text Input Section */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Paste your text here
        </label>
        <TextInput
          value={textContent}
          onChange={setTextContent}
          placeholder="Paste your legal document text here..."
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-border via-accent/30 to-border" />
        <span className="text-xs uppercase text-muted-foreground font-medium">
          Or
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-border via-accent/30 to-border" />
      </div>

      {/* File Upload Section */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Or upload a document
        </label>
        <FileUpload
          uploadedFile={uploadedFile}
          onFileSelect={setUploadedFile}
          acceptedFormats={[".txt", ".pdf", ".docx"]}
        />
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcessDocument}
        disabled={(!textContent.trim() && !uploadedFile) || loading}
        className="premium-button w-full text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Summarizing… Please wait
          </>
        ) : (
          "Process Document"
        )}
      </button>

      {/* Loading Message */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
          <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          <span>Your document is being analyzed and summarized…</span>
        </div>
      )}

      {/* Summary Preview */}
      {summary && (
        <div className="p-6 mt-4 rounded-xl bg-gray-800 text-white space-y-3">
          {modelUsed && (
            <div className="text-sm text-green-300 font-semibold">
              Model Used: {modelUsed}
            </div>
          )}

          <h2 className="text-xl font-semibold">Summary</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}