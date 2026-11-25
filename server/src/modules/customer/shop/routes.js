const { Router } = require("express");
const controller = require("./controller");

const cartRouter = Router();
cartRouter.get("/", controller.getCart);
cartRouter.post("/items", controller.addCartItem);
cartRouter.patch("/items/:productId", controller.updateCartItem);
cartRouter.delete("/items/:productId", controller.removeCartItem);
cartRouter.post("/merge", controller.mergeCart);
cartRouter.delete("/", controller.clearCart);

const ordersRouter = Router();
ordersRouter.get("/", controller.getOrders);
ordersRouter.post("/quote", controller.quoteOrder);
ordersRouter.post("/", controller.createOrder);
ordersRouter.post("/coupon/validate", controller.validateCoupon);
ordersRouter.get("/:id", controller.getOrder);
ordersRouter.post("/:id/cancel", controller.cancelOrder);

module.exports = { cartRouter, ordersRouter };
