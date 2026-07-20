import { Request } from "express"
import { getPagination } from "../../utils/pagination"
import { prisma } from "../../lib/prisma";
import { ICreateProperty } from "./property.interface";
import { PropertyStatus } from "@prisma/client";

const getAllProperties = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);

    const where: Record<string, unknown> = { status: "AVAILABLE" }
    if (req.query["city"]) where["city"] = { contains: req.query.city as string, mode: "insensitive" }
    if (req.query["categoryId"]) where["categoryId"] = req.query["categoryId"]
    if (req.query["minRent"] || req.query["maxRent"]) {
        where["rentAmount"] = {
            ...(req.query["minRent"] ? { gte: Number(req.query["minRent"]) } : {}),
            ...(req.query["maxRent"] ? { lte: Number(req.query["maxRent"]) } : {}),
        }
    }
    if (req.query["bedrooms"]) where["bedrooms"] = Number(req.query["bedrooms"])

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
        throw new Error("Property not found");
    }

    return property;
}

const createProperty = async (data: ICreateProperty, landlordId: string) => {
    const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
    });

    if (!category) {
        throw new Error("Category not found");
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
        throw new Error("Property not found");
    }

    if (property.landlordId !== landlordId) {
        throw new Error("You are not authorized to update this property");
    }

    if (data.categoryId) {
        const category = await prisma.category.findUnique({
            where: { id: data.categoryId }
        });
        if (!category) {
            throw new Error("Category not found");
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
        throw new Error("Property not found");
    }

    if (property.landlordId !== landlordId) {
        throw new Error("You are not authorized to delete this property");
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
        throw new Error("Property not found");
    }

    if (property.landlordId !== landlordId) {
        throw new Error("You are not authorized to update this property status");
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