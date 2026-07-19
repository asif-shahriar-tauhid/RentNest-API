import { Router } from "express";
import { authController } from "./auth.controller";
import { auth } from "../../middlewares/auth";
import { UserRole } from "../../../generated";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT),
  authController.myProfile,
);

export const authRoute = router;
