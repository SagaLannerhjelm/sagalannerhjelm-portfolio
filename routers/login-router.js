const express = require("express");
const bcrypt = require("bcrypt");

// Hardcoded mail and password for login
const adminMail = "admin@gmail.com";
const adminPassword = "$2b$10$VIgcvt4aTDB8pKutc6kuLuIGI/urBZOT0G.pAs0md5/fm4PgD6qAG";

const router = express.Router();

router.get("/", function (request, response) {
  response.render("login.hbs");
});

router.post("/", function (request, response) {
  const enteredMail = request.body.mail;
  const enteredPassword = request.body.password;

  const mailEnteredCorrectly = enteredMail.includes("@");
  const mailMaxLenght = 60;
  const passwordMaxLenght = 25;

  const errorMessages = [];

  // Validation of mail
  if (enteredMail === "") {
    errorMessages.push("Mail can't be empty");
  } else if (mailEnteredCorrectly === false) {
    errorMessages.push("The entered mail does not include a '@'");
  } else if (enteredMail.length > mailMaxLenght) {
    errorMessages.push("Entered mail can't be more than " + mailMaxLenght + " characters");
  }

  // Validation of password
  if (enteredPassword === "") {
    errorMessages.push("Password can't be empty");
  } else if (enteredPassword.length > passwordMaxLenght) {
    errorMessages.push("Entered password can't be more than " + passwordMaxLenght + " characters");
  }

  const correctPassword = bcrypt.compareSync(enteredPassword, adminPassword);

  if (enteredMail === adminMail && correctPassword) {
    // Login
    request.session.isLoggedIn = true;

    response.redirect("/");
  } else {
    // Display error message
    const model = {
      failedToLogin: true,
      errorMessages,
      enteredMail,
      enteredPassword,
    };

    response.render("login.hbs", model);
  }
});

module.exports = router;
