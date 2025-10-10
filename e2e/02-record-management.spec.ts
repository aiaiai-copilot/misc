import { test, expect } from '@playwright/test';
import { MiscPage } from './support/page-objects/MiscPage';

test.describe('Record Management', () => {
  let miscPage: MiscPage;

  test.beforeEach(async ({ page }) => {
    miscPage = new MiscPage(page);
    await miscPage.goto();
    await miscPage.clearLocalStorage();
    // Reload page to ensure clean UI state after database clear
    await miscPage.goto();
  });

  test('Creating multiple records', async ({ page: _page }) => {
    // Given the input field is empty
    await expect(miscPage.inputField).toHaveValue('');

    // When I create multiple records
    await miscPage.createRecord('проект deadline понедельник');
    await miscPage.createRecord('покупки молоко хлеб');
    await miscPage.createRecord('идея startup мобильное приложение');

    // Then I should have 3 records in total
    const recordCount = await miscPage.getRecordCount();
    expect(recordCount).toBe(3);

    // And each record should be saved with its original tag order
    const records = await miscPage.getVisibleRecords();
    expect(records).toContain('проект deadline понедельник');
    expect(records).toContain('покупки молоко хлеб');
    expect(records).toContain('идея startup мобильное приложение');
  });

  test('Editing an existing record', async ({ page: _page }) => {
    // Given I have a record
    await miscPage.createRecord('встреча Петров 15:00');

    // When I search for it
    await miscPage.searchFor('встреча');
    await miscPage.waitForSearchResults();

    // And I click on the record
    await miscPage.clickRecord(0);

    // Then the record content should load in the input field
    await expect(miscPage.inputField).toHaveValue('встреча Петров 15:00');

    // Verify we're in edit mode by checking for the "Editing record" indicator
    const editIndicator = miscPage.page.locator('text=Editing record:');
    await expect(editIndicator).toBeVisible();

    // When I modify it - use fill which clears automatically
    await miscPage.inputField.fill('встреча Петров 16:00 перенос');
    await miscPage.inputField.press('Enter');

    // Wait for the update to complete
    await miscPage.waitForInputToClear();

    // Then the record should be updated
    await miscPage.searchFor('Петров');
    await miscPage.waitForSearchResults();

    const records = await miscPage.getVisibleRecords();
    expect(records.some(record => record.includes('16:00 перенос'))).toBe(true);
  });

  test('Deleting a record', async ({ page: _page }) => {
    // Given I have a record
    await miscPage.createRecord('старая задача');

    // When I search for it and delete it
    await miscPage.searchFor('старая');
    await miscPage.waitForSearchResults();
    await miscPage.selectRecordWithKeyboard(0);
    await miscPage.deleteSelectedRecord();

    // Then it should not appear in search results
    await miscPage.searchFor('старая');
    await miscPage.waitForSearchResults();

    const hasNoResults = await miscPage.hasNoResults();
    expect(hasNoResults).toBe(true);
  });

  test('Record uniqueness by tag set', async ({ page: _page, browserName }) => {
    // Use browser-specific tags to avoid conflicts between parallel test runs
    const uniqueId = `${browserName}-${Date.now()}`;
    const tag1 = `проект-${uniqueId}`;
    const tag2 = 'дедлайн';
    const tag3 = 'понедельник';

    // Given I have a record
    const originalOrder = `${tag1} ${tag2} ${tag3}`;
    await miscPage.createRecord(originalOrder);

    // Wait for search results to show the created record (search for the unique tag to filter out other tests' records)
    await miscPage.searchFor(tag1);
    await miscPage.waitForSearchResults();

    let initialCount = await miscPage.getRecordCount();
    expect(initialCount).toBe(1);

    // When I try to create a duplicate with different order
    const differentOrder = `${tag3} ${tag1} ${tag2}`;
    await miscPage.inputField.fill(differentOrder);
    await miscPage.inputField.press('Enter');

    // The input might not clear automatically for duplicate records,
    // so let's wait a moment and check the result
    await miscPage.page.waitForTimeout(500);

    // Search for the unique tag again to filter results
    await miscPage.searchFor(tag1);
    await miscPage.waitForSearchResults();

    // Then the system should recognize it as a duplicate
    const finalCount = await miscPage.getRecordCount();
    expect(finalCount).toBe(1); // No new record should be created

    // Check the existing record (behavior may vary - either keeps original order or updates to new order)
    const records = await miscPage.getVisibleRecords();
    // The app might either keep the original order or update to the new input order
    const expectedPattern = new RegExp(`^(${tag1} ${tag2} ${tag3}|${tag3} ${tag1} ${tag2})$`);
    expect(records[0]).toMatch(expectedPattern);
  });
});