const mongoose = require("mongoose");
const Product = require("./models/Product");
const Seller = require("./models/Seller");
const SellerNotification = require("./models/SellerNotification");
const { sendSellerOrderEmail } = require("./orderEmail");
const HttpError = require("../../utils/HttpError");

async function createNewOrderNotifications(order, resendConfig) {
  const productIds = order.items
    .map((item) => item.productId)
    .filter((id) => mongoose.isValidObjectId(id));
  if (!productIds.length) return;

  const [products, sellers] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("_id seller")
      .lean(),
    Seller.find({
      _id: { $in: order.sellerFulfillments.map((entry) => entry.seller) },
      "settings.notifications.orders": { $ne: false },
    })
      .select("_id name email storeName")
      .lean(),
  ]);
  const sellerIds = new Set(sellers.map((seller) => seller._id.toString()));
  const sellerProductIds = new Map();
  for (const product of products) {
    const sellerId = product.seller.toString();
    if (!sellerIds.has(sellerId)) continue;
    const ids = sellerProductIds.get(sellerId) || new Set();
    ids.add(product._id.toString());
    sellerProductIds.set(sellerId, ids);
  }

  const notifications = [];
  for (const [sellerId, ownedIds] of sellerProductIds) {
    const items = order.items.filter((item) => ownedIds.has(item.productId));
    if (!items.length) continue;

    notifications.push({
      updateOne: {
        filter: { seller: sellerId, type: "new_order", order: order._id },
        update: {
          $setOnInsert: {
            seller: sellerId,
            type: "new_order",
            order: order._id,
            orderCode: order.code,
            message: `${items.length} item${items.length === 1 ? "" : "s"} in order ${order.code}`,
            itemCount: items.reduce((count, item) => count + item.quantity, 0),
            total:
              Math.round(
                items.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.sellerPrice ?? item.price) * item.quantity,
                  0,
                ) * 100,
              ) / 100,
            currency: order.currency || "USD",
          },
        },
        upsert: true,
      },
    });
  }

  if (notifications.length) {
    await SellerNotification.bulkWrite(notifications, { ordered: true });
  }

  if (!resendConfig) {
    console.warn(
      `Seller order email skipped for ${order.code}: RESEND_API_KEY and RESEND_FROM are not configured.`,
    );
    return;
  }
  await Promise.all(
    sellers.map(async (seller) => {
      const ownedIds = sellerProductIds.get(seller._id.toString());
      const items = order.items.filter((item) => ownedIds?.has(item.productId));
      if (!items.length || !seller.email) return;
      try {
        await sendSellerOrderEmail({
          config: resendConfig,
          seller,
          order,
          items,
        });
      } catch (error) {
        console.error(
          `Could not email seller ${seller._id} about order ${order.code}:`,
          error,
        );
      }
    }),
  );
}

async function listNotifications(sellerId) {
  const [notifications, unreadCount] = await Promise.all([
    SellerNotification.find({ seller: sellerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    SellerNotification.countDocuments({ seller: sellerId, readAt: null }),
  ]);
  return {
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      type: notification.type,
      orderId: notification.order.toString(),
      orderCode: notification.orderCode,
      message: notification.message,
      itemCount: notification.itemCount,
      total: notification.total,
      currency: notification.currency,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })),
    unreadCount,
  };
}

async function markNotificationRead(sellerId, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Notification not found.");
  }
  const notification = await SellerNotification.findOneAndUpdate(
    { _id: id, seller: sellerId },
    { $set: { readAt: new Date() } },
    { new: true },
  ).lean();
  if (!notification) throw new HttpError(404, "Notification not found.");
  return { id: notification._id.toString(), readAt: notification.readAt };
}

module.exports = {
  createNewOrderNotifications,
  listNotifications,
  markNotificationRead,
};
