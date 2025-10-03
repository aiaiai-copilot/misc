/**
 * API-based implementation of TagRepository
 *
 * Note: The backend API doesn't have dedicated tag endpoints, so this implementation
 * derives tag information from records and tag statistics.
 */

import {
  TagRepository,
  TagSearchOptions,
  TagUsageInfo,
  TagSuggestion,
} from '@misc-poc/application';
import { Tag, DomainError } from '@misc-poc/domain';
import { Result, Ok, TagId } from '@misc-poc/shared';
import { ApiError } from './api-record-repository.js';

export interface TagStatistic {
  tag: string;
  count: number;
}

export interface ApiClient {
  getTagStatistics(): Promise<Result<TagStatistic[], ApiError>>;
}

export class ApiTagRepository implements TagRepository {
  private tagCache: Map<string, Tag> = new Map();
  private usageCache: Map<string, number> = new Map();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(private readonly apiClient: ApiClient) {}

  async findById(id: TagId): Promise<Result<Tag | null, DomainError>> {
    await this.refreshCacheIfNeeded();

    const tag = Array.from(this.tagCache.values()).find(t => t.id.equals(id));
    return Ok(tag ?? null);
  }

  async findByNormalizedValue(
    normalizedValue: string
  ): Promise<Result<Tag | null, DomainError>> {
    await this.refreshCacheIfNeeded();

    const tag = this.tagCache.get(normalizedValue.toLowerCase());
    return Ok(tag ?? null);
  }

  async findByNormalizedValues(
    normalizedValues: string[]
  ): Promise<Result<Tag[], DomainError>> {
    await this.refreshCacheIfNeeded();

    const tags: Tag[] = [];
    for (const value of normalizedValues) {
      const tag = this.tagCache.get(value.toLowerCase());
      if (tag) {
        tags.push(tag);
      }
    }

    return Ok(tags);
  }

