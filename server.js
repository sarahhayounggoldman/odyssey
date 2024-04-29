// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env') });
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');
const fs = require('node:fs/promises');
const { ObjectId } = require('mongodb');


// const upload = multer({ dest: "uploads/" }); //multer

// for logins
const bcrypt = require('bcrypt')
const ROUNDS = 15;

// our modules loaded from cwd

const { Connection } = require('./connection'); 
const cs304 = require('./cs304');
const { error } = require('console');
const { fstat } = require('fs');
const { open } = require('./connection');

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

//session management
app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

//for multer/file upload
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('/students/odyssey/uploads'));

//helper function to convert date object to a string
function timeString(dateObj) {
    if (!dateObj) {
        dateObj = new Date();
    }
    // convert val to two-digit string
    d2 = (val) => val < 10 ? '0' + val : '' + val;
    let hh = d2(dateObj.getHours())
    let mm = d2(dateObj.getMinutes())
    let ss = d2(dateObj.getSeconds())
    return hh + mm + ss
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/students/odyssey/uploads')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length - 1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
})

console.log('Multer configured successfully');

//middleware
var upload = multer({
    storage: storage,
    limits: { fileSize: 1_000_000_000 }
});


// ================================================================
// custom routes here

const DB = 'odyssey';
const ODYSSEY_USERS = 'odyssey_users';
const ODYSSEY_POSTS = 'odyssey_posts';

// main page; this get redirects to login page if not logged in, otherwise shows the home page
app.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        console.log('0');
        req.flash('error', 'You are not logged in - please do so.');
        return res.render('login.ejs');
    } else {
        return res.render('home.ejs', { username: req.session.username });
    }

});

// get request for our form 
app.get('/form/', (req, res) => {
    console.log('get form');
    return res.render('form.ejs', { action: '/form/', data: req.query });
});

// post for our form
app.post('/form/', (req, res) => {
    console.log('post form');
    return res.render('form.ejs', { action: '/form/', data: req.body });
});

// displays sorted posts based on what the user wants to sort by; ex) budget, rating, date/time posted
app.get('/explore', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    let sortOptions = {};
    let queryFilter = {};
    let sort_option = req.query.sort_option || 'recent';  // Default to 'recent' if not specified

    if (sort_option === 'recent') {
        sortOptions.timestamp = -1;
    } else if (sort_option === 'oldest') {
        sortOptions.timestamp = 1;
    } else if (sort_option === 'budget_high') {
        sortOptions.budget = -1;
        queryFilter.budget = { $exists: true, $ne: null };
    } else if (sort_option === 'budget_low') {
        sortOptions.budget = 1;
        queryFilter.budget = { $exists: true, $ne: null };
    } else if (sort_option === 'rating_high') {
        sortOptions.rating = -1;
        queryFilter.rating = { $exists: true, $ne: null };
    } else if (sort_option === 'rating_low') {
        sortOptions.rating = 1;
        queryFilter.rating = { $exists: true, $ne: null };
    } else if (sort_option === 'likes_high') {
        sortOptions.likes = -1;
    } else if (sort_option === 'likes_low') {
        sortOptions.likes = 1;
    }

    const allPosts = await db.collection('odyssey_posts').find(queryFilter).sort(sortOptions).toArray();
    const username = req.session.username;  // Retrieve username from session
    res.render('explore.ejs', { posts: allPosts, username: username, sort_option: sort_option });
});

// renders followers page showing a user's followers
app.get('/followers', async (req, res) => {
    const user = req.session.username;
   
    const db = await Connection.open(mongoUri, DB);
    const userCollection = await db.collection(ODYSSEY_USERS).findOne({ username: user });
    const followers = userCollection.following;
    console.log(followers);
    let allFollowerPosts = [];
   
    for (const follower of followers) {
        const followerPosts = await db.collection(ODYSSEY_POSTS).find({ username: follower }).toArray();
        allFollowerPosts = allFollowerPosts.concat(followerPosts);
    }
   
    return res.render('followers.ejs', {posts: allFollowerPosts, username: req.session.username});
 }); 

// displays a user's saved posts
app.get('/saved', requiresLogin, async (req, res) => {
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    // get user
    const user = await db.collection(ODYSSEY_USERS).findOne({ username: username });
    if (!user) {
        console.error("No user found with username:", username);
        return res.status(404).render('error.ejs', { message: "User not found." });
    }

    // handle case with no saved posts
    if (!user.savedPosts || user.savedPosts.length === 0) {
        return res.render('saved.ejs', { posts: [], message: "You haven't saved any posts yet." });
    }
    const postIds = user.savedPosts.map(id => new ObjectId(id));
    const posts = await db.collection(ODYSSEY_POSTS).find({ _id: { $in: postIds } }).toArray();
    console.log("Fetched posts:", posts);
    res.render('saved.ejs', { posts: posts, username: username });
});

