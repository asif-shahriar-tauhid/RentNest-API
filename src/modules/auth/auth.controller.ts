import { NextFunction, Request, Response } from "express";
import "../../types/express";
import { catchAsync } from "../../utils/catchAsync";
import { authService } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.register(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User registered successfully",
      data: result,
    });
  },
);

const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User login successful.",
      data: { user, accessToken },
    });
  },
);

const myProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await authService.myProfile(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User profile fetched successfully",
      data: user,
    });
  },
);

const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Logged out successfully",
      data: null,
    });
  },
);

export const authController = {
  register,
  login,
  myProfile,
  logout,
};
