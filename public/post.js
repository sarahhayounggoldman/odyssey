const form = document.getElementById("post-form");

form.addEventListener("submit", submitForm);

function submitForm(e) {
    e.preventDefault();
    const formData = new FormData(form);
    fetch("http://localhost:9132/explore", {
        method: 'POST',
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data"
        }
    })
        .then((res) => console.log(res))
        .catch((err) => console.error("Error occurred", err));
}

// function submitForm(e) {
//     e.preventDefault();
//     const formData = new FormData();
//     const form = document.getElementById("post-form");
//     const name = formData.get("name");
//     const files = document.getElementById("files");

//     formData.append("name", name.value);
//     // for(let i =0; i < files.length; i++) {
//     //         formData.append("photos", files.files[i]);
//     // }
//     for (let i = 0; i < files.length; i++) {
//         formData.append("files", files.get(i));
//     }
//     fetch("http://localhost:9132/explore", {
//         method: 'POST',
//         body: formData,
//         headers: {
//           "Content-Type": "multipart/form-data"
//         }
//     })
//         .then((res) => console.log(res))
//         .catch((err) => console.error("Error occured", err));
// }