/* eslint-disable @typescript-eslint/no-misused-promises */
import { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z, ZodError } from 'zod'
import { isClubRole } from '../utils'

// Schema for new event objects
const eventSchema = z.object({
  title: z.string({
    required_error: 'Event title is required'
  })
    .trim()
    .min(1, 'Event title is required')
    .max(100, 'Max event title length is 100'),

  description: z.string({
    required_error: 'Event description is required'
  })
    .trim()
    .min(1, 'Event description is required')
    .max(255, 'Max event description length is 255'),

  date: z.coerce.date({
    required_error: 'Event date is required'
  })
    .min(new Date(), { message: 'Event is too old' })
})

// Schema for event updates
const updateEventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Event title cannot be empty')
    .max(100, 'Max event title length is 100')
    .optional(),

  description: z.string()
    .trim()
    .min(1, 'Event description cannot be empty')
    .max(255, 'Max event description length is 255')
    .optional(),

  date: z.coerce.date()
    .min(new Date(), { message: 'Event is too old' })
    .optional()
})

export const eventsRouter = Router({ mergeParams: true })
const prisma = new PrismaClient()

// Get all events from a club. Can specify finished status and sort order
eventsRouter.get('/', isClubRole('joinedClubs'), async (req, res) => {
  try {
    // Get query parameters and create custom query
    const { finished, date } = req.query
    const finishedQuery = typeof finished !== 'undefined'
      ? {
          finished: finished === 'true'
        }
      : {}

    // Make request
    const events = await prisma.event.findMany({
      where: {
        clubId: Number(req.params.clubId),
        ...finishedQuery
      },
      orderBy: {
        date: date as Prisma.SortOrder ?? 'desc'
      }
    })
    res.json({ events: events ?? [] })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Club not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Get event by ID
eventsRouter.get('/:eventId', isClubRole('joinedClubs'), async (req, res) => {
  try {
    // Find event
    const event = await prisma.event.findFirstOrThrow({
      where: {
        id: Number(req.params.eventId),
        clubId: Number(req.params.clubId)
      }
    })
    res.json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Event not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or event ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Create new event
eventsRouter.post('/', isClubRole('adminClubs'), async (req, res) => {
  try {
    // Validate given event and add to db
    const parsedEvent = eventSchema.parse(req.body)
    const event = await prisma.event.create({
      data: {
        ...parsedEvent,
        club: {
          connect: { id: Number(req.params.clubId) }
        }
      }
    })
    res.status(201).json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Club not found' })
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

// Update an event
eventsRouter.put('/:eventId', isClubRole('adminClubs'), async (req, res) => {
  try {
    // Validate given event object
    const parsedEvent = updateEventSchema.parse(req.body)

    // Find if event with eventId and clubId exists and get date
    const dateFromEventToUpdate = await prisma.event.findFirstOrThrow({
      where: {
        id: Number(req.params.eventId),
        clubId: Number(req.params.clubId)
      },
      select: {
        date: true
      }
    })

    // Find date to use for updating finished attribute
    const dateToCompare = parsedEvent.date ?? dateFromEventToUpdate.date

    // Perform update
    const event = await prisma.event.update({
      where: { id: Number(req.params.eventId) },
      data: {
        ...parsedEvent,
        finished: (new Date()) > dateToCompare
      }
    })
    res.json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Event not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or event ID' })
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid data provided', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Delete an event
eventsRouter.delete('/:eventId', isClubRole('adminClubs'), async (req, res) => {
  try {
    // Check if event with given eventId and clubId exists
    await prisma.event.findFirstOrThrow({
      where: {
        id: Number(req.params.eventId),
        clubId: Number(req.params.clubId)
      }
    })

    const event = await prisma.event.delete({
      where: { id: Number(req.params.eventId) }
    })
    res.json(event)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Event not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or event ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
