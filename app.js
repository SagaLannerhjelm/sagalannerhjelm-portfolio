const express = require("express");
const expressHandlebars = require("express-handlebars");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const connectSqLite3 = require("connect-sqlite3");
const SQLiteStore = connectSqLite3(expressSession);
const fileUpload = require("express-fileupload");
const bcrypt = require("bcrypt");
const fs = require("fs");
const db = require("./db.js");

//Routers
const blogRouter = require("./routers/blog-router");
const projectRouter = require("./routers/project-router");
const commentRouter = require("./routers/comment-router");

// Variables
let viewAllProjects;
const path = __dirname + "/public/uploads/";

// Hardcoded mail and password for login
const adminMail = "admin@gmail.com";
const adminPassword =
  "$2b$10$VIgcvt4aTDB8pKutc6kuLuIGI/urBZOT0G.pAs0md5/fm4PgD6qAG";

const app = express();
// expressHandlebars.register;

//Middlewares

// Following code was made with help by Esterling Accime's video https://www.youtube.com/watch?v=2BoSBaWvFhM, retrieved 2022-09-24
const hbs = expressHandlebars.create({
  defaultLayout: "main.hbs",

  // Create custom helper
  helpers: {
    // Following three line of code made with help by https://stackoverflow.com/questions/34252817/handlebarsjs-check-if-a-string-is-equal-to-a-value 2022-09-24
    ifEquals: function (firstArgument, secondArgument, options) {
      return firstArgument == secondArgument
        ? options.fn(this)
        : options.inverse(this);
    },
  },
});

app.engine(
  "hbs",
  hbs.engine
  // expressHandlebars.engine({
  //   defaultLayout: "main.hbs",
  // })
);

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

// Middleware function to handle expressSession
app.use(
  expressSession({
    store: new SQLiteStore({ db: "session-db.db" }),
    saveUninitialized: false,
    resave: false,
    secret: "aewogofjegdfsef",
  })
);

// app.use(cookieParser());

app.use(fileUpload());

app.use(function (request, response, next) {
  response.locals.session = request.session;
  next();
});

// Routers
app.use("/blog", blogRouter);

app.use("/project", projectRouter);

app.use("/comment", commentRouter);

app.get("/", function (request, response) {
  viewAllProjects = true;

  db.getAllProjects(function (error, projects) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }

    const model = {
      // session: request.session,
      errorMessages,
      projects,
      viewAllProjects,
    };

    response.render("startpage.hbs", model);
  });
});

// Sort projects based on categoty
app.get("/projects", function (request, response) {
  const category = request.query.category;

  viewAllProjects = false;

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

app.get("/about", function (request, response) {
  response.render("about.hbs");
});

app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

app.get("/login", function (request, response) {
  response.render("login.hbs");
});

app.post("/login", function (request, response) {
  const enteredMail = request.body.mail;
  const enteredPassword = request.body.password;

  const mailEnteredCorrectly = enteredMail.includes("@");
  const mailMaxLenght = 60;
  const passwordMaxLenght = 8;

  const errorMessages = [];

  // Validation of mail
  if (enteredMail === "") {
    errorMessages.push("Mail can't be empty");
  } else if (mailEnteredCorrectly === false) {
    errorMessages.push("The entered mail does not include a '@'");
  } else if (enteredMail.length > mailMaxLenght) {
    errorMessages.push(
      "Entered mail can't be more than " + mailMaxLenght + " characters"
    );
  }

  // Validation of password
  if (enteredPassword === "") {
    errorMessages.push("Password can't be empty");
  } else if (enteredPassword.length > passwordMaxLenght) {
    errorMessages.push(
      "Entered password can't be more than " + passwordMaxLenght + " characters"
    );
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
    };

    response.render("login.hbs", model);
  }
});

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/login");
});

