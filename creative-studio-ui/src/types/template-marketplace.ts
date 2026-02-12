/**
 * Template Marketplace Types
 * MI3: Template Marketplace - User template sharing
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  previewUrl?: string;
  category: TemplateCategory;
  subcategory?: string;
  tags: string[];
  author: TemplateAuthor;
  version: string;
  compatibility: TemplateCompatibility;
  pricing: TemplatePricing;
  statistics: TemplateStatistics;
  features: TemplateFeature[];
  requirements: TemplateRequirements;
  assets: TemplateAsset[];
  instructions: TemplateInstructions;
  isFeatured: boolean;
  isVerified: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export type TemplateCategory = 
  | 'intro'
  | 'outro'
  | 'transitions'
  | 'lower-thirds'
  | 'titles'
  | 'end-cards'
  | 'social-media'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'promotional'
  | 'educational'
  | 'storytelling'
  | 'motion-graphics'
  | 'logo-reveal'
  | 'photo-slideshow'
  | 'music-video'
  | 'documentary'
  | 'commercial'
  | 'custom';

export interface TemplateAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  socialLinks?: SocialLink[];
  verified: boolean;
  rating: number;
  totalSales: number;
  joinedAt: string;
}

export interface SocialLink {
  platform: 'twitter' | 'instagram' | 'youtube' | 'dribbble' | 'behance' | 'artstation';
  url: string;
}

export interface TemplateCompatibility {
  minVersion: string;
  maxVersion?: string;
  platforms: Platform[];
  aspectRatios: AspectRatio[];
  resolutions: Resolution[];
}

export type Platform = 'web' | 'desktop' | 'mobile' | 'all';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | 'custom';

export type Resolution = '720p' | '1080p' | '1440p' | '4K' | '8K' | 'custom';

export interface TemplatePricing {
  type: 'free' | 'paid' | 'subscription' | 'credit';
  price?: number;
  currency?: string;
  credits?: number;
  subscriptionTier?: 'basic' | 'pro' | 'enterprise';
  salePrice?: number;
  saleEndsAt?: string;
}

export interface TemplateStatistics {
  downloads: number;
  views: number;
  likes: number;
  comments: number;
  rating: number;
  ratingCount: number;
  favorites: number;
}

export interface TemplateFeature {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isPremium: boolean;
}

export interface TemplateRequirements {
  plugins?: string[];
  fonts?: string[];
  assets?: string[];
  minRam?: number;
  minStorage?: number;
  gpuRequirements?: string;
}

export interface TemplateAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'font' | 'lottie' | '3d-model' | 'preset';
  url: string;
  thumbnail?: string;
  size: number;
  isRequired: boolean;
  license?: string;
  attribution?: string;
}

export interface TemplateInstructions {
  overview: string;
  installationSteps: string[];
  customizationSteps: string[];
  usageTips: string[];
  troubleshooting?: string[];
  videoTutorial?: string;
  documentationUrl?: string;
  changelog?: ChangelogEntry[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  isBreaking: boolean;
}

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  templates: string[];
  author: TemplateAuthor;
  isCurated: boolean;
  isSeasonal: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  username: string;
  avatar?: string;
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  helpful: number;
  notHelpful: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceSearchParams {
  query?: string;
  categories?: TemplateCategory[];
  platforms?: Platform[];
  aspectRatios?: AspectRatio[];
  resolutions?: Resolution[];
  price?: 'free' | 'paid' | 'all';
  sortBy?: SortOption;
  rating?: number;
  tags?: string[];
  author?: string;
  page: number;
  limit: number;
}

export type SortOption = 
  | 'newest'
  | 'popular'
  | 'rating'
  | 'price-low'
  | 'price-high'
  | 'downloads'
  | 'trending';

export interface MarketplaceState {
  templates: Template[];
  collections: TemplateCollection[];
  featuredTemplates: string[];
  searchParams: MarketplaceSearchParams;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface UserLibrary {
  purchasedTemplates: string[];
  downloadedTemplates: string[];
  favorites: string[];
  collections: string[];
  uploadHistory: UploadHistoryEntry[];
}

export interface UploadHistoryEntry {
  templateId: string;
  name: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface TemplateUploadData {
  template: Partial<Template>;
  assets: File[];
  thumbnail: File;
  preview?: File;
  documentation?: File;
  price?: number;
  isPublic: boolean;
  license: 'personal' | 'commercial' | 'editorial';
  attributionRequired: boolean;
}
