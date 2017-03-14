var instagram = require("instagram-node"),
    INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

var InstagramHashtagCommentsCrawler = function(hashtag) {
  this.hashtag = hashtag;
  this.mediasCollecteds = [];
  this.calls = 0;
  this.maxCallCount = Infinity;

  return this;
}

InstagramHashtagCommentsCrawler.prototype.getClient = function() {
  if (!this.client) {
    this.client = instagram.instagram();

    this.client.use({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      access_token: this.access_token
    });
  }

  return this.client;
}

InstagramHashtagCommentsCrawler.prototype.setAccessToken = function(access_token) {
  this.access_token = access_token
}


InstagramHashtagCommentsCrawler.prototype.getFirstPromiseCollect = function() {
  var _this = this;

  return function() {
    return new Promise(function(resolve, reject){
      _this.getClient().tag_media_recent(_this.hashtag, function(err, medias, pagination, remaining, limit) {
        if (err) {
          console.log(err);
          resolve([[],{}]);
          return;
        }

        resolve([medias, pagination]);
      });
    });
  }
}

InstagramHashtagCommentsCrawler.prototype.getPaginationNextPromise = function(pagination) {
  return function() {
    return new Promise(function(resolve, reject){

      pagination.next(function(err, medias, pagination, remaining, limit) {
        if (err) {
          resolve([[], {}]);
          return;
        }

        resolve([medias, pagination]);
      });

    });
  }
}


// function a(urlToFetch, data) {
//   return new Promise(function(resolve, reject){
//     response = fetch(urlToFetch);

//     // codigo aqui
//     if (response.hasMore) {
//       a(response.nextUrl, data.concat(response.data)).then(resolve).catch(reject);
//     } else {
//       resolve(data.concat(response.data));
//     }
//   })
// }

// a(url, []);

// retorna uma promise
// que retorna um array com todos os comentarios
InstagramHashtagCommentsCrawler.prototype.collectLoop = function(collectPromiseFunc, memo) {
  var _this = this;

  return new Promise(function(resolve, reject){
    _this.calls += 1;

    // recursividade de promise
    // isso é chamado no run, funciona tipo um reduce
    // a diferença é que, ao inves de retornar um resultado pronto, é retornado uma promise
    // tem o memo, assim com o reduce
    // vai ser retornado ele mais os dados que forem coletados.
    collectPromiseFunc().then(function(response){
      var medias = response[0],
          pagination = response[1];

      if (pagination.next && _this.calls < _this.maxCallCount) {
        _this.collectLoop(
          _this.getPaginationNextPromise(pagination),
          memo.concat(medias)
        ).then(resolve).catch(reject)
      } else {
        resolve(memo.concat(medias));
      }

    }).catch(function(){
      console.log(arguments);
      resolve(memo);
    });
  });
}

InstagramHashtagCommentsCrawler.prototype.run = function() {
  var _this = this;
  return new Promise(function(resolve, reject){

    _this.collectLoop(_this.getFirstPromiseCollect(), []).then(function(medias){
      mediasWithComments = medias.filter(function(media){
        return media.comments.count > 0;
      });

      var promises = mediasWithComments.map(function(media){
        return new Promise(function(resolve, reject){
          _this.getClient().comments(media.id, function(err, result, remaining, limit){
            if (err) {
              console.log(err);
              resolve([]);
              return;
            }
            resolve(result);
          });
        });
      });

      Promise.all(promises).then(resolve).catch(reject);
    }).catch(reject);
  });

}


module.exports = InstagramHashtagCommentsCrawler


