// src/routes/accept-invite.tsx
import { createFileRoute } from '@tanstack/react-router'
import AcceptInvite from '@/pages/AcceptInvite'
import { z } from 'zod'

// Validates the ?token= query param from the URL
const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/accept-invite')({
  validateSearch: searchSchema,
  component: AcceptInvite,
})
