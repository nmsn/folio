// Shared types for folio

export type ID = string;

export interface User {
  id: ID;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RSSSource {
  id: ID;
  userId: ID;
  name: string;
  url: string;
  description?: string;
  iconUrl?: string;
  category?: string;
  isActive: boolean;
  lastFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: ID;
  sourceId: ID;
  title: string;
  url: string;
  author?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingItem {
  id: ID;
  userId: ID;
  articleId: ID;
  status: 'unread' | 'reading' | 'read' | 'saved';
  progress?: number;
  aiSummary?: string;
  aiAnnotations?: AIAnnotation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnnotation {
  id: ID;
  type: 'summary' | 'highlight' | 'question' | 'answer';
  content: string;
  createdAt: Date;
}