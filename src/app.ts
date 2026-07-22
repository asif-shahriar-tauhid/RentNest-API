import express, { Application, Request, Response } from "express";
import cors from "cors";
import config from "./config";
import cookieParser from "cookie-parser";
import { authRoute } from "./modules/auth/auth.route";
import { adminRoute } from "./modules/admin/admin.route";
import { propertyRoute } from "./modules/property/property.route";
import { categoryRoute } from "./modules/category/category.route";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url,
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
app.use("/api/admin", adminRoute);
export default app;
