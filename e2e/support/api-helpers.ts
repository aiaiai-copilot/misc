/**
 * API helper functions for E2E tests
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Clear all records from the database via API
 */
export async function clearAllRecords(): Promise<void> {
  try {
    // Get all records
    const response = await fetch(`${API_BASE_URL}/api/records?limit=1000`);
    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records || [];

    // Delete each record
    const deletePromises = records.map(async (record: { id: string }) => {
      const deleteResponse = await fetch(`${API_BASE_URL}/api/records/${record.id}`, {
        method: 'DELETE',
      });
      if (!deleteResponse.ok) {
        console.warn(`Failed to delete record ${record.id}: ${deleteResponse.statusText}`);
      }
    });

    await Promise.all(deletePromises);
    console.log(`Cleared ${records.length} records from database`);
  } catch (error) {
    console.error('Error clearing records:', error);
    throw error;
  }
}

/**
 * Verify backend is accessible
 */
export async function verifyBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/records?limit=1`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
