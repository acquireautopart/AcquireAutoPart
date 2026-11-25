const express = require("express");
const { Router } = express;
const controller = require("./controller");

const router = Router();

router.put(
  "/photo",
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "600kb" }),
  controller.updateProfilePhoto,
);

/* Overview --------------------------------------------------------------- */
router.get("/overview", controller.getOverview);

/* Wallet & ledger -------------------------------------------------------- */
router.get("/wallet", controller.getWallet);
router.post("/wallet/topup", controller.topUpWallet);
router.post("/wallet/withdraw", controller.withdrawFromWallet);
router.get("/ledger", controller.getLedger);

/* Wishlist --------------------------------------------------------------- */
router.get("/wishlist/ids", controller.getWishlistIds);
router.get("/wishlist", controller.getWishlist);
router.post("/wishlist", controller.addWishlistItem);
router.delete("/wishlist/:id", controller.removeWishlistItem);
router.delete("/wishlist", controller.clearWishlist);

/* Price and stock alerts -------------------------------------------------- */
router.get("/alerts", controller.getProductAlerts);
router.post("/alerts", controller.createProductAlert);
router.delete("/alerts/:id", controller.removeProductAlert);

/* Saved vehicles --------------------------------------------------------- */
router.get("/vehicles", controller.getVehicles);
router.post("/vehicles", controller.createVehicle);
router.patch("/vehicles/:id/primary", controller.setPrimaryVehicle);
router.delete("/vehicles/:id", controller.removeVehicle);

/* Addresses -------------------------------------------------------------- */
router.get("/addresses", controller.getAddresses);
router.post("/addresses", controller.createAddress);
router.patch("/addresses/:id/default", controller.setDefaultAddress);
router.patch("/addresses/:id", controller.updateAddress);
router.delete("/addresses/:id", controller.removeAddress);

/* Payment methods -------------------------------------------------------- */
router.get("/payments", controller.getPayments);
router.post("/payments", controller.createPayment);
router.patch("/payments/:id/default", controller.setDefaultPayment);
router.delete("/payments/:id", controller.removePayment);

/* KYC -------------------------------------------------------------------- */
router.get("/kyc", controller.getKyc);
router.post("/kyc/:key", controller.submitKycStep);

/* Returns & refunds ------------------------------------------------------ */
router.get("/returns", controller.getReturns);
router.post("/returns", controller.createReturn);
router.post("/returns/:id/cancel", controller.cancelReturn);

/* Support tickets -------------------------------------------------------- */
router.get("/tickets", controller.getTickets);
router.post("/tickets", controller.createTicket);

/* Account settings ------------------------------------------------------- */
router.patch("/settings", controller.updateProfile);
router.patch("/preferences", controller.updatePreferences);
router.post("/password", controller.changePassword);

module.exports = { profileRouter: router };
