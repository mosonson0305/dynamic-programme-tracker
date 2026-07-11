import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import type { Project } from '../models'

describe('ProgrammeDB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('should create and retrieve a project', async () => {
    const project: Project = {
      id: 'p1',
      name: 'Test Project',
      dataDate: '2026-07-11',
      description: 'A test project',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    }

    await db.projects.add(project)
    const retrieved = await db.projects.get('p1')

    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('p1')
    expect(retrieved?.name).toBe('Test Project')
    expect(retrieved?.dataDate).toBe('2026-07-11')
  })
})
