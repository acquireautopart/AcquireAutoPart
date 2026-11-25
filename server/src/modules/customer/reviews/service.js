const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../../seller/models/Product");
require("../../seller/models/Seller");
const Review = require("./Review");
const HttpError = require("../../../utils/HttpError");
const { getCountry } = require("../../market/countries");

function isApprovedSeller(seller) {
  return (
    seller &&
    (seller.adminStatus === "Approved" ||
      (seller.adminStatus === undefined && seller.verified === true))
  );
}

async function findPublicProduct(productId, requestedCountry) {
  const country = getCountry(requestedCountry);
  if (!country) {
    throw new HttpError(
      400,
      "Choose a valid country to browse the marketplace.",
    );
  }

  const product = await Product.findById(productId)
    .select("seller status stock")
    .populate("seller", "country adminStatus verified")
    .lean();
  if (
    !product ||
    product.status !== "Active" ||
    product.seller?.country !== country.code ||
    !isApprovedSeller(product.seller)
  ) {
    throw new HttpError(404, "Product not found.");
  }
  return product;
}

async function getReviewSummary(productId) {
  const [summary] = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: null,
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);
  return {
    ratingAverage: summary ? Math.round(summary.ratingAverage * 100) / 100 : 0,
    ratingCount: summary?.ratingCount || 0,
  };
}

async function listReviews(productId, country) {
  const product = await findPublicProduct(productId, country);
  const [reviews, summary] = await Promise.all([
    Review.find({ product: product._id })
      .select("rating title comment createdAt")
      .populate("customer", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    getReviewSummary(product._id),
  ]);
  return {
    ...summary,
    reviews: reviews.map((review) => ({
      id: review._id.toString(),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewer: formatReviewerName(review.customer?.name),
      verifiedPurchase: true,
    })),
  };
}

function formatReviewerName(name) {
  const parts = String(name || "Customer").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "Customer";
  return `${parts[0]} ${parts.at(-1)[0]}.`;
}

async function hasDeliveredOrder(customerId, product) {
  return Order.exists({
    customer: customerId,
    "items.productId": product._id.toString(),
    $or: [
      { status: "Delivered" },
      {
        sellerFulfillments: {
          $elemMatch: { seller: product.seller._id, status: "Delivered" },
        },
      },
    ],
  });
}

async function getReviewEligibility(customerId, productId, country) {
  const product = await findPublicProduct(productId, country);
  const [deliveredOrder, existingReview] = await Promise.all([
    hasDeliveredOrder(customerId, product),
    Review.findOne({ product: product._id, customer: customerId })
      .select("rating title comment")
      .lean(),
  ]);
  return {
    canReview: Boolean(deliveredOrder),
    review: existingReview
      ? {
          rating: existingReview.rating,
          title: existingReview.title,
          comment: existingReview.comment,
        }
      : null,
  };
}

async function createReview(customerId, productId, country, input = {}) {
  const product = await findPublicProduct(productId, country);
  const rating = Number(input.rating);
  const title = String(input.title || "").trim();
  const comment = String(input.comment || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "Choose a rating from 1 to 5 stars.");
  }
  if (title.length > 100 || comment.length > 2000) {
    throw new HttpError(400, "Review title or comment is too long.");
  }

  const deliveredOrder = await hasDeliveredOrder(customerId, product);
  if (!deliveredOrder) {
    throw new HttpError(
      403,
      "Only customers who have received this product can review it.",
    );
  }

  const reviewFilter = { product: product._id, customer: customerId };
  let review;
  try {
    review = await Review.findOneAndUpdate(
      reviewFilter,
      { $set: { rating, title, comment } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    review = await Review.findOneAndUpdate(
      reviewFilter,
      { $set: { rating, title, comment } },
      { new: true, runValidators: true },
    ).lean();
  }
  const [summary, customer] = await Promise.all([
    getReviewSummary(product._id),
    Customer.findById(customerId).select("name").lean(),
  ]);
  return {
    ...summary,
    review: {
      id: review._id.toString(),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewer: formatReviewerName(customer?.name),
      verifiedPurchase: true,
    },
  };
}

module.exports = { listReviews, getReviewEligibility, createReview };
