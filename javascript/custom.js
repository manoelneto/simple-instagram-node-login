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
    var $loadingChild = $el;

    $loadingChild.addClass('loading').removeClass("loaded");

    $.ajax({
      url: "/api/hashtags/" + hashtag,
      success: function(data) {
        if (data.length === 0) {
          $el.find('.instagram-posts-list').html("We don`t has post for this hashtag :(");
          return;
        }

        var postsRendered = data.map(function(post){
          if (post.caption && post.caption.text) {
            post.caption_text = post.caption.text
          }

          post.created_time_str = new Date(parseInt(post.created_time)).shortDate();

          return Mustache.render(postTemplate, post);
        });

        $el.find('.instagram-posts-list').html(postsRendered.join("\n"));
      },
      error: function() {
        alert("Could not load hashtag: " + hashtag);
      },
      complete: function() {
        $loadingChild.removeClass('loading').addClass("loaded");
      }
    })
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
