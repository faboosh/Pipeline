const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bodyParser = require("body-parser");
const request = require('request-promise');
// TODO: Move to server.js
app.use(bodyParser.urlencoded({
  extended: false
}));
// TODO: Move to server.js
app.use(bodyParser.json());


app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});

// TODO: Move to server.js
app.post('/register', (req, res) => {
  /*let user = await */
  request('http://127.0.0.1:3000/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body),
  }).then(() => {
    res.redirect('chat');
  });
});

app.get('/chat', (req, res) => {
  request('http://127.0.0.1:3000/chat', {
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(users => {
    res.render('chat', { "users": JSON.parse(users) });
  });
});

app.post('/login', (req, res) => {
  console.log(req.body);
  request('http://127.0.0.1:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body),
  }).then((authorized) => {
    if (JSON.parse(authorized)) {
      res.redirect('chat');
    } else {
      res.redirect('/');
    }
  });
});

io.on('connection', (socket) => {
  socket.on('newUser', (user) => {
    socket.username = user;
    //New user is online
    socket.broadcast.emit('newUser', `${user}: Is now online!`);
    //You are online
    socket.on('userOnline', (user) => {
      socket.emit('userOnline', `You ${user} are online`);
    });
    // is Typing
    socket.on('typing', (isTyping) => {
      socket.broadcast.emit('updateTyping', user, isTyping);
    });
  });

  socket.on('chat message', function (chatMessage) { //Lyssnar på eventet 'chat message'
    request('http://127.0.0.1:3000/chatroom', { //POST request to server.js containing message
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: chatMessage,
    }).then(message => { //recieves message + id from server
      console.log(JSON.parse(message));
      //The server recieves a JSON string object and sends it further to all clients connected to the socket.
      io.emit('chat message', JSON.parse(message)); //Emits chat message to all clients
    });
  });

  socket.on('disconnect', (user) => {
    socket.broadcast.emit('newUser', socket.username + ' Disconnected')
  });
});

http.listen(5000, function () {
  console.log('listening on *:5000');
});
