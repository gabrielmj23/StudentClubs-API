import { Prisma, PrismaClient } from '@prisma/client'
import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'

// Handler for errors updating club information
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
  res.status(500).json({ error })
  console.error(error)
}

// Middleware to protect routes for logged in users only
export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization
    if (typeof authHeader === 'string') {
      // Extract token from header and verify
      const token = authHeader.split(' ')[1]
      const user = jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as jwt.JwtPayload

      // Add user to request and continue
      req.user = user
      next()
    } else {
      res.sendStatus(401)
    }
  } catch (error) {
    res.sendStatus(401)
  }
}

// Helper middleware for validating if user is member, admin or owner of a given club
export const isClubRole = (clubRoles: ClubRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const prisma = new PrismaClient()
    // Build query to validate user's role
    const clubQueries = clubRoles.map((clubType) => [clubType, { some: { id: Number(req.params.clubId) } }])
    try {
      // Try to find user
      await prisma.user.findFirstOrThrow({
        where: {
          id: Number(req.user?.user.id),
          ...clubQueries
        }
      })
      next()
    } catch (error) {
      res.status(401).json({ error: 'User role does not permit this action' })
    }
  }
}

// Error class for user authentication
export class AuthError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'AuthError'
  }
}
