import express from 'express'
import { authRouter } from './routes/auth'
import { clubsRouter } from './routes/clubs'
import { usersRouter } from './routes/users'

const app = express()
app.use(express.json())
const PORT = process.env.PORT ?? 3000

app.use('/api/auth', authRouter)
app.use('/api/clubs', clubsRouter)
app.use('/api/users', usersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
