import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";

export const auth = (...requiredRoles: UserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization;

    if (!token) {
      throw new AppError(
        "You are not logged in. Please log in to access this resource",
        httpStatus.UNAUTHORIZED
      );
    }

    const verifiedToken = jwtUtils.verifyToken(
      token,
      config.jwt_access_secret,
    );

    if (!verifiedToken.success) {
      throw new AppError(verifiedToken.error, httpStatus.UNAUTHORIZED);
    }

    const { email, id, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError(
        "Forbidden. You don't have permission to access this source.",
        httpStatus.FORBIDDEN
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) throw new AppError("User not found. Please log in again.", httpStatus.UNAUTHORIZED);
    if (existingUser.status === "BANNED")
      throw new AppError("Your account is blocked. Please contact support", httpStatus.FORBIDDEN);

    req.user = {
      email: existingUser.email,
      name: existingUser.name,
      id: existingUser.id,
      role: existingUser.role,
    };

    next();
  })
}