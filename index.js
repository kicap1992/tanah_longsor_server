const express = require('express');
const app = express();
const mongoose = require('mongoose');



require('dotenv/config');


const formData = require('express-form-data');
const cors = require('cors')
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
// const io = require("socket.io")(server, {
//   cors: {
//     origin: "https://192.168.43.125",
//     methods: ["GET", "POST"],
//     // allowedHeaders: ["my-custom-header"],
//     // credentials: true
//   }
// });
let users = {};




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(formData.parse());
app.options('*', cors())
app.use(cors())

mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true, family: 4, })
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("Connected to db")
})

// import routes
const from_esp32_routes = require('./routes/from_esp32_routes');

// routes
app.use('/api/from_esp32', from_esp32_routes)

app.get('/', (req, res) => {

  const id = req.query.id;
  console.log(id);
  console.log("ada pengambilan data")
  res.send('ii dia pyan fdssfsd ');
})

app.get('/ambil_data_1', (req, res) => {
  res.send('ini ambil data 1');
})

const port = process.env.PORT || 3001;

io.on('connection', (socket) => {
  let userId = socket.id;

  if (!users[userId]) users[userId] = [];
  users[userId].push(socket.id);
  console.log('socket connected', userId);

  socket.on('reload_calibation', (_) => {
    socket.broadcast.emit('reload_calibation', {
      message: 'reload_calibation'
    });
  })
  socket.on('new_device', (_) => {
    socket.broadcast.emit('new_device', {
      message: _.id
    });
  })

  socket.on('hehe', (_) => {
    socket.broadcast.emit('hehe', {
      _
    });
  })
  socket.on('notif_to_phone', (_) => {
    console.log(_ , " ini sebelum broadcast")
    socket.broadcast.emit('notif_to_phone', {
      message: _.message,
      id: _.id,
      status : _.status,
      lat: _.lat,
      lng : _.lng
    });
  })

  socket.on('disconnect', (_) => {
    console.log('user disconnected');
    console.log(_)
  });



});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
})

