'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { MessageSquare, Activity, Brain, CheckCircle, Zap, Settings, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Chat', href: '/chat', icon: MessageSquare },
  { label: 'Activities', href: '/activities', icon: Activity },
  { label: 'Memory', href: '/memory', icon: Brain },
  { label: 'Approvals', href: '/approvals', icon: CheckCircle },
  { label: 'Automations', href: '/automations', icon: Zap },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <aside className="glass-dark w-full h-full flex flex-col px-4 py-6 border-r border-white/10">
      {/* Logo */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center glow-purple">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-lg hidden sm:block">Axis</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200',
                isActive
                  ? 'nav-active bg-purple-600/10 text-accent-glow-bright'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon size={20} />
              <span className="hidden sm:block text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      {mounted && (
        <div className="border-t border-white/10 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className="hidden sm:block text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </Button>
        </div>
      )}
    </aside>
  )
}
