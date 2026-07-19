import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { adminController } from "./admin.controller";

const router = Router();

router.use(auth(UserRole.ADMIN));

router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("users/:id/status", adminController.updateUserStatus);

router.get("/properties", adminController.getAllProperties);
router.get("/rentals", adminController.getAllRentals);
router.get("/payments", adminController.getAllPayments);

export const adminRoute = router;