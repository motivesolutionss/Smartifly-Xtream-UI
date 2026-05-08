import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useStore from '@smartifly/shared/src/store';
import XtreamAPI, { XtreamCategory, XtreamPagedResponse } from '@smartifly/shared/src/api/xtream';
import { config, logger } from '@smartifly/shared/src/config';

type CategoryKey = string;

export interface PagedCatalogCategory {
    id: string;
    name: string;
    countLabel?: string;
}

interface CategoryPageState<T> {
    items: T[];
    page: number;
    hasMore: boolean;
    initialized: boolean;
    loading: boolean;
    error: string | null;
}

interface UsePagedCatalogOptions<T> {
    categories: XtreamCategory[];
    fetchPage: (
        api: XtreamAPI,
        page: number,
        limit: number,
        categoryId?: string
    ) => Promise<XtreamPagedResponse<T>>;
    getItemId: (item: T) => string;
    filterItems?: (items: T[]) => T[];
    shuffleItems?: (items: T[], categoryId: string, page: number) => T[];
    countNoun: string;
    allCategoryName?: string;
    resetKey?: string;
}

const PAGE_SIZE = Math.max(60, config.catalog.serverPagination.pageSize || 180);

const createEmptyState = <T,>(): CategoryPageState<T> => ({
    items: [],
    page: 0,
    hasMore: false,
    initialized: false,
    loading: false,
    error: null,
});

const getCategoryKey = (categoryId: string | null | undefined): CategoryKey => {
    if (!categoryId || categoryId === 'all') return 'all';
    return String(categoryId);
};

const appendUniqueItems = <T,>(
    existingItems: T[],
    nextItems: T[],
    getItemId: (item: T) => string
): T[] => {
    const seen = new Set(existingItems.map((item) => getItemId(item)));
    const merged = [...existingItems];

    for (const item of nextItems) {
        const id = getItemId(item);
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push(item);
    }

    return merged;
};

export const usePagedCatalog = <T,>({
    categories,
    fetchPage,
    getItemId,
    filterItems,
    shuffleItems,
    countNoun,
    allCategoryName = 'All',
    resetKey,
}: UsePagedCatalogOptions<T>) => {
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [pages, setPages] = useState<Record<CategoryKey, CategoryPageState<T>>>({});
    const pagesRef = useRef<Record<CategoryKey, CategoryPageState<T>>>({});
    const activeRequestRef = useRef<Record<CategoryKey, number>>({});

    const updatePages = useCallback((updater: (prev: Record<CategoryKey, CategoryPageState<T>>) => Record<CategoryKey, CategoryPageState<T>>) => {
        setPages((prev) => {
            const next = updater(prev);
            pagesRef.current = next;
            return next;
        });
    }, []);

    const selectedKey = getCategoryKey(selectedCategoryId);
    const selectedPage = pages[selectedKey] ?? createEmptyState<T>();

    const loadPage = useCallback(async (categoryId: string, page: number, replace: boolean) => {
        const key = getCategoryKey(categoryId);
        const existingState = pagesRef.current[key] ?? createEmptyState<T>();

        if (existingState.loading) {
            return;
        }

        const api = getXtreamAPI();
        if (!api) {
            logger.error(`[TV Catalog] Missing Xtream API for category ${key}`);
            return;
        }

        updatePages((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] ?? createEmptyState<T>()),
                loading: true,
                error: null,
            },
        }));

        const requestId = Date.now();
        activeRequestRef.current[key] = requestId;

        try {
            const response = await fetchPage(
                api,
                page,
                PAGE_SIZE,
                key === 'all' ? undefined : key
            );

            const rawItems = Array.isArray(response.items) ? response.items : [];
            const filteredItems = filterItems ? filterItems(rawItems) : rawItems;
            const nextItems = shuffleItems ? shuffleItems(filteredItems, key, page) : filteredItems;

            updatePages((prev) => {
                if (activeRequestRef.current[key] !== requestId) {
                    return prev;
                }

                const previous = prev[key] ?? createEmptyState<T>();
                const mergedItems = replace
                    ? nextItems
                    : appendUniqueItems(previous.items, nextItems, getItemId);

                return {
                    ...prev,
                    [key]: {
                        items: mergedItems,
                        page,
                        hasMore: response.serverPaginated ? response.hasMore : false,
                        initialized: true,
                        loading: false,
                        error: null,
                    },
                };
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load content';
            logger.error(`[TV Catalog] Failed loading category ${key}`, error);

            updatePages((prev) => ({
                ...prev,
                [key]: {
                    ...(prev[key] ?? createEmptyState<T>()),
                    loading: false,
                    initialized: true,
                    error: message,
                },
            }));
        }
    }, [fetchPage, filterItems, getItemId, getXtreamAPI, shuffleItems, updatePages]);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    useEffect(() => {
        pagesRef.current = {};
        activeRequestRef.current = {};
        setPages({});
        setSelectedCategoryId('all');
    }, [resetKey]);

    useEffect(() => {
        const current = pages[selectedKey];
        if (current?.initialized || current?.loading) {
            return;
        }

        loadPage(selectedKey, 1, true);
    }, [loadPage, pages, selectedKey]);

    const loadMore = useCallback(() => {
        const current = pagesRef.current[selectedKey] ?? createEmptyState<T>();
        if (!current.initialized || current.loading || !current.hasMore) {
            return;
        }

        loadPage(selectedKey, current.page + 1, false);
    }, [loadPage, selectedKey]);

    const refreshCurrent = useCallback(() => {
        loadPage(selectedKey, 1, true);
    }, [loadPage, selectedKey]);

    const categoryOptions = useMemo<PagedCatalogCategory[]>(() => {
        const makeCountLabel = (key: string): string | undefined => {
            const entry = pages[key];
            if (!entry?.initialized) return undefined;
            if (entry.loading && entry.items.length === 0) return '...';
            return entry.hasMore ? `${entry.items.length}+` : `${entry.items.length}`;
        };

        return [
            {
                id: 'all',
                name: allCategoryName,
                countLabel: makeCountLabel('all'),
            },
            ...categories.map((category) => {
                const id = String(category.category_id);
                return {
                    id,
                    name: category.category_name,
                    countLabel: makeCountLabel(id),
                };
            }),
        ];
    }, [allCategoryName, categories, pages]);

    const selectedCategoryName = useMemo(() => {
        return categoryOptions.find((category) => category.id === selectedKey)?.name ?? 'All';
    }, [categoryOptions, selectedKey]);

    const countLabel = useMemo(() => {
        if (selectedPage.loading && selectedPage.items.length === 0) {
            return 'Loading...';
        }
        if (selectedPage.error && selectedPage.items.length === 0) {
            return 'Failed to load';
        }
        if (selectedPage.loading && selectedPage.items.length > 0) {
            return `Loading more ${countNoun}...`;
        }
        if (selectedPage.hasMore) {
            return `${selectedPage.items.length}+ ${countNoun} loaded`;
        }
        return `${selectedPage.items.length} ${countNoun}`;
    }, [countNoun, selectedPage.error, selectedPage.hasMore, selectedPage.items.length, selectedPage.loading]);

    return {
        selectedCategoryId,
        setSelectedCategoryId,
        categories: categoryOptions,
        items: selectedPage.items,
        selectedCategoryName,
        countLabel,
        isInitialLoading: selectedPage.loading && selectedPage.items.length === 0,
        isLoadingMore: selectedPage.loading && selectedPage.items.length > 0,
        hasMore: selectedPage.hasMore,
        error: selectedPage.error,
        loadMore,
        refreshCurrent,
    };
};

export default usePagedCatalog;
