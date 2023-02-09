const mysql = require('mysql2')

let pool = mysql.createPool({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'proxyreport',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 2
})
pool = pool.promise()

module.exports = {
    pool
}