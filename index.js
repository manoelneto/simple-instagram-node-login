require('dotenv').config();

var express = require("express"),
    session = require("express-session"),
    instagram = require("instagram-node"),
    path = require("path"),
    redis = require("redis"),
    redisStore = require('connect-redis')(session),
    bodyParser = require('body-parser'),
    flatten = require('flatten'),
    InstagramHashtagCommentsCrawler = require('./lib/instagram_hashtag_comments_crawler'),

    app = express(),

    PORT = process.env.PORT || "8080",
    SESSION_SECRET = process.env.SESSION_SECRET,
    URL = process.env.URL,
    INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET,
    INSTAGRAM_REDIRECT_URI = "http://"+URL+"/insta_callback",
    INSTAGRAM_API = "https://api.instagram.com/v1",
    REDIS_URL = process.env.REDIS_URL,
    REDIS_PASSWORD = process.env.REDIS_PASSWORD;

var TOKENS_NOT_PERMITED = ["que", "o", "a", "e", "é", "eh", "i", "não", "de", "pra",
"para", "q", "em", "essa", "da", "esse", "se", "no", "ele", "tem", "do", "the", "k",
"kk", "kkk", "kkkk", "kkkkk", "kkkkkk", "you", 'he', "him", "his", "her",
"she", "com", "muito", "vc", "vcs", "você", "voce"];

function getInstagramClient() {
  var ig = instagram.instagram();

  ig.use({
    client_id: INSTAGRAM_APP_ID,
    client_secret: INSTAGRAM_APP_SECRET
  });

  return ig;
}

function getAccessToken(req) {
  // returning elife
  // return process.env.INSTAGRAM_ACCESS_TOKEN || req.session.instagram.access_token;
  return req.session.instagram.access_token;
}

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");

var redis_opt = {
  url: REDIS_URL,
};

if (REDIS_PASSWORD) {
  redis_opt.password = REDIS_PASSWORD;
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new redisStore(redis_opt)
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/javascript', express.static(__dirname + '/javascript'));
app.use('/stylesheet', express.static(__dirname + '/stylesheet'));
app.use('/plugins', express.static(__dirname + '/plugins'));
app.use('/image', express.static(__dirname + '/image'));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/app", function(req, res){
  if (!req.session.instagram) {
    res.redirect("/insta_auth");
    return;
  }

  res.render("app");
});

app.get("/hashtags/add", function(req, res){
  if (!req.session.instagram) {
    req.session.back_url = "/hashtags/add";
    res.redirect("/insta_auth");
    return;
  }

  res.render("hashtags_add");
});


app.get("/hashtags", function(req, res){
  if (!req.session.instagram) {
    req.session.back_url = "/hashtags";
    res.redirect("/insta_auth");
    return;
  }

  var hashtags = [];

  if (!req.session.hashtags) {
    res.redirect('/hashtags/add');
    return;
  }

  hashtags = req.session.hashtags.split(",");

  res.render("hashtags", {hashtags: hashtags});
});

app.get("/api/photos", function(req, res){
  if (!req.session.instagram) {
    res.status(422).send({
      error: true,
      message: "No instagram info"
    });

    return;
  }

  var ig = getInstagramClient();

  ig.use({
    access_token: getAccessToken(req)
  });

  ig.user_self_media_recent(function(err, medias, pagination){
    if (err) res.send(err);
    res.send(medias);
  });

});