// saves a post to the user's saved page
app.post('/save-post/:postId', requiresLogin, async (req, res) => {
    const postId = req.params.postId;
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);
   
    try {
        const user = await db.collection(ODYSSEY_USERS).findOne({ username: username });
        if (user.savedPosts && user.savedPosts.includes(postId)) {
            return res.status(400).send('Post already saved');
        }

        await db.collection(ODYSSEY_USERS).updateOne(
            { username: username },
            { $addToSet: { savedPosts: postId } }  // Using $addToSet to avoid duplicates
        );
        res.send('Post saved successfully');
    } catch (error) {
        console.error('Error saving post:', error);
        if (!res.headersSent) {
            res.status(500).send("Server error: " + error.message);
        }
    }
});

// searches posts based on user's selected search criteria
app.get('/search', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    let sortOptions = {};
    let sort_option = req.query.sort_option || 'recent'; // Default to 'recent' if not specified
    const searchedCountry = req.query.country; 

    if (sort_option === 'recent') {
        sortOptions.timestamp = -1;
    } else if (sort_option === 'oldest') {
        sortOptions.timestamp = 1;
    } else if (sort_option === 'budget_high') {
        sortOptions.budget = -1;
    } else if (sort_option === 'budget_low') {
        sortOptions.budget = 1;
    } else if (sort_option === 'rating_high') {
        sortOptions.rating = -1;
    } else if (sort_option === 'rating_low') {
        sortOptions.rating = 1;
    } else if (sort_option === 'likes_high') {
        sortOptions.likes = -1;
    } else if (sort_option === 'likes_low') {
        sortOptions.likes = 1;
    }

    let query = {
        "location.country": new RegExp(searchedCountry, 'i')
    };

    const posts = await db.collection('odyssey_posts').find(query).sort(sortOptions).toArray();
    const username = req.session.username; 
    res.render('searchResults.ejs', {
        posts: posts,
        username: username,
        sort_option: sort_option,
        searchedCountry: searchedCountry  
    });
});

// allows users to edit their own posts
app.get('/edit/:postId', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    try {
        const post = await db.collection(ODYSSEY_POSTS).findOne({ _id: new ObjectId(req.params.postId) });
        if (post.username !== req.session.username) {
            req.flash('error', 'You are not authorized to edit this post.');
            return res.redirect('/explore');
        }
        res.render('editPost', { post: post });
    } catch (error) {
        req.flash('error', 'Error fetching post data: ' + error.message);
        res.redirect('/explore');
    }
});

// updates a post in the database
app.post('/update-post/:postId', upload.single('file'), async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const formData = req.body;
    let updateData = {
        location: { country: formData.country, city: formData.city },
        categories: formData.categories,
        budget: formData.budget,
        travelType: formData.travelType,
        rating: formData.rating,
        content: { text: formData.caption, images: formData.images }
    };

    if (req.file) {
        updateData.content.images = req.file.filename; // handle file upload
    }

    await db.collection(ODYSSEY_POSTS).updateOne({ _id: new ObjectId(req.params.postId) }, { $set: updateData });
    req.flash('info', 'Post updated successfully.');
    res.redirect('/explore');
});

// posts a post 
app.post('/explore', upload.single('file'), async (req, res) => {
    try {
        console.log('GOT HERE');
        console.log('Received form submission:', req.body);
        console.log('Uploaded files:', req.file);

        const formData = req.body;
        const db = await Connection.open(mongoUri, DB);

        //change file perms
        let val = await fs.chmod('/students/odyssey/uploads/' + req.file.filename, 0o664);
        console.log('chmod val', val);

        const result = await db.collection(ODYSSEY_POSTS).insertOne({
            username: req.session.username,
            timestamp: new Date(),
            location: {
                country: formData.country,
                city: formData.city,
            },
            categories: formData.categories,

            budget: formData.budget,
            travelType: formData.travelType,
            rating: formData.rating,
            content: {
                text: formData.caption,
                images: req.file.filename
            },
            likes: 0
        });
        const posts = await db.collection(ODYSSEY_POSTS).find({}).toArray();
        return res.render('explore.ejs', { posts, username: req.session.username });

    } catch (error) {
        console.error('Error uploading files:', error);
        return res.status(500).send("Server error: " + error.message);
    }
});

// handles Ajax requests for liking a post, checking to make sure the user hasn't already liked the post
app.post('/likeAjax/:postId', async (req, res) => {
    const postId = req.params.postId;
    const username = req.session.username;

    const db = await Connection.open(mongoUri, DB);
    const user = await db.collection(ODYSSEY_USERS).findOne({ username: username });

    // if user has already liked the post
    if (user.likedPosts && user.likedPosts.map(id => id.toString()).includes(postId.toString())) {
        console.log("User already liked this post.");
        return res.status(400).json({ error: true, message: 'You already liked this post!' });
    }
    // else like the post
    const doc = await likePost(postId);
    await db.collection(ODYSSEY_USERS).updateOne(
        { _id: user._id },
        { $addToSet: { likedPosts: postId } }
    );

    return res.json({ error: false, likes: doc.likes, postId: postId });
});

