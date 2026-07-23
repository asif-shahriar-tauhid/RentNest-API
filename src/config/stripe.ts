import Stripe from "stripe";
import config from "./index.js";

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: "2025-02-24.acacia" as any,
});

export default stripe;
