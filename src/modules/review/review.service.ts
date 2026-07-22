import { RentalStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ICreateReviewInput } from "./review.interface"

const createReview = async (
    data: ICreateReviewInput,
    tenantId: string,
) => {
    if (data.rating < 1 || data.rating > 5)
        throw new Error("Rating must be between 1 and 5");

    const verifyRentalRequest = await prisma.rentalRequests.findUnique({
        where: {
            id: data.rentalRequestId
        }
    });

    if (!verifyRentalRequest) throw new Error("Rental request not found.");

    if (verifyRentalRequest.tenantId !== tenantId)
        throw new Error("You can only review your own rentals.");

    if (verifyRentalRequest.status !== RentalStatus.COMPLETED || RentalStatus.APPROVED)
        throw new Error("You can only review completed/approved rentals.");

    const existingReview = await prisma.review.findUnique({
        where: {
            rentalRequestId: data.rentalRequestId
        }
    });

    if (existingReview)
        throw new Error("You have already reviewed this rental.");

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