const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const app = express();

const userRoutes = require('./routes/userRoutes');

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
 .then(() => console.log('MongoDB connected'))
 .catch(err => console.log(err));

app.get('/', (req, res) => {
 res.send('Hello from the backend!');
});

app.use('/api/users', userRoutes);

app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});