import { Request, Response, NextFunction } from "express";
import * as paymentService from "./payment.service.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";

const createPayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const result = await paymentService.createStripePayment(
            req.body.rentalRequestId as string,
            req.user!.id
        );
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Payment session created successfully",
            data: result,
        })
    }
);

const stripeWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sig = req.headers["stripe-signature"] as string;
        await paymentService.handleStripeWebhook(req.body as Buffer, sig);
        res.json({ received: true });
    } catch (err) {
        next(err);
    }
};

const confirmPayment = catchAsync(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const payment = await paymentService.confirmPayment(
            req.body.sessionId as string,
            req.user!.id
        );
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Payment confirmed successfully",
            data: payment,
        })
    }
);

const getPayments = catchAsync(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { payments, meta } = await paymentService.getPayments(
            req.user!.id,
            req.user!.role,
            req
        );
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Payments retrieved successfully",
            data: payments,
            meta,
        });
    }
);

const getPaymentById = catchAsync(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const id = req.params["id"] as string;
        const payment = await paymentService.getPaymentById(
            id,
            req.user!.id,
            req.user!.role
        );
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Payment retrieved successfully",
            data: payment,
        })
    }
);

export const paymentController = {
    createPayment,
    stripeWebhook,
    confirmPayment,
    getPayments,
    getPaymentById
}