var express = require("express"),
    app = express(),
    http = require('http'),
    formidable = require('formidable'),
    util = require('util')
    fs   = require('fs-extra'),
    qt   = require('quickthumb');

var port = 8080; 
var sockjs = require('sockjs');
var wbsc = sockjs.createServer();
var connections = [];

var sendMessageToSocketCliects = function(msg) {
  for(var i=0; i<connections.length; i++) {
    connections[i].write(msg);
  }  
}

// use quickthumb
app.use(qt.static(__dirname + '/'));

// API: image upload
app.post('/upload', function (req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    res.send(200);
  });

  form.on('end', function(fields, files) {
    /* Temporary location of our uploaded file */
    var temp_path = this.openedFiles[0].path;
    /* The file name of the uploaded file */
    var file_name = this.openedFiles[0].name;
    /* Location where we want to copy the uploaded file */
    var new_location = 'uploads/';

    fs.copy(temp_path, new_location + file_name, function(err) {  
      if (err) {
        console.error(err);
      } else {
        console.log("image upload completed");
        sendMessageToSocketCliects('image_uploaded');
      }
    });
  });
});

// show the upload form 
app.get('/', function (req, res){
  res.writeHead(200, {'Content-Type': 'text/html' });
  /* Display the file upload form. */
  var form = '<form action="/upload" enctype="multipart/form-data" method="post"><input name="title" type="text" /><input multiple="multiple" name="upload" type="file" /><input type="submit" value="Upload" /></form>';
  res.end(form); 
}); 

// API: take a picture
app.get('/shoot', function (req, res){
  console.log("take a picture");
  sendMessageToSocketCliects('shoot');
  res.send(200);
});

// setup express
app.configure(function () {
  app.set('port', process.env.PORT || port);  
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


// setup websocket 
wbsc.on('connection', function(conn) {
  console.log('Got connection' + conn.address.address);
  connections.push(conn);

  conn.on('data', function(message) {
    // send message to all connected clients
    sendMessageToSocketCliects(message);
  });

  conn.on('close', function() {
    connections.splice(connections.indexOf(conn), 1); // remove the connection
    console.log('Lost connection');
  });
});
wbsc.installHandlers(server, {prefix:'/camdy'});
