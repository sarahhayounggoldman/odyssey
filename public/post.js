const form = document.getElementById("post-form");

form.addEventListener("submit", submitForm);

function submitForm(e) {
  e.preventDefault();

//TEST form elt exists
  console.log("Form:", form);

  
  const formData = new FormData(form);

  console.log("FormData:", formData);

  formData.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });

  fetch("http://localhost:9132/explore", {
      method: 'POST',
      body: formData,
  })
  .then((res) => console.log(res))
  .catch((err) => console.error("Error occurred", err));
}

// const form = document.getElementById("post-form");

// form.addEventListener("submit", submitForm);

// function submitForm(e) {
//   e.preventDefault();

//   const form = document.getElementById("post-form");
//   const formData = new FormData(form);
//   console.log(formData);


//   fetch("http://localhost:9132/explore", {
//       method: 'POST',
//       body: formData, 
//   })
//   .then((res) => console.log(res))
//   .catch((err) => console.error("Error occurred", err));
// }


//OLD: 
// function submitForm(e) {
//     e.preventDefault();

//     const formData = new FormData(form);

//     const country = formData.get("country");
//     const city = formData.get("city");
//     const categories = formData.getAll("categories");
//     const budget = formData.get("budget");
//     const travelType = formData.get("travelType");
//     const rating = formData.get("rating");
//     const caption = formData.get("caption");
//     const files = formData.getAll("files");

//     const data = {
//         location: {
//             country: country,
//             city: city
//         },
//         categories: categories,
//         budget: budget,
//         travelType: travelType,
//         rating: parseInt(rating), 
//         content: {
//             text: caption,
//             images: files.length > 0 ? files : null, // are the files uploaded??
//             likes: 0,
//             comments: null
//         }
//     };
//     console.log(data);

//     fetch("http://localhost:9132/explore", {
//         method: 'POST',
//         body: JSON.stringify(data),
//         headers: {
//             "Content-Type": "application/json"
//         }
//     })
//     .then((res) => console.log(res))
//     .catch((err) => console.error("Error occurred", err));
// }

//OLD ENDS HERE



// const form = document.getElementById("post-form");

// form.addEventListener("submit", submitForm);

// function submitForm(e) {
//     e.preventDefault();

//     //get all data
//     const country = document.getElementById("country");
//     const city = document.getElementById("city");
//     // const categories = document.getElementById(categories);
//     // const categories = [];
//     // const checked = form.querySelectorAll('input[type="checkbox"][name="categories"]');
//     // checked.forEach(checkbox => {
//     //   if (checkbox.checked) {
//     //     categories.push(checkbox.value);
//     //   }
//     // });
//     const categories = [];
//     const checkedCheckboxes = form.querySelectorAll('input[type="checkbox"][name="categories"]:checked');
//     checkedCheckboxes.forEach(checkbox => {
//         categories.push(checkbox.value);
//     });
//     const budget = document.getElementById("budget");
//     const travelType = document.getElementById("travelType");
//     const rating = document.getElementById("rating");
//     const files = document.getElementById("files");
//     const caption = document.getElementById("caption");

//     const formData = new FormData(form);

//     formData.append("country", country.value);
//     formData.append("city", city.value);
//     formData.append("categories", JSON.stringify(categories));
//     formData.append("budget", budget.value);
//     formData.append("travelType", travelType.value);
//     formData.append("rating", rating.value);
//     formData.append("files", files.value);
//     formData.append("caption", caption.value);



//     fetch("http://localhost:9132/explore", {
//         method: 'POST',
//         body: formData,
//         headers: {
//           "Content-Type": "multipart/form-data"
//         }
//     })
//         .then((res) => console.log(res))
//         .catch((err) => console.error("Error occurred", err));
// }

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