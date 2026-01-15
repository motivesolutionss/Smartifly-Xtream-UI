'use client';

import { type ReactNode } from 'react';
import {
    useFormContext,
    Controller,
    type FieldPath,
    type FieldValues,
    type ControllerRenderProps,
    type ControllerFieldState,
    type UseFormStateReturn,
} from 'react-hook-form';
import { cn } from '@/lib/utils';

export interface FormFieldProps<T extends FieldValues> {
    /** Field name (path) */
    name: FieldPath<T>;
    /** Field label */
    label?: string;
    /** Field description/helper text */
    description?: string;
    /** Required indicator */
    required?: boolean;
    /** Additional class for wrapper */
    className?: string;
    /** Render function for custom input */
    render: (props: {
        field: ControllerRenderProps<T, FieldPath<T>>;
        fieldState: ControllerFieldState;
        formState: UseFormStateReturn<T>;
    }) => ReactNode;
}

/**
 * FormField component for react-hook-form integration
 * 
 * Must be used inside a FormProvider context
 * 
 * @example
 * <FormProvider {...methods}>
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <FormField
 *       name="email"
 *       label="Email"
 *       required
 *       render={({ field, fieldState }) => (
 *         <Input {...field} error={fieldState.error?.message} />
 *       )}
 *     />
 *   </form>
 * </FormProvider>
 */
export function FormField<T extends FieldValues>({
    name,
    label,
    description,
    required,
    className,
    render,
}: FormFieldProps<T>) {
    const { control } = useFormContext<T>();

    return (
        <Controller
            name={name}
            control={control}
            render={(props) => {
                const { fieldState } = props;
                const error = fieldState.error?.message;

                return (
                    <div className={cn('space-y-1.5', className)}>
                        {label && (
                            <label
                                htmlFor={name}
                                className="text-sm font-medium text-[var(--text-secondary)]"
                            >
                                {label}
                                {required && (
                                    <span className="text-red-400 ml-0.5">*</span>
                                )}
                            </label>
                        )}
                        {render(props)}
                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                        {description && !error && (
                            <p className="text-sm text-[var(--text-muted)]">
                                {description}
                            </p>
                        )}
                    </div>
                );
            }}
        />
    );
}

// Form wrapper with provider
import { FormProvider, type UseFormReturn } from 'react-hook-form';

export interface FormProps<T extends FieldValues> {
    /** Form methods from useForm */
    form: UseFormReturn<T>;
    /** Submit handler */
    onSubmit: (data: T) => void | Promise<void>;
    /** Form children */
    children: ReactNode;
    /** Additional class name */
    className?: string;
}

/**
 * Form component that wraps FormProvider
 * 
 * @example
 * const form = useForm({ resolver: zodResolver(schema) });
 * 
 * <Form form={form} onSubmit={handleSubmit}>
 *   <FormField name="email" ... />
 *   <Button type="submit">Submit</Button>
 * </Form>
 */
export function Form<T extends FieldValues>({
    form,
    onSubmit,
    children,
    className,
}: FormProps<T>) {
    return (
        <FormProvider {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn('space-y-4', className)}
            >
                {children}
            </form>
        </FormProvider>
    );
}
