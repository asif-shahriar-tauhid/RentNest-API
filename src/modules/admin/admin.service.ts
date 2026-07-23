import { Request } from "express"
import { getPagination } from "../../utils/pagination";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const getAllUsers = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);
    const whatRole = req.query['role'] as string | undefined;
    const where = whatRole ? { role: whatRole as UserRole } : {};

    const [total, userList] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                createdAt: true,
                _count: {
                    select: {
                        properties: true,
                        rentalRequests: true,
                    }
                },
            },
        }),
    ]);

    return {
        users: userList,
        meta: {
            page,
            limit,
            total
        }
    }
}

const getUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            createdAt: true,
            _count: {
                select: {
                    properties: true,
                    rentalRequests: true,
                }
            },
        },
    });

    if (!user) throw new AppError("User not found", httpStatus.NOT_FOUND);
    return user;
}

const updateUserStatus = async (id: string, status: UserStatus) => {
    if (!["ACTIVE", "BANNED"].includes(status))
        throw new AppError("Invalid status", httpStatus.BAD_REQUEST);

    const user = await prisma.user.findUnique({
        where: { id }
    })
    if (!user) throw new AppError("User not found", httpStatus.NOT_FOUND);
    if (user.role === "ADMIN")
        throw new AppError("Cannot update admin status", httpStatus.FORBIDDEN);

    const updatedUser = await prisma.user.update({
        where: { id },
        data: { status },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            status: true,
            createdAt: true,
        }
    })
    return updatedUser;
}

const getAllProperties = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);
    const [total, properties] = await Promise.all([
        prisma.property.count(),
        prisma.property.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                landlord: { select: { id: true, name: true, email: true } },
                category: true,
            },
        }),
    ]);
    return { properties, meta: { page, limit, total } };
};

const getAllRentals = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);
    const [total, rentals] = await Promise.all([
        prisma.rentalRequests.count(),
        prisma.rentalRequests.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                property: { select: { id: true, title: true, rentAmount: true } },
                tenant: { select: { id: true, name: true, email: true } },
            },
        }),
    ]);
    return { rentals, meta: { page, limit, total } };
};

const getAllPayments = async (req: Request) => {
    const { page, limit, skip } = getPagination(req);
    const [total, payments] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                rentalRequest: {
                    include: {
                        property: { select: { id: true, title: true } },
                        tenant: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        }),
    ]);
    return { payments, meta: { page, limit, total } };
};


export const adminService = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllProperties,
    getAllRentals,
    getAllPayments
}