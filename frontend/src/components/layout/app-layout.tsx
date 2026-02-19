'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { SIDEBAR_WIDTH } from '@/lib/constants'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  showSearch?: boolean
  onSearchChange?: (value: string) => void
}

export function AppLayout({ children, title, showSearch, onSearchChange }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-[280px] flex-col flex-shrink-0 border-r border-white/10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header
            title={title}
            showSearch={showSearch}
            onSearchChange={onSearchChange}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
