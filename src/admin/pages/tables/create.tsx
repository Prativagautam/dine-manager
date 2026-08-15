import { useEffect } from "@wordpress/element";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Text,
} from "@mantine/core";

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Occupied", label: "Occupied" },
  { value: "Out of Service", label: "Out of Service" },
];

const TableFormSchema = z.object({
  title: z.string().min(1, "Table name is required"),
  capacity: z
    .number({ invalid_type_error: "Capacity is required" })
    .min(1, "Capacity must be at least 1"),
  section: z.string().optional(),
  status: z.enum(["Available", "Occupied", "Out of Service"]),
  grid_x: z
    .number()
    .min(0, "Grid X must be 0 or greater")
    .max(11, "Grid X cannot exceed 11"),
  grid_y: z
    .number()
    .min(0, "Grid Y must be 0 or greater")
    .max(11, "Grid Y cannot exceed 11"),
});

export type TableFormValues = z.infer<typeof TableFormSchema>;

interface TableFormProps {
  opened: boolean;
  mode: "create" | "edit";
  defaultValues: TableFormValues;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TableFormValues) => void | Promise<void>;
}

const TableForm = ({
  opened,
  mode,
  defaultValues,
  loading,
  error,
  onClose,
  onSubmit,
}: TableFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TableFormValues>({
    resolver: zodResolver(TableFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === "create" ? "Add Table" : "Edit Table"}
      size="lg"
    >
      <Stack spacing="md">
        {error ? <Alert color="red">{error}</Alert> : null}

        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Table name"
              placeholder="Enter table name"
              {...field}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          name="capacity"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Capacity"
              min={1}
              {...field}
              value={field.value ?? 1}
              onChange={(value) => field.onChange(value ?? 0)}
              error={errors.capacity?.message}
            />
          )}
        />

        <Controller
          name="section"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Section"
              placeholder="Enter section name"
              {...field}
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="Status"
              data={STATUS_OPTIONS}
              {...field}
              error={errors.status?.message}
            />
          )}
        />

        <Group grow>
          <Controller
            name="grid_x"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Grid X"
                min={0}
                max={11}
                {...field}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(value ?? 0)}
                error={errors.grid_x?.message}
              />
            )}
          />
          <Controller
            name="grid_y"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Grid Y"
                min={0}
                max={11}
                {...field}
                value={field.value ?? 0}
                onChange={(value) => field.onChange(value ?? 0)}
                error={errors.grid_y?.message}
              />
            )}
          />
        </Group>

        <Group position="right" spacing="sm" mt="xs">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="brand"
            loading={loading}
            onClick={handleSubmit(onSubmit)}
          >
            {mode === "create" ? "Create Table" : "Save Changes"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default TableForm;
