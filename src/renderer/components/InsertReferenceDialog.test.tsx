import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { InsertReferenceDialog } from './InsertReferenceDialog'
import { renderWithPrompt } from '../test-utils'
import { mockElectronAPI } from '../lib/mock-electron-api'

describe('InsertReferenceDialog', () => {
  const previousElectronAPI = window.electronAPI

  beforeEach(() => {
    window.electronAPI = {
      ...mockElectronAPI,
      ui: {
        ...mockElectronAPI.ui,
        getLocale: async () => 'zh-CN',
        setLocale: async (locale) => locale,
        getSystemLocale: async () => 'zh-CN'
      }
    }
  })

  afterEach(() => {
    window.electronAPI = previousElectronAPI
  })

  it('renders the insert reference dialog in Chinese', async () => {
    renderWithPrompt(
      <InsertReferenceDialog
        open={true}
        projects={[{ id: 'project-1', name: '项目 A', createdAt: 1 }]}
        selectedProjectId="project-1"
        selectedNotePath="新建文件夹/新建笔记.md"
        noteOptions={[{ path: '新建文件夹/新建笔记.md', label: '新建文件夹/新建笔记.md' }]}
        isLoadingNotes={false}
        onProjectChange={() => {}}
        onNoteChange={() => {}}
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )

    expect(await screen.findByText('选择目标笔记')).toBeInTheDocument()
    expect(screen.getByText('选择要插入这些 dump 引用的项目笔记。')).toBeInTheDocument()
    expect(screen.getByText('项目')).toBeInTheDocument()
    expect(screen.getByText('笔记')).toBeInTheDocument()
    expect(screen.getByText('引用会追加到 项目 A / 新建文件夹/新建笔记.md。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '插入引用' })).toBeInTheDocument()
  })
})
