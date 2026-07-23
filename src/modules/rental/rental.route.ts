import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { rentalController } from "./rental.controller";

const router = Router();

router.post("/", auth("TENANT"), rentalController.createRentalRequest)
router.get("/", auth("TENANT", "LANDLORD", "ADMIN"), rentalController.getRentalRequests)
router.get("/:id", auth("TENANT", "LANDLORD", "ADMIN"), rentalController.getRentalRequestById)
router.patch("/:id/status", auth("LANDLORD"), rentalController.updateRentalStatus)

export const rentalRoute = router;