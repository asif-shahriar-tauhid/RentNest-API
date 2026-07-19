import { Request } from "express"
import { getPagination } from "../../utils/pagination";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

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

    if (!user) throw new Error("User not found");
    return user;
}

const updateUserStatus = async (id: string, status: UserStatus) => {
    if (!["ACTIVE", "BANNED"].includes(status))
        throw new Error("Invalid status");

    const user = await prisma.user.findUnique({
        where: { id }
    })
    if (!user) throw new Error("User not found");
    if (user.role === "ADMIN")
        throw new Error("Cannot update admin status");

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

const getAllProperties = async () => {

}

const getAllRentals = async () => {

}

const getAllPayments = async () => {

}

export const adminService = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllProperties,
    getAllRentals,
    getAllPayments
}