// increments the like count of a post in the database
async function likePost(postId) {
    const db = await Connection.open(mongoUri, DB);
    const post = await db.collection(ODYSSEY_POSTS).findOne({ _id: new ObjectId(postId) });
    console.log(postId);
    if (post) {
        console.log(post.likes);
        const updatedLikes = post.likes ? post.likes + 1 : 1;
        await db.collection(ODYSSEY_POSTS).updateOne({ _id: new ObjectId(postId) }, { $set: { likes: updatedLikes } });
        return { likes: updatedLikes, postId: postId };
    } else {
        throw new Error('Post not found');
    }
}


// middleware to check permissions and make sure users are logged in before accessing pages with other users' info
function requiresLogin(req, res, next) {
    if (!req.session.loggedIn) {
        req.flash('error', 'This page requires you to be logged in - please do so.');
        return res.redirect("/");
    } else {
        next();
    }
}

// Displays user profile page with posts, bio, and username
app.get('/profile', async (req, res) => {
    const user = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    const posts = await db.collection(ODYSSEY_POSTS).find({ "username": user }).toArray();
    const onePerson = await db.collection(ODYSSEY_USERS).find({ "username": user }).toArray();
    let person = onePerson[0]
    // const bio = person.bio;
    const followers = person.followers;
    const following = person.following;
    console.log(posts); // check output
    return res.render('profile.ejs',
        {
            username: req.session.username,
            posts: posts,
            bio: person.bio,
            followers: followers.length,
            following: following.length
        }
    );
});


app.get('/signup', (req, res) => {
    return res.render('signUp.ejs');
});

// sign up new users
app.post("/signup", async (req, res) => {
    try {
        const email = req.body.email;
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DB);
        var existingUser = await db.collection(ODYSSEY_USERS).findOne({ username: username });
        // make sure user doesn't already have an account
        if (existingUser) {
            req.flash('error', "Login already exists - please try logging in instead.");
            return res.redirect('/')
        }
        const hash = await bcrypt.hash(password, ROUNDS);
        await db.collection(ODYSSEY_USERS).insertOne(
            {
                username: username,
                email: email,
                bio: '',
                followers: [],
                following: [],
                postIDs: [],
                hash: hash
            }
        );
        console.log('successfully joined', username, password, hash);
        req.flash('info', 'successfully joined and logged in as ' + username);
        req.session.username = username;
        req.session.loggedIn = true;
        return res.redirect('/');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});

//log in users
app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DB);
        var existingUser = await db.collection(ODYSSEY_USERS).findOne({ username: username });
        console.log('user', existingUser);
        if (!existingUser) {
            req.flash('error', "Username does not exist - try again.");
            return res.redirect('/')
        }
        const match = await bcrypt.compare(password, existingUser.hash);
        console.log('match', match);
        if (!match) {
            req.flash('error', "Username or password incorrect - try again.");
            return res.redirect('/')
        }
        req.flash('info', 'successfully logged in as ' + username);
        req.session.username = username;
        req.session.loggedIn = true;
        console.log('login as', username);
        return res.redirect('/');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});

// log out users
app.post('/logout', (req, res) => {
    if (req.session.username) {
        req.session.username = null;
        req.session.loggedIn = false;
        req.flash('info', 'You are logged out.');
        return res.redirect('/');
    } else {
        req.flash('error', 'You are not logged in - please do so.');
        return res.redirect('/');
    }
});

//allows users to edit their own profiles (edit username and bio)
app.get('/editprofile', async (req, res) => {
    // return res.render('editProfile.ejs');
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    try {
        const person = await db.collection(ODYSSEY_USERS).findOne({ username: username });
        const bio = person.bio;
        res.render('editProfile.ejs', { username: username, bio: bio });
    } catch (error) {
        req.flash('error', 'Error fetching profile data: ' + error.message);
        res.redirect('/explore');
    }
});

// updates user's edited profile
app.post("/editprofile", async (req, res) => {
    try {
        const username = req.session.username;
        const newUsername = req.body.newUsername;
        const bio = req.body.bio;
        const db = await Connection.open(mongoUri, DB);
        var existingUser = await db.collection(ODYSSEY_USERS).updateOne({ username: username }, { $set: { bio: bio, username: newUsername } });
        if (existingUser) {
            req.flash('info', "Updated succesfully.");
            req.session.username = newUsername;
            return res.redirect('/profile')
        }
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function () {
    console.log(`open http://localhost:${serverPort}`);
});