import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { categoryService } from "./category.service"
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const getAllCategories = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const categories = await categoryService.getAllCategories();

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Categories fetched successfully",
            data: categories,
        });
    }
)
const getCategoryById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const category = await categoryService.getCategoryById(id);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Category fetched successfully",
            data: category,
        });
    }
)
const createCategory = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const newCategory = await categoryService.createCategory(req.body);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Category created successfully",
            data: newCategory,
        });
    }
)
const updateCategory = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const updatedCategory = await categoryService.updateCategory(id, req.body);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    }
)
const deleteCategory = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;

        await categoryService.deleteCategory(id);
        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Category deleted successfully",
            data: null,
        });
    }
)

export const categoryController = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
}