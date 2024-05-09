// Authors: Annie Chen, Sarah Goldman, Catherine Mi, Bellen Wong
// Start code from Scott D. Anderson

// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, 
// your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?',
// type 'y', then press the enter key in the same terminal

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

// bcrypt for logins
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

// configure Multer to write to a single, shared folder
// by supplying an *absolute* pathname
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

// Use these constants to access the database
const DB = 'odyssey';
const ODYSSEY_USERS = 'odyssey_users';
const ODYSSEY_POSTS = 'odyssey_posts';

/**
 * (GET) Renders the login page to input login credentials
 * Redirects to home if already logged into session
 */
app.get('/', async(req, res) => {
    if (!req.session.loggedIn) {
        req.flash('error', 'You are not logged in - please do so.');
        return res.render('login.ejs');
    }else{
        return res.redirect("/home");
    }
});

/**
 * (GET) Renders the home page
 * Home page contains nav bar, welcome message, and 
 * posts of users you are following
 */
app.get('/home', requiresLogin, async(req, res) => {
    const user = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    const person= await db.collection(ODYSSEY_USERS)
        .findOne({ username: user });
    const following = person.following;
    
    const promises = [];
    following.forEach(async (username) => {
        // Add promise into the array
        promises.push(db.collection(ODYSSEY_POSTS)
            .find({ "username": username }).toArray());
    });

    // Promises need to resolve
    Promise.all(promises)
            // postsArray is an array of arrays of posts for each user
        .then((postsArray) => {
            // Flatten into a single array of posts
            const posts = postsArray.flat();
            
            // Sort posts by time posted
            posts.sort((a, b) => b.timestamp - a.timestamp);

            res.render('home.ejs', { 
                username: req.session.username, 
                following: following, 
                posts: posts 
            });
        })
        .catch((error) => {
            console.error('Error fetching posts:', error);
        });
        }

);

/**
 * (GET) Renders the blank form for a user to post a post
 */
app.get('/form/', requiresLogin, (req, res) => {
    // Get the referer from the request headers
    const referer = req.get('referer');
    return res.render('form.ejs', { 
        action: '/form/', 
        data: req.query, 
        referer:referer 
    });
});

/**
 * (POST) This route receives form data from a user submission 
 * to create a new post. After receiving the form data, it 
 * renders the form page again, passing back the data.
 */
app.post('/form/', (req, res) => {
    return res.render('form.ejs', { 
        action: '/form/', 
        data: req.body
    });
});

/**
 * (GET) Renders the explore page to recommend posts to users
 * Explore page displays posts of all users with a sorting feature
 */
app.get('/explore', requiresLogin, async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    let sortOptions = {};
    let queryFilter = {};
    // Default to 'recent' if not specified
    let sort_option = req.query.sort_option || 'recent';  

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

    const allPosts = await db.collection('odyssey_posts')
        .find(queryFilter).sort(sortOptions).toArray();

    const username = req.session.username;  // Retrieve username from session
    res.render('explore.ejs', { 
        posts: allPosts, 
        username: username, 
        sort_option: sort_option 
    });
});

/**
 * (GET) Renders the followers page showing your followers
 * List of your followers have links their user page
 */
app.get('/followers', requiresLogin, async (req, res) => {
    const user = req.session.username;

    const db = await Connection.open(mongoUri, DB);
    const userCollection = await db.collection(ODYSSEY_USERS)
        .findOne({ username: user });
    const followers = userCollection.followers;

    return res.render('followers.ejs', { 
        followers: followers, 
        username: req.session.username 
    });
});

/**
 * (POST) Processes the follow and redirects to the 
 * page of the user you followed
 */
app.post('/follow/:username', async (req, res) => {
    const user = req.session.username;
    const userToFollow = req.params.username;

    const doc = await follow(user, userToFollow);
    req.flash('info', `You followed ${doc.following}`);
    return res.redirect("/user/" + userToFollow);
});

/**
 * Async helper function for the follower feature
 * @param {*} currentUser
 * @param {*} userToFollow
 * @returns the username of the userToFollow
 */
