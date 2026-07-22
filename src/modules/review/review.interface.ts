export interface ICreateReviewInput {
    rentalRequestId: string;
    propertyId: string;
    rating: number;
    comment?: string;
}