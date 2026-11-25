const { Router } = require("express");
const authController = require("./controller");
const authRateLimiter = require("./rateLimiter");
const requireCustomer = require("./requireCustomer");

const router = Router();

router.post("/register", authRateLimiter, authController.register);
router.post("/login", authRateLimiter, authController.login);
router.get("/me", requireCustomer, authController.getCurrentCustomer);
router.post("/logout", authController.logout);

module.exports = { authRouter: router };
