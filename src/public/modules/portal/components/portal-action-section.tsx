import { portalConfig } from "../../../shared/api/client";
import AuthToggle from "../../auth/components/auth-toggle";
import OrderPortal from "../../order/components/order-portal";
import ReservationPortal from "../../reservation/components/reservation-portal";
import { saveIntent } from "../utils/intent";

interface PortalActionSectionProps {
  view: "order" | "reservation";
}

const PortalActionSection = ({ view }: PortalActionSectionProps) =>
  portalConfig.is_logged_in ? (
    view === "order" ? (
      <OrderPortal />
    ) : (
      <ReservationPortal />
    )
  ) : (
    <AuthToggle onAuthPromptShown={() => saveIntent(view)} />
  );

export default PortalActionSection;
