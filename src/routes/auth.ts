/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs'
import { Prisma, PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'

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

  password: z.string({
    required_error: 'Password is required'
  })
    .trim()
    .min(8, 'Min password length is 8')
    .max(24, 'Max password length is 24'),

  confirmation: z.string({
    required_error: 'Password confirmation is required'
  })
    .trim()
    .min(8, 'Min password length is 8')
    .max(24, 'Max password length is 24'),

  description: z.string()
    .trim()
    .min(1)
    .max(255, 'Max description length is 255')
    .optional()
})
  .refine((user) => user.password === user.confirmation, {
    message: 'Password and confirmation must match',
    path: ['confirmation']
  })
  .refine((user) => /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(user.password), {
    message: 'Password is not strong enough',
    path: ['password']
  })

// Error class for user authentication
class AuthError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export const authRouter = Router()
const prisma = new PrismaClient()

// Sign up route
authRouter.post('/signup', async (req, res) => {
  try {
    const parsedUser = userSchema.parse(req.body)

    // Encrypt password
    const salt = await bcrypt.genSalt(10)
    parsedUser.password = await bcrypt.hash(parsedUser.password, salt)
    const { confirmation, ...userToBeAdded } = parsedUser

    const user = await prisma.user.create({
      data: userToBeAdded
    })
    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Check schema validation errors
      res.status(400).json({ error: 'Invalid data', issues: error.issues })
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint failed
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Email is already being used' })
      }
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Log in route. Uses JWT for authentication
authRouter.post('/login', async (req, res) => {
  try {
    const loginEmail: string = req.body.email ?? ''
    const loginPassword: string = req.body.password ?? ''

    // Find matching user and check password equality
    const user = await prisma.user.findFirstOrThrow({
      where: { email: loginEmail }
    })
    const passwordMatches = await bcrypt.compare(loginPassword, user.password)
    if (!passwordMatches) {
      throw new AuthError('Incorrect email or password')
    }

    // Generate access token and send
    const { password, ...userWithoutPassword } = user
    const accessToken = jwt.sign(
      { user: userWithoutPassword }, process.env.JWT_SECRET as jwt.Secret, { expiresIn: '8h' }
    )
    res.json({ accessToken })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Not found
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' })
      }
    } else if (error instanceof AuthError) {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
