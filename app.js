const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bodyParser = require("body-parser");
const request = require('request-promise');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
// TODO: Move to server.js
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cookieParser());
// TODO: Move to server.js
app.use(bodyParser.json());

app.set('trust proxy', 1) // trust first proxy
 
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}))

app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.post('/register', (req, res) => {
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
    let user = {
      alias: req.session.user.alias,
      _id: req.session.user._id
    }
    console.log(user);
    res.cookie('user', `{_id:${user._id},alias:${user.alias}`, { maxAge: 900000, httpOnly: false});
    res.render('chat', { "users": JSON.parse(users)});
  });
});

app.post('/login', (req, res) => {
  let user = req.body;
  request('http://127.0.0.1:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body),
  }).then((user) => {
    if (JSON.parse(user)) {
      req.session.user = JSON.parse(user);
      
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
      body: chatMessage, //Message body
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
