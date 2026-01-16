"use client";

import { useState } from "react";
import { Upload, Link2, Video } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const formData = new FormData();
    if (file) formData.append("video", file);
    if (url) formData.append("videoUrl", url);

    await fetch("/api/process-video", {
      method: "POST",
      body: formData,
    });

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-amber-100 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-xl rounded-2xl shadow-xl">
          <CardContent className="p-8 space-y-6">
            <header className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-purple-800">Video Intake</h1>
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
                dragActive
                  ? "border-purple-600 bg-purple-50"
                  : "border-purple-300"
              }`}
            >
              <Video className="mx-auto mb-3 text-purple-600" />
              <p className="text-sm text-purple-700">
                Drag & drop your video here
              </p>
              <p className="text-xs text-muted-foreground">or</p>
              <Input
                type="file"
                accept="video/*"
                className="mt-3"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Link2 size={16} /> Video URL
              </label>
              <Input
                placeholder="https://example.com/video.mp4"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {/* Selected Info */}
            {(file || url) && (
              <div className="text-xs text-purple-700 bg-purple-50 p-3 rounded-lg">
                {file && <p>📁 File: {file.name}</p>}
                {url && <p>🔗 URL provided</p>}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading || (!file && !url)}
              className="w-full rounded-xl bg-purple-700 hover:bg-purple-800 text-white"
            >
              {loading ? "Processing…" : "Submit & Start"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
