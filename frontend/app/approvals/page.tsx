'use client'

import React from 'react'
import { useApprovals, useApproveApproval, useRejectApproval } from '@/src/hooks/use-approvals'
import { Sidebar } from '@/src/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export default function ApprovalsPage() {
  const { data: approvals = [], isLoading } = useApprovals()
  const [feedbackId, setFeedbackId] = React.useState<string | null>(null)
  const [feedbackText, setFeedbackText] = React.useState('')

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')

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
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-accent-glow-bright" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No pending approvals</p>
              <p className="text-sm">All approvals are up to date</p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-2xl">
              {pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  isEditingFeedback={feedbackId === approval.id}
                  feedbackText={feedbackId === approval.id ? feedbackText : ''}
                  onFeedbackChange={(text) => {
                    setFeedbackId(approval.id)
                    setFeedbackText(text)
                  }}
                  onCancelFeedback={() => {
                    setFeedbackId(null)
                    setFeedbackText('')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApprovalCard({
  approval,
  isEditingFeedback,
  feedbackText,
  onFeedbackChange,
  onCancelFeedback,
}: any) {
  const { mutate: approve, isPending: isApproving } = useApproveApproval(approval.id)
  const { mutate: reject, isPending: isRejecting } = useRejectApproval(approval.id)

  const handleApprove = () => {
    approve(
      { feedback: feedbackText },
      {
        onSuccess: () => {
          toast.success('Approval approved')
          onCancelFeedback()
        },
        onError: () => {
          toast.error('Failed to approve')
        },
      }
    )
  }

  const handleReject = () => {
    reject(
      { feedback: feedbackText },
      {
        onSuccess: () => {
          toast.success('Approval rejected')
          onCancelFeedback()
        },
        onError: () => {
          toast.error('Failed to reject')
        },
      }
    )
  }

  return (
    <Card className="glass-dark border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Proposed Plan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Session: {approval.sessionId}</p>
          </div>
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200">
            Pending
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Steps */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Proposed Steps</p>
          <div className="space-y-2">
            {approval.steps.map((step: any, index: number) => (
              <div key={step.id} className="bg-black/40 rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-accent-glow-bright">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    <p className="text-xs text-accent-glow-bright mt-2">Tool: {step.tool}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        {isEditingFeedback && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Feedback (Optional)</p>
            <Textarea
              placeholder="Add feedback..."
              value={feedbackText}
              onChange={(e) => onFeedbackChange(e.target.value)}
              className="bg-white/5 border-white/10 h-24"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4">
          {isEditingFeedback ? (
            <>
              <Button
                variant="outline"
                onClick={onCancelFeedback}
                className="border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleApprove}
                disabled={isApproving}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Check size={16} className="mr-1" />
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isRejecting}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X size={16} className="mr-1" />
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onFeedbackChange('')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Check size={16} className="mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => onFeedbackChange('')}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X size={16} className="mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
