import { Request } from "express";
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import stripe from "../../config/stripe";
import config from "../../config";
import { getPagination } from "../../utils/pagination";
import { AppError } from "../../utils/AppError";

export const createStripePayment = async (
    rentalRequestId: string,
    tenantId: string
) => {
    const rental = await prisma.rentalRequests.findUnique({
        where: { id: rentalRequestId },
        include: {
            property: { select: { title: true, rentAmount: true, landlordId: true } },
            payments: true,
        },
    });

    if (!rental) throw new AppError("Rental request not found.", 404);
    if (rental.tenantId !== tenantId)
        throw new AppError("You are not authorized to pay for this request.", 403);
    if (rental.status !== "APPROVED")
        throw new AppError("Rental request must be approved before payment.", 400);

    const hasExistingPayment = rental.payments.some(
        (p) => p.status !== "FAILED"
    );

    if (hasExistingPayment)
        throw new AppError("Payment already exists for this rental request.", 409);

    const totalAmount = rental.property.rentAmount * rental.duration;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `Rent: ${rental.property.title}`,
                        description: `${rental.duration} month(s) rental`,
                    },
                    unit_amount: Math.round(totalAmount * 100), // in cents
                },
                quantity: 1,
            },
        ],
        metadata: {
            rentalRequestId,
            tenantId,
        },
        success_url: `${config.app_url ?? "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.app_url ?? "http://localhost:3000"}/payment/cancel`,
    });

    try {
        const payment = await prisma.payment.create({
            data: {
                rentalRequestId,
                userId: tenantId,
                amount: totalAmount,
                provider: "STRIPE",
                status: "PENDING",
                sessionId: session.id,
            },
        });

        return { sessionId: session.id, url: session.url, payment };
    } catch (err) {
        await stripe.checkout.sessions.expire(session.id).catch(() => {
        });
        throw err;
    }
};

export const handleStripeWebhook = async (
    rawBody: Buffer,
    signature: string
) => {
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            config.stripe.webhookSecret
        );
    } catch (err) {
        throw new AppError(`Invalid webhook signature: ${(err as Error).message}`, 400);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const rentalRequestId = session.metadata?.["rentalRequestId"];

        if (rentalRequestId) {
            await prisma.$transaction([
                prisma.payment.update({
                    where: { rentalRequestId },
                    data: {
                        status: "COMPLETED",
                        transactionId: session.payment_intent as string,
                        paidAt: new Date(),
                    },
                }),
                prisma.rentalRequests.update({
                    where: { id: rentalRequestId },
                    data: { status: "ACTIVE" },
                }),
            ]);
        }
    } else if (event.type === "checkout.session.expired") {

        const session = event.data.object as Stripe.Checkout.Session;
        const rentalRequestId = session.metadata?.["rentalRequestId"];
        if (rentalRequestId) {
            await prisma.payment.update({
                where: { rentalRequestId },
                data: { status: "FAILED" },
            });
        }
    } else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const sessionList = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1,
        });
        const session = sessionList.data[0];
        const rentalRequestId = session?.metadata?.["rentalRequestId"];
        if (rentalRequestId) {
            await prisma.payment.update({
                where: { rentalRequestId },
                data: { status: "FAILED" },
            });
        }
    }
};

export const confirmPayment = async (sessionId: string, tenantId: string) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) throw new AppError("Payment session not found.", 404);

    const rentalRequestId = session.metadata?.["rentalRequestId"];
    if (!rentalRequestId) throw new AppError("Invalid session metadata.", 400);

    const existingPayment = await prisma.payment.findUnique({
        where: { rentalRequestId },
    });
    if (existingPayment?.status === "COMPLETED") {
        return existingPayment;
    }

    if (session.payment_status !== "paid") {
        throw new AppError("Payment has not been completed.", 400);
    }

    const [payment] = await prisma.$transaction([
        prisma.payment.update({
            where: { rentalRequestId },
            data: {
                status: "COMPLETED",
                transactionId: session.payment_intent as string,
                paidAt: new Date(),
            },
        }),
        prisma.rentalRequests.update({
            where: { id: rentalRequestId },
            data: { status: "ACTIVE" },
        }),
    ]);

    return payment;
};

export const getPayments = async (
    userId: string,
    role: string,
    req: Request
) => {
    const { page, limit, skip } = getPagination(req);

    let where: Record<string, unknown> = {};
    if (role === "ADMIN") {
        where = {};
    } else if (role === "LANDLORD") {
        where = { rentalRequest: { property: { landlordId: userId } } };
    } else {
        where = { userId };
    }

    const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                rentalRequest: {
                    include: {
                        property: { select: { id: true, title: true, rentAmount: true } },
                    },
                },
            },
        }),
    ]);

    return { payments, meta: { total, page, limit } };
};

export const getPaymentById = async (
    id: string,
    userId: string,
    role: string
) => {
    const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
            rentalRequest: {
                include: {
                    property: { select: { id: true, title: true } },
                    tenant: { select: { id: true, name: true, email: true } },
                },
            },
        },
    });

    if (!payment) throw new AppError("Payment not found.", 404);
    if (payment.userId !== userId && role !== "ADMIN")
        throw new AppError("You are not authorized to view this payment.", 403);

    return payment;
};
