import { expect, test } from '@playwright/test'

test('sandbox demo mounts, updates through the VM path, and swaps examples', async ({
  page,
}) => {
  await page.goto('/')

  const status = page.locator('[data-status]')
  await expect(status).toContainText('Mounted')

  const preview = page.locator('[data-preview]')
  const counterButton = preview.locator('button')
  await expect(counterButton).toHaveText(/Clicked 0/)

  await counterButton.click()
  await expect(counterButton).toHaveText(/Clicked 1/)

  await page.getByRole('button', { name: 'Split Files' }).click()
  await page.getByRole('button', { name: 'Mount Fresh' }).click()
  await expect(status).toContainText('Mounted "Split Files"')

  const splitButton = preview.locator('button')
  const splitCount = preview.locator('span')

  await expect(splitCount).toHaveText('0')
  await splitButton.click()
  await expect(splitCount).toHaveText('1')
})
