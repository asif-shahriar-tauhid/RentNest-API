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
    async (req: Request, res: Response, next: NextFunction) => { }
)
export const reviewController = {
    createReview,
    getPropertyReviews
}