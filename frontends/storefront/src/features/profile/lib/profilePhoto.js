import { authApiBase } from "@/lib/authApi";

export async function uploadProfilePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file?.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP profile photo.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size > 550 * 1024) throw new Error("Choose a smaller image.");

  const response = await fetch(`${authApiBase}/profile/photo`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Could not save your profile photo.");
  return result.customer;
}
