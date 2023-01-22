/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

// Schema to validate received club object
const clubSchema = z.object({
  name: z.string({
    required_error: 'Club name is required'
  })
    .trim()
    .min(1, 'Club name is required')
    .max(30, 'Max club name length is 30'),

  description: z.string({
    required_error: 'Club description is required'
  })
    .trim()
    .min(1, 'Club description is required')
    .max(255, 'Max club description length is 255'),

  ownerId: z.coerce.number({
    required_error: 'Owner ID is required'
  })
    .int('Invalid owner ID')
    .positive('Invalid owner ID')
})

export const clubsRouter = Router()
const prisma = new PrismaClient()

// GET all clubs
clubsRouter.get('/', async (_req, res) => {
  try {
    const clubs = await prisma.club.findMany()
    res.json({
      clubs: clubs ?? []
    })
  } catch (error) {
    res.status(500).json(error)
    console.error(error)
  }
})

// GET club by id
clubsRouter.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params
    const club = await prisma.club.findFirstOrThrow({
      where: {
        id: Number(clubId)
      }
    })
    res.json(club)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Not found
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Club not found' })
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid Club ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// POST a new club
clubsRouter.post('/', async (req, res) => {
  try {
    const parsedClub = clubSchema.parse(req.body)
    const club = await prisma.club.create({
      data: parsedClub
    })
    res.json(club)
  } catch (error) {
    // Customize error messages relating to database
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        res.status(400).json({ error: 'Invalid owner ID' })
      }
    } else if (error instanceof z.ZodError) {
      // ZodError refers to failing validation schema
      res.status(400).json({ error: 'Invalid data provided', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
