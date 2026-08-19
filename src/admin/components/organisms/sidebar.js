/* WordPress */
import { __ } from "@wordpress/i18n";

/* Library */
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  Box,
  NavLink,
  Stack,
  Title,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  CalendarRange,
  LayoutDashboard,
  Map,
  Menu,
  Settings,
  ShoppingBasket,
  Table2,
} from "lucide-react";

/**
 * Left sidebar navigation — matches DESIGN.md §5's documented pattern
 * (persistent, ~260-280px wide, warm surface-dim background, active item
 * gets a solid brand-color pill). This did not exist before; the
 * boilerplate's AdminHeader only has a horizontal top nav.
 *
 * No breadcrumb — intentional, per DESIGN.md: none of the 6 Stitch
 * screens use one. Navigation here is flat (5-6 top-level sections, no
 * deep nesting), so a persistent sidebar alone is sufficient — a
 * breadcrumb would be adding a pattern the design never called for.
 *
 * Icons are deliberately omitted for now — Stitch's design uses Material
 * Symbols Outlined via a webfont, which may not be enqueued yet (depends
 * on whether the earlier font-loading PHP change was applied). Add icons
 * once that's confirmed, rather than guessing at an unverified icon
 * package.
 *
 * `capability` on a nav item is the presentation-layer gate — it only
 * decides whether the link renders. It is NOT a security boundary; the
 * real enforcement for every one of these sections is already in each
 * REST controller's permission_callback. A user who somehow reached
 * /menu without manage_rms_menu_items would still get 403s from every
 * write request — this filter just keeps them from seeing a link that
 * would only frustrate them.
 */
const NAV_ITEMS = [
  {
    to: "/",
    label: __("Dashboard", "restaurant-management-system"),
    icon: LayoutDashboard,
  },
  {
    to: "/menu",
    label: __("Menu", "restaurant-management-system"),
    icon: Menu,
    capability: "view_rms_menu_items",
  },
  {
    to: "/tables",
    label: __("Tables", "restaurant-management-system"),
    icon: Table2,
    capability: "manage_rms_tables",
  },
  {
    to: "/reservations",
    label: __("Reservations", "restaurant-management-system"),
    icon: CalendarRange,
    capability: "manage_rms_reservations",
  },
  {
    to: "/orders",
    label: __("Orders", "restaurant-management-system"),
    icon: ShoppingBasket,
    capability: "manage_rms_orders",
  },
  {
    to: "/floor-plan",
    label: __("Floor Plan", "restaurant-management-system"),
    icon: Map,
    capability: "manage_rms_tables",
  },
];

/* Settings moved here from AdminHeader's old primaryNav — matches
 * DESIGN.md's pattern of Settings/Support sitting at the bottom of the
 * sidebar, separated from the main nav list, not as a top-bar tab. */
const FOOTER_NAV_ITEMS = [
  {
    to: "/settings",
    label: __("Settings", "restaurant-management-system"),
    icon: Settings,
  },
];

const Sidebar = () => {
  const theme = useMantineTheme();
  const location = useLocation();

  // Anyone reaching this component already has access_rms_admin (the
  // wp-admin menu itself is gated on that), so Dashboard/Settings have
  // no `capability` requirement — they're visible to Staff and Admin
  // alike. Items with a `capability` only show if the current user's
  // localized capabilities include it.
  const { capabilities = {} } = RestaurantManagementSystemLocalize;

  const isVisible = (item) => !item.capability || capabilities[item.capability];

  const renderNavLink = (item) => {
    const isActive =
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to);

    return (
      <NavLink
        key={item.to}
        component={RouterNavLink}
        to={item.to}
        label={item.label}
        leftSection={
          item.icon ? <item.icon size={18} strokeWidth={1.8} /> : undefined
        }
        active={isActive}
        color="brand"
        variant="filled"
        styles={{
          root: { borderRadius: theme.radius.md },
        }}
      />
    );
  };

  return (
    <Box
      w={280}
      mih="100vh"
      bg={theme.other.surfaceDim}
      p="md"
      style={{ flexShrink: 0, display: "flex", flexDirection: "column" }}
    >
      <Box mb="xl" px="xs">
        <Title order={3} ff="'Source Serif 4', serif">
          KhanaPro
        </Title>
        <Text size="xs" c="dimmed" tt="uppercase">
          Admin Console
        </Text>
      </Box>

      <Stack gap={4}>{NAV_ITEMS.filter(isVisible).map(renderNavLink)}</Stack>

      <Box
        mt="auto"
        pt="md"
        style={{ borderTop: `1px solid ${theme.other.outlineVariant}` }}
      >
        <Stack gap={4}>
          {FOOTER_NAV_ITEMS.filter(isVisible).map(renderNavLink)}
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
