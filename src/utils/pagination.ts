import { Request } from "express";

export interface PaginationOptions {
    page: number;
    limit: number;
    skip: number;
}

export const getPagination = (req: Request): PaginationOptions => {
    const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
    const limit = Math.min(
        100,
        Math.max(1, parseInt(String(req.query["limit"] ?? "10")))
    );
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
