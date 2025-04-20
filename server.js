const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get('/botstatus', (req, res) => {
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  const uptime = process.uptime();

  res.json({
    status: 'Online',
    memory: `${memoryUsage.toFixed(2)} MB`,
    uptime: Math.floor(uptime),
    region: 'yandex (ru-central1)',
  });
});

app.listen(PORT, () => {
  console.log(`Status API rodando na porta ${PORT}`);
});