'use client'

import React from 'react'
import { useProfile, useUpdateProfile } from '@/src/hooks/use-profile'
import { useModels } from '@/src/hooks/use-models'
import { Sidebar } from '@/src/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: profile, isLoading: isLoadingProfile } = useProfile()
  const { data: models = [], isLoading: isLoadingModels } = useModels()
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile()

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    meetingHours: '',
    focusHours: '',
    communicationStyle: 'professional',
    workPattern: '9am-5pm',
  })

  const [showApiKey, setShowApiKey] = React.useState(false)
  const [apiKey, setApiKey] = React.useState('')
  const [selectedProvider, setSelectedProvider] = React.useState<string>('')
  const [selectedModel, setSelectedModel] = React.useState<string>('')

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        meetingHours: profile.meetingHours || '',
        focusHours: profile.focusHours || '',
        communicationStyle: profile.communicationStyle || 'professional',
        workPattern: profile.workPattern || '9am-5pm',
      })
    }
  }, [profile])

  const handleSaveProfile = () => {
    updateProfile(formData, {
      onSuccess: () => {
        toast.success('Profile updated successfully')
      },
      onError: () => {
        toast.error('Failed to update profile')
      },
    })
  }

  const uniqueProviders = Array.from(new Set(models.map((m) => m.provider)))
  const filteredModels = selectedProvider ? models.filter((m) => m.provider === selectedProvider) : []

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-glow-bright" />
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden lg:flex w-[280px] flex-col flex-shrink-0 border-r border-white/10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="glass-dark border-b border-white/10 px-6 py-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-2xl">
            {/* Profile Settings */}
            <Card className="glass-dark border-white/10">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Meeting Hours</Label>
                    <Input
                      value={formData.meetingHours}
                      onChange={(e) => setFormData({ ...formData, meetingHours: e.target.value })}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder="9am-12pm, 2pm-5pm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Focus Hours</Label>
                    <Input
                      value={formData.focusHours}
                      onChange={(e) => setFormData({ ...formData, focusHours: e.target.value })}
                      className="mt-1 bg-white/5 border-white/10"
                      placeholder="10am-12pm, 3pm-5pm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Communication Style</Label>
                    <Select value={formData.communicationStyle} onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Work Pattern</Label>
                    <Select value={formData.workPattern} onValueChange={(value) => setFormData({ ...formData, workPattern: value })}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9am-5pm">9am - 5pm</SelectItem>
                        <SelectItem value="8am-6pm">8am - 6pm</SelectItem>
                        <SelectItem value="10am-4pm">10am - 4pm</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                >
                  {isUpdating ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* AI Configuration */}
            <Card className="glass-dark border-white/10">
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingModels ? (
                          <SelectItem value="">Loading...</SelectItem>
                        ) : (
                          uniqueProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider.charAt(0).toUpperCase() + provider.slice(1)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedProvider}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 bg-white/5 border-white/10"
                      placeholder="Enter your API key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </Button>
                  </div>
                </div>

                {selectedModel && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Current Configuration</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Provider: <span className="text-accent-glow-bright">{selectedProvider}</span></p>
                      <p>Model: <span className="text-accent-glow-bright">{filteredModels.find((m) => m.id === selectedModel)?.name}</span></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
