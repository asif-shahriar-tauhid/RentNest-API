import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";


const getAllUsers = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { user, meta } = await adminService.getAllUsers(req);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "User profile fetched successfully",
            data: { user, meta },
        });
    },
);

const getUserById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const user = await adminService.getUserById(id);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "User profile fetched successfully",
            data: user,
        });
    }
);

const updateUserStatus = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const user = await adminService.updateUserStatus(id, req.body.status);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "User status updated successfully",
            data: user,
        });
    }
)
export const adminController = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllProperties,
    getAllRentals,
    getAllPayments
}