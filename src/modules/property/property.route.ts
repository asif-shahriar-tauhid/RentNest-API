import { Router } from "express";
import { propertyController } from "./property.controller";
import { auth } from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router()

router.get("/", propertyController.getAllProperties);
router.get("/:id", propertyController.getPropertyById);
router.post("/", auth(UserRole.LANDLORD), propertyController.createProperty);
router.patch("/:id", auth(UserRole.LANDLORD), propertyController.updateProperty);
router.delete("/:id", auth(UserRole.LANDLORD), propertyController.deleteProperty);
router.patch("/:id/status", auth(UserRole.LANDLORD), propertyController.updatePropertyStatus);


export const propertyRoute = router