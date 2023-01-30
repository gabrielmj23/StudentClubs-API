/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { handleUpdateErrors, isAuthenticated, isClubRole } from '../utils'
import { postsRouter } from './posts'
import { eventsRouter } from './events'

// Schema to validate received club object for new clubs
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
    .max(255, 'Max club description length is 255')
})

// Schema to validate received club object for updates
const updateClubSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Club name cannot be empty')
    .max(30, 'Max club name length is 30')
    .optional(),

  description: z.string()
    .trim()
    .min(1, 'Club description cannot be empty')
    .max(255, 'Max club description length is 255')
    .optional()
})

export const clubsRouter = Router()
clubsRouter.use(isAuthenticated) // All routes will be log-in protected
clubsRouter.use('/:clubId/posts', postsRouter) // Set up routes relating to clubs' posts
clubsRouter.use('/:clubId/events', eventsRouter) // Set up routes relating to clubs' events
const prisma = new PrismaClient()

// Get all clubs
clubsRouter.get('/', async (_req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      include: {
        owner: {
          select: { name: true }
        },
        _count: {
          select: { members: true, posts: true }
        }
      }
    })
    res.json({
      clubs: clubs ?? []
    })
  } catch (error) {
    res.status(500).json(error)
    console.error(error)
  }
})

// Get club by id
clubsRouter.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params
    const club = await prisma.club.findFirstOrThrow({
      where: {
        id: Number(clubId)
      },
      include: {
        owner: {
          select: { name: true }
        },
        _count: {
          select: { members: true, posts: true }
        }
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

// Post a new club
clubsRouter.post('/', async (req, res) => {
  try {
    const parsedClub = clubSchema.parse(req.body)
    const ownerId: number = req.user?.user.id as number
    const club = await prisma.club.create({
      data: {
        ...parsedClub,
        owner: {
          connect: { id: ownerId }
        },
        members: {
          connect: { id: ownerId }
        },
        admins: {
          connect: { id: ownerId }
        }
      }
    })
    res.status(201).json(club)
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

// Update a club's name or description
clubsRouter.put('/:clubId', isClubRole('ownedClubs'), async (req, res) => {
  try {
    const { clubId } = req.params

    // Validate sent information
    const updateData = updateClubSchema.parse(req.body)

    // Update club
    const club = await prisma.club.update({
      where: { id: Number(clubId) },
      data: updateData
    })
    res.json(club)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Club not found' })
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club ID' })
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid data provided', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Delete a club
clubsRouter.delete('/:clubId', isClubRole('ownedClubs'), async (req, res) => {
  try {
    const { clubId } = req.params
    await prisma.club.delete({
      where: { id: Number(clubId) }
    })
    res.sendStatus(200)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Club not found' })
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Add a member to a club
clubsRouter.post('/:clubId/members', isClubRole('adminClubs'), async (req, res) => {
  try {
    const { clubId } = req.params
    const memberId: String = req.body.memberId
    const club = await prisma.club.update({
      where: { id: Number(clubId) },
      data: {
        members: {
          connect: { id: Number(memberId) }
        }
      }
    })
    res.json(club)
  } catch (error: UpdateError) {
    handleUpdateErrors(error, res)
  }
})

// Delete member from a club
clubsRouter.delete('/:clubId/members/:memberId', isClubRole('adminClubs'), async (req, res) => {
  try {
    const { clubId, memberId } = req.params
    const club = await prisma.club.update({
      where: { id: Number(clubId) },
      data: {
        members: {
          disconnect: { id: Number(memberId) }
        }
      }
    })
    res.json(club)
  } catch (error: UpdateError) {
    handleUpdateErrors(error, res)
  }
})

// Add an admin to a club
clubsRouter.post('/:clubId/admins', isClubRole('adminClubs'), async (req, res) => {
  try {
    const { clubId } = req.params
    const adminId: String = req.body.adminId
    const club = await prisma.club.update({
      where: { id: Number(clubId) },
      data: {
        admins: {
          connect: { id: Number(adminId) }
        },
        members: {
          connect: { id: Number(adminId) }
        }
      }
    })
    res.json(club)
  } catch (error: UpdateError) {
    handleUpdateErrors(error, res)
  }
})

// Delete admin from a club
clubsRouter.delete('/:clubId/admins/:adminId', isClubRole('adminClubs'), async (req, res) => {
  try {
    const { clubId, adminId } = req.params
    const club = await prisma.club.update({
      where: { id: Number(clubId) },
      data: {
        admins: {
          disconnect: { id: Number(adminId) }
        }
      }
    })
    res.json(club)
  } catch (error: UpdateError) {
    handleUpdateErrors(error, res)
  }
})
