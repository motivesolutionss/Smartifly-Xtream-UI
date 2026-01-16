import { Image } from 'react-native';

const prefetchedUris = new Set<string>();

export const prefetchImage = (uri?: string) => {
    if (!uri || prefetchedUris.has(uri)) return;
    prefetchedUris.add(uri);

    Image.prefetch(uri).catch(() => {
        prefetchedUris.delete(uri);
    });
};