async function follow(currentUser, userToFollow) {
    const db = await Connection.open(mongoUri, DB);
    const users = await db.collection(ODYSSEY_USERS);

    //update currentUser to have userToFollow in their follwoing
    await users.updateOne(
        { username: currentUser },
        { $addToSet: { following: userToFollow } },
        { upsert: true }
    );

    //update userToFollow to have currentUser as follower
    await users.updateOne(
        { username: userToFollow },
        { $addToSet: { followers: currentUser } },
        { upsert: true }
    );

    usersCollection = await db.collection(ODYSSEY_USERS).find({}).toArray();

    return { following: userToFollow };
};

/**
 * (GET) Renders the user page
 * Shows all the posts of a single user
 */
app.get('/user/:username', requiresLogin, async (req, res) => {
    const user = req.params.username;
    const db = await Connection.open(mongoUri, DB);
    const userPosts = await db.collection(ODYSSEY_POSTS)
        .find({ username: user }).toArray();
    const person = await db.collection(ODYSSEY_USERS)
        .findOne({ username: user });

    const followers = person.followers;
    const following = person.following;

    return res.render('user.ejs', {
        username: user,
        posts: userPosts,
        bio: person.bio,
        followers: followers.length,
        following: following.length
    });
});

/**
 * (GET) Renders the saved page
 * Shows your saved posts
 */
app.get('/saved', requiresLogin, async (req, res) => {
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    // get user
    const user = await db.collection(ODYSSEY_USERS)
        .findOne({ username: username });
    if (!user) {
        console.error("No user found with username:", username);
        return res.status(404).render('error.ejs', 
        { message: "User not found." });
    }

    // handle case with no saved posts
    if (!user.savedPosts || user.savedPosts.length === 0) {
        return res.render('saved.ejs', 
        { posts: [], message: "You haven't saved any posts yet." });
    }
    const postIds = user.savedPosts.map(id => new ObjectId(id));
    const posts = await db.collection(ODYSSEY_POSTS)
        .find({ _id: { $in: postIds } }).toArray();
    res.render('saved.ejs', { 
        posts: posts, 
        username: username 
    });
});

/**
 * (POST) This endpoint handles Ajax requests when a user 
 * clicks the "Save" button on a post. It receives the postId 
 * as a parameter and checks if the post is already saved by the user.
 * If not, it adds the post to the user's list of saved posts in the database.
 * It sends a response back to the client that is used 
 * to update the front end dynamically.
 */
app.post('/save-post/:postId', requiresLogin, async (req, res) => {
    const postId = req.params.postId;
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);

    try {
        const user = await db.collection(ODYSSEY_USERS)
            .findOne({ username: username });
        if (user.savedPosts && user.savedPosts.includes(postId)) {
            return res.status(400).send('Post already saved');
        }

        // Using $addToSet to avoid duplicates
        await db.collection(ODYSSEY_USERS).updateOne(
            { username: username },
            { $addToSet: { savedPosts: postId } }  
        );
        res.send('Post saved successfully');
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).send("Server error: " + error.message);
        }
    }
});

/**
 * (GET) Searches posts based on user's selected search criteria
 * Renders the searchResults.ejs page
 */
app.get('/search', requiresLogin, async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    let sortOptions = {};
    // default to 'recent' if not specified
    let sort_option = req.query.sort_option || 'recent'; 
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

    const posts = await db.collection('odyssey_posts')
        .find(query).sort(sortOptions).toArray();

    const username = req.session.username;
    res.render('searchResults.ejs', {
        posts: posts,
        username: username,
        sort_option: sort_option,
        searchedCountry: searchedCountry
    });
});

/**
 * (GET) Renders the edit post page
 * Allows users to edit their own posts
 */
