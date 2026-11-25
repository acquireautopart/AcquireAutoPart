const reviewService = require("./service");

async function listReviews(req, res) {
  return res.json(
    await reviewService.listReviews(
      req.params.productId,
      req.query.country || "US",
    ),
  );
}

async function createReview(req, res) {
  return res
    .status(201)
    .json(
      await reviewService.createReview(
        req.customer._id,
        req.params.productId,
        req.query.country || "US",
        req.body || {},
      ),
    );
}

async function getReviewEligibility(req, res) {
  return res.json(
    await reviewService.getReviewEligibility(
      req.customer._id,
      req.params.productId,
      req.query.country || "US",
    ),
  );
}

module.exports = { listReviews, getReviewEligibility, createReview };
