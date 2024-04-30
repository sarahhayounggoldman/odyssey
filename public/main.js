"use strict";

var g;

function nextIfOk(resp) {
    g = resp;
    console.log('response received');
    if(resp.status === 200) {
        return resp.json();
    } else {
        throw new Error('Something went wrong on server!');
    }
}

function loginAjax() {
    let uid = $('[name=uid]').val();
    let form = document.getElementById('login_form');
    console.log('form', form);
    let form_data = new FormData(form);
    console.log('data', form_data);
    const req = new Request('/set-uid-ajax/', {method: 'POST',
                                               body: form_data});
    fetch(req)
        .then(nextIfOk)
        .then((resp) => { console.debug(resp);
                          // update page for logged-in user
                          $("#login-uid").text(uid);
                          $("#logged-in").show();
                          $("#not-logged-in").hide();
                        })
        .catch((error) => { console.error(error); });
}

$("#login-ajax").click(loginAjax);


//likes 
$(document).ready(function() {
    $('body').on('click', '.likeBtn', function() {
        var postId = $(this).closest("[data-post-id]").attr("data-post-id");
        //var postId = $(this).data('post-id') || $(this).closest('[data-post-id]').attr('data-post-id');
        likePost(postId);
    });
});

function likePost(postId) {
    console.log("got here to likePost");
    $.post("/likeAjax/" + postId, { postId: postId }).then(processAction);
}

function processAction(resp) {
    console.log('response is ',resp);
    if (resp.error) {
        alert('Error: '+resp.error);
    }
    console.log("Liked post "+resp.postId+". Total likes: "+resp.likes);
    console.log(resp.postId);
    $(`[data-post-id=${String(resp.postId)}]`).closest(".post-container").find('.likeCounter').text(resp.likes);
}

//save button handler
$(document).ready(function() {
    $('.save-post-button').click(function() {
        var postId = $(this).data('post-id');
        $.post('/save-post/' + postId, function(data) {
            alert('Post saved successfully!');
        }).fail(function(response) {
            alert('Error saving post: ' + response.responseText);
        });
    });
});

//follow button handler
$(document).ready(function() {
    $('.follow-button').click(function() {
        var username = $(this).data('username');
        console.log(username);
        $.post('/follow/' + username, function(data) {
            alert('Followed successfully!');
        }).fail(function(response) {
            alert('Error following user: ' + response.responseText);
        });
    });
}); 

//for converting time to user's clock
document.addEventListener('DOMContentLoaded', function () {
    const dateTimeElements = document.querySelectorAll('.date-time');

    dateTimeElements.forEach(element => {
      const timestamp = element.getAttribute('data-timestamp');
      const date = new Date(timestamp);
      const formattedDate = date.toLocaleString('default', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      element.textContent = formattedDate;
    });
});


//comments
$(document).ready(function() {
    $('body').on('click', '.sendComment', function() {
        // var postId = $(this).closest("[data-post-id]").attr("data-post-id");
        // var comment = $(this).closest('.comment-section').find('.comment').val(); 
        // addComment(postId, comment);
        var postId = $(this).closest("form").attr("data-post-id");
        var commentText = $(this).closest("form").find('input[name="comment"]').val();  
        addComment(postId, commentText);
    });
});

function addComment(postId, comment) {
    $.post("/commentAjax/" + postId, { comment: comment }).then(processAction);
}

function processAction(resp) {
    if (resp.error) {
        alert('Error: ' + resp.error);
    } else {
        const postContainer = $(`[data-post-id="${resp.postId}"]`).closest(".post-container");

        const commentDiv = $('<div>').addClass('comment');
        const commentP = $('<p>').text(resp.comment.text);
        const commentUser = $('<small>').text(`Comment by: ${resp.comment.userId}`);

        commentDiv.append(commentP).append(commentUser);
        postContainer.find('.comments-section').append(commentDiv);
        postContainer.find('input[name="comment"]').val(''); 
    }
}


console.log('main.js loaded');

//For managing the dropdown of editing and deleting a post. 
document.addEventListener('DOMContentLoaded', function() {
    var settingsButtons = document.querySelectorAll('.settings-btn');
    settingsButtons.forEach(function(btn) {
        btn.addEventListener('click', function(event) {
            var dropdown = this.nextElementSibling;
            if (dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            } else {
                dropdown.style.display = 'block';
            }
            event.stopPropagation();
        });
    });

    window.addEventListener('click', function() {
        var dropdowns = document.querySelectorAll('.settings-dropdown');
        dropdowns.forEach(function(dropdown) {
            dropdown.style.display = 'none';
        });
    });
});


