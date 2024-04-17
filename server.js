// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');
// const upload = multer({ dest: "uploads/" }); //multer

 // for logins
const bcrypt = require('bcrypt')
const ROUNDS = 15;

// our modules loaded from cwd

const { Connection } = require('./connection'); //QUESTION - does this need to be .js?
const cs304 = require('./cs304');
const { error } = require('console');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data
app.use(flash());


app.use(serveStatic('public'));
// app.use(express.static('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

//for multer/file upload
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//NEED TO DEBUG
//multer for file upload
app.use('/uploads', serveStatic('uploads'));

function timeString(dateObj) {
    if( !dateObj) {
        dateObj = new Date();
    }
    // convert val to two-digit string
    d2 = (val) => val < 10 ? '0'+val : ''+val;
    let hh = d2(dateObj.getHours())
    let mm = d2(dateObj.getMinutes())
    let ss = d2(dateObj.getSeconds())
    return hh+mm+ss
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length-1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
  })

console.log('Multer configured successfully'); 

//middleware
  var upload = multer({ storage: storage,
    limits: {fileSize: 1_000_000_000 }});

//TBA: where to send it

// app.post("/upload", upload.array("files"), uploadFiles);
// function uploadFiles(req, res) {
//     console.log(req.body);
// }



// ================================================================
// custom routes here

// const DB = process.env.USER;
const DB = 'odyssey';
const ODYSSEY_USERS = 'odyssey_users';
const ODYSSEY_POSTS = 'odyssey_posts';
// const DBNAME = "bcrypt";
// const USERS = "users";

// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);
    return res.render('index.ejs', {uid, visits});
});

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/set-uid/', (req, res) => {
    console.log('in set-uid');
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    res.redirect('/');
});

// shows how logins might work via Ajax
app.post('/set-uid-ajax/', (req, res) => {
    console.log(Object.keys(req.body));
    console.log(req.body);
    let uid = req.body.uid;
    if(!uid) {
        res.send({error: 'no uid'}, 400);
        return;
    }
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    console.log('logged in via ajax as ', req.body.uid);
    res.send({error: false});
});

// conventional non-Ajax logout, so redirects
// app.post('/logout/', (req, res) => {
//     console.log('in logout');
//     req.session.uid = false;
//     req.session.logged_in = false;
//     res.redirect('/');
// });

// two kinds of forms (GET and POST), both of which are pre-filled with data
// from previous request, including a SELECT menu. Everything but radio buttons

app.get('/form/', (req, res) => {
    console.log('get form');
    return res.render('form.ejs', {action: '/form/', data: req.query });
});

app.post('/form/', (req, res) => {
    console.log('post form');
    return res.render('form.ejs', {action: '/form/', data: req.body });
});

app.get('/explore', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('explore.ejs', {uid, visits});
});

app.get('/followers', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('followers.ejs', {uid, visits});
});

app.get('/saved', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('saved.ejs', {uid, visits});
});

app.get('/search', async (req, res) => {
    const searchedCountry = req.query.country;
    const db = await Connection.open(mongoUri, DB);
    const posts = await db.collection(ODYSSEY_POSTS).find({"location.country": searchedCountry}).toArray();
    console.log(posts); // check output
    res.render('searchResults', { posts: posts });
});

app.get('/profile', async (req, res) => {
    const username = req.body.username;
});

// //multer for file upload
// app.use('/uploads', serveStatic('uploads'));

// function timeString(dateObj) {
//     if( !dateObj) {
//         dateObj = new Date();
//     }
//     // convert val to two-digit string
//     d2 = (val) => val < 10 ? '0'+val : ''+val;
//     let hh = d2(dateObj.getHours())
//     let mm = d2(dateObj.getMinutes())
//     let ss = d2(dateObj.getSeconds())
//     return hh+mm+ss
// }

// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'uploads')
//     },
//     filename: function (req, file, cb) {
//         let parts = file.originalname.split('.');
//         let ext = parts[parts.length-1];
//         let hhmmss = timeString();
//         cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
//     }
//   })

// console.log('Multer configured successfully'); 

// //middleware
//   var upload = multer({ storage: storage,
//     limits: {fileSize: 1_000_000_000 }});

// POSTING A POST! We want to 1) add it to the database and 2) have it show up on the Explore and Profile pages of the user.
//Starting with just Explore first!

// app.post('/explore', upload.array('files'), async (req, res) => {

//     try {
//       const formData = req.body;
//       const db = await Connection.open(mongoUri, DB);
  
//       const result = await db.collection(ODYSSEY_POSTS).insertOne({
//         authorID: formData.authorID,
//         timestamp: new Date(),
//         location: {
//           country: formData.country,
//           city: formData.city,
//         },
//         categories: formData.categories,
//         budget: formData.budget,
//         travelType: formData.travelType,
//         rating: formData.rating,
//         content: {
//           text: formData.caption,
//           images: req.files.map(file => file.path)
//         },
//       });   

//       return res.redirect(`/explore`);

//     } //try
//     catch(error) {
//         // res.status(500).send("server error");
//         console.error('Error uploading files:', error);
//         return res.status(500).send("Server error: " + error.message);
//     }
// });