app.get('/edit/:postId', requiresLogin, async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    try {
        const post = await db.collection(ODYSSEY_POSTS)
            .findOne({ _id: new ObjectId(req.params.postId) });

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


/**
 * (POST) Processes the edit and redirects to the explore page
 * Updates a post in the database
 */
app.post('/update-post/:postId', upload.single('file'), async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const formData = req.body;
    const postId = req.params.postId; 
    const existingPost = await db.collection(ODYSSEY_POSTS)
        .findOne({ _id: new ObjectId(postId) });

    let updateData = {
        location: { 
            country: formData.country, 
            city: formData.city 
        },
        categories: formData.categories,
        budget: formData.budget,
        travelType: formData.travelType,
        rating: formData.rating,
        content: { 
            text: formData.caption, 
            images: existingPost.content.images 
        }
    };

    // update image only if a new file was uploaded
    if (req.file && req.file.filename) {
        updateData.content.images = req.file.filename; // handle file upload
    }

    await db.collection(ODYSSEY_POSTS).updateOne(
        { _id: new ObjectId(req.params.postId) }, { $set: updateData });

    req.flash('info', 'Post updated successfully.');
    res.redirect('/explore');
});

/**
 * (DELETE) Deletes a post
 */
app.delete('/delete/:postId', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);

    const post = await db.collection(ODYSSEY_POSTS).findOne(
        { _id: new ObjectId(req.params.postId) });
        
    if (post.username !== req.session.username) {
        return res.status(403)
            .send('You are not authorized to delete this post.');
    }
    await db.collection(ODYSSEY_POSTS)
        .deleteOne({ _id: new ObjectId(req.params.postId) });
    res.send('Post deleted');

});


/**
 * (POST) Processes a post and redirects to the explore page
 */
app.post('/explore', upload.single('file'), async (req, res) => {
    try {
        const formData = req.body;
        const db = await Connection.open(mongoUri, DB);

        //change file perms
        let val = await fs.chmod('/students/odyssey/uploads/' + req.file.filename, 0o664);

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
        res.redirect('/explore');

    } catch (error) {
        return res.status(500).send("Server error: " + error.message);
    }
});

/**
 * (POST) Handles Ajax requests for liking a post
 * Checks to make sure the user hasn't already liked the post
 */
app.post('/likeAjax/:postId', async (req, res) => {
    const postId = req.params.postId;
    const username = req.session.username;

    const db = await Connection.open(mongoUri, DB);
    const user = await db.collection(ODYSSEY_USERS)
        .findOne({ username: username });
    const postIdStr = postId.toString();

    // check if user already liked the post
    if (user.likedPosts && user.likedPosts.includes(postIdStr)) {
        // user already liked this post, so we unlike it
        const updatedPost = await unlikePost(postId);
        await db.collection(ODYSSEY_USERS).updateOne(
            { _id: user._id },
            { $pull: { likedPosts: postIdStr } }
        );
        res.json({ error: false, likes: updatedPost.likes, 
            liked: false, postId: postId });
    } else {
        // user has not liked this post, so we like it
        const updatedPost = await likePost(postId);
        await db.collection(ODYSSEY_USERS).updateOne(
            { _id: user._id },
            { $addToSet: { likedPosts: postIdStr } }
        );
        res.json({ error: false, likes: updatedPost.likes, 
            liked: true, postId: postId });
    }
});

/**
 * Helper function for the like feature
 * Automatically increments the like count of a post in the database
 * @param {*} postId
 * @returns updateLikes and postId
 */
async function likePost(postId) {
    const db = await Connection.open(mongoUri, DB);
    const updateResult = await db.collection(ODYSSEY_POSTS).updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { likes: 1 } }  
    );
    if (updateResult.matchedCount === 0) {
        throw new Error('Post not found');
    }
    const post = await db.collection(ODYSSEY_POSTS)
        .findOne({ _id: new ObjectId(postId) });
    return { likes: post.likes, postId: postId };
}

/**
 * Helper function for the like feature
 * Automatically decrements the like count of a post in the database
 * @param {*} postId
 * @returns updateLikes and postId
 */
async function unlikePost(postId) {
    const db = await Connection.open(mongoUri, DB);
    const post = await db.collection(ODYSSEY_POSTS)
        .findOne({ _id: new ObjectId(postId) });
    if (!post) throw new Error('Post not found');
    if (post.likes > 0) {
        await db.collection(ODYSSEY_POSTS).updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { likes: -1 } }  
        );
    }
    const updatedPost = await db.collection(ODYSSEY_POSTS)
        .findOne({ _id: new ObjectId(postId) });
    return { likes: updatedPost.likes, postId: postId };
}

/**
 * (POST) Processes a comment and updates the post to have a comment
 */
