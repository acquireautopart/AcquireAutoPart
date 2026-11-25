const { Resend } = require("resend");

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

function buildSellerOrderEmail({ seller, order, items }) {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</td><td>${item.quantity}</td><td>${escapeHtml(order.currency || "USD")} ${(
          Number(item.sellerPrice ?? item.price) * item.quantity
        ).toFixed(2)}</td></tr>`,
    )
    .join("");
  const itemLines = items
    .map(
      (item) =>
        `- ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity}`,
    )
    .join("\n");
  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.sellerPrice ?? item.price) * item.quantity,
    0,
  );

  return {
    to: [seller.email],
    subject: `New AcquireAuto order ${order.code}`,
    text: [
      `Hello ${seller.storeName || seller.name},`,
      "",
      `You have received a new order: ${order.code}`,
      itemLines,
      "",
      `Items total: ${order.currency || "USD"} ${total.toFixed(2)}`,
      `Payment: ${order.payment?.method || "Unknown"} (${order.payment?.paid ? "paid" : "pending"})`,
      "",
      "Open your Seller Hub to view the order and update fulfillment.",
    ].join("\n"),
    html: `<p>Hello ${escapeHtml(seller.storeName || seller.name)},</p><p>You have received a new order: <strong>${escapeHtml(order.code)}</strong></p><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Item</th><th>Qty</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Items total:</strong> ${escapeHtml(order.currency || "USD")} ${total.toFixed(2)}<br><strong>Payment:</strong> ${escapeHtml(order.payment?.method || "Unknown")} (${order.payment?.paid ? "paid" : "pending"})</p><p>Open your Seller Hub to view the order and update fulfillment.</p>`,
  };
}

async function sendSellerOrderEmail({ config, seller, order, items }) {
  if (!config?.apiKey || !config.from) {
    throw new Error("Resend order email is not configured.");
  }
  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({
    from: config.from,
    ...buildSellerOrderEmail({ seller, order, items }),
  });
  if (error) {
    throw new Error(`Resend order email delivery failed: ${error.message}`);
  }
}

module.exports = { buildSellerOrderEmail, sendSellerOrderEmail };
