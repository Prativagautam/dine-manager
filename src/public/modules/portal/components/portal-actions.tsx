import { Button, Group } from "@mantine/core";

interface PortalActionsProps {
  activeSection: "order" | "reservation" | null;
  onSelect: (section: "order" | "reservation") => void;
}

const PortalActions = ({ activeSection, onSelect }: PortalActionsProps) => (
  <Group gap="md" wrap="wrap">
    <Button
      variant={activeSection === "order" ? "filled" : "outline"}
      onClick={() => onSelect("order")}
    >
      Place Order
    </Button>
    <Button
      variant={activeSection === "reservation" ? "filled" : "outline"}
      onClick={() => onSelect("reservation")}
    >
      Reserve Table
    </Button>
  </Group>
);

export default PortalActions;
