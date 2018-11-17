'use strict';
const express = require('express');

let app = express();
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile('public/index.html')
});

app.listen(8080, () => console.log("Listening at port 8080"));