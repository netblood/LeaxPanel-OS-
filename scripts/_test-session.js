const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
const rows = db.prepare('SELECT sid, sess, expire FROM sessions ORDER BY expire DESC LIMIT 3').all();
for (const row of rows) {
  try {
    const sess = JSON.parse(row.sess);
    console.log('SID:', row.sid);
    console.log('  user:', sess.user ? JSON.stringify(sess.user) : 'NONE');
    console.log('  cookie:', JSON.stringify(sess.cookie));
    console.log('  expire:', row.expire);
    console.log('---');
  } catch(e) {
    console.log('SID:', row.sid, 'PARSE ERROR:', e.message);
  }
}
db.close();
