const express = require('express');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// for-direction calculation
function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

(async () => {
  try {
    // connect to mySql using promise-based API
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306
    });

    console.log('database connected successfully');

    app.get('/', (req, res) => {
      res.send('Home route working fine');
    });

    app.post('/addSchool', async (req, res) => {
      const { name, address, latitude, longitude } = req.body;

      if (!name || !address || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Enter Correct Data!' });
      }

      try {
        await db.execute(
          'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
          [name, address, latitude, longitude]
        );
        res.status(201).json({ message: 'School added successfully!' });
      } catch (err) {
        console.error('DB Error:', err);
        res.status(500).json({ error: 'Database insertion error' });
      }
    });

    app.get('/listSchools', async (req, res) => {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      try {
        // using the promise-based query
        const [schools] = await db.query('SELECT * FROM schools');

        const sortedSchools = schools.map(school => {
          const distance = getDistanceFromLatLon(
            parseFloat(latitude),
            parseFloat(longitude),
            school.latitude,
            school.longitude
          );
          return { ...school, distance };
        }).sort((a, b) => a.distance - b.distance);

        res.json(sortedSchools);
      } catch (err) {
        console.error('Fetch Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
})();
