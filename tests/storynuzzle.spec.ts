import { PDFDocument } from 'pdf-lib'
import { expect, test } from '@playwright/test'
import { makeStoryPages } from '../lib/story'
import { APICallError } from 'ai'
import { shouldRetryGeneration } from '../lib/generation-failures'
import path from 'node:path'

const guardianA = {
  email: process.env.STORYNUZZLE_E2E_GUARDIAN_A_EMAIL,
  password: process.env.STORYNUZZLE_E2E_GUARDIAN_A_PASSWORD,
}
const guardianB = {
  email: process.env.STORYNUZZLE_E2E_GUARDIAN_B_EMAIL,
  password: process.env.STORYNUZZLE_E2E_GUARDIAN_B_PASSWORD,
}
const liveE2EReady = Boolean(
  process.env.STORYNUZZLE_LIVE_E2E === 'true' && guardianA.email && guardianA.password && guardianB.email && guardianB.password,
)

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
}

test('provider failures are retried only when safe and within the automatic limit', () => {
  const transient = new APICallError({ message: 'temporary provider outage', url: 'https://gateway.invalid', requestBodyValues: {}, statusCode: 503, isRetryable: true })
  const permanent = new APICallError({ message: 'invalid request', url: 'https://gateway.invalid', requestBodyValues: {}, statusCode: 400, isRetryable: false })

  expect(shouldRetryGeneration(transient, 1)).toBe(true)
  expect(shouldRetryGeneration(transient, 3)).toBe(false)
  expect(shouldRetryGeneration(permanent, 1)).toBe(false)
})

test('the four fixed story scenes personalize name and pronouns', () => {
  const sheStory = makeStoryPages('Avery', 'she')
  const heStory = makeStoryPages('Avery', 'he')

  expect(sheStory).toHaveLength(4)
  expect(heStory).toHaveLength(4)
  expect(sheStory[2]).toContain('on her nose')
  expect(heStory[2]).toContain('on his nose')
  expect(sheStory.every((scene) => scene.includes('Avery'))).toBe(true)
})

test('the read-only sample is visibly separate and makes no live API requests', async ({ page }) => {
  const apiRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
  })

  await page.goto('/demo')
  await expect(page.getByText('Read-only sample')).toBeVisible()
  await expect(page.getByText(/does not upload a photo, call OpenAI, save data/)).toBeVisible()
  for (let scene = 1; scene <= 4; scene += 1) {
    await page.getByRole('button', { name: 'Next sample page' }).click()
    await expect(page.getByRole('heading', { name: `Scene ${scene}` })).toBeVisible()
  }
  expect(apiRequests).toHaveLength(0)
})

test('the guardian account screen is available without exposing private data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Their face in a story/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Preview the read-only sample' })).toBeVisible()
  await page.getByRole('link', { name: 'Sign in or create an account' }).click()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()

  await page.getByRole('button', { name: 'Create an account' }).click()
  await expect(page.getByRole('button', { name: 'Create guardian account' })).toBeVisible()
})

