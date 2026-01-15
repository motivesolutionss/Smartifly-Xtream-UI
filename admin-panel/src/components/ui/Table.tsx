
import { type ReactNode, forwardRef, type TableHTMLAttributes, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Table
export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
    children: ReactNode;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(({ className, children, ...props }, ref) => (
    <div className="w-full overflow-auto">
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props}>
            {children}
        </table>
    </div>
));
Table.displayName = "Table";

// TableHead
export const TableHead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHead.displayName = "TableHead";

// TableBody
export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

// TableRow
export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cn(
            "border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-secondary)]/50 data-[state=selected]:bg-[var(--bg-secondary)]",
            className
        )}
        {...props}
    />
));
TableRow.displayName = "TableRow";

// TableCell
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
    header?: boolean;
    align?: 'left' | 'center' | 'right';
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({ className, header, align = 'left', ...props }, ref) => {
    const Component = header ? 'th' : 'td';
    return (
        <Component
            ref={ref}
            className={cn(
                "p-4 align-middle [&:has([role=checkbox])]:pr-0",
                header && "h-12 text-[var(--text-secondary)] font-medium bg-[var(--bg-card)]",
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                "last:pr-6 first:pl-6", // Add padding to first and last cells
                className
            )}
            {...props}
        />
    );
});
TableCell.displayName = "TableCell";
