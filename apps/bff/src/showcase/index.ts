import { handleHitPayMppPaidShowcase } from "./hitpay-mpp-paid";
import { handleStripeMppPaidShowcase } from "./stripe-mpp-paid";

export const showcaseRoutes = new Set([
  "/showcase/stripe-mpp/paid",
  "/showcase/hitpay-mpp/paid",
]);

export const handleShowcaseRoute = (request: Request, path: string): Promise<Response> | Response | null => {
  switch (path) {
    case "/showcase/stripe-mpp/paid":
      return handleStripeMppPaidShowcase(request);
    case "/showcase/hitpay-mpp/paid":
      return handleHitPayMppPaidShowcase(request);
    default:
      return null;
  }
};
