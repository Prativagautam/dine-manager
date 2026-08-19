import { Box, Flex, Image, Stack, Text, Title } from "@mantine/core";
import PortalActions from "./portal-actions";
import { theme } from "../../../../shared/theme";

interface PortalHeroProps {
  activeSection: "order" | "reservation" | null;
  onSelect: (section: "order" | "reservation") => void;
  heading?: string;
  subtitle?: string;
}

const HERO_IMAGE_URL =
  "https://wp-theme.ddev.site/wp-content/uploads/2026/08/hero-image.png";

const PortalHero = ({
  activeSection,
  onSelect,
  heading = "Fresh food and Fast Service",
  subtitle = "Order online or reserve your table in seconds. Fresh ingredients, honest cooking, and a warm table waiting for you.",
}: PortalHeroProps) => (
  <Box
    px="xl"
    py={{ base: "xl", md: "4xl" }}
    style={{ maxWidth: theme.other.maxContentWidth, margin: "0 auto" }}
  >
    <Flex
      align="flex-start"
      gap="4xl"
      wrap="wrap"
    >
      <Stack gap="xl" style={{ flex: "1 1 360px" }}>
        <Title order={1}>{heading}</Title>
        <Text c="dimmed" size="lg" maw={520}>
          {subtitle}
        </Text>
        <PortalActions
          activeSection={activeSection}
          onSelect={onSelect}
        />
      </Stack>

      <Box style={{ flex: "1 1 400px" }}>
        <Image src={HERO_IMAGE_URL} radius="lg" alt="Featured dish" />
      </Box>
    </Flex>
  </Box>
);

export default PortalHero;
