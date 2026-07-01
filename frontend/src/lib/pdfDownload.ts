const safeFilenamePart = (value: string, fallback: string) => {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return cleaned || fallback;
};

export const buildPdfFilename = (prefix: string, sourceName?: string | null) => {
  const rawName = (sourceName || "plan").replace(/\\/g, "/").split("/").pop() || "plan";
  const stem = rawName.replace(/\.[^/.]+$/, "");
  const safePrefix = safeFilenamePart(prefix, "Report");
  const safeStem = safeFilenamePart(stem, "plan");

  return `${safePrefix}_${safeStem}.pdf`;
};

/**
 * Downloads a jsPDF document with the correct filename.
 *
 * Uses Chrome's File System Access API (showSaveFilePicker) to open a
 * NATIVE OS "Save As" dialog. This is immune to all browser sandboxing,
 * iframe restrictions, and Blob URL filename stripping.
 *
 * Falls back to classic Blob URL download for non-Chrome browsers.
 */
export const downloadPdfDocument = async (doc: any, filename: string) => {
  const cleanFilename = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;

  const blob: Blob = doc.output("blob");

  // ─── Approach 1: Native OS "Save As" dialog (Chrome 86+) ───
  // Opens a real OS file picker pre-filled with the correct filename.
  // Completely bypasses all iframe/sandbox/webview download restrictions.
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: cleanFilename,
        types: [
          {
            description: "PDF Document",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Done — file saved with correct name
    } catch (err: any) {
      if (err?.name === "AbortError") return; // User cancelled the dialog
    }
  }

  // ─── Approach 2: Classic Blob download fallback (Firefox, etc.) ───
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cleanFilename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};
