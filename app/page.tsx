"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Link2, Video, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast, ToastProvider } from "@/components/ui/use-toast";

const MAX_FILE_SIZE_MB = 500;
const MAX_DURATION_SEC = 300;

export default function HomePage() {
  return (
    <ToastProvider>
      <VideoUploadPage />
    </ToastProvider>
  );
}

function VideoUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { toast } = useToast();

  /* -------------------- Validation -------------------- */
  const validateFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Max size is ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return false;
    }

    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);

    await new Promise((resolve) => (video.onloadedmetadata = resolve));

    if (video.duration > MAX_DURATION_SEC) {
      toast({
        title: "Video too long",
        description: `Max duration is ${MAX_DURATION_SEC / 60} minutes`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  /* -------------------- Drag & Drop -------------------- */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (await validateFile(dropped))) {
      setFile(dropped);
      toast({ title: "Video selected" });
    }
  };

  /* -------------------- Upload + Progress -------------------- */
  const handleSubmit = async () => {
  if (!file && !url) return;
  setLoading(true);
  setProgress(0);

  if (file) {
    // 1️⃣ Get presigned URL from server
    const res = await fetch("/api/s3-upload", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      headers: { "Content-Type": "application/json" },
    });
    const { url: presignedUrl, key } = await res.json();

    // 2️⃣ Upload directly to S3
    await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    toast({ title: "Upload complete", description: "Video uploaded to S3", variant: "success" });

    // 3️⃣ Optionally trigger your processing job with S3 key
    const jobRes = await fetch("/api/process-video", {
      method: "POST",
      body: JSON.stringify({ s3Key: key }),
      headers: { "Content-Type": "application/json" },
    });

    const { jobId } = await jobRes.json();
    setJobId(jobId);
    setStatus("queued");
  }

  if (url) {
    // Handle URL-based processing as before
  }

  setLoading(false);
};


  /* -------------------- Polling -------------------- */
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/job-status?id=${jobId}`);
      const data = await res.json();
      setStatus(data.status);

      if (data.status === "completed") {
        toast({ title: "Processing complete", variant: "success" });
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, toast]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-amber-100 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-xl rounded-2xl shadow-xl">
          <CardContent className="p-8 space-y-6">
            <header className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-purple-800">DC Video Advisor</h1>
              <p className="text-sm text-amber-700">
                Upload, drop, or link a video to start processing
              </p>
            </header>

            {/* Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragActive ? "border-purple-600 bg-purple-50" : "border-purple-300"
              }`}
            >
              <Video className="mx-auto mb-3 text-purple-600" />
              <p className="text-sm text-purple-700">Drag & drop your video here</p>
              <Input
                type="file"
                accept="video/*"
                className="mt-3"
                onChange={async (e) => {
                  const selected = e.target.files?.[0];
                  if (selected && (await validateFile(selected))) {
                    setFile(selected);
                    toast({ title: "Video selected" });
                  }
                }}
              />
            </div>

            {/* Preview */}
            {file && (
              <video
                ref={videoRef}
                className="w-full rounded-xl border"
                controls
                src={URL.createObjectURL(file)}
              />
            )}

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Link2 size={16} /> Video URL
              </label>
              <Input placeholder="https://example.com/video.mp4" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>

            {/* Progress */}
            {loading && <Progress value={progress} />}

            {/* Status */}
            {status && <p className="text-xs text-purple-700 text-center">Status: {status}</p>}

            <Button
              onClick={handleSubmit}
              disabled={loading || (!file && !url)}
              className="w-full rounded-xl bg-purple-700 hover:bg-purple-800 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Uploading
                </span>
              ) : (
                "Submit & Start"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}