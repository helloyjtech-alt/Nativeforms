import { AppSubscription } from "@shopify/shopify-app-remix/server";

export const MONTHLY_PLAN = 'Monthly subscription';
export const ANNUAL_PLAN = 'Annual subscription';

export const PLANS = {
  FREE: "FREE",
  STARTER: "STARTER",
  GROWTH: "GROWTH"
};

export const currentPlan = async (shop: string) => {
  // In the future this will query the Shop model from Prisma
  return PLANS.FREE;
};
