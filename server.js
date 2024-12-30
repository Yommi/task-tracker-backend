const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: './config.env' });

const app = require('./app');

const db = process.env.DB_URL.replace(
  '<db_username>',
  process.env.DB_USERNAME,
).replace('<db_password>', process.env.DB_PASSWORD);

mongoose
  .connect(db)
  .then(() => console.log('Database Connected ✅'))
  .catch((err) => console.log('Database connection error 🚫', err));

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port: ${port}`));
