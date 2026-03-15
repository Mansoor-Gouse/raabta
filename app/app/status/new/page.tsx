"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CropEditor } from "@/components/feed/new/CropEditor";
import {
  type TextOverlay,
  DEFAULT_TEXT_OVERLAY,
  TEXT_OVERLAY_COLORS,
  TEXT_OVERLAY_FONTS,
  MAX_OVERLAYS_PER_STATUS,
} from "@/types/status";

type Visibility = "everyone" | "inner_circle" | "trusted_circle";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: "globe" | "users" | "lock" }[] = [
  { value: "everyone", label: "Everyone", icon: "globe" },
  { value: "inner_circle", label: "Inner circle", icon: "users" },
  { value: "trusted_circle", label: "Trusted", icon: "lock" },
];

type SelectedItem = {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  videoDuration?: string | null;
};

const MAX_ITEMS = 10;

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|heic|heif)$/i;
const VIDEO_EXTS = /\.(mp4|webm|mov|m4v|quicktime)$/i;

function isImageFile(f: File): boolean {
  const t = (f.type || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  if (!t || t === "application/octet-stream") return IMAGE_EXTS.test(f.name || "");
  return false;
}

function isVideoFile(f: File): boolean {
  const t = (f.type || "").toLowerCase();
  if (t.startsWith("video/")) return true;
  if (!t || t === "application/octet-stream") return VIDEO_EXTS.test(f.name || "");
  return false;
}

function isMediaFile(f: File): boolean {
  return isImageFile(f) || isVideoFile(f);
}

/** Ensure file has a proper type for upload (server accepts by extension if type is wrong) */
function fileForUpload(file: File, asImage: boolean): File {
  const t = (file.type || "").toLowerCase();
  if (asImage && t.startsWith("image/")) return file;
  if (!asImage && t.startsWith("video/")) return file;
  const ext = (file.name.split(".").pop() || (asImage ? "jpg" : "mp4")).toLowerCase();
  const mime = asImage
    ? (ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg")
    : (ext === "webm" ? "video/webm" : "video/mp4");
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
}

export default function NewStatusPage() {
  const router = useRouter();
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [editedBlob, setEditedBlob] = useState<Blob | null>(null);
  const [editedPreviewUrl, setEditedPreviewUrl] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [captionByItemId, setCaptionByItemId] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Visibility>("everyone");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shareShake, setShareShake] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const selectingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [textOverlaysByItemId, setTextOverlaysByItemId] = useState<Record<string, TextOverlay[]>>({});
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    overlayId: string;
    startX: number;
    startY: number;
    startPX: number;
    startPY: number;
  } | null>(null);
  const OVERLAY_SCALE_MIN = 0.5;
  const OVERLAY_SCALE_MAX = 3;
  const overlayGestureRef = useRef<{
    overlayId: string;
    startScale: number;
    startRotation: number;
    startDist: number;
    startAngle: number;
  } | null>(null);

  type MediaTransform = { scale: number; translateX: number; translateY: number };
  const [mediaTransformByItemId, setMediaTransformByItemId] = useState<Record<string, MediaTransform>>({});
  const mediaGestureRef = useRef<{
    type: "pan" | "pinch" | null;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    startScale: number;
    startDist: number;
    startCenterX: number;
    startCenterY: number;
  } | null>(null);

  const primaryItem = selectedItems.find((it) => it.id === primaryId) ?? selectedItems[0];
  const primaryFile = primaryItem?.file ?? null;
  const primaryPreviewUrl = primaryItem?.previewUrl ?? "";
  const isImage = primaryFile ? isImageFile(primaryFile) : false;
  const isVideo = primaryFile ? isVideoFile(primaryFile) : false;
  const displayUrl = editedPreviewUrl || primaryPreviewUrl;
  const canAddMore = selectedItems.length < MAX_ITEMS;
  const hasMedia = selectedItems.length > 0;

  const handleCancel = useCallback(() => {
    setSelectedItems((prev) => {
      prev.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      return [];
    });
    if (editedPreviewUrl) URL.revokeObjectURL(editedPreviewUrl);
    setEditedPreviewUrl("");
    setEditedBlob(null);
    setPrimaryId(null);
    setCaptionByItemId({});
    setTextOverlaysByItemId({});
    setSelectedOverlayId(null);
    setError("");
    setShowCropOverlay(false);
    router.push("/app/feed");
  }, [router, editedPreviewUrl]);

  const handleCameraClick = useCallback(() => {
    setError("");
    setIsSelecting(true);
    if (selectingTimeoutRef.current) clearTimeout(selectingTimeoutRef.current);
    selectingTimeoutRef.current = setTimeout(() => setIsSelecting(false), 8000);
    setTimeout(() => fileInputRef.current?.click(), 0);
  }, []);

  const handleGalleryClick = useCallback(() => {
    setError("");
    setIsSelecting(true);
    if (selectingTimeoutRef.current) clearTimeout(selectingTimeoutRef.current);
    selectingTimeoutRef.current = setTimeout(() => setIsSelecting(false), 8000);
    setTimeout(() => galleryInputRef.current?.click(), 0);
  }, []);

  const addSelectedFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (selectingTimeoutRef.current) {
        clearTimeout(selectingTimeoutRef.current);
        selectingTimeoutRef.current = null;
      }
      setIsSelecting(false);
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return;
      const incoming = list.filter(isMediaFile);
      if (incoming.length === 0) {
        setError("Please choose an image or video.");
        return;
      }
      setError("");
      setEditedBlob(null);
      setEditedPreviewUrl("");

      setSelectedItems((prev) => {
        const room = MAX_ITEMS - prev.length;
        const toAdd = incoming.slice(0, room).map((file) => {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const previewUrl = URL.createObjectURL(file);
          return {
            id,
            file,
            previewUrl,
            isVideo: isVideoFile(file),
            videoDuration: null,
          } satisfies SelectedItem;
        });
        const next = [...prev, ...toAdd];
        if (!primaryId && next.length > 0) setPrimaryId(next[0].id);
        toAdd.forEach((it) => {
          if (!it.isVideo) return;
          const vid = document.createElement("video");
          vid.preload = "metadata";
          vid.onloadedmetadata = () => {
            const m = Math.floor(vid.duration / 60);
            const s = Math.floor(vid.duration % 60);
            setSelectedItems((curr) =>
              curr.map((c) =>
                c.id === it.id ? { ...c, videoDuration: `${m}:${s.toString().padStart(2, "0")}` } : c
              )
            );
            vid.remove();
          };
          vid.src = it.previewUrl;
        });
        if (incoming.length > room) setError(`You can add up to ${MAX_ITEMS} items.`);
        return next;
      });
    },
    [primaryId]
  );

  const removeItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((p) => p.id !== id);
      setPrimaryId((prevPrimary) => (prevPrimary === id ? next[0]?.id ?? null : prevPrimary));
      return next;
    });
    setTextOverlaysByItemId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedOverlayId(null);
  }, []);

  const handleFileSelectedFromGallery = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const selected = input.files;
      const list = selected && selected.length > 0 ? Array.from(selected) : [];
      input.value = "";
      if (list.length > 0) addSelectedFiles(list);
      else addSelectedFiles(null);
    },
    [addSelectedFiles]
  );

  const handleFileSelectedFromCamera = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectingTimeoutRef.current) {
      clearTimeout(selectingTimeoutRef.current);
      selectingTimeoutRef.current = null;
    }
    setIsSelecting(false);
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (!isMediaFile(selected)) {
      setError("Please choose an image or video.");
      return;
    }
    setSelectedItems((prev) => {
      prev.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      return [];
    });
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previewUrl = URL.createObjectURL(selected);
    const next: SelectedItem[] = [
      { id, file: selected, previewUrl, isVideo: isVideoFile(selected), videoDuration: null },
    ];
    setPrimaryId(id);
    setSelectedItems(next);
    setEditedBlob(null);
    setEditedPreviewUrl("");
    setError("");
    if (isImageFile(selected)) {
      setShowCropOverlay(true);
    }
  }, []);

  const handleCropDone = useCallback((blob: Blob) => {
    setEditedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setEditedBlob(blob);
    setShowCropOverlay(false);
  }, []);

  const handleCropSkip = useCallback(() => {
    setShowCropOverlay(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (selectedItems.length === 0) {
      setError("Add at least one photo or video.");
      setShareShake(true);
      setTimeout(() => setShareShake(false), 400);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const ordered = primaryId
        ? (() => {
            const primary = selectedItems.find((it) => it.id === primaryId);
            if (!primary) return selectedItems;
            return [primary, ...selectedItems.filter((it) => it.id !== primaryId)];
          })()
        : selectedItems;

      const uploaded: Array<{
        mediaUrl: string;
        type: "image" | "video";
        caption?: string;
        textOverlays?: TextOverlay[];
        mediaTransform?: { scale: number; translateX: number; translateY: number };
      }> = [];

      for (let i = 0; i < ordered.length; i++) {
        const item = ordered[i];
        const formData = new FormData();
        let fileToUpload: File;
        if (i === 0 && editedBlob && isImageFile(item.file)) {
          fileToUpload = new File([editedBlob], item.file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
        } else {
          fileToUpload = fileForUpload(item.file, isImageFile(item.file));
        }
        formData.set("file", fileToUpload);

        const uploadRes = await fetch("/api/status/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          setError((err as { error?: string }).error || "Upload failed. Please try again.");
          return;
        }
        const { mediaUrl, type } = (await uploadRes.json()) as { mediaUrl: string; type: "image" | "video" };
        const overlays = textOverlaysByItemId[item.id] ?? [];
        const transform = mediaTransformByItemId[item.id];
        const hasTransform = transform && (transform.scale !== 1 || transform.translateX !== 0 || transform.translateY !== 0);
        const itemCaption = (captionByItemId[item.id] ?? "").trim().slice(0, 500);
        uploaded.push({
          mediaUrl,
          type,
          ...(itemCaption ? { caption: itemCaption } : {}),
          ...(overlays.length > 0 ? { textOverlays: overlays } : {}),
          ...(hasTransform ? { mediaTransform: transform } : {}),
        });
      }

      const postRes = await fetch("/api/status/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: uploaded, visibility }),
      });
      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({}));
        setError((err as { error?: string }).error || "Failed to post. Please try again.");
        return;
      }
      router.push("/app/feed");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }, [selectedItems, primaryId, editedBlob, captionByItemId, visibility, router, textOverlaysByItemId, mediaTransformByItemId]);

  useEffect(() => {
    return () => {
      if (selectingTimeoutRef.current) clearTimeout(selectingTimeoutRef.current);
      if (editedPreviewUrl) URL.revokeObjectURL(editedPreviewUrl);
      selectedItems.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
  }, [editedPreviewUrl, selectedItems]);

  useEffect(() => {
    setSelectedOverlayId(null);
  }, [primaryId]);

  const primaryIndex = primaryId ? selectedItems.findIndex((it) => it.id === primaryId) : 0;
  const setPrimaryByIndex = useCallback(
    (dir: "prev" | "next") => {
      if (selectedItems.length <= 1) return;
      let next = dir === "next" ? primaryIndex + 1 : primaryIndex - 1;
      if (next < 0) next = selectedItems.length - 1;
      if (next >= selectedItems.length) next = 0;
      setPrimaryId(selectedItems[next].id);
      setSelectedOverlayId(null);
    },
    [selectedItems, primaryIndex]
  );

  const openCropForPrimary = useCallback(() => {
    if (selectedItems.length === 1 && primaryItem && isImageFile(primaryItem.file)) {
      setShowCropOverlay(true);
    }
  }, [selectedItems.length, primaryItem]);

  const primaryOverlays = (primaryId && textOverlaysByItemId[primaryId]) || [];
  const canAddOverlay = primaryOverlays.length < MAX_OVERLAYS_PER_STATUS;
  const selectedOverlay = primaryId && selectedOverlayId
    ? primaryOverlays.find((o) => o.id === selectedOverlayId)
    : null;

  const addTextOverlay = useCallback(() => {
    if (!primaryId || !canAddOverlay) return;
    const id = `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newOverlay: TextOverlay = { ...DEFAULT_TEXT_OVERLAY, id };
    setTextOverlaysByItemId((prev) => ({
      ...prev,
      [primaryId]: [...(prev[primaryId] || []), newOverlay],
    }));
    setSelectedOverlayId(id);
  }, [primaryId, canAddOverlay]);

  const updateOverlay = useCallback(
    (overlayId: string, updates: Partial<TextOverlay>) => {
      if (!primaryId) return;
      setTextOverlaysByItemId((prev) => ({
        ...prev,
        [primaryId]: (prev[primaryId] || []).map((o) =>
          o.id === overlayId ? { ...o, ...updates } : o
        ),
      }));
    },
    [primaryId]
  );

  const removeOverlay = useCallback(
    (overlayId: string) => {
      if (!primaryId) return;
      setTextOverlaysByItemId((prev) => ({
        ...prev,
        [primaryId]: (prev[primaryId] || []).filter((o) => o.id !== overlayId),
      }));
      setSelectedOverlayId((id) => (id === overlayId ? null : id));
    },
    [primaryId]
  );

  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent, overlayId: string, x: number, y: number) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        overlayId,
        startX: e.clientX,
        startY: e.clientY,
        startPX: x,
        startPY: y,
      };
    },
    []
  );

  const handleOverlayPointerUp = useCallback(
    (e: React.PointerEvent, overlayId: string) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag && (Math.abs(e.clientX - drag.startX) > 5 || Math.abs(e.clientY - drag.startY) > 5)) {
        return;
      }
      setSelectedOverlayId((id) => (id === overlayId ? null : overlayId));
    },
    []
  );

  const handleOverlayTouchStart = useCallback(
    (e: React.TouchEvent, overlay: TextOverlay) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        dragRef.current = null;
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const angle = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI);
        overlayGestureRef.current = {
          overlayId: overlay.id,
          startScale: overlay.scale ?? 1,
          startRotation: overlay.rotation ?? 0,
          startDist: dist,
          startAngle: angle,
        };
      }
    },
    []
  );
  const handleOverlayTouchMove = useCallback(
    (e: React.TouchEvent, overlayId: string) => {
      const g = overlayGestureRef.current;
      if (!g || g.overlayId !== overlayId || e.touches.length !== 2 || !primaryId) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const angle = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI);
      if (g.startDist <= 0) return;
      const scaleFactor = dist / g.startDist;
      const newScale = Math.max(OVERLAY_SCALE_MIN, Math.min(OVERLAY_SCALE_MAX, g.startScale * scaleFactor));
      const angleDelta = angle - g.startAngle;
      const newRotation = g.startRotation + angleDelta;
      updateOverlay(overlayId, { scale: newScale, rotation: newRotation });
      overlayGestureRef.current = { ...g, startScale: newScale, startRotation: newRotation, startDist: dist, startAngle: angle };
    },
    [primaryId, updateOverlay]
  );
  const handleOverlayTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) overlayGestureRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !previewContainerRef.current || !primaryId) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - drag.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - drag.startY) / rect.height) * 100;
      const newX = Math.min(100, Math.max(0, drag.startPX + deltaX));
      const newY = Math.min(100, Math.max(0, drag.startPY + deltaY));
      setTextOverlaysByItemId((prev) => ({
        ...prev,
        [primaryId]: (prev[primaryId] || []).map((o) =>
          o.id === drag.overlayId ? { ...o, x: newX, y: newY } : o
        ),
      }));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [primaryId]);

  const MEDIA_SCALE_MIN = 0.5;
  const MEDIA_SCALE_MAX = 4;
  const getMediaTransform = useCallback(
    (itemId: string | null): MediaTransform =>
      (itemId && mediaTransformByItemId[itemId]) || { scale: 1, translateX: 0, translateY: 0 },
    [mediaTransformByItemId]
  );
  const setMediaTransform = useCallback((itemId: string | null, updater: (prev: MediaTransform) => MediaTransform) => {
    if (!itemId) return;
    setMediaTransformByItemId((prev) => ({
      ...prev,
      [itemId]: updater(prev[itemId] || { scale: 1, translateX: 0, translateY: 0 }),
    }));
  }, []);

  const handleMediaPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !primaryId) return;
      const t = getMediaTransform(primaryId);
      mediaGestureRef.current = {
        type: "pan",
        startX: e.clientX,
        startY: e.clientY,
        startTx: t.translateX,
        startTy: t.translateY,
        startScale: t.scale,
        startDist: 0,
        startCenterX: 0,
        startCenterY: 0,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [primaryId, getMediaTransform]
  );
  const handleMediaPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = mediaGestureRef.current;
      if (!g || g.type !== "pan" || !primaryId) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      setMediaTransform(primaryId, (prev) => ({
        ...prev,
        translateX: prev.translateX + dx,
        translateY: prev.translateY + dy,
      }));
      mediaGestureRef.current = { ...g, startX: e.clientX, startY: e.clientY, startTx: g.startTx + dx, startTy: g.startTy + dy };
    },
    [primaryId, setMediaTransform]
  );
  const handleMediaPointerUp = useCallback(() => {
    mediaGestureRef.current = null;
  }, []);

  const handleMediaTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!primaryId || !previewContainerRef.current) return;
      const touches = e.touches;
      const t = getMediaTransform(primaryId);
      if (touches.length === 2) {
        const [a, b] = [touches[0], touches[1]];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const centerX = (a.clientX + b.clientX) / 2;
        const centerY = (a.clientY + b.clientY) / 2;
        mediaGestureRef.current = {
          type: "pinch",
          startX: centerX,
          startY: centerY,
          startTx: t.translateX,
          startTy: t.translateY,
          startScale: t.scale,
          startDist: dist,
          startCenterX: centerX,
          startCenterY: centerY,
        };
      } else if (touches.length === 1) {
        mediaGestureRef.current = {
          type: "pan",
          startX: touches[0].clientX,
          startY: touches[0].clientY,
          startTx: t.translateX,
          startTy: t.translateY,
          startScale: t.scale,
          startDist: 0,
          startCenterX: 0,
          startCenterY: 0,
        };
      }
    },
    [primaryId, getMediaTransform]
  );
  const handleMediaTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const g = mediaGestureRef.current;
      if (!g || !primaryId) return;
      e.preventDefault();
      if (g.type === "pinch" && e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        if (g.startDist <= 0) return;
        const scaleFactor = dist / g.startDist;
        const newScale = Math.max(MEDIA_SCALE_MIN, Math.min(MEDIA_SCALE_MAX, g.startScale * scaleFactor));
        setMediaTransform(primaryId, (prev) => ({ ...prev, scale: newScale }));
        mediaGestureRef.current = { ...g, startDist: dist, startScale: newScale };
      } else if (g.type === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - g.startX;
        const dy = e.touches[0].clientY - g.startY;
        setMediaTransform(primaryId, (prev) => ({
          ...prev,
          translateX: g.startTx + dx,
          translateY: g.startTy + dy,
        }));
        mediaGestureRef.current = { ...g, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTx: g.startTx + dx, startTy: g.startTy + dy };
      }
    },
    [primaryId, setMediaTransform]
  );
  const handleMediaTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) return;
    if (e.touches.length === 1 && mediaGestureRef.current?.type === "pinch") {
      const g = mediaGestureRef.current;
      setMediaTransform(primaryId!, (prev) => {
        mediaGestureRef.current = {
          type: "pan",
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTx: prev.translateX,
          startTy: prev.translateY,
          startScale: prev.scale,
          startDist: 0,
          startCenterX: 0,
          startCenterY: 0,
        };
        return prev;
      });
      return;
    }
    if (e.touches.length === 0) mediaGestureRef.current = null;
  }, [primaryId, setMediaTransform]);

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className="story-add-flow flex flex-col h-full min-h-full overflow-hidden relative"
      style={{
        backgroundColor: "var(--story-add-bg)",
        color: "var(--story-add-text)",
      }}
    >
      {/* Floating close — no header */}
      <button
        type="button"
        onClick={handleCancel}
        className="absolute top-0 left-0 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-90 transition-all focus:outline-none focus:ring-2 focus:ring-white/40"
        style={{ top: "max(0.5rem, env(safe-area-inset-top))", left: "0.5rem" }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Floating media count when has media */}
      {hasMedia && (
        <div
          className="absolute top-0 right-0 z-30 flex items-center gap-1 px-3 py-2 rounded-full bg-black/40 text-white/90 text-sm font-medium"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "0.5rem" }}
        >
          <span>{selectedItems.length}</span>
          <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
          </svg>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelectedFromCamera}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.heic,.mp4,.mov,.webm"
        multiple
        className="hidden"
        onChange={handleFileSelectedFromGallery}
      />

      {saving && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200"
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <div className="flex flex-col items-center gap-5 px-8 py-8 rounded-2xl bg-white/10 border border-white/20 max-w-[280px] mx-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-white">Posting your story</p>
              <p className="text-sm text-white/70">Uploading and publishing…</p>
            </div>
          </div>
        </div>
      )}

      {/* Primary preview — full bleed, padding so floating bar doesn’t cover */}
      <div className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden pb-[160px]">
        {!hasMedia ? (
          <button
            type="button"
            onClick={handleGalleryClick}
            disabled={isSelecting || saving}
            className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center min-h-[200px] relative w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60"
            aria-label="Add photos or videos from gallery"
          >
            {isSelecting && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <p className="text-sm font-medium text-white/90">Opening…</p>
                </div>
              </div>
            )}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "var(--story-add-gradient-cell)" }}
              aria-hidden
            >
              <svg
                className="w-12 h-12 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white/95">Add photos or videos</p>
              <p className="text-sm text-white/55">Tap to choose from gallery</p>
            </div>
          </button>
        ) : (
          <>
            <div ref={previewContainerRef} className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              <div
                className="absolute inset-0 flex items-center justify-center touch-none select-none"
                style={{
                  transformOrigin: "center center",
                  transform: (() => {
                    const t = getMediaTransform(primaryId ?? null);
                    return `scale(${t.scale}) translate(${t.translateX}px, ${t.translateY}px)`;
                  })(),
                }}
              >
                {isImage ? (
                  <img
                    src={displayUrl}
                    alt=""
                    className="max-h-full w-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <video
                    key={primaryId}
                    src={primaryPreviewUrl}
                    className="max-h-full w-full object-contain pointer-events-none"
                    controls
                    playsInline
                    muted
                  />
                )}
              </div>
            </div>
            {/* Media pan/zoom gesture layer — always present when hasMedia */}
            {hasMedia && (
              <div
                className="absolute inset-0 z-10 touch-none select-none"
                style={{ pointerEvents: "auto" }}
                onPointerDown={handleMediaPointerDown}
                onPointerMove={handleMediaPointerMove}
                onPointerUp={handleMediaPointerUp}
                onPointerCancel={handleMediaPointerUp}
                onTouchStart={handleMediaTouchStart}
                onTouchMove={handleMediaTouchMove}
                onTouchEnd={handleMediaTouchEnd}
                onClick={() => setSelectedOverlayId(null)}
                aria-hidden
              />
            )}
            {/* Text overlays — draggable, position in % */}
            {primaryId && primaryOverlays.length > 0 && (
              <div
                className="absolute inset-0 z-20"
                style={{ pointerEvents: "none" }}
              >
                <div
                  className="absolute inset-0 touch-none select-none"
                  style={{ pointerEvents: "auto" }}
                  onClick={() => setSelectedOverlayId(null)}
                  onPointerDown={handleMediaPointerDown}
                  onPointerMove={handleMediaPointerMove}
                  onPointerUp={handleMediaPointerUp}
                  onPointerCancel={handleMediaPointerUp}
                  onTouchStart={handleMediaTouchStart}
                  onTouchMove={handleMediaTouchMove}
                  onTouchEnd={handleMediaTouchEnd}
                  aria-hidden
                />
                {primaryOverlays.map((overlay) => {
                  const fontFamily =
                    overlay.fontFamily === "serif"
                      ? "Georgia, serif"
                      : overlay.fontFamily === "mono"
                        ? "ui-monospace, monospace"
                        : "system-ui, sans-serif";
                  return (
                    <div
                      key={overlay.id}
                      style={{
                        position: "absolute",
                        left: `${overlay.x}%`,
                        top: `${overlay.y}%`,
                        transform: `translate(-50%, -50%) scale(${overlay.scale ?? 1}) rotate(${overlay.rotation ?? 0}deg)`,
                        fontSize: overlay.fontSize,
                        fontFamily,
                        color: overlay.color,
                        backgroundColor: overlay.backgroundColor || "transparent",
                        fontWeight: overlay.fontWeight || "normal",
                        textAlign: overlay.textAlign || "center",
                        pointerEvents: "auto",
                        padding: "4px 8px",
                        borderRadius: 4,
                        maxWidth: "90%",
                        cursor: "grab",
                        userSelect: "none",
                        touchAction: "none",
                        outline: selectedOverlayId === overlay.id ? "2px solid rgba(255,255,255,0.8)" : "none",
                        outlineOffset: 2,
                      }}
                      onPointerDown={(e) => handleOverlayPointerDown(e, overlay.id, overlay.x, overlay.y)}
                      onPointerUp={(e) => handleOverlayPointerUp(e, overlay.id)}
                      onPointerCancel={(e) => handleOverlayPointerUp(e, overlay.id)}
                      onTouchStart={(e) => handleOverlayTouchStart(e, overlay)}
                      onTouchMove={(e) => handleOverlayTouchMove(e, overlay.id)}
                      onTouchEnd={handleOverlayTouchEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {overlay.text || "Text"}
                    </div>
                  );
                })}
              </div>
            )}
            {isSelecting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 pointer-events-none">
                <span className="text-white/90 text-sm font-medium">Opening…</span>
              </div>
            )}
            {selectedItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPrimaryByIndex("prev")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  aria-label="Previous"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPrimaryByIndex("next")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  aria-label="Next"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            {selectedItems.length === 1 && primaryItem && isImageFile(primaryItem.file) && (
              <button
                type="button"
                onClick={openCropForPrimary}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium hover:bg-black/80"
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating bottom bar — icons only, dynamic */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-3 px-4 pb-4 pt-3 rounded-t-2xl transition-all duration-300"
        style={{
          background: "linear-gradient(to top, rgba(18,18,18,0.98) 0%, rgba(18,18,18,0.92) 70%, transparent)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Main action row: Camera | Gallery | [Thumbnails] | Send */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={isSelecting || saving}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Take photo"
          >
            {isSelecting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleGalleryClick}
            disabled={!canAddMore || isSelecting || saving}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Choose from gallery"
          >
            {isSelecting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {hasMedia && (
            <button
              type="button"
              onClick={addTextOverlay}
              disabled={!canAddOverlay || saving}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Add text"
              title="Add text"
            >
              <span className="text-lg font-bold leading-none">Aa</span>
            </button>
          )}

          {/* Thumbnail strip — scrollable when has media */}
          {hasMedia && (
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar">
              {selectedItems.map((it) => {
                const isPrimary = it.id === primaryId;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setPrimaryId(it.id)}
                    className={`shrink-0 w-11 h-11 rounded-lg overflow-hidden relative ring-2 transition-all duration-200 ${
                      isPrimary ? "ring-white scale-105" : "ring-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    {it.isVideo ? (
                      <video src={it.previewUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={it.previewUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItem(it.id); }}
                      className="absolute top-0 right-0 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500/90 active:scale-90 transition-all"
                      aria-label="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {it.isVideo && it.videoDuration && (
                      <span className="absolute bottom-0 right-0 px-1 rounded bg-black/80 text-[9px] text-white font-medium">
                        {it.videoDuration}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Send icon — highlights when media ready */}
          <button
            type="button"
            onClick={handleShare}
            disabled={saving || !hasMedia}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-40 disabled:pointer-events-none active:scale-90 ${
              shareShake ? "animate-[shake_0.4s_ease-in-out]" : ""
            } ${hasMedia && !saving ? "bg-white text-black hover:bg-white/90 hover:scale-105 shadow-lg shadow-white/20" : "bg-white/20 text-white"}`}
            aria-label="Share"
          >
            {saving ? (
              <svg className="w-5 h-5 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Expandable details: caption + visibility icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 active:scale-90 transition-all"
            aria-label={detailsOpen ? "Hide details" : "Caption & audience"}
            aria-expanded={detailsOpen}
          >
            <svg className={`w-5 h-5 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* Visibility — icon + label pills (Everyone, Inner, Trusted) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                disabled={saving}
                className={`rounded-full flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/40 ${
                  visibility === opt.value ? "bg-white text-black" : "text-white/90 hover:text-white bg-white/15 hover:bg-white/25"
                }`}
                title={opt.label}
                aria-label={opt.label}
              >
                {opt.icon === "globe" && (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                )}
                {opt.icon === "users" && (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                {opt.icon === "lock" && (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expanded caption — per segment (current primary) */}
        {detailsOpen && (
          <div className="transition-opacity duration-200">
            <input
              type="text"
              value={primaryId ? (captionByItemId[primaryId] ?? "") : ""}
              onChange={(e) => {
                if (!primaryId) return;
                setCaptionByItemId((prev) => ({ ...prev, [primaryId]: e.target.value }));
              }}
              placeholder={selectedItems.length > 1 ? "Caption for this slide…" : "Add a caption…"}
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              maxLength={500}
            />
            {selectedItems.length > 1 && (
              <p className="text-[11px] text-white/50 mt-1">
                Caption for current slide. Switch slides to edit each.
              </p>
            )}
          </div>
        )}

        {/* Style toolbar for selected text overlay */}
        {selectedOverlay && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedOverlay.text}
                onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                placeholder="Text"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                maxLength={200}
              />
              <button
                type="button"
                onClick={() => removeOverlay(selectedOverlay.id)}
                className="w-9 h-9 rounded-full bg-red-500/30 text-red-300 flex items-center justify-center hover:bg-red-500/50"
                aria-label="Delete text"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {TEXT_OVERLAY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateOverlay(selectedOverlay.id, { color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedOverlay.color === color ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/60">Size</span>
              <button
                type="button"
                onClick={() => updateOverlay(selectedOverlay.id, { fontSize: Math.max(12, selectedOverlay.fontSize - 2) })}
                className="w-8 h-8 rounded-lg bg-white/20 text-white text-sm font-bold"
              >
                −
              </button>
              <span className="text-xs text-white/80 w-8 text-center">{selectedOverlay.fontSize}</span>
              <button
                type="button"
                onClick={() => updateOverlay(selectedOverlay.id, { fontSize: Math.min(72, selectedOverlay.fontSize + 2) })}
                className="w-8 h-8 rounded-lg bg-white/20 text-white text-sm font-bold"
              >
                +
              </button>
              {TEXT_OVERLAY_FONTS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateOverlay(selectedOverlay.id, { fontFamily: value })}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium ${
                    selectedOverlay.fontFamily === value ? "bg-white text-black" : "bg-white/20 text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateOverlay(selectedOverlay.id, {
                    fontWeight: selectedOverlay.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className={`px-2 py-1.5 rounded-lg text-xs font-bold ${
                  selectedOverlay.fontWeight === "bold" ? "bg-white text-black" : "bg-white/20 text-white"
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() =>
                  updateOverlay(selectedOverlay.id, {
                    backgroundColor:
                      selectedOverlay.backgroundColor && selectedOverlay.backgroundColor !== "transparent"
                        ? "transparent"
                        : "rgba(0,0,0,0.5)",
                  })
                }
                className={`px-2 py-1.5 rounded-lg text-xs ${
                  selectedOverlay.backgroundColor && selectedOverlay.backgroundColor !== "transparent"
                    ? "bg-white text-black"
                    : "bg-white/20 text-white"
                }`}
              >
                BG
              </button>
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateOverlay(selectedOverlay.id, { textAlign: align })}
                  className={`px-2 py-1.5 rounded-lg text-xs capitalize ${
                    selectedOverlay.textAlign === align ? "bg-white text-black" : "bg-white/20 text-white"
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <p className="text-xs text-red-400 font-medium text-center py-1" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Crop overlay */}
      {showCropOverlay &&
        displayUrl &&
        primaryItem &&
        isImageFile(primaryItem.file) &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <CropEditor
              imageSrc={displayUrl}
              aspect={9 / 16}
              onDone={handleCropDone}
              onSkip={handleCropSkip}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