  async findAll(options?: TagSearchOptions): Promise<Result<Tag[], DomainError>> {
    await this.refreshCacheIfNeeded();

    let tags = Array.from(this.tagCache.values());

    // Apply sorting
    if (options?.sortBy === 'usage') {
      tags = tags.sort((a, b) => {
        const usageA = this.usageCache.get(a.normalizedValue) ?? 0;
        const usageB = this.usageCache.get(b.normalizedValue) ?? 0;
        const diff = options?.sortOrder === 'asc' ? usageA - usageB : usageB - usageA;
        return diff !== 0 ? diff : a.normalizedValue.localeCompare(b.normalizedValue);
      });
    } else {
      // Sort by normalized value
      tags = tags.sort((a, b) => {
        const cmp = a.normalizedValue.localeCompare(b.normalizedValue);
        return options?.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Apply pagination
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? tags.length;
      tags = tags.slice(offset, offset + limit);
    }

    return Ok(tags);
  }

  async findByPrefix(
    prefix: string,
    limit?: number
  ): Promise<Result<TagSuggestion[], DomainError>> {
    await this.refreshCacheIfNeeded();

    const lowerPrefix = prefix.toLowerCase();
    const suggestions: TagSuggestion[] = [];

    for (const tag of this.tagCache.values()) {
      if (tag.normalizedValue.toLowerCase().startsWith(lowerPrefix)) {
        const matchScore = this.calculateMatchScore(tag.normalizedValue, lowerPrefix);
        suggestions.push({ tag, matchScore });
      }
    }

    // Sort by match score (higher is better)
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    // Apply limit
    if (limit !== undefined) {
      return Ok(suggestions.slice(0, limit));
    }

    return Ok(suggestions);
  }

  async getUsageInfo(
    options?: TagSearchOptions
  ): Promise<Result<TagUsageInfo[], DomainError>> {
    await this.refreshCacheIfNeeded();

    const usageInfos: TagUsageInfo[] = [];

    for (const tag of this.tagCache.values()) {
      const usageCount = this.usageCache.get(tag.normalizedValue) ?? 0;
      usageInfos.push({ tag, usageCount });
    }

    // Apply sorting
    if (options?.sortBy === 'usage') {
      usageInfos.sort((a, b) => {
        const diff = options?.sortOrder === 'asc'
          ? a.usageCount - b.usageCount
          : b.usageCount - a.usageCount;
        return diff !== 0 ? diff : a.tag.normalizedValue.localeCompare(b.tag.normalizedValue);
      });
    } else {
      usageInfos.sort((a, b) => {
        const cmp = a.tag.normalizedValue.localeCompare(b.tag.normalizedValue);
        return options?.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Apply pagination
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? usageInfos.length;
      return Ok(usageInfos.slice(offset, offset + limit));
    }

    return Ok(usageInfos);
  }

  async findOrphaned(): Promise<Result<Tag[], DomainError>> {
    await this.refreshCacheIfNeeded();

    // Tags with 0 usage count are orphaned
    const orphaned: Tag[] = [];

    for (const tag of this.tagCache.values()) {
      const usageCount = this.usageCache.get(tag.normalizedValue) ?? 0;
      if (usageCount === 0) {
        orphaned.push(tag);
      }
    }

    return Ok(orphaned);
  }

  async save(tag: Tag): Promise<Result<Tag, DomainError>> {
    // Tags are created implicitly through records, so we just cache it
    this.tagCache.set(tag.normalizedValue, tag);
    return Ok(tag);
  }

  async update(tag: Tag): Promise<Result<Tag, DomainError>> {
    // Tags are immutable in the API, so we just update the cache
    this.tagCache.set(tag.normalizedValue, tag);
    return Ok(tag);
  }

  async delete(id: TagId): Promise<Result<void, DomainError>> {
    // Find and remove from cache
    for (const [key, tag] of this.tagCache.entries()) {
      if (tag.id.equals(id)) {
        this.tagCache.delete(key);
        this.usageCache.delete(tag.normalizedValue);
        break;
      }
    }
    return Ok(undefined);
  }

  async deleteBatch(ids: TagId[]): Promise<Result<void, DomainError>> {
    for (const id of ids) {
      const result = await this.delete(id);
      if (result.isErr()) {
        return result;
      }
    }
    return Ok(undefined);
  }

  async saveBatch(tags: Tag[]): Promise<Result<Tag[], DomainError>> {
    for (const tag of tags) {
      this.tagCache.set(tag.normalizedValue, tag);
    }
    return Ok(tags);
  }

  async deleteAll(): Promise<Result<void, DomainError>> {
    this.tagCache.clear();
    this.usageCache.clear();
    return Ok(undefined);
  }

  async count(): Promise<Result<number, DomainError>> {
    await this.refreshCacheIfNeeded();
    return Ok(this.tagCache.size);
  }

  async existsByNormalizedValue(
    normalizedValue: string
  ): Promise<Result<boolean, DomainError>> {
    await this.refreshCacheIfNeeded();
    return Ok(this.tagCache.has(normalizedValue.toLowerCase()));
  }

  async exists(id: TagId): Promise<Result<boolean, DomainError>> {
    await this.refreshCacheIfNeeded();

    for (const tag of this.tagCache.values()) {
      if (tag.id.equals(id)) {
        return Ok(true);
      }
    }

    return Ok(false);
  }

  async getUsageCount(id: TagId): Promise<Result<number, DomainError>> {
    await this.refreshCacheIfNeeded();

    for (const tag of this.tagCache.values()) {
      if (tag.id.equals(id)) {
        const count = this.usageCache.get(tag.normalizedValue) ?? 0;
        return Ok(count);
      }
    }

    return Ok(0);
  }

  /**
   * Refresh cache from API if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.CACHE_TTL) {
      return;
    }

    const result = await this.apiClient.getTagStatistics();
    if (result.isErr()) {
      // Keep using stale cache on error
      console.error('Failed to refresh tag cache:', result.unwrapErr());
      return;
    }

    const statistics = result.unwrap();

    // Update cache
    this.tagCache.clear();
    this.usageCache.clear();

    for (const stat of statistics) {
      const tag = Tag.create(stat.tag);
      this.tagCache.set(stat.tag, tag);
      this.usageCache.set(stat.tag, stat.count);
    }

    this.lastCacheUpdate = now;
  }

  /**
   * Calculate match score for autocomplete suggestions
   */
  private calculateMatchScore(normalizedValue: string, prefix: string): number {
    const lower = normalizedValue.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();

    // Exact match
    if (lower === lowerPrefix) {
      return 100;
    }

    // Starts with prefix
    if (lower.startsWith(lowerPrefix)) {
      // Shorter matches score higher
      const lengthRatio = lowerPrefix.length / lower.length;
      return 50 + (lengthRatio * 49);
    }

    return 0;
  }
}
