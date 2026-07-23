import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import config from "./config";
import cookieParser from "cookie-parser";
import { authRoute } from "./modules/auth/auth.route";
import { adminRoute } from "./modules/admin/admin.route";
import { propertyRoute } from "./modules/property/property.route";
import { categoryRoute } from "./modules/category/category.route";
import { rentalRoute } from "./modules/rental/rental.route";
import { reviewRoute } from "./modules/review/review.route";
import { paymentRoute } from "./modules/payment/payment.route";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";

const app: Application = express();

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(
  cors({
    origin: config.app_url || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to RentNest API");
});

app.use("/api/auth", authRoute);
app.use("/api/property", propertyRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/rentals", rentalRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/admin", adminRoute);
app.use("/api/payments", paymentRoute);

// 404 handler — must be after all routes and before the error handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(globalErrorHandler);

export default app;

