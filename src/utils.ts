import { Prisma } from '@prisma/client'
import { Response } from 'express'

export const handleUpdateErrors = (error: UpdateError, res: Response): undefined => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: Not found
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Club or user not found' })
      return
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Invalid parameters' })
    return
  }
  res.status(500).json(error)
  console.error(error)
}
