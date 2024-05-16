const { Server } = require('socket.io', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000, // 1 second
  reconnectionDelayMax: 5000, // 5 seconds
  randomizationFactor: 0.5
});

let io;

module.exports = {
  init(server) {
    io = new Server(server, { 
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        }
    });

    io.on('connection', (socket) => {

      console.log('a user connected:', new Date().toISOString());

        if (socket.handshake.auth.role === 'employer') {
            console.log('Employer connected', socket.handshake.auth.userId);
            const employerId = socket.handshake.auth.userId;
            socket.join(`employer-${employerId}`);
        }
        if (socket.handshake.auth.role === 'student') {
            console.log('Student connected', socket.handshake.auth.userId);
            const employerId = socket.handshake.auth.userId;
            socket.join(`student-${employerId}`);
        }
    });
  },
  getInstance() {
    return io;
  },
};