import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";


const getAllUsers = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { users, meta } = await adminService.getAllUsers(req);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Users fetched successfully",
            data: { users, meta },
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
);

const getAllProperties = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { properties, meta } = await adminService.getAllProperties(req);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Properties fetched successfully",
            data: { properties, meta },
        });
    }
);

const getAllRentals = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { rentals, meta } = await adminService.getAllRentals(req);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Rentals fetched successfully",
            data: { rentals, meta },
        });
    }
);

const getAllPayments = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { payments, meta } = await adminService.getAllPayments(req);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Payments fetched successfully",
            data: { payments, meta },
        });
    }
);

export const adminController = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllProperties,
    getAllRentals,
    getAllPayments
}