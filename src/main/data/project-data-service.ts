import type { Project } from '@/shared/types'
import { validateProjectName } from '@/shared/naming'
import { deleteProjectWorkspace, ensureProjectWorkspace } from '../workspace-service'
import { enqueueWrite, readActiveMetadata, readMetadata, requireVaultPath, writeMetadata } from './repository-context'

export async function getProjects(): Promise<Project[]> {
  return (await readActiveMetadata()).projects
}

export async function createProject(name: string): Promise<Project> {
  const normalizedName = validateProjectName(name)
  const createdProject: Project = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: Date.now()
  }

  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    metadata.projects.unshift(createdProject)
    await writeMetadata(vaultPath, metadata)
  })

  await ensureProjectWorkspace(createdProject.id)
  return createdProject
}

export async function updateProject(id: string, name: string): Promise<Project> {
  const normalizedName = validateProjectName(name)

  return enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const project = metadata.projects.find((entry) => entry.id === id)

    if (!project) {
      throw new Error('Project not found')
    }

    project.name = normalizedName
    await writeMetadata(vaultPath, metadata)
    return { ...project }
  })
}

export async function deleteProject(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)

    metadata.projects = metadata.projects.filter((project) => project.id !== id)
    metadata.dumps = metadata.dumps.map((dump) => (
      dump.projectId === id
        ? { ...dump, projectId: null, updatedAt: Date.now() }
        : dump
    ))
    metadata.summaries = metadata.summaries.filter((summary) => summary.projectId !== id)

    await writeMetadata(vaultPath, metadata)
  })

  await deleteProjectWorkspace(id)
}