app.post('/commentAjax/:postId', async (req, res) => {
    const postId = req.params.postId;
    const commentText = req.body.comment;
    const username = req.session.username; 
    const db = await Connection.open(mongoUri, DB);
    const post = await db.collection(ODYSSEY_POSTS)
        .findOne({_id: new ObjectId(postId)});

    const comment = { text: commentText, userId: username }; 
    const updatedComments = post.comments 
    ? [...post.comments, comment] : [comment];
    await db.collection(ODYSSEY_POSTS).updateOne({_id: new ObjectId(postId)}, 
    { $set: { comments: updatedComments } });
    res.json({ 
        postId: postId, 
        comment: comment 
    });
});

/**
 * Middleware to check permissions and make sure users are logged 
 * in before accessing pages with other users' info
 * Redirects to home page
 */
function requiresLogin(req, res, next) {
    if (!req.session.loggedIn) {
        req.flash('error', 
        'This page requires you to be logged in - please do so.');
        return res.redirect("/");
    } else {
        next();
    }
}

/**
 * (GET) Renders the profile page
 * Profile page contains your own posts, bio, and username
 */
app.get('/profile', requiresLogin, async (req, res) => {
    const user = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    const posts = await db.collection(ODYSSEY_POSTS)
        .find({ "username": user }).toArray();
    const onePerson = await db.collection(ODYSSEY_USERS)
        .find({ "username": user }).toArray();
    let person = onePerson[0]
    const followers = person.followers;
    const following = person.following;
    return res.render('profile.ejs', {
        username: req.session.username,
        user: person,
        posts: posts,
        bio: person.bio,
        followers: followers.length,
        following: following.length
    });
});

/**
 * (GET) Renders the sign-up page
 */
app.get('/signup', (req, res) => {
    return res.render('signUp.ejs');
});

/**
 * (POST) Processes a user signing up for an account
 * Updates the database with the new user and redirects to the home page
 */
app.post("/signup", async (req, res) => {
    try {
        const email = req.body.email;
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DB);
        var existingUser = await db.collection(ODYSSEY_USERS)
            .findOne({ username: username });
        // make sure user doesn't already have an account
        if (existingUser) {
            req.flash('error', 
            "Login already exists - please try logging in instead.");
            return res.redirect('/')
        }
        const hash = await bcrypt.hash(password, ROUNDS);
        await db.collection(ODYSSEY_USERS).insertOne({
            username: username,
            email: email,
            bio: '',
            followers: [],
            following: [],
            postIDs: [],
            hash: hash,
            profilePic: null
        });
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

/**
 * (POST) Processes a user logging in
 * Redirects to the home page when they successfully log in
 * Gives an error otherwise
 */
app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DB);
        var existingUser = await db.collection(ODYSSEY_USERS)
            .findOne({ username: username });
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

/**
 * (POST) Processes a user logging out
 * Redirects to the home page
 */
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

/**
 * (GET) Renders the editProfile page
 * Allows users to edit their own profiles (username and bio)
 */
app.get('/editprofile', requiresLogin, async (req, res) => {
    // return res.render('editProfile.ejs');
    const username = req.session.username;
    const db = await Connection.open(mongoUri, DB);
    try {
        const person = await db.collection(ODYSSEY_USERS)
            .findOne({ username: username });
        const bio = person.bio;
        res.render('editProfile.ejs', { username: username, bio: bio });
    } catch (error) {
        req.flash('error', 'Error fetching profile data: ' + error.message);
        res.redirect('/explore');
    }
});

/**
 * (POST) Processes a user's edited profile
 * Updates user's edited profile and redirects to the profile page
 */
app.post("/editprofile", upload.single('profilePic'), async (req, res) => {
    try {
        const username = req.session.username;
        const bio = req.body.bio;
        const db = await Connection.open(mongoUri, DB);

        let updateData = {bio: bio} 
        if (req.file) {
            updateData.profilePic = req.file.filename; 
        }
    
        var existingUser = await db.collection(ODYSSEY_USERS).updateOne(
        { username: username }, { $set: updateData });
        
        if (existingUser) {
            req.flash('info', "Updated succesfully.");
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