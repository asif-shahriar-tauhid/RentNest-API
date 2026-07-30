import { PropertyStatus } from "@prisma/client";

export interface ICreateProperty {
    title: string;
    description: string;
    address: string;
    city: string;
    district: string;
    rentAmount: number;
    bedrooms: number;
    bathrooms: number;
    area?: number;
    amenities?: string[];
    images?: string[];
    categoryId: string;
    status?: PropertyStatus;
}
