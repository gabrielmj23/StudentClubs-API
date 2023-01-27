/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import * as bcrypt from 'bcryptjs'
import { AuthError, isAuthenticated } from '../utils'

export const usersRouter = Router()

// Schema to validate updateable user fields (name, description); including password as well for security
const updateUserSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(25, 'Max name length is 25')
    .optional(),

  description: z.string()
    .trim()
    .max(255, 'Max description length is 255')
    .optional(),

  password: z.string({
    required_error: 'Password is required'
  })
    .trim()
    .min(1, 'Password is required')
})

usersRouter.put('/:userId', isAuthenticated, async (req, res) => {
  const requester: number = req.user?.user.id as number
  const userId: string = req.params.userId

  // Only same user can update account details
  if (requester !== Number(userId)) {
    res.status(401).json({ error: 'Only same user can make this request' })
    return
  }

  // Update provided details
  const prisma = new PrismaClient()
  try {
    // Check if user exists
    const userToUpdate = await prisma.user.findFirstOrThrow({
      where: { id: Number(userId) }
    })

    // Parse information sent by client and compare passwords
    const { password, ...updateData } = updateUserSchema.parse(req.body)
    const passwordMatch = await bcrypt.compare(password, userToUpdate.password)
    if (!passwordMatch) {
      throw new AuthError('Incorrect password')
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData
    })
    res.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Not found
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' })
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid user ID' })
    } else if (error instanceof AuthError) {
      // AuthError: Wrong password
      res.status(401).json({ error: error.message })
    } else if (error instanceof ZodError) {
      // ZodError: Failed parsing
      res.status(400).json({ error: 'Invalid data provided', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
