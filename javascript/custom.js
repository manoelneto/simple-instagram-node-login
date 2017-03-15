Date.prototype.shortDate = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('-');
};

if ($('.hashtag-form').length) {
  $('.hashtag-form').on("submit", function(e){
    e.preventDefault();
    var hashtag = $("[name='hashtags_to_monitor']").val();

    if (!hashtag) {
      alert("You must provide a hashtag");
      return;
    }

    $.ajax({
      url: "/api/hashtags",
      method: "post",
      data: {
        hashtag: hashtag
      },
      success: function() {
        window.location.href = '/hashtags';
      },
      error: function() {
        alert("Can`t save your hashtag");
      }
    })

  });
}

if ($('.hashtag-page').length) {

  var postTemplate = $('#post-template').html();

  function loadHashTagContent(hashtag, $el) {
    var $loadingPostsChild = $el.find('.loading-posts'),
        $loadingGraphChild = $el.find('.loading-graph');

    $loadingPostsChild.addClass('loading').removeClass("loaded");
    $loadingGraphChild.addClass('loading').removeClass("loaded");
    $el.find(".instagram-graph").html("");

    $.ajax({
      url: "/api/hashtags/" + hashtag,
      success: function(data) {
        if (data.length === 0) {
          $el.find('.instagram-posts-list').html("We don`t have post for this hashtag :(");
          return;
        }

        var postsRendered = data.map(function(post){
          if (post.caption && post.caption.text) {
            post.caption_text = post.caption.text
          }

          post.created_time_str = new Date(parseInt(post.created_time) * 1000).shortDate();

          return Mustache.render(postTemplate, post);
        });

        $el.find('.instagram-posts-list').html(postsRendered.join("\n"));
      },
      error: function() {
        $el.find('.instagram-posts-list').html("Could not load hashtag");
      },
      complete: function() {
        $loadingPostsChild.removeClass('loading').addClass("loaded");
      }
    });

    $.ajax({
      url: "/api/comments/" + hashtag,
      success: function(data) {
        if (data.constructor.name !== "Array") {
          $el.find(".instagram-graph").css("height", "");
          $el.find(".instagram-graph").html("Could not load this chart");
          return;
        }

        $el.find(".instagram-graph").height(200);

        setTimeout(function(){

          $.plot($el.find(".instagram-graph")[0], [{
            color: '#3b5998',
            data: data.filter(function(d, i){
              return i <= 5;
            })
          }], {
            series: {
              bars: {
                show: true,
                barWidth: 0.6,
                align: "center"
              }
            },
            xaxis: {
              mode: "categories",
              tickLength: 0
            }
          });

        }, 100);

      },
      error: function() {
        $el.find(".instagram-graph").css("height", "");
        $el.find(".instagram-graph").html("Could not load this chart");
        return;
      },
      complete: function() {
        $loadingGraphChild.removeClass('loading').addClass("loaded");
      }
    });
  }

  $('.hashtag').each(function(){
    loadHashTagContent($(this).data('hashtag'), $(this));
  });

  $('.option .btn-reload').on("click", function(){
    loadHashTagContent($(this).parents('.hashtag').data("hashtag"), $(this).parents('.hashtag'));
  });

  $('.option .btn-remove').on("click", function(e){
    e.preventDefault();

    if (confirm("Are you sure?")) {
      var hashtag = $(this).parents('.hashtag').data('hashtag');
      $(this).parents('.hashtag').remove();

      $.ajax({
        method: "DELETE",
        url: "/api/hashtags/" + hashtag,
        error: function() {
          alert("Error on removing hashtag: " + hashtag);
        }
      });
    }
  });
}
