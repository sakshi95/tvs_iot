'use strict';
const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const start_time = [6, 0];
const end_time = [18, 0];

let connection = mysql.createConnection({
    host: '192.168.0.134',
    user: 'prixgen',
    password: 'prix@123',
    database: 'tvs_db'
});

connection.connect(e => {
    if (e) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

let app = express();
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile('public/index.html')
});

app.post('/getStatus', async (req, res) => {
    connection.query('SELECT dbd_id,dbd_state,time,reason,user FROM `tvs_horizon` order by id desc limit 1',
        (err, result, fields) => {
            if (err) {
                console.log(err);
                res.json({error: err});
                return;
            }
            let current = result[0];
            let warning = false;
            let validateTime = () => {
                let now = new Date();
                let h = now.getHours();
                let m = now.getMinutes();
                let t = h * 60 + m;
                let st = start_time[0] * 60 + start_time[1];
                let et = end_time[0] * 60 + end_time[1];
                console.log(st, et, t);
                if (t > st && t < et)
                    return true;
            };
            console.log(current.dbd_state);
            if (current.dbd_state === 1 && current.reason !== "" && validateTime()) {
                //Set warning bit
                console.log("Here");
                warning = true;
            }
            res.json({
                id: current.dbd_id,
                status: current.dbd_state, //Machine on or off
                started: current.time,  //Time of start
                warning: warning,       //Warning unta
                reason: current.reason,  //Yake warning tegdru
                user: current.user //WHo cleared warning
            });
        });
});

app.post('/clearWarning', (req, res) => {
    let reason = req.body.reason;
    let username = req.body.username;
    let password = req.body.password;
    let hash = crypto.createHash('sha256').update(password).digest('base64');
    let error = {};
    console.log("Clear warning issued");
    connection.query({
        sql: 'select password from users where username=?',
        values: [username]
    }, (err, results, fields) => {
        if (err) {
            res.json({error: err});
            return;
        }
        console.log(results);
        if (results.length !== 1) {
            res.json({error: "User doesn't exist"});
        }
        else if (results[0].password !== hash) {
            res.json({error: "Wrong Password"});
        }
        else {
            console.log("Auth successful");
            connection.query({
                sql: 'update tvs_horizon set reason=?,user=? where id in (select max(id) from (select * from tvs_horizon) as th)',
                values: [reason, username]
            }, (err) => {
                if (err) {
                    res.json({error: err})
                }
                else {
                    res.json({error: {}})
                }
            })
        }
    });
});

app.post('/addUser', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    console.log(username, password);
    let hash = crypto.createHash('sha256').update(password).digest('base64');
    connection.query({
        sql: 'insert into users values(?,?)',
        values: [username, hash]
    }, (err) => {
        if (err) {
            console.log("Error while modifying the warning status ", err);
            res.json({error: err});
            return;
        }
        res.json({error: {}});
    });
});

app.listen(8080, () => console.log("Listening at port 8080"));