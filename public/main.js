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

// like button handler
$(document).ready(function() {
    $(".likeBtn").on('click', function(event) {
        var postId = $(this).closest("[data-post-id]").attr("data-post-id");
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
    $(`[data-post-id=${resp.postId}]`).find('.likeCounter').text(resp.likes);
}

// function likePost(postId) {
//     console.log("got here to likePost");
//     $.post("/likeAjax/" + postId, { postId: postId }).then(processAction);
// }
// function processAction(resp) {
//     console.log('response is ',resp);
//     if (resp.error) {
//         alert('Error: '+resp.error);
//     }
//     console.log("Liked movie "+resp.id+". Total likes: "+resp.likes);
//     $(`[data-id=${resp.id}]`).find('.likeCounter').text(resp.likes);
// }

// function likePost(postId) {
//     $.post("/explore", { postId: postId }).then(processAction);
// }

console.log('main.js loaded');

