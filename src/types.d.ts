import * as jwt from 'jsonwebtoken'

// Add user to express requests and responses
declare global {
  namespace Express {
    export interface Request {
      user?: jwt.JwtPayload
    }
    export interface Response {
      user?: jwt.JwtPayload
    }
  }

  // Type including all roles from user perspective
  export type ClubRole = 'joinedClubs' | 'ownedClubs' | 'adminClubs'

  // Error type for update actions
  export type UpdateError = Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError | Error
}
