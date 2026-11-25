"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function OrderReceiptButton({ order }) {
  const [error, setError] = useState("");

  async function printReceipt() {
    setError("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Allow pop-ups to print the package label.");
      return;
    }

    try {
      const qr = await QRCode.toDataURL(order.scanToken, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      });
      const barcodeCanvas = document.createElement("canvas");
      JsBarcode(barcodeCanvas, order.scanToken, {
        format: "CODE128",
        displayValue: false,
        margin: 4,
        height: 56,
      });
      const barcode = barcodeCanvas.toDataURL("image/png");
      const items = order.items
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</td><td>${item.quantity}</td><td>${escapeHtml(order.currency)} ${(item.price * item.quantity).toFixed(2)}</td></tr>`,
        )
        .join("");
      const address = order.address || {};
      const addressText = [
        address.name,
        address.line,
        [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
        address.country,
        address.phone,
      ]
        .filter(Boolean)
        .map(escapeHtml)
        .join("<br>");
      const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      printWindow.document.open();
      printWindow.document
        .write(`<!doctype html><html><head><meta charset="utf-8"><title>Order ${escapeHtml(order.code)}</title><style>
        *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0 0 6px}.muted{color:#555;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0}.box{border:1px solid #bbb;border-radius:6px;padding:12px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:8px 5px;border-bottom:1px solid #ddd}th{font-size:11px;text-transform:uppercase}.codes{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px dashed #888;padding-top:16px;margin-top:18px}.qr{width:130px;height:130px}.barcode{max-width:65%;height:90px;object-fit:contain}@media print{body{margin:8mm}}
      </style></head><body><h1>AcquireAuto · Package receipt</h1><p class="muted">Order ${escapeHtml(order.code)} · ${escapeHtml(new Date(order.placedAt).toLocaleString())}</p><div class="grid"><section class="box"><strong>Deliver to</strong><p>${addressText || "Address not available"}</p></section><section class="box"><strong>Payment</strong><p>${escapeHtml(order.paymentMethod)} · ${escapeHtml(order.paymentStatus)}</p><strong>Seller item total: ${escapeHtml(order.currency)} ${subtotal.toFixed(2)}</strong></section></div><table><thead><tr><th>Item</th><th>Qty</th><th>Line total</th></tr></thead><tbody>${items}</tbody></table><div class="codes"><img class="qr" src="${qr}" alt="Shipment QR code"><img class="barcode" src="${barcode}" alt="Shipment barcode"></div><p class="muted">Scan either code in Seller Hub to advance this package through fulfillment.</p></body></html>`);
      printWindow.document.close();
      printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
      window.setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
        }
      }, 400);
    } catch (renderError) {
      printWindow.close();
      setError(renderError.message || "Could not create the package receipt.");
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={printReceipt}
        disabled={!order.scanToken}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-[10px] font-semibold hover:border-orange-400 disabled:opacity-50 dark:border-neutral-700"
      >
        <Printer size={13} />
        Print receipt
      </button>
      {error && (
        <span role="alert" className="mt-1 block max-w-36 text-[10px] text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
