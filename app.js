var http = require('http'),
    path = require('path'),
    methods = require('methods'),
    express = require('express'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    cors = require('cors'),
    errorhandler = require('errorhandler'),
    boc_api = require('./boc_api');

// Create global app object
var app = express();

boc_api.get_app_token(function(err,new_boc_api){
  if(err){
    console.log(err)
  }else{
    boc_api = new_boc_api;
    if(boc_api.sub_id.length === 0){
      boc_api.createSubscription(function(err,sub_id){
        if(err){
          console.log(err)
        }else{
          let login_url = boc_api.get_login_url(sub_Id)
          console.log("LOGIN URL: "+login_url)
        }
      })
    }
  }
  
});


app.use(cors());

// Normal express config defaults
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require('method-override')());
app.use(express.static(__dirname + '/public'));

app.use(session({ secret: 'conduit', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false  }));
app.set('view engine', 'pug')

app.use("/", require("./routes/index"));
app.use("/bocOauthcb", require("./routes/boc_callback"));


/// error handlers

  app.use(function(err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({'errors': {
      message: err.message,
      error: err
    }});
  });

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({'errors': {
    message: err.message,
    error: {}
  }});
});

// finally, let's start our server...
var server = app.listen( process.env.PORT || 3000, function(){
  console.log('Listening on port ' + server.address().port);
});
