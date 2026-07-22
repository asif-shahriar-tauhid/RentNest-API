import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { reviewController } from "./review.controller";

const router = Router();

router.post("/", auth("TENANT"), reviewController.createReview)
router.get("/property/:propertyId", reviewController.getPropertyReviews)

export const reviewRoute = router;