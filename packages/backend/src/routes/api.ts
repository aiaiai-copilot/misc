import { Router, Request, Response } from 'express';
import { PostgresRecordRepository } from '@misc-poc/infrastructure-postgresql';
import { RecordContent, RecordId, SearchQuery, TagId, generateTagUuid } from '@misc-poc/shared';
import { Record } from '@misc-poc/domain';
import { getDatabasePool } from '../services/database.js';
import { validateUuidParam, validateRecordBody, validateSearchQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Initialize repository
const getRecordRepository = (): PostgresRecordRepository => {
  const pool = getDatabasePool();
  return new PostgresRecordRepository(pool);
};

// GET /api/records - Search/list records with pagination
router.get('/records', validateSearchQuery, asyncHandler(async (req: Request, res: Response) => {
  const repository = getRecordRepository();
  const { q, limit = '100', offset = '0' } = req.query;

  const parsedLimit = parseInt(limit as string, 10);
  const parsedOffset = parseInt(offset as string, 10);

  let result;
  if (q && typeof q === 'string' && q.trim().length > 0) {
    const searchQuery = new SearchQuery(q);
    result = await repository.search(searchQuery, { limit: parsedLimit, offset: parsedOffset });
  } else {
    result = await repository.findAll({ limit: parsedLimit, offset: parsedOffset });
  }

  if (result.isErr()) {
    throw result.unwrapErr();
  }

  const searchResult = result.unwrap();
  res.json({
    records: searchResult.records.map(record => record.toJSON()),
    total: searchResult.total,
  });
}));

// POST /api/records - Create a new record
router.post('/records', validateRecordBody, asyncHandler(async (req: Request, res: Response) => {
  const repository = getRecordRepository();
  const { content } = req.body;

  // Create record content and extract tags from content
  const recordContent = new RecordContent(content);
  const tokens = recordContent.extractTokens();

  // Generate deterministic TagId for each token (same text = same UUID)
  const tagIds = new Set(tokens.map(token => new TagId(generateTagUuid(token))));

  // Check for duplicate records with same tag set
  const duplicateCheckResult = await repository.findByTagSet(tagIds);
  if (duplicateCheckResult.isErr()) {
    throw duplicateCheckResult.unwrapErr();
  }

  const duplicates = duplicateCheckResult.unwrap();
  if (duplicates.length > 0) {
    res.status(409).json({ error: 'Record already exists with this combination of tags' });
    return;
  }

  const record = Record.create(recordContent, tagIds);

  const result = await repository.save(record);

  if (result.isErr()) {
    throw result.unwrapErr();
  }

  const savedRecord = result.unwrap();
  res.status(201).json(savedRecord.toJSON());
}));

// PUT /api/records/:id - Update an existing record
router.put('/records/:id', validateUuidParam('id'), validateRecordBody, asyncHandler(async (req: Request, res: Response) => {
  const repository = getRecordRepository();
  const { id } = req.params;
  const { content } = req.body;

  const recordId = new RecordId(id!);

  // Find existing record
  const findResult = await repository.findById(recordId);
  if (findResult.isErr()) {
    throw findResult.unwrapErr();
  }

  const existingRecord = findResult.unwrap();
  if (!existingRecord) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  // Create new record with updated content and extract tags from new content
  const recordContent = new RecordContent(content);
  const tokens = recordContent.extractTokens();

  // Generate deterministic TagId for each token (same text = same UUID)
  const tagIds = new Set(tokens.map(token => new TagId(generateTagUuid(token))));

  // Check for duplicate records with same tag set (excluding current record)
  const duplicateCheckResult = await repository.findByTagSet(tagIds, recordId);
  if (duplicateCheckResult.isErr()) {
    throw duplicateCheckResult.unwrapErr();
  }

  const duplicates = duplicateCheckResult.unwrap();
  if (duplicates.length > 0) {
    res.status(409).json({ error: 'Record already exists with this combination of tags' });
    return;
  }

  const updatedRecord = new Record(
    existingRecord.id,
    recordContent,
    tagIds,
    existingRecord.createdAt,
    new Date()
  );

  const updateResult = await repository.update(updatedRecord);

  if (updateResult.isErr()) {
    throw updateResult.unwrapErr();
  }

  const savedRecord = updateResult.unwrap();
  res.json(savedRecord.toJSON());
}));

// DELETE /api/records/:id - Delete a record
router.delete('/records/:id', validateUuidParam('id'), asyncHandler(async (req: Request, res: Response) => {
  const repository = getRecordRepository();
  const { id } = req.params;

  const recordId = new RecordId(id!);

  const result = await repository.delete(recordId);

  if (result.isErr()) {
    throw result.unwrapErr();
  }

  res.status(204).send();
}));

// GET /api/tags - Get tag statistics for tag cloud
router.get('/tags', asyncHandler(async (_req: Request, res: Response) => {
  const repository = getRecordRepository();
  const result = await repository.getTagStatistics();

  if (result.isErr()) {
    throw result.unwrapErr();
  }

  const statistics = result.unwrap();
  res.json(statistics);
}));

export default router;
