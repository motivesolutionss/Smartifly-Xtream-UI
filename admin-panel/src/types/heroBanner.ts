export type HeroBannerTargetType = 'movie' | 'series' | 'live' | 'custom';

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetType?: HeroBannerTargetType;
  targetId?: string;
  targetUrl?: string;
  order?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHeroBannerDTO {
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetType?: HeroBannerTargetType;
  targetId?: string;
  targetUrl?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateHeroBannerDTO extends Partial<CreateHeroBannerDTO> {}
