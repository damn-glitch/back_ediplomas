const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const fs = require('fs');
const caCert = fs.readFileSync('ca-certificate.crt');

const dbClient = require("./database/db")

app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

// Initialize the database
const dbInit = require("./database/dbCreateTables");
dbInit(dbClient);

// Middleware for authentication
const authenticate = require("./auth/jwtCheck");

//Register
const registerRouter = require("./auth/register");
app.use("/register", registerRouter(dbClient));

//Login
const loginRouter = require("./auth/login");
app.use("/login", loginRouter(dbClient));

//Password Reset
const passwordResetRouter = require("./auth/passwordReset");
app.use("/password-reset", passwordResetRouter(dbClient));

//Parse and insert to db route
const dontTouch = require('./account/dontTouch');
app.use("/dont-touch-this", dontTouchRouter(dbClient));

// Graduate account route (authenticated)
const graduateRouter = require("./account/graduate");
app.get("/graduate-details", graduateRouter.details(dbClient, authenticate));

// Graduates route (authenticated)
app.get("/graduates", graduateRouter.graduate(dbClient, authenticate));

// Account
const accountRouter = require("./account/account");
app.get("/account", accountRouter.getMethod(dbClient, authenticate));

// Update account route (authenticated)
app.put("/account", accountRouter.putMethod(dbClient, authenticate));

// Search(by metadata)
const searchRouter = require("./account/search")
app.use("/search", searchRouter(db))

// Validate IIN
const validateIinRouter = require("./account/iin")
app.use("/validate-iin", validateIinRouter(db))

// Endpoint to generate and send OTP
const otpRouter = require("./otp/otp")
app.use("/get-otp", otpRouter.send(db))

// Endpoint to verify OTP
app.use("/verify-otp", otpRouter.verify(db))

