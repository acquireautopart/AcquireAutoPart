"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { sellerApi } from "@/features/seller/lib/sellerApi";
import { Button, Modal } from "@/features/seller/shared/components/ui";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ProductImportDialog({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function chooseFile(event) {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    setFile(null);
    setPreview(null);
    setIssues([]);
    setError("");
    if (!selected) return;
    if (!/\.(csv|xlsx|json)$/i.test(selected.name)) {
      setError("Choose a .csv, .xlsx, or .json file.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("Product import files must be no larger than 5 MB.");
      return;
    }
    setFile(selected);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!file) {
        setError("Choose a CSV, XLSX, or JSON file first.");
        return;
      }

      if (!preview?.valid) {
        const result = await sellerApi.previewProductImport(file);
        setPreview(result);
        setIssues(result.issues || []);
        return;
      }

      const result = await sellerApi.importProducts(file);
      await onImported(result.importedCount);
    } catch (requestError) {
      setError(requestError.message);
      setIssues(requestError.issues || []);
      if (requestError.issues?.length) setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  const canImport = Boolean(file && preview?.valid);

  return (
    <Modal
      title="Import products"
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      submitLabel={
        busy
          ? preview?.valid
            ? "Importing…"
            : "Validating…"
          : canImport
            ? `Import ${preview.totalRows} products`
            : "Validate file"
      }
      compact
    >
      <div className="space-y-4 pb-1 text-sm">
        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 font-bold">
            <FileSpreadsheet size={16} className="text-brand" />
            File format and required fields
          </div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            Required columns: <code>sku</code>, <code>name</code>, <code>category</code>,{" "}
            <code>subcategory</code>, <code>price</code>, and <code>images</code>. Choose
            category and subcategory names from the managed list.
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Add 1–7 HTTP/HTTPS image URLs per product. In CSV/Excel, separate image URLs with{" "}
            <code>|</code>; in JSON, use an <code>images</code> array. Use publicly accessible image
            links; the importer checks URL format, not whether the image is reachable.
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Optional fields: <code>brand</code>, <code>fitment</code>, <code>description</code>,{" "}
            <code>compareAtPrice</code>, <code>stock</code>, <code>lowStockThreshold</code>, and{" "}
            <code>status</code>. Optional <code>variants</code> use a JSON array (also in Excel).
            Status defaults to Draft. Up to 500 products and 5 MB per file.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 font-semibold text-brand">
            <a href="/templates/seller-products-template.csv" download>
              Download CSV/Excel template
            </a>
            <a href="/templates/seller-products-template.json" download>
              Download JSON template
            </a>
          </div>
        </section>

        <label className="block rounded-lg border border-dashed border-neutral-300 p-4 text-xs dark:border-neutral-700">
          <span className="font-bold">Choose a product file</span>
          <input
            type="file"
            accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={chooseFile}
            className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-neutral-200 file:px-3 file:py-2 file:text-xs file:font-bold dark:file:bg-neutral-800"
          />
          {file && <span className="mt-2 block break-all text-neutral-500">{file.name}</span>}
        </label>

        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}

        {preview && (
          <section
            className={`rounded-lg border p-3 ${
              preview.valid
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {preview.valid ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="text-red-600" />
              )}
              {preview.valid
                ? `${preview.totalRows} products are valid. Nothing is saved until you import.`
                : `Found ${issues.length} issue${issues.length === 1 ? "" : "s"}. No products were saved.`}
            </div>

            {preview.valid && (
              <ul className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                {preview.preview.map((product) => (
                  <li key={product.sku} className="flex justify-between gap-3">
                    <span className="truncate">
                      {product.name} · {product.sku}
                    </span>
                    <span className="shrink-0">{product.images.length} images</span>
                  </li>
                ))}
                {preview.totalRows > preview.preview.length && (
                  <li>and {preview.totalRows - preview.preview.length} more…</li>
                )}
              </ul>
            )}
          </section>
        )}

        {issues.length > 0 && (
          <section className="max-h-48 overflow-y-auto rounded-lg border border-red-200 dark:border-red-900">
            <p className="sticky top-0 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
              Fix all issues before importing:
            </p>
            <ul className="space-y-1 p-3 text-xs text-red-700 dark:text-red-300">
              {issues.map((issue, index) => (
                <li key={`${issue.row}-${issue.field}-${index}`}>
                  Row {issue.row}, <strong>{issue.field}</strong>: {issue.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[11px] text-neutral-500">
          The entire file is validated again before saving. One invalid row or duplicate SKU
          prevents every product in the batch from being saved.
        </p>
      </div>
    </Modal>
  );
}
