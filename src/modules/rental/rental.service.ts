import { Request } from "express";
import { prisma } from "../../lib/prisma";
import { ICreateRentalInput } from "./rental.interface";
import { getPagination } from "../../utils/pagination";
import { RentalStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const rentalInclude = {
    tenant: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true
        }
    },
    property: {
        select: {
            id: true,
            title: true,
            address: true,
            city: true,
            rentAmount: true,
            landlordId: true,
            landlord: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            }
        }
    },
    payments: true,
} as const;

const createRentalRequest = async (
    data: ICreateRentalInput,
    tenantId: string
) => {
    const property = await prisma.property.findUnique({
        where: {
            id: data.propertyId
        }
    });

    if (!property) throw new AppError("Property not found", httpStatus.NOT_FOUND);

    if (property.status !== "AVAILABLE") throw new AppError("This property is not available for rent", httpStatus.BAD_REQUEST);

    const existingPropertyRequest = await prisma.rentalRequests.findFirst({
        where: {
            tenantId,
            propertyId: data.propertyId,
            status: {
                in: ["PENDING", "APPROVED", "ACTIVE"]
            }
        }
    });

    if (existingPropertyRequest) {
        throw new AppError("You have already have an active request for this property", httpStatus.CONFLICT);
    }

    return prisma.rentalRequests.create({
        data: {
            tenantId,
            propertyId: data.propertyId,
            moveInDate: new Date(data.moveInDate),
            duration: data.duration,
            message: data.message
        },
        include: rentalInclude
    });
}

const getRentalRequests = async (
    userId: string,
    role: string,
    req: Request
) => {
    const { page, limit, skip } = getPagination(req);

    let where: Record<string, unknown> = {};
    if (role === "TENANT") {
        where = { tenantId: userId };
    } else if (role === "LANDLORD") {
        where = {
            property: { landlordId: userId }
        };
    } else if (role === "ADMIN") {
        where = {};
    }

    const [total, rentals] = await Promise.all([
        prisma.rentalRequests.count({ where }),
        prisma.rentalRequests.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: rentalInclude
        }),
    ]);

    return {
        rentals,
        meta: { page, limit, total }
    }
}

const getRentalRequestById = async (
    userId: string,
    role: string,
    id: string
) => {
    const rental = await prisma.rentalRequests.findUnique({
        where: {
            id
        },
        include: rentalInclude
    })

    if (!rental) throw new AppError("Rental request not found", httpStatus.NOT_FOUND);

    const isOwner =
        rental.tenantId === userId ||
        rental.property.landlordId === userId ||
        role === "ADMIN";

    if (!isOwner) throw new AppError("You are not authorized to access this rental request", httpStatus.FORBIDDEN);

    return rental;
}

const updateRentalStatus = async (
    id: string,
    status: RentalStatus,
    landlordId: string
) => {
    const rental = await prisma.rentalRequests.findUnique({
        where: {
            id
        },
        include: {
            property: true,
            tenant: true
        }
    });

    if (!rental) throw new AppError("Rental request not found", httpStatus.NOT_FOUND);

    if (rental.property.landlordId !== landlordId)
        throw new AppError("You are not authorized to update this rental request", httpStatus.FORBIDDEN);

    if ((status === "APPROVED" || status === "REJECTED") && rental.status !== "PENDING") {
        throw new AppError("Only pending requests can be approved or rejected", httpStatus.BAD_REQUEST);
    }

    if (status === "COMPLETED" && rental.status !== "ACTIVE") {
        throw new AppError("Only active rentals can be marked as completed", httpStatus.BAD_REQUEST);
    }

    if (!["APPROVED", "REJECTED", "COMPLETED"].includes(status)) {
        throw new AppError("Invalid status. Must be APPROVED/REJECTED/COMPLETED.", httpStatus.BAD_REQUEST);
    }

    const updatedStatus = await prisma.rentalRequests.update({
        where: { id },
        data: {
            status: status
        },
        include: rentalInclude
    });

    return updatedStatus;
}

export const rentalService = {
    createRentalRequest,
    getRentalRequests,
    getRentalRequestById,
    updateRentalStatus
}