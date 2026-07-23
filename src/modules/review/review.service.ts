import { RentalStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ICreateReviewInput } from "./review.interface";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const createReview = async (
    data: ICreateReviewInput,
    tenantId: string,
) => {
    if (data.rating < 1 || data.rating > 5)
        throw new AppError("Rating must be between 1 and 5", httpStatus.BAD_REQUEST);

    const verifyRentalRequest = await prisma.rentalRequests.findUnique({
        where: {
            id: data.rentalRequestId
        }
    });

    if (!verifyRentalRequest) throw new AppError("Rental request not found.", httpStatus.NOT_FOUND);

    if (verifyRentalRequest.tenantId !== tenantId)
        throw new AppError("You can only review your own rentals.", httpStatus.FORBIDDEN);

    if (verifyRentalRequest.propertyId !== data.propertyId)
        throw new AppError("Property ID does not match the rental request.", httpStatus.BAD_REQUEST);

    if (verifyRentalRequest.status !== RentalStatus.COMPLETED)
        throw new AppError("You can only review completed rentals.", httpStatus.BAD_REQUEST);

    const existingReview = await prisma.review.findUnique({
        where: {
            rentalRequestId: data.rentalRequestId
        }
    });

    if (existingReview)
        throw new AppError("You have already reviewed this rental.", httpStatus.CONFLICT);

    return prisma.review.create({
        data: {
            tenantId,
            propertyId: data.propertyId,
            rentalRequestId: data.rentalRequestId,
            rating: data.rating,
            comment: data.comment
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                }
            },
            property: {
                select: {
                    id: true,
                    title: true,
                }
            }
        }
    })
}

const getPropertyReviews = async (propertyId: string) => {
    const reviews = await prisma.review.findMany({
        where: { propertyId },
        orderBy: { createdAt: "desc" },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                }
            },
        },
    });
    return reviews;
};

export const reviewService = {
    createReview,
    getPropertyReviews
}