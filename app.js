const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bodyParser = require("body-parser");
const request = require('request-promise');

///////////////////////////////////////////////////
/// MIDDLEWARES
///////////////////////////////////////////////////

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

///////////////////////////////////////////////////
/// ROUTES
///////////////////////////////////////////////////


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

///////////////////////////////////////////////////
/// SOCKET CONFIG
///////////////////////////////////////////////////

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

    socket.on('chat message', function (chatObject) { //Lyssnar på eventet 'chat message'
        request('http://127.0.0.1:3000/chatroom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: chatObject,
        }).then(message => {
            console.log(JSON.parse(message));
            //The server recieves a JSON string object and sends it further to all clients connected to the socket.
            io.emit('chat message', JSON.parse(message));
        });

        //HTTP request till servern, Post request fetch
        /*async function getMessage(msg) {
          let customers = await fetch('http://127.0.0.1:3001/chat/' + msg, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Content-Type': 'text/json'
            }
          }).then(data => {
            return data.json();
          });
    
          render(customers);
        }*/

    });
    socket.on('disconnect', (user) => {
        socket.broadcast.emit('newUser', socket.username + ' Disconnected')
    });
});

http.listen(5000, function () {
    console.log('listening on *:5000');
});

