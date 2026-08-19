import { useEffect, useState } from "@wordpress/element";
import {
  Badge,
  Card,
  Group,
  Image,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { apiClient } from "../../../shared/api/client";

interface MenuItem {
  id: number;
  title: string;
  price: number;
  featured_image_url: string | null;
  menu_category: string[];
}

const BestSellingCarousel = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<MenuItem[]>("/rms/v1/menu-items?featured=true")
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Nothing to feature yet (or fetch failed) — quietly omit the section
  // rather than showing an empty carousel or an alarming error banner
  // on an otherwise-working page.
  if (!loading && (error || items.length === 0)) {
    return null;
  }

  return (
    <Stack gap="xl">
      <Title order={2}>Best Selling Dishes</Title>
      <ScrollArea>
        <Group gap="md" wrap="nowrap" pb="sm">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={220} width={220} radius="md" />
              ))
            : items.map((item) => (
                <Card key={item.id} withBorder radius="md" w={220} p="md">
                  <Card.Section>
                    <Image
                      src={item.featured_image_url ?? undefined}
                      height={140}
                      alt={item.title}
                      fallbackSrc="https://placehold.co/220x140?text=No+Image"
                    />
                  </Card.Section>
                  <Stack gap={4} mt="sm">
                    <Text fw={700} lineClamp={1}>
                      {item.title}
                    </Text>
                    <Group justify="space-between">
                      <Text fw={600} c="brand">
                        ${item.price.toFixed(2)}
                      </Text>
                      {item.menu_category[0] ? (
                        <Badge
                          color="brand"
                          variant="light"
                          size="sm"
                          tt="capitalize"
                        >
                          {item.menu_category[0]}
                        </Badge>
                      ) : null}
                    </Group>
                  </Stack>
                </Card>
              ))}
        </Group>
      </ScrollArea>
    </Stack>
  );
};

export default BestSellingCarousel;
