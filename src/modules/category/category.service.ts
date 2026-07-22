import { prisma } from "../../lib/prisma"
import { ICreateInput } from "./category.interface"

const getAllCategories = async () => {
    return prisma.category.findMany({
        orderBy: {
            name: "asc"
        }
    })
}
const getCategoryById = async (id: string) => {
    const category = prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new Error("This category does not exist.");
    return category;

}
const createCategory = async (data: ICreateInput) => {
    return prisma.category.create({ data })
}
const updateCategory = async (id: string, data: ICreateInput) => {
    const category = prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new Error("This category does not exist.");

    return prisma.category.update({
        where: { id },
        data
    })
}
const deleteCategory = async (id: string) => {
    const category = prisma.category.findUnique({
        where: {
            id
        }
    })

    if (!category) throw new Error("This category does not exist.");
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
