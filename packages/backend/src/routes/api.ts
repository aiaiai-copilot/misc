import { Router, Request, Response } from 'express';
import { PostgresRecordRepository } from '@misc-poc/infrastructure-postgresql';
import { RecordContent, RecordId, SearchQuery } from '@misc-poc/shared';
import { Record } from '@misc-poc/domain';
import { getDatabasePool } from '../services/database.js';

const router = Router();

// Initialize repository
const getRecordRepository = (): PostgresRecordRepository => {
  const pool = getDatabasePool();
  return new PostgresRecordRepository(pool);
};

// GET /api/records - Search/list records with pagination
router.get('/records', async (req: Request, res: Response) => {
  try {
    const repository = getRecordRepository();
    const { q, limit = '100', offset = '0' } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (isNaN(parsedLimit) || parsedLimit < 0) {
      res.status(400).json({ error: 'Invalid limit parameter' });
      return;
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(400).json({ error: 'Invalid offset parameter' });
      return;
    }

    let result;
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchQuery = new SearchQuery(q);
      result = await repository.search(searchQuery, { limit: parsedLimit, offset: parsedOffset });
    } else {
      result = await repository.findAll({ limit: parsedLimit, offset: parsedOffset });
    }

    if (result.isErr()) {
      const error = result.unwrapErr();
      res.status(500).json({ error: error.message });
      return;
    }

    const searchResult = result.unwrap();
    res.json({
      records: searchResult.records.map(record => record.toJSON()),
      total: searchResult.total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to fetch records: ${message}` });
  }
});

// POST /api/records - Create a new record
router.post('/records', async (req: Request, res: Response) => {
  try {
    const repository = getRecordRepository();
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required and must be a string' });
      return;
    }

    // Create record content and extract tag IDs from content
    const recordContent = new RecordContent(content);

    // For now, create record with empty tag set (tag extraction will be handled in future tasks)
    const record = Record.create(recordContent, new Set());

    const result = await repository.save(record);

    if (result.isErr()) {
      const error = result.unwrapErr();
      res.status(500).json({ error: error.message });
      return;
    }

    const savedRecord = result.unwrap();
    res.status(201).json(savedRecord.toJSON());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: `Failed to create record: ${message}` });
  }
});

// PUT /api/records/:id - Update an existing record
router.put('/records/:id', async (req: Request, res: Response) => {
  try {
    const repository = getRecordRepository();
    const { id } = req.params;
    const { content } = req.body;

    // Validate UUID
    let recordId: RecordId;
    try {
      recordId = new RecordId(id);
    } catch {
      res.status(400).json({ error: 'Invalid record ID format' });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required and must be a string' });
      return;
    }

    // Find existing record
    const findResult = await repository.findById(recordId);
    if (findResult.isErr()) {
      res.status(500).json({ error: findResult.unwrapErr().message });
      return;
    }

    const existingRecord = findResult.unwrap();
    if (!existingRecord) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    // Create new record with updated content but same tags
    const recordContent = new RecordContent(content);
    const updatedRecord = new Record(
      existingRecord.id,
      recordContent,
      existingRecord.tagIds,
      existingRecord.createdAt,
      new Date()
    );

    const updateResult = await repository.update(updatedRecord);

    if (updateResult.isErr()) {
      const error = updateResult.unwrapErr();
      res.status(500).json({ error: error.message });
      return;
    }

    const savedRecord = updateResult.unwrap();
    res.json(savedRecord.toJSON());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: `Failed to update record: ${message}` });
  }
});

// DELETE /api/records/:id - Delete a record
router.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    const repository = getRecordRepository();
    const { id } = req.params;

    // Validate UUID
    let recordId: RecordId;
    try {
      recordId = new RecordId(id);
    } catch {
      res.status(400).json({ error: 'Invalid record ID format' });
      return;
    }

    const result = await repository.delete(recordId);

    if (result.isErr()) {
      const error = result.unwrapErr();
      if (error.code === 'RECORD_NOT_FOUND') {
        res.status(404).json({ error: 'Record not found' });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to delete record: ${message}` });
  }
});

// GET /api/tags - Get tag statistics for tag cloud
router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const repository = getRecordRepository();
    const result = await repository.getTagStatistics();

    if (result.isErr()) {
      const error = result.unwrapErr();
      res.status(500).json({ error: error.message });
      return;
    }

    const statistics = result.unwrap();
    res.json(statistics);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to fetch tag statistics: ${message}` });
  }
});

export default router;
