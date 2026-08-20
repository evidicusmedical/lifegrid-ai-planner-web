export type GridImageRendererName = "html-to-image" | "html2canvas";

export interface GridPngResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  renderer: GridImageRendererName;
}

export interface GridPngOptions {
  pixelRatio: number;
  backgroundColor: string;
  width: number;
  height: number;
  targeted: boolean;
  firefox: boolean;
  safari: boolean;
}

const RENDER_TIMEOUT_MS = 22_000;

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string) =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });

const validatePng = async (
  dataUrl: string,
  width: number,
  height: number,
  renderer: GridImageRendererName,
): Promise<GridPngResult> => {
  if (width <= 0 || height <= 0 || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("INVALID_PNG_OUTPUT");
  }
  const blob = await (await fetch(dataUrl)).blob();
  if (!blob.size) throw new Error("EMPTY_PNG_BLOB");
  if (blob.type !== "image/png") throw new Error("INVALID_PNG_MIME");
  return { dataUrl, blob, width, height, renderer };
};

const renderWithHtmlToImage = async (node: HTMLElement, options: GridPngOptions) => {
  const { toPng } = await import("html-to-image");
  const captureOptions = {
    pixelRatio: options.pixelRatio,
    backgroundColor: options.backgroundColor,
    width: options.width,
    height: options.height,
    cacheBust: true,
  };
  let dataUrl = await toPng(node, captureOptions);
  if (options.safari) {
    await toPng(node, captureOptions);
    dataUrl = await toPng(node, captureOptions);
  }
  return validatePng(dataUrl, options.width, options.height, "html-to-image");
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string"
    ? resolve(reader.result)
    : reject(new Error("INVALID_PNG_OUTPUT"));
  reader.onerror = () => reject(reader.error ?? new Error("INVALID_PNG_OUTPUT"));
  reader.readAsDataURL(blob);
});

const renderWithHtml2Canvas = async (node: HTMLElement, options: GridPngOptions) => {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, {
    backgroundColor: options.backgroundColor,
    scale: options.pixelRatio,
    useCORS: true,
    logging: false,
    width: options.width,
    height: options.height,
    windowWidth: Math.max(window.innerWidth, options.width),
    windowHeight: Math.max(window.innerHeight, options.height),
  });
  if (canvas.width <= 0 || canvas.height <= 0) throw new Error("INVALID_PNG_OUTPUT");
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => {
    if (!value) reject(new Error("EMPTY_PNG_BLOB"));
    else resolve(value);
  }, "image/png"));
  if (!blob.size) throw new Error("EMPTY_PNG_BLOB");
  if (blob.type !== "image/png") throw new Error("INVALID_PNG_MIME");
  const dataUrl = await blobToDataUrl(blob);
  if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("INVALID_PNG_OUTPUT");
  return { dataUrl, blob, width: canvas.width, height: canvas.height, renderer: "html2canvas" as const };
};

export const renderGridPng = async (node: HTMLElement, options: GridPngOptions) => {
  if (options.targeted && options.firefox) {
    return withTimeout(renderWithHtml2Canvas(node, options), RENDER_TIMEOUT_MS, "HTML2CANVAS");
  }
  try {
    return await withTimeout(renderWithHtmlToImage(node, options), RENDER_TIMEOUT_MS, "HTML_TO_IMAGE");
  } catch (error) {
    if (!options.targeted) throw error;
    return withTimeout(renderWithHtml2Canvas(node, options), RENDER_TIMEOUT_MS, "HTML2CANVAS");
  }
};
