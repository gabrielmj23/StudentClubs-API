import express from 'express'

const app = express()
app.use(express.json())
const PORT = process.env.PORT ?? 3000

app.get('/', (_req, res) => {
  console.log('Ping!')
  res.send('Pong!')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
