import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse"
import httpStatus from "http-status";
import { rentalService } from "./rental.service";

const createRentalRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const rental = await rentalService.createRentalRequest(
            req.body,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Rental request created successfully",
            data: rental,
        });
    }
)

const getRentalRequests = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const rentals = await rentalService.getRentalRequests(
            req.user!.id,
            req.user!.role,
            req
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Rental requests fetched successfully",
            data: rentals,
        });
    }
)

const getRentalRequestById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const rental = await rentalService.getRentalRequestById(
            req.user!.id,
            req.user!.role,
            id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Rental request fetched successfully",
            data: rental,
        });
    }
)

const updateRentalStatus = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const rental = await rentalService.updateRentalStatus(
            id,
            req.body.status,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Rental status updated successfully",
            data: rental,
        });
    }
)

export const rentalController = {
    createRentalRequest,
    getRentalRequests,
    getRentalRequestById,
    updateRentalStatus
}
