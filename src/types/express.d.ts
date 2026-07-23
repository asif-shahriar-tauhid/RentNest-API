declare namespace Express {
    interface Request {
        user?: {
            email: string;
            name: string;
            id: string;
            role: import("@prisma/client").UserRole;
        };
    }
}
