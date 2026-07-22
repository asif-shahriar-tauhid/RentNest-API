import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { propertyService } from "./property.service"
import { sendResponse } from "../../utils/sendResponse"
import httpStatus from "http-status";

const getAllProperties = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const properties = await propertyService.getAllProperties(req)

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Properties fetched successfully",
            data: properties,
        });
    }
)

const getPropertyById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const property = await propertyService.getPropertyById(id)

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Property fetched successfully",
            data: property,
        });
    }
)

const createProperty = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const property = await propertyService.createProperty(
            req.body,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Property created successfully",
            data: property,
        });
    }
)

const updateProperty = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const property = await propertyService.updateProperty(
            id,
            req.body,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Property updated successfully",
            data: property,
        });
    }
)

const deleteProperty = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const property = await propertyService.deleteProperty(
            id,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Property deleted successfully",
            data: property,
        });
    }
)

const updatePropertyStatus = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params["id"] as string;
        const property = await propertyService.updatePropertyStatus(
            id,
            req.body.status,
            req.user!.id
        )

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Property status updated successfully",
            data: property,
        });
    }
)

export const propertyController = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    updatePropertyStatus
}