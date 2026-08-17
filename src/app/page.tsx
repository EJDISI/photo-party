"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Camera, 
  Video,
  Image as ImageIcon, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Loader2, 
  Heart, 
  AlertCircle, 
  RefreshCw, 
  Maximize2,
  FlipHorizontal,
  RotateCw,
  QrCode,
  Copy,
  Check,
  Trash2,
  Moon,
  Sun
} from "lucide-react";
import confetti from "canvas-confetti";

interface FileItem {
  id: string;
  name: string;
  file: File;
  previewUrl: string | null;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  isFlipped: boolean;
  rotation: number;
  uploadedKey?: string;
}

interface GalleryPhoto {
  key: string;
  url: string;
  author: string;
  uploadedAt: string;
  isVideo: boolean;
}

const applyTransformations = async (item: FileItem): Promise<File> => {
  if (item.file.type.startsWith("video/") || (!item.isFlipped && item.rotation === 0)) {
    return item.file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const tempUrl = URL.createObjectURL(item.file);
    img.src = tempUrl;

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return resolve(item.file);

      const isRotated90or270 = item.rotation === 90 || item.rotation === 270;
      canvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);

      if (item.isFlipped) {
        ctx.scale(-1, 1);
      }

      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(item.file);
          const bakedFile = new File([blob], item.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(bakedFile);
        },
        "image/jpeg",
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(item.file);
    };
  });
};

