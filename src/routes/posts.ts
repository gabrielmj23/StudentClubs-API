/* eslint-disable @typescript-eslint/no-misused-promises */
import { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z, ZodError } from 'zod'
import { isClubRole } from '../utils'

// Schema to validate new posts
const postSchema = z.object({
  title: z.string({
    required_error: 'Post title is required'
  })
    .trim()
    .min(1, 'Post title is required')
    .max(30, 'Max title length is 30'),

  content: z.string({
    required_error: 'Post cannot be empty'
  })
    .trim()
    .min(1, 'Post cannot be empty')
    .max(5000, 'Max post length is 5000')
})

// Schema to validate post update objects
const updatePostSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Post title cannot be empty')
    .max(30, 'Max title length is 30')
    .optional(),

  content: z.string()
    .trim()
    .min(1, 'Post cannot be empty')
    .max(5000, 'Max post length is 5000')
    .optional()
})

export const postsRouter = Router({ mergeParams: true })
const prisma = new PrismaClient()

// Get all posts from a club
postsRouter.get('/', isClubRole('joinedClubs'), async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { clubId: Number(req.params.clubId) },
      include: {
        author: {
          select: { name: true }
        },
        club: {
          select: { name: true }
        }
      }
    })
    res.json({ posts: posts ?? [] })
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

// Get post by id
postsRouter.get('/:postId', isClubRole('joinedClubs'), async (req, res) => {
  try {
    const post = await prisma.post.findFirstOrThrow({
      where: {
        id: Number(req.params.postId),
        clubId: Number(req.params.clubId)
      },
      include: {
        author: {
          select: { name: true }
        },
        club: {
          select: { name: true }
        }
      }
    })
    res.json(post)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Post not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or post ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Create a new post
postsRouter.post('/', isClubRole('joinedClubs'), async (req, res) => {
  try {
    // Validate post contents
    const parsedPost = postSchema.parse(req.body)

    // Add post to database
    const post = await prisma.post.create({
      data: {
        ...parsedPost,
        author: {
          connect: { id: Number(req.user?.user.id) }
        },
        club: {
          connect: { id: Number(req.params.clubId) }
        }
      }
    })
    res.status(201).json(post)
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

// Update post
postsRouter.put('/:postId', isClubRole('joinedClubs'), async (req, res) => {
  try {
    // Check if post exists
    const postId = req.params.postId
    const postToUpdate = await prisma.post.findFirstOrThrow({
      where: {
        id: Number(postId),
        clubId: Number(req.params.clubId)
      }
    })

    // Check if user requesting is author
    if (postToUpdate.authorId !== Number(req.user?.user.id)) {
      res.status(401).json({ error: 'Only author can make this request' })
    }

    // Parse given update object and make update
    const parsedPost = updatePostSchema.parse(req.body)
    const post = await prisma.post.update({
      where: { id: Number(postId) },
      data: {
        ...parsedPost,
        lastUpdated: new Date()
      }
    })
    res.json(post)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Club or post not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or post ID' })
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid data provided', issues: error.issues })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})

// Delete a post (can be made by author, admins and owner)
postsRouter.delete('/:postId', isClubRole('joinedClubs'), async (req, res) => {
  try {
    // Check if post exists
    const { clubId, postId } = req.params
    const postToDelete = await prisma.post.findFirstOrThrow({
      where: {
        id: Number(postId),
        clubId: Number(clubId)
      }
    })

    // Check if user is admin or owner of the club
    const isAdminOrOwner = await prisma.user.findFirst({
      where: {
        id: Number(req.user?.user.id),
        OR: [
          {
            adminClubs: {
              some: { id: Number(clubId) }
            },
            ownedClubs: {
              some: { id: Number(clubId) }
            }
          }
        ]
      }
    })

    // Check permissions
    if (postToDelete.authorId !== Number(req.user?.user.id) && isAdminOrOwner === null) {
      res.status(401).json({ error: 'Only author, admin or owner can delete this post' })
      return
    }

    // Delete post
    const post = await prisma.post.delete({
      where: { id: Number(postId) }
    })
    res.json(post)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: 'Club or post not found' })
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid club or post ID' })
    } else {
      res.status(500).json(error)
      console.error(error)
    }
  }
})
