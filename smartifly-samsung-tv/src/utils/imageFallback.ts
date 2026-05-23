export const getImageOrFallback = (imageUrl: string | undefined, fallbackUrl: string) => {
  return imageUrl && imageUrl.trim() ? imageUrl : fallbackUrl;
};