export default function PhotoParty() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [author, setAuthor] = useState("");
  const [authorError, setAuthorError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [myUploadedKeys, setMyUploadedKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showQrModal, setShowQrModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const authorInputRef = useRef<HTMLInputElement>(null);

  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      setIsLoadingGallery(true);
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setGallery(data.photos || []);
      }
    } catch (err) {
      console.error("Błąd galerii:", err);
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    // Inicjalizacja trybu ciemnego
    const savedTheme = localStorage.getItem("photo_party_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);

    if (shouldBeDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.origin);
      const savedKeys = localStorage.getItem("photo_party_my_keys");
      if (savedKeys) {
        try {
          setMyUploadedKeys(JSON.parse(savedKeys));
        } catch {}
      }
    }
    fetchGallery();
    const saved = localStorage.getItem("photo_party_author");
    if (saved) setAuthor(saved);
  }, [fetchGallery]);

  const toggleDarkMode = () => {
    const nextState = !isDark;
    setIsDark(nextState);
    if (nextState) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("photo_party_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("photo_party_theme", "light");
    }
  };

  const handleAuthorChange = (val: string) => {
    setAuthor(val);
    if (val.trim().length > 0) {
      setAuthorError(false);
    }
    localStorage.setItem("photo_party_author", val);
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const list = Array.from(selectedFiles);
    const newItems: FileItem[] = list.map((file, i) => {
      let preview: string | null = null;
      try {
        preview = URL.createObjectURL(file);
      } catch {
        preview = null;
      }

      return {
        id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name || (file.type.startsWith("video/") ? `film_${i + 1}.mp4` : `zdjecie_${i + 1}.jpg`),
        file,
        previewUrl: preview,
        progress: 0,
        status: "idle",
        isFlipped: false,
        rotation: 0,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
  };

  const toggleFlip = (id: string) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFlipped: !item.isFlipped } : item
      )
    );
  };

  const rotatePhoto = (id: string) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const uploadSingleFile = async (item: FileItem, currentAuthor: string): Promise<string> => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 10 } : f))
    );

    try {
      const finalFile = await applyTransformations(item);
      const ext = finalFile.name.split(".").pop() || (item.file.type.startsWith("video/") ? "mp4" : "jpg");
      const guestName = currentAuthor && currentAuthor.trim() ? currentAuthor.trim() : "Gość";

      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: finalFile.name || `plik_${Date.now()}.${ext}`,
          contentType: finalFile.type || (item.file.type.startsWith("video/") ? "video/mp4" : "image/jpeg"),
          author: guestName,
        }),
      });

      if (!res.ok) throw new Error("Błąd autoryzacji serwera R2");
      const { uploadUrl, key } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", finalFile.type || "application/octet-stream");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.max(10, Math.round((e.loaded / e.total) * 100));
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: percent, status: "uploading" } : f))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: 100, status: "success", uploadedKey: key } : f))
            );
            resolve();
          } else {
            console.error("Błąd zapisu do R2:", xhr.status, xhr.responseText);
            reject(new Error(`Błąd zapisu (HTTP ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Błąd połączenia"));
        xhr.send(finalFile);
      });

      return key;
    } catch (err: unknown) {
      console.error("Błąd procesu wgrywania:", err);
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error" } : f))
      );
      throw err;
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0 || isUploading) return;

    if (!author.trim()) {
      setAuthorError(true);
      authorInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      authorInputRef.current?.focus();
      return;
    }

    setIsUploading(true);

    try {
      const uploadedKeys = await Promise.all(files.map((item) => uploadSingleFile(item, author)));
      
      const newKeysList = [...myUploadedKeys, ...uploadedKeys.filter(Boolean)];
      setMyUploadedKeys(newKeysList);
      localStorage.setItem("photo_party_my_keys", JSON.stringify(newKeysList));

      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
      });

      fetchGallery();

      setTimeout(() => {
        setIsComplete(true);
      }, 1000);
    } catch (error) {
      console.error("Błąd wysyłania:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (key: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to zdjęcie z albumu?")) return;

    try {
      setIsDeleting(true);
      const res = await fetch("/api/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        setGallery((prev) => prev.filter((p) => p.key !== key));
        const updatedKeys = myUploadedKeys.filter((k) => k !== key);
        setMyUploadedKeys(updatedKeys);
        localStorage.setItem("photo_party_my_keys", JSON.stringify(updatedKeys));
        if (selectedPhoto?.key === key) {
          setSelectedPhoto(null);
        }
      } else {
        alert("Wystąpił błąd podczas usuwania zdjęcia.");
      }
    } catch (err) {
      console.error("Błąd usuwania:", err);
      alert("Błąd połączenia.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReset = () => {
    files.forEach((f) => {
      if (f.previewUrl) {
        try {
          URL.revokeObjectURL(f.previewUrl);
        } catch {}
      }
    });
    setFiles([]);
    setIsComplete(false);
    fetchGallery();
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#faf8f5] dark:bg-[#0f1612] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-800 dark:text-emerald-500 animate-spin" />
      </main>
    );
  }

  const completedCount = files.filter((f) => f.status === "success").length;
  const isAuthorValid = author.trim().length > 0;

  const qrImageUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        currentUrl
      )}&color=${isDark ? "e6ede8" : "065f46"}&bgcolor=${isDark ? "19231d" : "ffffff"}`
    : "";

  return (
    <main className="min-h-screen bg-[#faf8f5] dark:bg-[#0f1612] text-[#2c3e35] dark:text-[#e6ede8] pb-20 selection:bg-emerald-200 transition-colors duration-200">
      {/* Pasek nawigacyjny */}
      <header className="bg-white/95 dark:bg-[#141d18]/95 backdrop-blur-md border-b border-[#e8e2d8] dark:border-[#22332a] sticky top-0 z-20 px-6 pt-4 pb-4 text-center shadow-sm relative transition-colors">
        <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400 mb-1">
          <span>Wesele</span>
          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-[#1f2d27] dark:text-[#f2f7f4]">
          Kinga i Kamil
        </h1>

        {/* Przyciski w nagłówku: Tryb Ciemny & QR */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#1d2a23] dark:hover:bg-[#25372e] text-[#2c3e35] dark:text-[#e6ede8] rounded-xl transition cursor-pointer flex items-center justify-center shadow-sm"
            title={isDark ? "Włącz tryb jasny" : "Włącz tryb ciemny"}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-emerald-800" />
            )}
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#1d2a23] dark:hover:bg-[#25372e] text-[#2c3e35] dark:text-[#e6ede8] rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Pokaż kod QR"
          >
            <QrCode className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span className="text-[11px] font-bold hidden sm:inline">QR</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        {/* Ekran po wysłaniu */}
        {isComplete ? (
          <div className="bg-white dark:bg-[#16201a] rounded-3xl p-6 shadow-sm text-center border border-[#e8e2d8] dark:border-[#22332a] space-y-4">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1f2d27] dark:text-[#f2f7f4]">Wszystko wgrane! ❤️</h2>
            <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">
              Dziękujemy, <span className="font-semibold text-[#1f2d27] dark:text-white">{author}</span>! Twoje pamiątki pojawiły się we wspólnej galerii poniżej.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-[#f4efe6] font-semibold rounded-2xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Dodaj kolejne zdjęcia lub filmy
            </button>
          </div>
        ) : (
          <>
            <div className="text-center px-2">
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-light">
                Cieszymy się, że jesteście z nami! Podzielcie się swoimi zdjęciami i filmami z wesela.
              </p>
            </div>

            {/* Formularz podpisu */}
            <div className={`bg-white dark:bg-[#16201a] p-5 rounded-2xl border transition-all shadow-sm ${
              authorError 
                ? "border-rose-400 ring-2 ring-rose-200 dark:ring-rose-950" 
                : "border-[#e8e2d8] dark:border-[#22332a]"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Twój podpis <span className="text-rose-500">*</span>
                </label>
                {authorError && (
                  <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Podpis jest wymagany!
                  </span>
                )}
              </div>
              <input
                ref={authorInputRef}
                type="text"
                value={author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder="np. Szwagier, Świadkowie, Ciocia Kasia..."
                className={`w-full px-4 py-3 bg-[#faf8f5] dark:bg-[#111914] text-[#2c3e35] dark:text-[#f2f7f4] border rounded-xl text-sm transition focus:outline-none focus:ring-2 ${
                  authorError
                    ? "border-rose-300 focus:ring-rose-400 bg-rose-50/40 dark:bg-rose-950/20"
                    : "border-stone-200 dark:border-stone-800 focus:ring-emerald-800 dark:focus:ring-emerald-600"
                }`}
                disabled={isUploading}
              />
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1.5 font-light">
                Podpis pojawi się przy Twoich zdjęciach i filmach we wspólnej galerii.
              </p>
            </div>

            {/* 3 Przyciski wyboru - szmaragdowy emerald-800 */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* 1. ZDJĘCIE */}
              <label
                htmlFor="native-photo-input"
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-[#f4efe6] rounded-2xl shadow-sm cursor-pointer select-none text-center transition"
              >
                <Camera className="w-6 h-6 text-amber-300" />
                <span className="text-[11px] font-semibold leading-tight">Zrób zdjęcie</span>
                <input
                  id="native-photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>

              {/* 2. KAMERA / WIDEO */}
              <label
                htmlFor="native-video-input"
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-[#f4efe6] rounded-2xl shadow-sm cursor-pointer select-none text-center transition"
              >
                <Video className="w-6 h-6 text-amber-300" />
                <span className="text-[11px] font-semibold leading-tight">Nagraj film</span>
                <input
                  id="native-video-input"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>

              {/* 3. GALERIA */}
              <label
                htmlFor="native-gallery-input"
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-[#f4efe6] rounded-2xl shadow-sm cursor-pointer select-none text-center transition"
              >
                <ImageIcon className="w-6 h-6 text-amber-300" />
                <span className="text-[11px] font-semibold leading-tight">Z galerii</span>
                <input
                  id="native-gallery-input"
                  type="file"
                  accept="image/*,video/*,video/mp4,video/quicktime,video/webm,.mov,.mp4"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="w-full py-3 bg-white dark:bg-[#16201a] hover:bg-stone-50 dark:hover:bg-[#1c2921] border border-[#e8e2d8] dark:border-[#22332a] rounded-2xl text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
              <span>Pokaż kod QR gościom obok 📲</span>
            </button>

            {/* Pasek postępu */}
            {isUploading && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <Loader2 className="w-6 h-6 text-emerald-800 dark:text-emerald-400 animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Wgrywanie ({completedCount} z {files.length} gotowe)
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">Prosimy nie zamykać strony.</p>
                </div>
              </div>
            )}

            {/* Podgląd plików */}
            {files.length > 0 && (
              <div className="bg-white dark:bg-[#16201a] p-5 rounded-2xl border border-[#e8e2d8] dark:border-[#22332a] shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Wybrane pliki ({files.length})
                  </span>
                  {!isUploading && (
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Wyczyść wszystko
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((item) => (
                    <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-stone-100 dark:bg-[#111914] border-2 border-stone-200 dark:border-stone-800 flex flex-col justify-end shadow-sm">
                      {item.file.type.startsWith("video/") ? (
                        <video src={item.previewUrl || ""} className="absolute inset-0 w-full h-full object-cover" />
                      ) : item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={item.previewUrl} 
                          alt="preview" 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-150" 
                          style={{
                            transform: `rotate(${item.rotation}deg) scaleX(${item.isFlipped ? -1 : 1})`
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-stone-200 dark:bg-stone-800">
                          <ImageIcon className="w-6 h-6 text-stone-400 mb-1" />
                          <span className="text-[10px] text-stone-600 dark:text-stone-300 truncate max-w-full px-1">{item.name}</span>
                        </div>
                      )}

                      {!isUploading && item.status === "idle" && (
                        <div className="absolute top-2 inset-x-2 flex justify-between items-center z-10">
                          {!item.file.type.startsWith("video/") ? (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleFlip(item.id)}
                                title="Odbij lustrzanie"
                                className={`p-2 rounded-full transition-transform active:scale-90 cursor-pointer shadow-md backdrop-blur-sm flex items-center justify-center ${
                                  item.isFlipped 
                                    ? "bg-amber-400 text-stone-950 font-bold scale-105" 
                                    : "bg-black/75 hover:bg-black text-white"
                                }`}
                              >
                                <FlipHorizontal className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => rotatePhoto(item.id)}
                                title="Obróć o 90°"
                                className="p-2 rounded-full bg-black/75 hover:bg-black active:scale-90 text-white transition-transform cursor-pointer shadow-md backdrop-blur-sm flex items-center justify-center"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : <div />}

                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            title="Usuń"
                            className="p-2 rounded-full bg-rose-600/90 hover:bg-rose-700 active:scale-90 text-white transition-transform cursor-pointer ml-auto shadow-md backdrop-blur-sm flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      )}

                      {item.isFlipped && (
                        <div className="absolute bottom-2 left-2 z-10 bg-amber-400 text-stone-950 font-bold px-2 py-0.5 rounded-md text-[9px] shadow-sm uppercase tracking-wider">
                          Odbite ↔
                        </div>
                      )}

                      {item.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10">
                          <Loader2 className="w-7 h-7 text-amber-300 animate-spin mb-1" />
                          <span className="text-xs font-bold tracking-wider">Wgrywanie...</span>
                          <span className="text-[11px] text-amber-200 font-semibold">{item.progress}%</span>
                          <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-amber-300 h-full transition-all duration-150" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {item.status === "success" && (
                        <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center p-2 text-white z-10">
                          <CheckCircle2 className="w-9 h-9 text-emerald-400 mb-1" />
                          <span className="text-xs font-bold text-emerald-200">Wgrano! ✅</span>
                        </div>
                      )}

                      {item.status === "error" && (
                        <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-2 text-white z-10">
                          <AlertCircle className="w-8 h-8 text-rose-400 mb-1" />
                          <span className="text-[11px] font-bold text-rose-200 text-center">Błąd</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className={`w-full py-4 font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 mt-4 cursor-pointer text-sm sm:text-base ${
                    !isAuthorValid
                      ? "bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-600 cursor-not-allowed"
                      : "bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                      <span>Wgrywanie ({completedCount}/{files.length})...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 text-amber-300" />
                      <span>
                        {!isAuthorValid 
                          ? "Wpisz swój podpis powyżej" 
                          : `Prześlij wspomnienia (${files.length})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Wspólna Galeria */}
        <section className="bg-white dark:bg-[#16201a] p-5 rounded-2xl border border-[#e8e2d8] dark:border-[#22332a] shadow-sm space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-serif font-bold text-[#1f2d27] dark:text-[#f2f7f4]">
                Wspólna Galeria ({gallery.length})
              </h2>
            </div>
            <button
              onClick={fetchGallery}
              disabled={isLoadingGallery}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white flex items-center gap-1 cursor-pointer transition p-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGallery ? "animate-spin text-emerald-800 dark:text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">Odśwież</span>
            </button>
          </div>

          {isLoadingGallery && gallery.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <p className="text-xs">Ładowanie pamiątek...</p>
            </div>
          ) : gallery.length === 0 ? (
            <div className="py-8 text-center text-stone-400 dark:text-stone-500 text-xs font-light">
              Bądź pierwszą osobą, która doda zdjęcie lub film do albumu! 📸
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((photo) => {
                const isMine = myUploadedKeys.includes(photo.key);

                return (
                  <div
                    key={photo.key}
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-[#111914] border border-stone-200 dark:border-stone-800 cursor-pointer shadow-sm active:scale-95 transition"
                  >
                    {photo.isVideo ? (
                      <video src={photo.url} className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={`Zdjęcie od ${photo.author}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    )}

                    {/* Przycisk usuwania na kafelku */}
                    {isMine && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.key);
                        }}
                        disabled={isDeleting}
                        title="Usuń to zdjęcie"
                        className="absolute top-1 right-1 z-10 p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg transition shadow-md cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-1.5 opacity-90 group-hover:opacity-100">
                      <span className="text-[10px] text-white font-medium truncate">
                        {photo.author}
                      </span>
                    </div>

                    {!isMine && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 bg-black/40 rounded-md text-white">
                        <Maximize2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal QR */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white dark:bg-[#16201a] w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl space-y-4 relative border border-stone-200 dark:border-[#22332a]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 p-2 text-stone-400 hover:text-stone-800 dark:hover:text-white bg-stone-100 dark:bg-[#1f2d25] rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pt-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                <span>Zeskanuj aparatami</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1f2d27] dark:text-[#f2f7f4]">
                Dołącz do Albumu
              </h3>
            </div>

            <div className="bg-[#faf8f5] dark:bg-[#111914] p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-center shadow-inner">
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt="Kod QR do albumu weselnego"
                  className="w-[200px] h-[200px] rounded-xl object-contain"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              Skieruj aparat telefonu na ten kod, aby od razu dodawać zdjęcia i filmy!
            </p>

            <button
              onClick={copyLink}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#1d2a23] dark:hover:bg-[#25372e] text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">Skopiowano link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                  <span>Kopiuj link do strony</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            {myUploadedKeys.includes(selectedPhoto.key) ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(selectedPhoto.key);
                }}
                disabled={isDeleting}
                className="p-3 text-white bg-rose-600 hover:bg-rose-700 rounded-full transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-lg"
                title="Usuń zdjęcie"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Usuń moje zdjęcie</span>
                  </>
                )}
              </button>
            ) : <div />}

            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-3 text-white bg-white/20 hover:bg-white/30 rounded-full transition cursor-pointer ml-auto"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          <div className="max-w-xl w-full max-h-[80vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {selectedPhoto.isVideo ? (
              <video src={selectedPhoto.url} controls autoPlay className="max-h-[70vh] rounded-2xl shadow-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPhoto.url}
                alt={`Zdjęcie od ${selectedPhoto.author}`}
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            )}
            <div className="mt-3 text-center text-white">
              <p className="text-sm font-semibold text-amber-300">Dodane przez: {selectedPhoto.author}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}