import { prisma } from "../../lib/prisma";
import { ICreateInput } from "./category.interface";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const getAllCategories = async () => {
    return prisma.category.findMany({
        orderBy: {
            name: "asc"
        }
    })
}
const getCategoryById = async (id: string) => {
    const category = await prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new AppError("This category does not exist.", httpStatus.NOT_FOUND);
    return category;

}
const createCategory = async (data: ICreateInput) => {
    return prisma.category.create({ data })
}
const updateCategory = async (id: string, data: ICreateInput) => {
    const category = await prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new AppError("This category does not exist.", httpStatus.NOT_FOUND);

    return prisma.category.update({
        where: { id },
        data
    })
}
const deleteCategory = async (id: string) => {
    const category = await prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new AppError("This category does not exist.", httpStatus.NOT_FOUND);
    return prisma.category.delete({
        where: { id }
    })
}

export const categoryService = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
}
