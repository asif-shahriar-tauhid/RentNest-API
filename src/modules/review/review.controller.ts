import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { reviewService } from "./review.service"
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";


const createReview = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const review = await reviewService.createReview(
            req.body,
            req.user!.id,
        );

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Review created successfully",
            data: review
        })
    }
)

const getPropertyReviews = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const propertyId = req.params["propertyId"] as string;
        const reviews = await reviewService.getPropertyReviews(propertyId);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Reviews fetched successfully",
            data: reviews
        })
    }
)

export const reviewController = {
    createReview,
    getPropertyReviews
}