import { describe, it, expect } from 'vitest';
import {
  CursorSchema,
  CursorPaginationInputSchema,
  createPaginatedResponse,
  ArticleListWithCursorSchema,
} from '@folio/shared';

describe('Cursor Schema', () => {
  it('should validate correct cursor', () => {
    const cursor = {
      id: 'article-123',
      publishedAt: '2026-06-03T12:00:00.000Z',
    };

    const result = CursorSchema.safeParse(cursor);
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const cursor = {
      id: 'article-123',
      publishedAt: 'not-a-date',
    };

    const result = CursorSchema.safeParse(cursor);
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const cursor = {
      publishedAt: '2026-06-03T12:00:00.000Z',
    };

    const result = CursorSchema.safeParse(cursor);
    expect(result.success).toBe(false);
  });
});

describe('CursorPaginationInput Schema', () => {
  it('should accept empty input with defaults', () => {
    const input = {};

    const result = CursorPaginationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBeUndefined();
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept valid cursor and limit', () => {
    const input = {
      cursor: {
        id: 'article-123',
        publishedAt: '2026-06-03T12:00:00.000Z',
      },
      limit: 50,
    };

    const result = CursorPaginationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject limit over 100', () => {
    const input = {
      limit: 150,
    };

    const result = CursorPaginationInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const input = {
      limit: 0,
    };

    const result = CursorPaginationInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('createPaginatedResponse', () => {
  it('should create response without next cursor when hasMore is false', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result = createPaginatedResponse(items, false, undefined, 10);

    expect(result.items).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeUndefined();
    expect(result.meta.total).toBe(10);
  });

  it('should create response with next cursor when hasMore is true', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const nextCursor = { id: '2', publishedAt: '2026-06-03T12:00:00.000Z' };

    const result = createPaginatedResponse(items, true, nextCursor);

    expect(result.items).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toEqual(nextCursor);
  });

  it('should not include total when not provided', () => {
    const items = [{ id: '1' }];
    const result = createPaginatedResponse(items, false);

    expect(result.meta.total).toBeUndefined();
  });
});

describe('ArticleListWithCursorSchema', () => {
  it('should accept valid article list query', () => {
    const query = {
      sourceId: 'feed-123',
      cursor: {
        id: 'article-456',
        publishedAt: '2026-06-03T12:00:00.000Z',
      },
      limit: 20,
    };

    const result = ArticleListWithCursorSchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should accept query with status filter', () => {
    const query = {
      status: 'unread',
    };

    const result = ArticleListWithCursorSchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('unread');
    }
  });

  it('should reject invalid status', () => {
    const query = {
      status: 'invalid',
    };

    const result = ArticleListWithCursorSchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

describe('Cursor pagination logic', () => {
  it('should correctly determine hasMore', () => {
    const limit = 20;
    const fetchedRows = Array(21).fill({ id: 'test' }); // Simulating API response with extra row

    const hasMore = fetchedRows.length > limit;
    const items = hasMore ? fetchedRows.slice(0, -1) : fetchedRows;

    expect(hasMore).toBe(true);
    expect(items).toHaveLength(20);
  });

  it('should extract next cursor from last item', () => {
    const items = [
      { id: '1', published_at: '2026-06-03T12:00:00.000Z' },
      { id: '2', published_at: '2026-06-03T11:00:00.000Z' },
    ];

    const lastItem = items[items.length - 1];
    const nextCursor = {
      id: lastItem.id,
      publishedAt: lastItem.published_at,
    };

    expect(nextCursor.id).toBe('2');
    expect(nextCursor.publishedAt).toBe('2026-06-03T11:00:00.000Z');
  });

  it('should handle empty result', () => {
    const items: never[] = [];
    const hasMore = items.length > 20;

    expect(hasMore).toBe(false);
    expect(items).toHaveLength(0);
  });
});