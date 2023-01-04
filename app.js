const express = require("express");
const expressHandlebars = require("express-handlebars");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const connectSqLite3 = require("connect-sqlite3");
const SQLiteStore = connectSqLite3(expressSession);
const fileUpload = require("express-fileupload");
// const fs = require("fs");
const db = require("./db.js");

//Routers
const blogRouter = require("./routers/blog-router");
const projectRouter = require("./routers/project-router");
const commentRouter = require("./routers/comment-router");
const loginRouter = require("./routers/login-router");

// Variables
let viewAllProjects;

const app = express();

/* Following code was made with help by Esterling Accime's video: 
https://www.youtube.com/watch?v=2BoSBaWvFhM, retrieved 2022-09-24 */
const hbs = expressHandlebars.create({
  defaultLayout: "main.hbs",

  // Create custom helper
  helpers: {
    /*  Following three line of code made with help by 
    https://stackoverflow.com/questions/34252817/handlebarsjs-check-if-a-string-is-equal-to-a-value, 
    retrieved 2022-09-24 */
    ifEquals: function (firstArgument, secondArgument, options) {
      return firstArgument == secondArgument ? options.fn(this) : options.inverse(this);
    },
  },
});

app.engine("hbs", hbs.engine);

// Middlewares

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(
  expressSession({
    store: new SQLiteStore({ db: "session-db.db" }),
    saveUninitialized: false,
    resave: false,
    secret: "aewogofjegdfsef",
  })
);

app.use(fileUpload());

app.use(function (request, response, next) {
  response.locals.session = request.session;
  next();
});

// Routers
app.use("/blog", blogRouter);

app.use("/project", projectRouter);

app.use("/comment", commentRouter);

app.use("/login", loginRouter);

app.get("/", function (request, response) {
  viewAllProjects = true;

  db.getAllProjects(function (error, projects) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }

    const model = {
      errorMessages,
      projects,
      viewAllProjects,
    };

    response.render("startpage.hbs", model);
  });
});

app.get("/about", function (request, response) {
  response.render("about.hbs");
});

app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/login");
});

app.get("/projects", function (request, response) {
  const category = request.query.category;

  viewAllProjects = false;

  // Sort projects based on category
  let illustrationsSelected = category === "Illustration" ? true : false;
  let gamesSelected = category === "Game development" ? true : false;
  let webDesignsSelected = category === "Web design" ? true : false;
  let graphicDesignsSelected = category === "Graphic design" ? true : false;

  db.getProjectsByCategory(category, function (error, projects) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }

    const model = {
      errorMessages,
      projects,
      viewAllProjects,
      illustrationsSelected,
      gamesSelected,
      webDesignsSelected,
      graphicDesignsSelected,
    };

    response.render("startpage.hbs", model);
  });
});

app.listen(8080);
