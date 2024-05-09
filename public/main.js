"use strict";

var g;

// Function to handle the AJAX response, checking if it's okay (status 200)
function nextIfOk(resp) {
    g = resp;
    console.log('response received');
    if(resp.status === 200) {
        return resp.json();
    } else {
        throw new Error('Something went wrong on server!');
    }
}

// Handles login using Ajax, getting user ID from login form input
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


// Likes handler (when a like button on a post is clicked)
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

// Processes like action response
function processAction(resp) {
    console.log('response is ',resp);
    if (resp.error) {
        alert('Error: '+resp.error);
    }
    const postId = resp.postId;
    const postContainer = $(`[data-post-id="${postId}"]`).closest(".post-container");
    const likeBtn = postContainer.find('.likeBtn');

    if (likeBtn.text() === "❤️ like!") {
        likeBtn.text("❤️ unlike");
    } else {
        likeBtn.text("❤️ like!");
    }

    console.log("Liked post " + postId + ". Total likes: " + resp.likes);
    postContainer.find('.likeCounter').text(resp.likes);
}

// Save button handler, saving a post to the saved page when "save" button clicked
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

// Follow button handling: follow a user when the follow button is clicked
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

// Converting time to user's clock for each post on load
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


// Add a comment using Ajax
$(document).ready(function() {
    $('body').on('click', '.sendComment', function() {
        var postId = $(this).closest("form").attr("data-post-id");
        var commentText = $(this).closest("form").find('input[name="comment"]').val();  
        addComment(postId, commentText);
    });
});

function addComment(postId, comment) {
    $.post("/commentAjax/" + postId, { comment: comment }).then(processActionComments);
}

function processActionComments(resp) {
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

// Manages the dropdown for editing and deleting posts: show/hide on click
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
            event.stopPropagation(); // Prevent the click from propagating to other elements
        });
    });

    // Close all dropdowns when clicking anywhere else on the page
    window.addEventListener('click', function() {
        var dropdowns = document.querySelectorAll('.settings-dropdown');
        dropdowns.forEach(function(dropdown) {
            dropdown.style.display = 'none';
        });
    });
});


