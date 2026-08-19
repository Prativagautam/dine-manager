import { useEffect } from '@wordpress/element';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Alert,
	Button,
	Group,
	Modal,
	NumberInput,
	Stack,
	Switch,
	TagsInput,
	Textarea,
	TextInput,
} from '@mantine/core';

const MenuItemFormSchema = z.object({
  title: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z
    .number({ invalid_type_error: "Price is required" })
    .min(0, "Price cannot be negative"),
  prep_time_minutes: z
    .number({ invalid_type_error: "Prep time is required" })
    .min(0, "Prep time cannot be negative"),
  is_available: z.boolean(),
  is_featured: z.boolean(),
  menu_category: z.array(z.string()),
  dietary_tag: z.array(z.string()),
});

export type MenuItemFormValues = z.infer<typeof MenuItemFormSchema>;

interface MenuItemFormProps {
	opened: boolean;
	mode: 'create' | 'edit';
	defaultValues: MenuItemFormValues;
	loading: boolean;
	error: string | null;
	onClose: () => void;
	onSubmit: (values: MenuItemFormValues) => void | Promise<void>;
}

const MenuItemForm = ({ opened, mode, defaultValues, loading, error, onClose, onSubmit }: MenuItemFormProps) => {
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<MenuItemFormValues>({
		resolver: zodResolver(MenuItemFormSchema),
		defaultValues,
		mode: 'onSubmit',
	});

	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);

	return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === "create" ? "Add Menu Item" : "Edit Menu Item"}
      size="lg"
    >
      <Stack gap="md">
        {error ? <Alert color="attention">{error}</Alert> : null}

        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Item name"
              placeholder="Enter item name"
              {...field}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              label="Description"
              placeholder="Enter item description"
              minRows={2}
              {...field}
            />
          )}
        />

        <Group grow>
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Price"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix="$"
                {...field}
                value={field.value ?? 0}
                onChange={(value) =>
                  field.onChange(typeof value === "number" ? value : 0)
                }
                error={errors.price?.message}
              />
            )}
          />
          <Controller
            name="prep_time_minutes"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Prep time (min)"
                min={0}
                {...field}
                value={field.value ?? 0}
                onChange={(value) =>
                  field.onChange(typeof value === "number" ? value : 0)
                }
                error={errors.prep_time_minutes?.message}
              />
            )}
          />
        </Group>

        <Controller
          name="menu_category"
          control={control}
          render={({ field }) => (
            <TagsInput
              label="Categories"
              placeholder="Type to add a category"
              description="Press Enter to add a new category, or pick an existing one"
              {...field}
            />
          )}
        />

        <Controller
          name="dietary_tag"
          control={control}
          render={({ field }) => (
            <TagsInput
              label="Dietary tags"
              placeholder="Type to add a dietary tag"
              description="e.g. vegetarian, vegan, gluten-free"
              {...field}
            />
          )}
        />

        <Controller
          name="is_available"
          control={control}
          render={({ field }) => (
            <Switch
              label="Available for ordering"
              checked={field.value}
              onChange={(event) => field.onChange(event.currentTarget.checked)}
            />
          )}
        />
        <Controller
          name="is_featured"
          control={control}
          render={({ field }) => (
            <Switch
              label="Featured (Best Selling)"
              checked={field.value}
              onChange={(event) => field.onChange(event.currentTarget.checked)}
            />
          )}
        />

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="brand"
            loading={loading}
            onClick={handleSubmit(onSubmit)}
          >
            {mode === "create" ? "Create Item" : "Save Changes"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default MenuItemForm;