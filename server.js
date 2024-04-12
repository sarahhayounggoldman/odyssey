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

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');

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
//app.use(express.static('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// ================================================================
// custom routes here

const DB = process.env.USER;
const WMDB = 'wmdb';
const STAFF = 'staff';

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
app.post('/logout/', (req, res) => {
    console.log('in logout');
    req.session.uid = false;
    req.session.logged_in = false;
    res.redirect('/');
});

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

app.get('/profile', async (req, res) => {
    // const db = await Connection.open(mongoUri, WMDB);
    // let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    // console.log('len', all.length, 'first', all[0]);
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('profile.ejs', {uid, visits});
});

// //TO DEBUG
// const countryList = [
// 	"Afghanistan",
// 	"Albania",
// 	"Algeria",
// 	"American Samoa",
// 	"Andorra",
// 	"Angola",
// 	"Anguilla",
// 	"Antarctica",
// 	"Antigua and Barbuda",
// 	"Argentina",
// 	"Armenia",
// 	"Aruba",
// 	"Australia",
// 	"Austria",
// 	"Azerbaijan",
// 	"Bahamas (the)",
// 	"Bahrain",
// 	"Bangladesh",
// 	"Barbados",
// 	"Belarus",
// 	"Belgium",
// 	"Belize",
// 	"Benin",
// 	"Bermuda",
// 	"Bhutan",
// 	"Bolivia (Plurinational State of)",
// 	"Bonaire, Sint Eustatius and Saba",
// 	"Bosnia and Herzegovina",
// 	"Botswana",
// 	"Bouvet Island",
// 	"Brazil",
// 	"British Indian Ocean Territory (the)",
// 	"Brunei Darussalam",
// 	"Bulgaria",
// 	"Burkina Faso",
// 	"Burundi",
// 	"Cabo Verde",
// 	"Cambodia",
// 	"Cameroon",
// 	"Canada",
// 	"Cayman Islands (the)",
// 	"Central African Republic (the)",
// 	"Chad",
// 	"Chile",
// 	"China",
// 	"Christmas Island",
// 	"Cocos (Keeling) Islands (the)",
// 	"Colombia",
// 	"Comoros (the)",
// 	"Congo (the Democratic Republic of the)",
// 	"Congo (the)",
// 	"Cook Islands (the)",
// 	"Costa Rica",
// 	"Croatia",
// 	"Cuba",
// 	"Curaçao",
// 	"Cyprus",
// 	"Czechia",
// 	"Côte d'Ivoire",
// 	"Denmark",
// 	"Djibouti",
// 	"Dominica",
// 	"Dominican Republic (the)",
// 	"Ecuador",
// 	"Egypt",
// 	"El Salvador",
// 	"Equatorial Guinea",
// 	"Eritrea",
// 	"Estonia",
// 	"Eswatini",
// 	"Ethiopia",
// 	"Falkland Islands (the) [Malvinas]",
// 	"Faroe Islands (the)",
// 	"Fiji",
// 	"Finland",
// 	"France",
// 	"French Guiana",
// 	"French Polynesia",
// 	"French Southern Territories (the)",
// 	"Gabon",
// 	"Gambia (the)",
// 	"Georgia",
// 	"Germany",
// 	"Ghana",
// 	"Gibraltar",
// 	"Greece",
// 	"Greenland",
// 	"Grenada",
// 	"Guadeloupe",
// 	"Guam",
// 	"Guatemala",
// 	"Guernsey",
// 	"Guinea",
// 	"Guinea-Bissau",
// 	"Guyana",
// 	"Haiti",
// 	"Heard Island and McDonald Islands",
// 	"Holy See (the)",
// 	"Honduras",
// 	"Hong Kong",
// 	"Hungary",
// 	"Iceland",
// 	"India",
// 	"Indonesia",
// 	"Iran (Islamic Republic of)",
// 	"Iraq",
// 	"Ireland",
// 	"Isle of Man",
// 	"Israel",
// 	"Italy",
// 	"Jamaica",
// 	"Japan",
// 	"Jersey",
// 	"Jordan",
// 	"Kazakhstan",
// 	"Kenya",
// 	"Kiribati",
// 	"Korea (the Democratic People's Republic of)",
// 	"Korea (the Republic of)",
// 	"Kuwait",
// 	"Kyrgyzstan",
// 	"Lao People's Democratic Republic (the)",
// 	"Latvia",
// 	"Lebanon",
// 	"Lesotho",
// 	"Liberia",
// 	"Libya",
// 	"Liechtenstein",
// 	"Lithuania",
// 	"Luxembourg",
// 	"Macao",
// 	"Madagascar",
// 	"Malawi",
// 	"Malaysia",
// 	"Maldives",
// 	"Mali",
// 	"Malta",
// 	"Marshall Islands (the)",
// 	"Martinique",
// 	"Mauritania",
// 	"Mauritius",
// 	"Mayotte",
// 	"Mexico",
// 	"Micronesia (Federated States of)",
// 	"Moldova (the Republic of)",
// 	"Monaco",
// 	"Mongolia",
// 	"Montenegro",
// 	"Montserrat",
// 	"Morocco",
// 	"Mozambique",
// 	"Myanmar",
// 	"Namibia",
// 	"Nauru",
// 	"Nepal",
// 	"Netherlands (the)",
// 	"New Caledonia",
// 	"New Zealand",
// 	"Nicaragua",
// 	"Niger (the)",
// 	"Nigeria",
// 	"Niue",
// 	"Norfolk Island",
// 	"Northern Mariana Islands (the)",
// 	"Norway",
// 	"Oman",
// 	"Pakistan",
// 	"Palau",
// 	"Palestine, State of",
// 	"Panama",
// 	"Papua New Guinea",
// 	"Paraguay",
// 	"Peru",
// 	"Philippines (the)",
// 	"Pitcairn",
// 	"Poland",
// 	"Portugal",
// 	"Puerto Rico",
// 	"Qatar",
// 	"Republic of North Macedonia",
// 	"Romania",
// 	"Russian Federation (the)",
// 	"Rwanda",
// 	"Réunion",
// 	"Saint Barthélemy",
// 	"Saint Helena, Ascension and Tristan da Cunha",
// 	"Saint Kitts and Nevis",
// 	"Saint Lucia",
// 	"Saint Martin (French part)",
// 	"Saint Pierre and Miquelon",
// 	"Saint Vincent and the Grenadines",
// 	"Samoa",
// 	"San Marino",
// 	"Sao Tome and Principe",
// 	"Saudi Arabia",
// 	"Senegal",
// 	"Serbia",
// 	"Seychelles",
// 	"Sierra Leone",
// 	"Singapore",
// 	"Sint Maarten (Dutch part)",
// 	"Slovakia",
// 	"Slovenia",
// 	"Solomon Islands",
// 	"Somalia",
// 	"South Africa",
// 	"South Georgia and the South Sandwich Islands",
// 	"South Sudan",
// 	"Spain",
// 	"Sri Lanka",
// 	"Sudan (the)",
// 	"Suriname",
// 	"Svalbard and Jan Mayen",
// 	"Sweden",
// 	"Switzerland",
// 	"Syrian Arab Republic",
// 	"Taiwan",
// 	"Tajikistan",
// 	"Tanzania, United Republic of",
// 	"Thailand",
// 	"Timor-Leste",
// 	"Togo",
// 	"Tokelau",
// 	"Tonga",
// 	"Trinidad and Tobago",
// 	"Tunisia",
// 	"Turkey",
// 	"Turkmenistan",
// 	"Turks and Caicos Islands (the)",
// 	"Tuvalu",
// 	"Uganda",
// 	"Ukraine",
// 	"United Arab Emirates (the)",
// 	"United Kingdom of Great Britain and Northern Ireland (the)",
// 	"United States Minor Outlying Islands (the)",
// 	"United States of America (the)",
// 	"Uruguay",
// 	"Uzbekistan",
// 	"Vanuatu",
// 	"Venezuela (Bolivarian Republic of)",
// 	"Viet Nam",
// 	"Virgin Islands (British)",
// 	"Virgin Islands (U.S.)",
// 	"Wallis and Futuna",
// 	"Western Sahara",
// 	"Yemen",
// 	"Zambia",
// 	"Zimbabwe",
// 	"Åland Islands"
// ];

// app.get('/form', (req, res) => {
//     // Your code here
//     res.render('form', { countryList: countryList});
// });

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