app.get("/api/comments/:hashtag", function(req, res){
  if (!req.session.instagram) {
    res.status(422).send({
      error: true,
      message: "No instagram info"
    });

    return;
  }


  var crawler = new InstagramHashtagCommentsCrawler(req.params.hashtag);
  crawler.setAccessToken(getAccessToken(req));
  crawler.maxCallCount = 10;

  crawler.run().then(function(medias){

    var finalResultAux = flatten(medias).reduce(function(memo, item){
      if (item.text) {
        var tokens = item.text.split(" ");
        // console.log(item.text);

        tokens.forEach(function(token){
          if (token.length > 0) {
            if (token[0] === "@" || token[0] === "#" || isNaN(token) === false ) {
              return true;
            }

            if ( TOKENS_NOT_PERMITED.indexOf(token.toLowerCase()) !== -1 ) {
              return true;
            }

            token = token.toLowerCase();

            if (!memo[token]) {
              memo[token] = 0;
            }

            memo[token] += 1;
          }
        });
      }

      return memo;
    }, {});

    var finalResult = [];

    for (var k in finalResultAux) {
      if (finalResultAux.hasOwnProperty(k)) {
        finalResult.push([k, finalResultAux[k]]);
      }
    }

    finalResult.sort(function(a, b){
      if (a[1] > b[1]) {
        return 1;
      } else if  (a[1] < b[1]) {
        return -1;
      } else {
        return 0;
      }
    }).reverse();

    res.send(finalResult);
  }).catch(function(){
    res.send(arguments);
  });

  // var ig = getInstagramClient();

  // ig.use({
  //   access_token: getAccessToken(req)
  // });

  // ig.tag_media_recent(req.params.hashtag, function(err, medias, pagination, remaining, limit) {
  //   // res.send(result);
  //   if (medias.length === 0) {
  //     res.send({no_data: ture});
  //     return;
  //   }

  //   console.log("begin tag_media_recent");
  //   console.log(medias);
  //   console.log(pagination);
  //   console.log(remaining);
  //   console.log(limit);
  //   console.log("end tag_media_recent");

  //   var promises = medias.map(function(media){
  //     return new Promise(function(resolve, reject){
  //       ig.comments(media.id, function(err, result, remaining, limit){
  //         if (err) reject(err);
  //         console.log("begin comments " + media.id);
  //         console.log(result);
  //         console.log(remaining);
  //         console.log(limit);
  //         console.log("end comments " + media.id);
  //         resolve(result);
  //       });
  //     });
  //   });

  //   Promise.all(promises).then(function(result){

  //     var finalResult = flatten(result).reduce(function(memo, item){
  //       if (item.text) {
  //         var tokens = item.text.split(" ");
  //         console.log(item.text);

  //         tokens.forEach(function(token){
  //           if (!memo[token]) {
  //             memo[token] = 0;
  //           }

  //           memo[token] += 1;
  //         });
  //       }

  //       return memo;
  //     }, {});

  //     res.send(finalResult);
  //   }).catch(function(){
  //     res.status(500).send(arguments);
  //   });

  // });


});

app.get("/insta_auth", function(req, res){
  var ig = getInstagramClient();

  res.redirect(
    ig.get_authorization_url(
      INSTAGRAM_REDIRECT_URI, {
        scope: ["follower_list", "public_content"]
      }
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
      if (req.session.back_url) {
        res.redirect(req.session.back_url);
      } else {
        res.redirect("/hashtags");
      }
    }
  });
});

app.post('/api/hashtags', function(req, res){
  if (!req.body.hashtag) {
    res.status(422).send({message: "You must provide a hashtag"});
    return;
  }

  var hashtags = (req.session.hashtags || "").split(',');

  hashtags = hashtags.concat(req.body.hashtag.split(","));

  hashtags = hashtags.filter(function(item, pos) {
    // uniq and clean
    return item && hashtags.indexOf(item) == pos;
  });

  req.session.hashtags = hashtags.join(",");

  res.status(201).end();
});

app.delete('/api/hashtags/:hashtag', function(req, res){
  if (!req.params.hashtag) {
    res.status(422).send({message: "You must provide a hashtag"});
    return;
  }

  var hashtags = (req.session.hashtags || "").split(',');

  var hashtagsToDestroy = req.params.hashtag.split(',');

  hashtags = hashtags.filter(function(hashtag){
    // I want to keep hashtags thas istn`t in hashtag to destroy
    return hashtagsToDestroy.indexOf(hashtag) === -1;
  });

  req.session.hashtags = hashtags.join(",");

  res.status(200).end();
});

app.get('/api/hashtags/:hashtag', function(req, res){
  var hashtag = req.params.hashtag;

  if (!req.session.instagram) {
    res.status(422).send({
      error: true,
      message: "No instagram info"
    });

    return;
  }

  var ig = getInstagramClient();

  ig.use({
    access_token: getAccessToken(req)
  });

  ig.tag_media_recent(hashtag, function(err, result, remaining, limit) {
    res.send(result);
  });

});

app.listen(PORT, function(){
  console.log("Server running on port " + PORT);
})
