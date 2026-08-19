import { Box, MantineProvider, Stack } from "@mantine/core";
import "@mantine/core/styles.css";
import { theme } from "../../../../shared/theme";
import { useEffect, useState } from "@wordpress/element";
import ResetPasswordForm from "../../auth/components/reset-password-form";
import PortalActionSection from "./portal-action-section";
import PortalHero from "./portal-hero";
import { consumeIntent } from "../utils/intent";
import BestSellingCarousel from "./best-selling-carousel";

export type PortalView = "all" | "order" | "reservation";

const urlParams = new URLSearchParams(window.location.search);
const isResetFlow = urlParams.get("rms_action") === "reset-password";
const resetLogin = urlParams.get("login") ?? "";
const resetKey = urlParams.get("key") ?? "";

const CustomerPortal = ({ view }: { view: PortalView }) => {
  const [activeSection, setActiveSection] = useState<
    "order" | "reservation" | null
  >(view === "all" ? null : view);

  // One-shot intent read for the combined portal only — after a register/login
  // reload, land back on the section the visitor was trying to reach.
  useEffect(() => {
    if (view !== "all") return;
    const intent = consumeIntent();
    if (intent) setActiveSection(intent);
  }, []);

  return (
    <MantineProvider theme={theme}>
      <Box className="rms-customer-portal">
        {isResetFlow ? (
          <ResetPasswordForm login={resetLogin} resetKey={resetKey} />
        ) : (
          <>
            <PortalHero
              activeSection={activeSection}
              onSelect={setActiveSection}
            />

            <Stack
              px="xl"
              pt={64}
              pb="xl"
              gap="xl"
              style={{ maxWidth: theme.other.maxContentWidth, margin: "0 auto" }}
            >
              {activeSection ? (
                <PortalActionSection view={activeSection} />
              ) : (
                <BestSellingCarousel />
              )}
            </Stack>
          </>
        )}
      </Box>
    </MantineProvider>
  );
};

export default CustomerPortal;
