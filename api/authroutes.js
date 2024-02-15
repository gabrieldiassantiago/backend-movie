const express = require('express');
const cors = require('cors'); // Importe o pacote CORS
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config/config');
const authMiddleware = require('../middleware/authMiddleware');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;


const router = express.Router();
router.use(cors());
require('dotenv').config(); 

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
      }, config.jwtSecret, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/user-data', authMiddleware, async (req, res) => {
  try {
    const userData = { username: req.user.username, email: req.user.email };
    res.json(userData);
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



router.get('/movies', authMiddleware,  async (req, res) => {
  try {
    const apiKey = process.env.API_MOVIE || '9772ebae19e854dd86f2d89c7089351c';
    const apiUrl = 'https://api.themoviedb.org/3/movie/popular'; 

    const response = await fetch(`${apiUrl}?api_key=${apiKey}`);
    const movies = await response.json();
    console.log('Dados dos filmes:', movies);

    res.json(movies.results);
  } catch (error) {
    console.error('Erro ao obter dados de filmes:', error.message);
    res.status(error.status || 500).json({ error: 'Erro ao obter dados de filmes' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);


    const newUser = new User({ username, password : hashedPassword, email });

    await newUser.save();

    const token = jwt.sign({
      id: newUser._id, // Use newUser._id aqui
      username: newUser.username,
      email: newUser.email,
    }, config.jwtSecret, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/addfavorites', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (!user.favorites.includes(movieId)) {
      user.favorites.push(movieId);
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao adicionar aos favoritos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({error: 'NAO ENCONTRADO'});
    }
    res.json(user.favorites)
  } catch (error) {

    console.error('Nao foi possivel obter os filmes')
    res.status(500).json({eror: 'Erro interno do servidor'})
  }
})


router.delete('/deletefavorite/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const index = user.favorites.indexOf(movieId);
    
    if (index !== -1) {
      user.favorites.splice(index, 1);
      await user.save();
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: 'Filme não encontrado nos favoritos do usuário' });
    }
  } catch (error) {
    console.error('Erro ao excluir dos favoritos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/', (req, res) => {
  const jsonData = { message: 'Bem-vindo à minha API!' };
  res.json(jsonData);
});

module.exports = router;
