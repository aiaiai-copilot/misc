import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
import { useRecordsIntegrated } from '../useRecordsIntegrated.js'
import { useApplicationContext } from '../../contexts/ApplicationContext.js'
import { Ok, Err } from '@misc-poc/shared'
import { DomainError } from '@misc-poc/domain'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('../../contexts/ApplicationContext')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}))

const mockCreateRecordUseCase = {
  execute: vi.fn(),
}

const mockUpdateRecordUseCase = {
  execute: vi.fn(),
}

const mockDeleteRecordUseCase = {
  execute: vi.fn(),
}

const mockSearchRecordsUseCase = {
  execute: vi.fn(),
}

const mockApplicationContext = {
  createRecordUseCase: mockCreateRecordUseCase,
  searchRecordsUseCase: mockSearchRecordsUseCase,
  updateRecordUseCase: mockUpdateRecordUseCase,
  deleteRecordUseCase: mockDeleteRecordUseCase,
  getTagSuggestionsUseCase: null,
  exportDataUseCase: null,
  importDataUseCase: null,
}

describe('useRecordsIntegrated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useApplicationContext as Mock).mockReturnValue(mockApplicationContext)
  })

  describe('initialization', () => {
    it('should load initial records on mount', async () => {
      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'tag1 tag2',
            tagIds: new Set(['tag1', 'tag2']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }

      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1)
        expect(result.current.records[0].id).toBe('record-1')
        expect(result.current.records[0].tags).toEqual(['tag1', 'tag2'])
      })
    })

    it('should handle search initialization error', async () => {
      const error = new DomainError('SEARCH_ERROR', 'Search failed')
      mockSearchRecordsUseCase.execute.mockResolvedValue(Err(error))

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.records).toHaveLength(0)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should show error toast when initial load fails', async () => {
      const error = new DomainError('SEARCH_ERROR', 'Database connection failed')
      mockSearchRecordsUseCase.execute.mockResolvedValue(Err(error))

      renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load records: Database connection failed')
      })
    })
  })

  describe('createRecord', () => {
    it('should create a new record successfully', async () => {
      const mockRecordResponse = {
        record: {
          id: 'new-record',
          content: 'new tag',
          tagIds: new Set(['new', 'tag']),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      mockCreateRecordUseCase.execute.mockResolvedValue(Ok(mockRecordResponse))
      
      // Mock empty search result for initialization
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: { records: [], total: 0, hasMore: false } })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.createRecord(['new', 'tag'])
      })

      expect(success!).toBe(true)
      expect(mockCreateRecordUseCase.execute).toHaveBeenCalledWith({
        content: 'new tag'
      })

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1)
        expect(result.current.records[0].tags).toEqual(['new', 'tag'])
      })
    })

    it('should handle duplicate record creation', async () => {
      const error = new DomainError('DUPLICATE_RECORD', 'Record already exists')
      mockCreateRecordUseCase.execute.mockResolvedValue(Err(error))

      // Mock empty search result for initialization
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: { records: [], total: 0, hasMore: false } })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.createRecord(['duplicate', 'tag'])
      })

      expect(success!).toBe(false)
    })

    it('should show error toast for duplicate record', async () => {
      const error = new DomainError('DUPLICATE_RECORD', 'Record already exists')
      mockCreateRecordUseCase.execute.mockResolvedValue(Err(error))

      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: { records: [], total: 0, hasMore: false } })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.createRecord(['duplicate', 'tag'])
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Record with these tags already exists')
      })
    })

    it('should show error toast for create failures', async () => {
      const error = new DomainError('CREATE_ERROR', 'Database write failed')
      mockCreateRecordUseCase.execute.mockResolvedValue(Err(error))

      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: { records: [], total: 0, hasMore: false } })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.createRecord(['new', 'tag'])
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create record: Database write failed')
      })
    })
  })

  describe('updateRecord', () => {
    it('should update an existing record successfully', async () => {
      const mockUpdateResponse = {
        record: {
          id: 'record-1',
          content: 'updated tags',
          tagIds: new Set(['updated', 'tags']),
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date(),
        }
      }

      mockUpdateRecordUseCase.execute.mockResolvedValue(Ok(mockUpdateResponse))

      // Mock search result with existing record for initialization
      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'old tags',
            tagIds: new Set(['old', 'tags']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.updateRecord('record-1', ['updated', 'tags'])
      })

      expect(success!).toBe(true)
      expect(mockUpdateRecordUseCase.execute).toHaveBeenCalledWith({
        id: 'record-1',
        content: 'updated tags'
      })

      await waitFor(() => {
        expect(result.current.records[0].tags).toEqual(['updated', 'tags'])
      })
    })

    it('should show error toast when update fails', async () => {
      const error = new DomainError('UPDATE_ERROR', 'Record not found')
      mockUpdateRecordUseCase.execute.mockResolvedValue(Err(error))

      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'old tags',
            tagIds: new Set(['old', 'tags']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => expect(result.current.records).toHaveLength(1))

      await act(async () => {
        try {
          await result.current.updateRecord('record-1', ['updated', 'tags'])
        } catch {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update record: Record not found')
      })
    })
  })

  describe('deleteRecord', () => {
    it('should delete a record successfully', async () => {
      const mockDeleteResponse = {
        deletedRecordId: 'record-1',
        deletedOrphanedTags: [],
      }

      mockDeleteRecordUseCase.execute.mockResolvedValue(Ok(mockDeleteResponse))

      // Mock search result with existing record for initialization
      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'tag1 tag2',
            tagIds: new Set(['tag1', 'tag2']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.deleteRecord('record-1')
      })

      expect(success!).toBe(true)
      expect(mockDeleteRecordUseCase.execute).toHaveBeenCalledWith({
        id: 'record-1'
      })

      await waitFor(() => {
        expect(result.current.records).toHaveLength(0)
      })
    })

    it('should show info toast when record already deleted', async () => {
      const error = new DomainError('RECORD_NOT_FOUND', 'Record not found')
      mockDeleteRecordUseCase.execute.mockResolvedValue(Err(error))

      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'tag1 tag2',
            tagIds: new Set(['tag1', 'tag2']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => expect(result.current.records).toHaveLength(1))

      await act(async () => {
        await result.current.deleteRecord('record-1')
      })

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Record was already deleted')
      })
    })

    it('should show error toast when delete fails', async () => {
      const error = new DomainError('DELETE_ERROR', 'Database error')
      mockDeleteRecordUseCase.execute.mockResolvedValue(Err(error))

      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'tag1 tag2',
            tagIds: new Set(['tag1', 'tag2']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          }
        ],
        total: 1,
        hasMore: false,
      }
      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => expect(result.current.records).toHaveLength(1))

      await act(async () => {
        await result.current.deleteRecord('record-1')
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete record: Database error')
      })
    })
  })

  describe('filtering and search', () => {
    it('should filter records based on search query', async () => {
      const mockSearchResult = {
        records: [
          {
            id: 'record-1',
            content: 'javascript react',
            tagIds: new Set(['javascript', 'react']),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          },
          {
            id: 'record-2',
            content: 'python django',
            tagIds: new Set(['python', 'django']),
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02'),
          }
        ],
        total: 2,
        hasMore: false,
      }

      mockSearchRecordsUseCase.execute.mockResolvedValue(
        Ok({ searchResult: mockSearchResult })
      )

      const { result } = renderHook(() => useRecordsIntegrated())

      await waitFor(() => {
        expect(result.current.records).toHaveLength(2)
      })

      // Test filtering
      act(() => {
        result.current.setSearchQuery('javascript')
      })

      await waitFor(() => {
        expect(result.current.filteredRecords).toHaveLength(1)
        expect(result.current.filteredRecords[0].tags).toContain('javascript')
      })
    })
  })
})