test('private generation, approval, four scenes, PDF, and cross-guardian isolation', async ({ page, browser }) => {
  test.skip(!liveE2EReady, 'Set STORYNUZZLE_LIVE_E2E=true and two confirmed test guardian accounts to run the live Vercel AI Gateway image-generation journey.')
  test.setTimeout(12 * 60 * 1000)

  await signIn(page, guardianA.email!, guardianA.password!)
  const invalidUpload = await page.request.post('/api/books', {
    multipart: {
      firstName: 'Avery',
      pronouns: 'she',
      guardianConsent: 'true',
      photo: { name: 'not-an-image.png', mimeType: 'image/png', buffer: Buffer.from('not an image') },
    },
  })
  expect(invalidUpload.status()).toBe(415)

  const nameField = page.getByLabel("Child's first name")
  await nameField.fill('Sky')
  await nameField.fill('Avery')
  const hePronouns = page.getByRole('radio', { name: 'He / him' })
  await hePronouns.check()
  await expect(hePronouns).toBeChecked()
  await page.getByRole('radio', { name: 'She / her' }).check()
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), 'tests/fixtures/fictional-child-photo.png'))
  await page.getByRole('button', { name: 'Create the character portrait' }).click()
  await expect(page.getByRole('alert')).toContainText('parent or legal guardian')
  await page.getByRole('checkbox').check()
  const firstGenerationResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/generate') && url.pathname.startsWith('/api/books/') && response.request().method() === 'POST'
  })
  await page.getByRole('button', { name: 'Create the character portrait' }).click()
  await expect(page).toHaveURL(/\/books\/[0-9a-f-]+$/)
  const bookId = page.url().split('/').at(-1)!
  const firstGenerationResponse = await firstGenerationResponsePromise
  expect(firstGenerationResponse.status()).toBe(202)
  const firstGeneration = await firstGenerationResponse.json()
  expect(firstGeneration.runId).toBeTruthy()

  const duplicateGenerationResponse = await page.request.post(`/api/books/${bookId}/generate`)
  expect([200, 202]).toContain(duplicateGenerationResponse.status())
  const duplicateGeneration = await duplicateGenerationResponse.json()
  if (duplicateGenerationResponse.status() === 202) expect(duplicateGeneration.runId).toBe(firstGeneration.runId)
  else expect(duplicateGeneration.status).toBe('completed')

  await page.reload()
  await expect(page.getByRole('heading', { name: "Avery's little book" })).toBeVisible()

  const secondContext = await browser.newContext()
  const secondGuardianPage = await secondContext.newPage()
  await signIn(secondGuardianPage, guardianB.email!, guardianB.password!)
  await secondGuardianPage.goto(`/books/${bookId}`)
  await expect(secondGuardianPage.getByRole('heading', { name: /That book isn\'t on this shelf/ })).toBeVisible()
  expect((await secondGuardianPage.request.get(`/api/books/${bookId}`)).status()).toBe(404)

  await expect(page.getByText('Portrait ready for your review')).toBeVisible({ timeout: 6 * 60 * 1000 })
  const portrait = page.getByRole('img', { name: /Approved character portrait of Avery/ })
  await expect(portrait).toBeVisible()
  await expect(portrait).toHaveAttribute('src', /storybook-assets/)
  await page.getByRole('button', { name: 'Approve and remove original photo' }).click()
  await expect(page.getByText('Story illustrations')).toBeVisible()

  const status = await page.request.get(`/api/books/${bookId}`)
  expect(status.ok()).toBe(true)
  expect((await status.json()).book.originalPhotoDeleted).toBe(true)

  await page.getByRole('button', { name: 'Create the four story scenes' }).click()
  await expect(page.getByText('Your story is ready')).toBeVisible({ timeout: 10 * 60 * 1000 })
  const savedBook = await (await page.request.get(`/api/books/${bookId}`)).json()
  expect(savedBook.pages).toHaveLength(4)
  expect(savedBook.pages.every((scene: { illustrationUrl: string | null }) => Boolean(scene.illustrationUrl))).toBe(true)

  for (let scene = 1; scene <= 4; scene += 1) {
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByRole('heading', { name: `Scene ${scene}` })).toBeVisible()
    await expect(page.getByText(savedBook.pages[scene - 1].sceneText)).toBeVisible()
    await expect(page.getByRole('img', { name: `Illustration for scene ${scene} in Avery's story` })).toBeVisible()
  }

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download the book PDF' }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  const pdf = await PDFDocument.load(Buffer.concat(chunks))
  expect(pdf.getPageCount()).toBe(5)

  expect((await secondGuardianPage.request.get(`/api/books/${bookId}/pdf`)).status()).toBe(404)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete this book and its private assets' }).click()
  await expect(page).toHaveURL('/')
  await secondContext.close()
})
