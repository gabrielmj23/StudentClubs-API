/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

// Schema to validate received user object
const userSchema = z.object({
  email: z.string({
    required_error: 'Email is required'
  })
    .email('Invalid email'),

  name: z.string({
    required_error: 'Name is required'
  })
    .trim()
    .min(1, 'Name is required')
    .max(25, 'Max name length is 25'),

  description: z.string()
    .trim()
    .min(1)
    .max(255, 'Max description length is 255')
    .optional()
})

export const usersRouter = Router()
const prisma = new PrismaClient()

// POST to create new user
usersRouter.post('/', async (req, res) => {
  try {
    const parsedUser = userSchema.parse(req.body)
    const user = await prisma.user.create({
      data: parsedUser
    })
    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid data', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
