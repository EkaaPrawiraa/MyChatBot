'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/chat')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-glow-bright mx-auto mb-4" />
        <p className="text-muted-foreground">Loading Axis Assistant...</p>
      </div>
    </div>
  )
}
