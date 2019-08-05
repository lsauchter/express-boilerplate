require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const winston = require('winston')
const uuid = require('uuid/v4')

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'info.log' })
    ]
})

if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }))
}

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN
    const authToken = req.get('Authorization')

    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`)
        return res.status(401).json({ error: 'Unauthorized request'})
    }

    next()
})

app.get('/', (req, res) => {
    res.send('Hello world')
});

const bookmarks = [
    {
    id: 1,
    title: 'bookmark 1',
    url: 'http://google.com',
    rating: 2,
    description: 'test bookmark'
    },
    {
    id: 2,
    title: 'bookmark 2',
    url: 'http://thinkful.com',
    rating: 1,
    description: 'test bookmark 2'
    }
]

app.get('/bookmarks', (req, res) => {
    res.json(bookmarks);
})

app.get('/bookmarks/:id', (req, res) => {
    const {id} = req.params;
    const bookmark = bookmarks.find(bk => bk.id == id);

    if(!bookmark) {
        logger.error(`Bookmark with id ${id} not found`);
        return res.status(404).send('Bookmark not found');
    }

    res.json(bookmark);
})

app.post('/bookmarks', (req, res) => {
    const { title, url, rating, description } = req.body;
    const id = uuid();

    if(!title) {
        return res.status(400).send('Title required')
    }
    if(!url) {
        return res.status(400).send('URL required')
    }
    if(!rating) {
        return res.status(400).send('Rating required')
    }
    if(!description) {
        return res.status(400).send('Description required')
    }

    const bookmark = {
        id,
        title,
        url,
        rating,
        description
    }

    bookmarks.push(bookmark);
    logger.info(`Bookmark with is ${id} created`)
    res.status(201).location(`http://localhost:8000/bookmarks/${id}`).json(bookmark)
})

app.delete('/bookmarks/:id', (req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex(bk => bk.id == id);

    if (bookmarkIndex === -1) {
        logger.error(`Bookmark with ${id} not found`);
        return res.status(404).send('Bookmark not found');
    }

    bookmarks.splice(bookmarkIndex, 1);
    logger.info(`Bookmark with id ${id} deleted`);
    res.status(204).end();
})

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
         console.error(error)
         response = { message: error.message, error }
    }
    res.status(500).json(response)
})

module.exports = app