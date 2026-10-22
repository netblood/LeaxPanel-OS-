const bcrypt = require('bcryptjs');
const hash = '$2a$12$gu42n6t6f8vypxHKauiyJuLEVWhakalCUbHfGKJ8MtgFArYIx4Lbe';
console.log('password123 matches:', bcrypt.compareSync('password123', hash));
console.log('password matches:', bcrypt.compareSync('password', hash));