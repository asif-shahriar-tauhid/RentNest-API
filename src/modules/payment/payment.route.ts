import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { paymentController } from "./payment.controller.js";

const router = Router();

router.post("/create", auth("TENANT"), paymentController.createPayment);
router.post("/webhook", paymentController.stripeWebhook);
router.post("/confirm", auth("TENANT"), paymentController.confirmPayment);
router.get("/", auth("TENANT", "LANDLORD", "ADMIN"), paymentController.getPayments);
router.get("/:id", auth("TENANT", "LANDLORD", "ADMIN"), paymentController.getPaymentById);

export const paymentRoute = router;

