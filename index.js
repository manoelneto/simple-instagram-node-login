require('dotenv').config();

var express = require("express"),
    session = require("express-session"),
    instagram = require("instagram-node"),
    path = require("path"),

    app = express(),

    PORT = process.env.PORT || "8080",
    SESSION_SECRET = process.env.SESSION_SECRET,
    URL = process.env.URL,
    INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET,
    INSTAGRAM_REDIRECT_URI = "http://"+URL+"/insta_callback",
    INSTAGRAM_API = "https://api.instagram.com/v1";

function getInstagramClient() {
  var ig = instagram.instagram();

  ig.use({
    client_id: INSTAGRAM_APP_ID,
    client_secret: INSTAGRAM_APP_SECRET
  });

  return ig;
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use('/javascript', express.static(__dirname + '/javascript'));
app.use('/stylesheet', express.static(__dirname + '/stylesheet'));
app.use('/plugins', express.static(__dirname + '/plugins'));
app.use('/image', express.static(__dirname + '/image'));

app.get("/", function(req, res){
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/app", function(req, res){
  if (!req.session.instagram) {
    res.redirect("/insta_auth");
    return;
  }

  res.sendFile(path.join(__dirname + "/app.html"));
});

app.get("/api/photos", function(req, res){
  var ig = getInstagramClient();

  if (!req.session.instagram) {
    res.send({
      error: true,
      message: "No instagram info"
    });

    return;
  }

  var ig = getInstagramClient();

  ig.use({
    access_token: req.session.instagram.access_token
  });

  ig.user_self_media_recent(function(err, medias, pagination){
    if (err) res.send(err);
    res.send(medias);
  });

});

app.get("/insta_auth", function(req, res){
  var ig = getInstagramClient();

  res.redirect(
    ig.get_authorization_url(
      INSTAGRAM_REDIRECT_URI
    )
  );
});

app.get("/insta_callback", function(req, res){
  var ig = getInstagramClient();

  ig.authorize_user(req.query.code, INSTAGRAM_REDIRECT_URI, function(err, result){
    if (err) {
      res.send(err);
    } else {
      req.session.instagram = result;
      res.redirect("/app");
    }
  });
});

app.listen(PORT, function(){
  console.log("Server running on port " + PORT);
})
