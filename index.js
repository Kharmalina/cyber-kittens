const express = require('express');
const app = express();
const { Kitten } = require('./db');
const jwt = require('jsonwebtoken');
const {JWT_SECRET = 'neverTellthesecretheheh'} = process.env;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware
const setUser = async (req, res, next) => {
  const auth = req.header("Authorization");
  if (!auth) {
    next();
  } else {
    const [, token] = auth.split(' ');
    const user = jwt.verify(token, JWT_SECRET);
    console.log(user)
    req.user = user;
    next();
  }
};

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get('/kittens/:id', setUser, async (req, res, next) => {
  // const auth = req.header("Authorization");
  const id = req.params.id;
  const user = req.user;
  if (user) {
    // const {age, color, name} = await Kitten...
    const foundKitty = await Kitten.findByPk(id);
    if (foundKitty.ownerId === user.id) {
    res.status(200).send({name: foundKitty.name, age: foundKitty.age, color: foundKitty.color});
    } else {
      res.sendStatus(401);
    }
  } else {
    res.sendStatus(401);
  }
});

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color
app.post('/kittens', setUser, async (req, res, next) => {
  const user = req.user;
  if (!user) {
      res.sendStatus(401);
  } else {
      const {name, age, color} = req.body;
      const kitten = await Kitten.create({name, age, color, ownerId: req.user.id});
      res.status(201).send({name: kitten.name, age: kitten.age, color: kitten.color});
      // res.send(kitty);
  }
});

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete('/kittens/:id', setUser, async (req, res, next) => {
  // const kitty = await User.findByPk(req.params.id);
  // TODO - req.user.id must match kitty.ownerId
  const id = req.params.id;
  const user = req.user;
  if (!user) {
      res.sendStatus(401);
  } else {
    // await Kitten.create({ownerId: req.user.id});
      const kitten = await Kitten.findByPk(id);
      if (user.id === kitten.ownerId) {
          await kitten.destroy();
          res.sendStatus(204);
      } else {
          res.sendStatus(401);
      }
  } 
});

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
