import { Request } from "express";
import { prisma } from "../../lib/prisma";
import { ICreateRentalInput } from "./rental.interface";
import { getPagination } from "../../utils/pagination";
import { RentalStatus } from "@prisma/client";

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
    payment: true,
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

    if (!property) throw new Error("Property not found");

    if (property.status !== "AVAILABLE") throw new Error("This property is not available for rent");

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
        throw new Error("You have already have an active request for this property");
    }

    return prisma.rentalRequests.create({
        data: {
            tenantId,
            propertyId: data.propertyId,
            moveInDate: data.moveInDate,
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

    const isOwner =
        rental?.tenantId === userId ||
        rental?.property.landlordId === userId ||
        role === "ADMIN";

    if (!isOwner) throw new Error("You are not authorized to access this rental request");

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

    if (!rental) throw new Error("Rental request not found");

    if (rental.property.landlordId !== landlordId)
        throw new Error("You are not authorized to update this rental request");

    if (status === "APPROVED" && rental.status !== "PENDING") {
        throw new Error("Only pending requests can be approved or rejected");
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
        throw new Error("Invalid status. Must be APPROVED/REJECTED.")
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