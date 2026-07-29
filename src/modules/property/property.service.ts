import { Request } from "express"
import { getPagination } from "../../utils/pagination"
import { prisma } from "../../lib/prisma";
import { ICreateProperty } from "./property.interface";
import { PropertyStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const getAllProperties = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);

    const where: Record<string, unknown> = { status: "AVAILABLE" }
    if (req.query["city"]) {
        const searchTerm = req.query.city as string;
        where["OR"] = [
            { city: { contains: searchTerm, mode: "insensitive" } },
            { district: { contains: searchTerm, mode: "insensitive" } },
            { address: { contains: searchTerm, mode: "insensitive" } },
            { title: { contains: searchTerm, mode: "insensitive" } },
        ];
    }
    if (req.query["categoryId"]) where["categoryId"] = req.query["categoryId"]
    const minRentVal = req.query["minRent"] || req.query["minPrice"];
    const maxRentVal = req.query["maxRent"] || req.query["maxPrice"];
    if (minRentVal || maxRentVal) {
        where["rentAmount"] = {
            ...(minRentVal ? { gte: Number(minRentVal) } : {}),
            ...(maxRentVal ? { lte: Number(maxRentVal) } : {}),
        }
    }
    if (req.query["bedrooms"]) {
        const beds = Number(req.query["bedrooms"]);
        if (beds >= 4) {
            where["bedrooms"] = { gte: 4 };
        } else {
            where["bedrooms"] = beds;
        }
    }

    const [total, properties] = await Promise.all([
        prisma.property.count({ where }),
        prisma.property.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                landlord: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                category: true,
                reviews: {
                    select: {
                        rating: true
                    }
                }
            }
        })
    ])

    return {
        properties,
        meta: {
            page,
            limit,
            total
        }
    }
}

const getPropertyById = async (id: string) => {
    const property = await prisma.property.findUnique({
        where: { id },
        include: {
            landlord: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                }
            },
            category: true,
            reviews: {
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                },
                orderBy: { createdAt: "desc" },
            }
        }
    });

    if (!property) {
        throw new AppError("Property not found", httpStatus.NOT_FOUND);
    }

    return property;
}

const createProperty = async (data: ICreateProperty, landlordId: string) => {
    const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
    });

    if (!category) {
        throw new AppError("Category not found", httpStatus.NOT_FOUND);
    }

    const property = await prisma.property.create({
        data: {
            ...data,
            landlordId,
            amenities: data.amenities ?? [],
            images: data.images ?? [],
        },
        include: {
            landlord: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            },
            category: true,
        }
    });

    return property;
}

const updateProperty = async (id: string, data: Partial<ICreateProperty>, landlordId: string) => {
    const property = await prisma.property.findUnique({
        where: { id }
    });

    if (!property) {
        throw new AppError("Property not found", httpStatus.NOT_FOUND);
    }

    if (property.landlordId !== landlordId) {
        throw new AppError("You are not authorized to update this property", httpStatus.FORBIDDEN);
    }

    if (data.categoryId) {
        const category = await prisma.category.findUnique({
            where: { id: data.categoryId }
        });
        if (!category) {
            throw new AppError("Category not found", httpStatus.NOT_FOUND);
        }
    }

    const updatedProperty = await prisma.property.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description,
            address: data.address,
            city: data.city,
            district: data.district,
            rentAmount: data.rentAmount !== undefined ? Number(data.rentAmount) : undefined,
            bedrooms: data.bedrooms !== undefined ? Number(data.bedrooms) : undefined,
            bathrooms: data.bathrooms !== undefined ? Number(data.bathrooms) : undefined,
            area: data.area !== undefined ? (data.area ? Number(data.area) : null) : undefined,
            amenities: data.amenities,
            images: data.images,
            categoryId: data.categoryId,
        },
        include: {
            landlord: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            },
            category: true,
        }
    });

    return updatedProperty;
}

const deleteProperty = async (id: string, landlordId: string) => {
    const property = await prisma.property.findUnique({
        where: { id }
    });

    if (!property) {
        throw new AppError("Property not found", httpStatus.NOT_FOUND);
    }

    if (property.landlordId !== landlordId) {
        throw new AppError("You are not authorized to delete this property", httpStatus.FORBIDDEN);
    }

    const activeRentalCount = await prisma.rentalRequests.count({
        where: {
            propertyId: id,
            status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
        },
    });

    if (activeRentalCount > 0) {
        throw new AppError(
            "Cannot delete a property with pending, approved, or active rental requests.",
            httpStatus.CONFLICT
        );
    }

    const deletedProperty = await prisma.property.delete({
        where: { id }
    });

    return deletedProperty;
}

const updatePropertyStatus = async (id: string, status: PropertyStatus, landlordId: string) => {
    const property = await prisma.property.findUnique({
        where: { id }
    });

    if (!property) {
        throw new AppError("Property not found", httpStatus.NOT_FOUND);
    }

    if (property.landlordId !== landlordId) {
        throw new AppError("You are not authorized to update this property status", httpStatus.FORBIDDEN);
    }

    const updatedProperty = await prisma.property.update({
        where: { id },
        data: { status },
        include: {
            landlord: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            },
            category: true,
        }
    });

    return updatedProperty;
}

export const propertyService = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    updatePropertyStatus
}