function renderPage() {
  if (destination === "project") {
    const model = {
      errorMessages,
      project: {
        projId: id,
      },
      pageNumber,
    };

    response.render("edit-project-picture.hbs", model);
  } else if (destination === "blog") {
    const model = {
      errorMessages,
      blog: {
        blogId: id,
      },
      pageNumber,
    };

    response.render("edit-blog-picture.hbs", model);
  }
}

app.post("/update-picture/:destination/:id", function (request, response) {
  const destination = request.params.destination;
  const id = request.params.id;

  const pageNumber = parseInt(request.body.page);

  let imageFile;
  let uploadPath;

  const errorMessages = [];

  function deleteOldPicture(oldPicture) {
    // Check if file exists
    if (fs.existsSync("public/uploads/" + oldPicture)) {
      // Try to delete the file form the file system
      console.log("old picture exists");
      fs.unlink("public/uploads/" + oldPicture, function (error) {
        if (error) {
          errorMessages.push(
            "Problem occured when deleting picture from file system"
          );
        }
        console.log("old picture deleted");
      });
    }
  }

  // Following line of code was made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
  if (!request.files || Object.keys(request.files).length === 0) {
    errorMessages.push("No file is selected");

    renderPage();
  } else {
    // Delete old picture from file system

    if (destination === "project") {
      // Select old picture name from the database
      db.getOldProjectPicture(id, function (error, project) {
        if (error) {
          errorMessages.push("Internal server error");
        }

        const oldPictureName = project.projPictureName;

        // Delete old picture
        deleteOldPicture(oldPictureName);
      });
    } else if (destination === "blog") {
      // Select old picture name from the database
      db.getOldBlogPicture(id, function (error, blog) {
        if (error) {
          errorMessages.push("Internal server error");
        }
        const oldPictureName = blog.blogPictureName;

        deleteOldPicture(oldPictureName);
      });
    }

    // Go ahead and update the picture

    // Following line of code was made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
    // imageFile is the name of the input
    imageFile = request.files.image;
    const uniqueFileName = Math.floor(Math.random() * 10000) + imageFile.name;
    uploadPath = path + uniqueFileName;

    if (errorMessages.length === 0) {
      // Move the uploaded file to the right place
      // Following line of code made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
      imageFile.mv(uploadPath, function (error) {
        if (error) {
          errorMessages.push("Error when uploading file");

          renderPage();
        } else {
          console.log("file moved");

          if (destination === "project") {
            db.updateProjectPicture(uniqueFileName, id, function (error) {
              if (error) {
                errorMessages.push("Internal server error");

                const model = {
                  errorMessages,
                };

                // Render the same page when error occured
                response.render("edit-project-picture.hbs", model);
              } else {
                console.log("database updated");
                // Redirect to another page when upload is completed
                response.redirect("/project/edit/" + id);
              }
            });
          } else if (destination === "blog") {
            db.updateBlogPicture(uniqueFileName, id, function (error) {
              if (error) {
                errorMessages.push("Internal server error");

                const model = {
                  errorMessages,
                  pageNumber,
                };

                // Render the same page when error occured
                response.render("edit-blog-picture.hbs", model);
              } else {
                console.log("database updated");
                // Redirect to another page when upload is completed
                response.redirect("/blog/edit/" + id + "/?page=" + pageNumber);
              }
            });
          }
        }
      });
    } else {
      const model = {
        errorMessages,
        pageNumber,
      };
      // Render the same page when error occured
      if (destination === "project") {
        response.render("edit-project-picture.hbs", model);
      } else if (destination === "blog") {
        response.render("edit-blog-picture.hbs", model);
      }
    }
  }
});

// app.get("/new-project-picture/:id", function (request, response) {
//   const id = request.params.id;

//   db.getProjectById(id, function (error, project) {
//     const errorMessages = [];

//     if (error) {
//       errorMessages.push("Internal server error");
//     }

//     const model = {
//       project,
//     };

//     response.render("new-project-picture.hbs", model);
//   });
// });

app.listen(8080);
