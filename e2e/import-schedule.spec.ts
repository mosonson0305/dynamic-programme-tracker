import { test, expect } from '@playwright/test'

const sampleCSV = `WBS Code,Activity Name,Duration,Start Date,Finish Date,Predecessors,Relation,Lag,Constraint,Constraint Date,Milestone
1,Design Phase,30,2026-08-01,2026-08-31,,,,,,N
1.1,Schematic Design,10,,,,,,,Y
1.2,Design Development,15,,,1.1,FS,0,,,,N
1.3,Construction Documents,20,,,1.2,FS,0,,,,N
`

test('import CSV and verify Gantt + Dashboard', async ({ page }) => {
  await page.goto('/')

  // Fill project name
  await page.getByPlaceholder('e.g. City Center Phase 2').fill('E2E Test')

  // Paste CSV content
  await page.locator('textarea').fill(sampleCSV)

  // Click import
  await page.click('button:has-text("Import CSV")')

  // After import, store auto-switches to Gantt tab — verify activity names in chart
  await expect(page.locator('text=Schematic Design')).toBeVisible({ timeout: 10000 })

  // Verify other activities are also rendered
  await expect(page.locator('text=Design Phase')).toBeVisible()
  await expect(page.locator('text=Design Development')).toBeVisible()

  // Switch to Dashboard tab
  await page.click('button:has-text("Dashboard")')

  // Verify dashboard content
  await expect(page.locator('text=Project Health Dashboard')).toBeVisible()
  await expect(page.locator('text=Overall % Complete')).toBeVisible()
})