app.post('/explore', upload.array('files'), async (req, res) => {
    try {
        console.log('GOT HERE');
        console.log('Received form submission:', req.body);
        console.log('Uploaded files:', req.files);

        const formData = req.body;
        const db = await Connection.open(mongoUri, DB);
  
        const result = await db.collection(ODYSSEY_POSTS).insertOne({
            authorID: formData.authorID,
            timestamp: new Date(),
            location: {
                country: formData.country,
                city: formData.city,
            },
            categories: formData.categories,
            // categories: Array.isArray(formData.categories) ? formData.categories : [formData.categories],

            budget: formData.budget,
            travelType: formData.travelType,
            rating: formData.rating,
            content: {
                text: formData.caption,
                images: req.files.map(file => file.path)
            },
        });   

        return res.redirect(`/explore`);
    } catch (error) {
        console.error('Error uploading files:', error);
        return res.status(500).send("Server error: " + error.message);
    }
});



// app.post("/explore", async (req, res) => {
//     // examples of flashing
//     const db = await Connection.open(mongoUri, DB);
//     // var existingMovie = await db.collection(MOVIES).find({tt: parseInt(req.body.movieTt)}).toArray();

//     var user = await db.collection(ODYSSEY_USERS).find({authorID: NULL}).toArray();
//     // if (existingMovie.length!=0) {
//     //     req.flash('error', `Error: tt .${req.body.movieTt} in use`);
//     //     console.log(`tt .${req.body.movieTt} in use`);
//     //     return res.render('form.ejs', {movieTt: req.body.movieTt, movieTitle: req.body.movieTitle, movieRelease: req.body.movieRelease});
//     // }
//     // else{
//     //     var ourStaff = await db.collection(STAFF).find({uid: SCOTT}).toArray();
//     //     const result = await db.collection(MOVIES).insertOne({
//     //               tt: parseInt(req.body.movieTt),
//     //               title: req.body.movieTitle,
//     //               release: req.body.movieRelease,
//     //               addedby: ourStaff[0]
//     //     });
//     //     console.log(`This is inserted: ${result.insertedId}`);
//     //     return res.redirect(`/update/${req.body.movieTt}`); //redirect to update
//     // } 
// });


//Code for Login
app.get('/profile', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    if (!req.session.loggedIn) {
        req.flash('error', 'You are not logged in - please do so.');
    }
    return res.render('profile.ejs', {uid, visits});
});

app.get('/loggedIn', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('loggedIn.ejs', {uid, visits, username: req.session.username});
});
  
app.post("/join", async (req, res) => {
try {
    const username = req.body.username;
    const password = req.body.password;
    const db = await Connection.open(mongoUri, DB);
    var existingUser = await db.collection(ODYSSEY_USERS).findOne({username: username});
    if (existingUser) {
        console.log("1");
        req.flash('error', "Login already exists - please try logging in instead.");
        return res.redirect('/profile')
    }
    const hash = await bcrypt.hash(password, ROUNDS);
    await db.collection(ODYSSEY_USERS).insertOne({
        username: username,
        hash: hash
    });
    console.log('successfully joined', username, password, hash);
    req.flash('info', 'successfully joined and logged in as ' + username);
    req.session.username = username;
    req.session.loggedIn = true;
    console.log("2");
    return res.redirect('/loggedIn');
} catch (error) {
    console.log("3");
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/profile')
}
});

app.post("/login", async (req, res) => {
try {
    const username = req.body.username;
    const password = req.body.password;
    const db = await Connection.open(mongoUri, DB);
    var existingUser = await db.collection(ODYSSEY_USERS).findOne({username: username});
    console.log('user', existingUser);
    if (!existingUser) {
    console.log("4");
    req.flash('error', "Username does not exist - try again.");
    return res.redirect('/profile')
    }
    const match = await bcrypt.compare(password, existingUser.hash); 
    console.log('match', match);
    if (!match) {
        req.flash('error', "Username or password incorrect - try again.");
        return res.redirect('/profile')
    }
    console.log("5");
    req.flash('info', 'successfully logged in as ' + username);
    req.session.username = username;
    req.session.loggedIn = true;
    console.log('login as', username);
    return res.redirect('/loggedIn');
} catch (error) {
    console.log("6");
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/profile')
}
});

app.post('/logout', (req,res) => {
if (req.session.username) {
    req.session.username = null;
    req.session.loggedIn = false;
    console.log("7");
    req.flash('info', 'You are logged out');
    return res.redirect('/profile');
} else {
    console.log("8");
    req.flash('error', 'You are not logged in - please do so.');
    return res.redirect('/profile');
}
});



// function requiresLogin(req, res, next) {
// if (!req.session.loggedIn) {
//     req.flash('error', 'This page requires you to be logged in - please do so.');
//     return res.redirect("/");
// } else {
//     next();
// }
// }
    

// app.get('/about', requiresLogin, (req,res) => {
// return res.render('about.ejs', {username: req.session.username});
// });

// app.get('/profile', requiresLogin, (req,res) => {
// return res.render('profile.ejs', {username: req.session.username});
// });

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
