import * as jwt from 'jsonwebtoken'

// Add user to express requests and responses
declare global {
  namespace Express {
    export interface Request {
      user?: string | jwt.JwtPayload
    }
    export interface Response {
      user?: string | jwt.JwtPayload
    }
  }

  // Error type for update actions
  export type UpdateError = Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError | Error
}
