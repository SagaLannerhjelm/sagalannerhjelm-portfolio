const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const connectSqLite3 = require("connect-sqlite3");
const SQLiteStore = connectSqLite3(expressSession);
const fileUpload = require("express-fileupload");
const bcrypt = require("bcrypt");
const fs = require("fs");

// Variables
const titleMaxLength = 40;
const descriptionMaxLenght = 1000;
const postPerPage = 5;
let viewAllProjects;

// Calculate today's date
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
const date = today.getDate();
const dateCorrection = date < 10 ? "0" + date : date;
const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

// Database
const db = new sqlite3.Database("portfolio-database.db");

// Hardcoded mail and password for login
const adminMail = "admin@gmail.com";
const adminPassword =
  "$2b$10$VIgcvt4aTDB8pKutc6kuLuIGI/urBZOT0G.pAs0md5/fm4PgD6qAG";

// Database tables
db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    projId INTEGER PRIMARY KEY,
    projTitle TEXT,
    projDescription TEXT,
    projCategory TEXT,
    projCreatedDate TEXT,
    projPictureName TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS blogposts (
    blogId INTEGER PRIMARY KEY,
    blogTitle TEXT,
    blogPublishedDate TEXT,
    blogDescription TEXT,
    blogPictureName TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    cmntId INTEGER PRIMARY KEY,
    cmntName TEXT,
    cmntDate TEXT,
    cmntContent TEXT,
    blog INTEGER,
    FOREIGN KEY(blog) REFERENCES blogposts (blogId)
  )
`);

const app = express();
expressHandlebars.register;

//Middlewares

// Following code was made with help by Esterling Accime's video https://www.youtube.com/watch?v=2BoSBaWvFhM, retrieved 2022-09-24
const hbs = expressHandlebars.create({
  defaultLayout: "main.hbs",

  // Create custom helper
  helpers: {
    // Following function retrieved from https://stackoverflow.com/questions/34252817/handlebarsjs-check-if-a-string-is-equal-to-a-value 2022-09-24
    ifEquals: function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
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

app.use(fileUpload());

app.use(function (request, response, next) {
  // const isLoggedIn = request.session.isLoggedIn;
  // console.log(isLoggedIn);

  // response.locals.isLoggedIn = isLoggedIn;

  response.locals.session = request.session;

  next();
});

app.use(cookieParser());

app.get("/", function (request, response) {
  const query = `SELECT * FROM projects ORDER BY projId DESC`;

  viewAllProjects = true;

  db.all(query, function (error, projects) {
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

  const query = `SELECT * FROM projects WHERE projCategory = ? ORDER BY projId DESC`;
  const values = [category];

  db.all(query, values, function (error, projects) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Inernal server error");
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

// Read projects with a specific id and render corresponding page
app.get("/project/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      project,
    };
    response.render("project-detail.hbs", model);
  });
});

// Renders blog page and pagination
app.get("/blog", function (request, response) {
  const pageNumber = parseInt(request.query.page);
  let nextPageUrl;
  let nextPageDisabled;
  let previousPageUrl =
    pageNumber != 1 ? "/blog?page=" + (pageNumber - 1) : "#";
  let previousPageDisabled = pageNumber != 1 ? false : true;
  const offsetValue = (pageNumber - 1) * postPerPage;

  db.all(
    `SELECT COUNT(*) as tableRows FROM blogposts`,
    function (error, blogposts) {
      const numberOfRows = blogposts[0].tableRows;
      const numberOfPages = Math.ceil(numberOfRows / postPerPage);
      nextPageUrl =
        pageNumber != numberOfPages ? "/blog?page=" + (pageNumber + 1) : "#";
      nextPageDisabled = pageNumber != numberOfPages ? false : true;

      let pageNumbers = [];
      let pageActive;

      for (let i = 1; i <= numberOfPages; i++) {
        if (i === pageNumber) {
          pageActive = true;
        } else {
          pageActive = false;
        }
        pageNumbers.push({ page: i, active: pageActive });
      }

      const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC LIMIT ? OFFSET ?`;
      const values = [postPerPage, offsetValue];

      const commentsQuery = `SELECT * FROM comments`;

      db.all(blogQuery, values, function (error, blogposts) {
        const errorMessages = [];
        if (error) {
          errorMessages.push("Internal server error");
        }
        db.all(commentsQuery, function (error, comments) {
          const errorMessages = [];
          if (error) {
            errorMessages.push("Internal server error");
          }

          // Filter comments on blogposts
          for (let b of blogposts) {
            b.comments = comments.filter((c) => c.blogId === b.blogId);
          }
          const model = {
            blogposts,
            pageNumber,
            pageNumbers,
            nextPageUrl,
            nextPageDisabled,
            previousPageUrl,
            previousPageDisabled,
            errorMessages,
          };
          response.render("blog.hbs", model);
        });
      });
    }
  );
});

// Create comments on blog page
app.post("/blog", function (request, response) {
  const pageNumber = parseInt(request.query.page);

  const blogId = parseInt(request.body.id);
  const name = request.body.name;
  const comment = request.body.comment;

  const errorMessages = [];

  const nameMaxLength = 50;
  const commentMaxLenght = 200;

  // Validation of name
  if (name === "") {
    errorMessages.push("Name can't be empty");
  } else if (name.length > nameMaxLength) {
    errorMessages.push("Name is longer than " + nameMaxLength + " characters");
  }

  // Validation of comment
  if (comment === "") {
    errorMessages.push("Comment can't be empty");
  } else if (comment.length > commentMaxLenght) {
    errorMessages.push(
      "Comment is longer than " + commentMaxLenght + " characters"
    );
  }

  if (errorMessages.length === 0) {
    const query = `INSERT INTO comments (cmntName, cmntDate, cmntContent, blogId) VALUES (?, ?, ?, ?)`;
    const values = [name, currentDate, comment, blogId];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          blogpost,
          comment,
        };
        response.render("blog.hbs", model);
      } else {
        response.redirect(
          "/blog?page=" + pageNumber + "#comment-section/" + blogId
        );
      }
    });
  } else {
    let nextPageUrl;
    let nextPageDisabled;
    let previousPageUrl =
      pageNumber != 1 ? "/blog?page=" + (pageNumber - 1) : "#";
    let previousPageDisabled = pageNumber != 1 ? false : true;
    const offsetValue = (pageNumber - 1) * postPerPage;

    db.all(
      `SELECT COUNT(*) as tableRows FROM blogposts`,
      function (error, blogposts) {
        const numberOfRows = blogposts[0].tableRows;
        const numberOfPages = Math.ceil(numberOfRows / postPerPage);
        nextPageUrl =
          pageNumber != numberOfPages ? "/blog?page=" + (pageNumber + 1) : "#";
        nextPageDisabled = pageNumber != numberOfPages ? false : true;

        let pageNumbers = [];
        let pageActive;

        for (let i = 1; i <= numberOfPages; i++) {
          if (i === pageNumber) {
            pageActive = true;
          } else {
            pageActive = false;
          }
          pageNumbers.push({ page: i, active: pageActive });
        }

        const errorAtBlogId = blogId;

        const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC LIMIT ? OFFSET ?`;
        const values = [postPerPage, offsetValue];

        const commentsQuery = `SELECT * FROM comments`;

        db.all(blogQuery, values, function (error, blogposts) {
          if (error) {
            errorMessages.push("Internal server error");
          }
          db.all(commentsQuery, function (error, comments) {
            if (error) {
              errorMessages.push("Internal server error");
            }

            // Filter comments on blogposts
            for (let b of blogposts) {
              b.comments = comments.filter((c) => c.blogId === b.blogId);
            }
            const model = {
              blogposts,
              pageNumber,
              pageNumbers,
              nextPageUrl,
              nextPageDisabled,
              previousPageUrl,
              previousPageDisabled,
              errorMessages,
              errorAtBlogId,
            };
            response.render("blog.hbs", model);
          });
        });
      }
    );
  }
});

app.get("/new-blog-picture/:id/", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.params.page);

  const query = `SELECT * FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      blog,
      pageNumber,
    };
    response.render("new-blog-picture.hbs", model);
  });
});

app.get("/edit-blog-picture/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.query.page);

  const query = `SELECT * FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      blog,
      pageNumber,
    };
    response.render("edit-blog-picture.hbs", model);
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

// app.get("/account", function (request, response) {
//   const query = `SELECT * FROM admin`;

//   db.all(query, function (error, admin) {
//     const errorMessages = [];
//     if (error) {
//       errorMessages.push("Internal server error");
//     }
//     const model = {
//       admin,
//     };

//     response.render("account.hbs", model);
//   });
// });

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/login");
});

// Following tutorial by Raddy on youtube: https://www.youtube.com/watch?v=hyJiNTFtQic date: 2022-10-06
app.post(
  "/upload-picture/:reason/:destination/:id",
  function (request, response) {
    const reason = request.params.reason;
    const destination = request.params.destination;
    const id = request.params.id;

    const pageNumber = parseInt(request.body.page);

    let imageFile;
    let uploadPath;

    const errorMessages = [];

    if (!request.files || Object.keys(request.files).length === 0) {
      errorMessages.push("No file is selected");

      let model;

      if (destination === "project") {
        model = {
          errorMessages,
          project: {
            projId: id,
          },
          pageNumber,
        };
      } else if (destination === "blog") {
        model = {
          errorMessages,
          blog: {
            blogId: id,
          },
          pageNumber,
        };
      }
      // Render the same page when error occured
      if (reason === "new" && destination === "project") {
        response.render("new-project-picture.hbs", model);
      } else if (reason === "edit" && destination === "project") {
        response.render("edit-project-picture.hbs", model);
      } else if (reason === "new" && destination === "blog") {
        response.render("new-blog-picture.hbs", model);
      } else if (reason === "edit" && destination === "blog") {
        response.render("edit-blog-picture.hbs", model);
      }
    } else {
      // Delete old picture from file system if editing

      if (destination === "project" && reason === "edit") {
        // Select old picture name from the database
        const oldPictureQuery = `SELECT projPictureName FROM projects WHERE projId = ?`;
        const values = [id];

        db.get(oldPictureQuery, values, function (error, project) {
          if (error) {
            errorMessages.push("Internal server error");
          }
          const oldPictureName = project.projPictureName;

          if (fs.existsSync("public/uploads/" + oldPictureName)) {
            console.log("file exist");
            // Try to delete the file form the file system
            fs.unlink("public/uploads/" + oldPictureName, function (error) {
              console.log("file deleted");
              if (error) {
                errorMessages.push(
                  "Problem occured when deleting picture from file system"
                );
              }
            });
          }
        });
      } else if (destination === "blog" && reason === "edit") {
        // Select old picture name from the database
        const oldPictureQuery = `SELECT blogPictureName FROM blogposts WHERE blogId = ?`;
        const values = [id];

        db.get(oldPictureQuery, values, function (error, blog) {
          if (error) {
            errorMessages.push("Internal server error");
          }
          const oldPictureName = blog.blogPictureName;

          if (fs.existsSync("public/uploads/" + oldPictureName)) {
            console.log("file exists");
            // Try to delete the file form the file system
            fs.unlink("public/uploads/" + oldPictureName, function (error) {
              console.log("file deleted");
              if (error) {
                errorMessages.push(
                  "Problem occured when deleting picture from file system"
                );
              }
            });
          }
        });
      }

      // Go ahead and update the picture

      // imageFile is the name of the input
      imageFile = request.files.image;
      // Give each file name some random numbers infront of them to make them unique
      const uniqueFileName = Math.floor(Math.random() * 10000) + imageFile.name;

      uploadPath = __dirname + "/public/uploads/" + uniqueFileName;

      // Move the uploaded file to the right place
      imageFile.mv(uploadPath, function (error) {
        if (error) {
          return response.status(500).send(error);
        }

        if (errorMessages.length === 0) {
          let query;

          if (destination === "project") {
            query = `UPDATE projects SET projPictureName = ? WHERE projId = ?`;
          } else if (destination === "blog") {
            query = `UPDATE blogposts SET blogPictureName = ? WHERE blogId = ?`;
          }

          const values = [uniqueFileName, id];

          db.run(query, values, function (error) {
            if (error) {
              errorMessages.push("Internal server error");
              const model = {
                errorMessages,
              };
              // Render the same page when error occured
              if (reason === "new" && destination === "project") {
                response.render("new-project-picture.hbs", model);
              } else if (reason === "edit" && destination === "project") {
                // Select old picture name form database
                response.render("edit-project-picture.hbs", model);
              } else if (reason === "new" && destination === "blog") {
                response.render("new-blog-picture.hbs", model);
              } else if (reason === "edit" && destination === "blog") {
                response.render("edit-blog-picture.hbs", model);
              }
            } else {
              // Redirect to another page when upload is completed
              if (reason === "new" && destination === "project") {
                response.redirect("/#projects");
              } else if (reason === "edit" && destination === "project") {
                response.redirect("/edit-project/" + id);
              } else if (reason === "new" && destination === "blog") {
                response.redirect("/blog?page=1");
              } else if (reason === "edit" && destination === "blog") {
                response.redirect("/edit-blog/" + id + "/?page=" + pageNumber);
              }
            }
          });
        } else {
          const model = {
            errorMessages,
          };
          // Render the same page when error occured
          if (reason === "new" && destination === "project") {
            response.render("new-project-picture.hbs", model);
          } else if (reason === "edit" && destination === "project") {
            response.render("edit-project-picture.hbs", model);
          } else if (reason === "new" && destination === "blog") {
            response.render("new-blog-picture.hbs", model);
          } else if (reason === "edit" && destination === "blog") {
            response.render("edit-blog-picture.hbs", model);
          }
        }
      });
    }
  }
);

app.get("/new-project", function (request, response) {
  const model = {
    currentDate,
  };
  response.render("new-project.hbs", model);
});

app.post("/new-project", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const date = request.body.date;
  const category = request.body.category;

  const errorMessages = [];

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // validation for title
    if (title === "") {
      errorMessages.push("Title can't be empty");
    } else if (title.length > titleMaxLength) {
      errorMessages.push(
        "Title is more than " + titleMaxLength + " characters"
      );
    }

    // validation for description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (title.length > descriptionMaxLenght) {
      errorMessages.push(
        "Title is more than " + descriptionMaxLenght + " characters"
      );
    }

    // validation for category
    if (category === "") {
      errorMessages.push("Choose a category");
    } else if (category === "Choose an option") {
      errorMessages.push("Pick a specific category");
    }

    // validation for date
    if (date === "") {
      errorMessages.push("Pick a date");
    }
  }

  if (errorMessages.length === 0) {
    const query = `INSERT INTO projects (projTitle, projDescription, projCreatedDate, projCategory) VALUES (?, ?, ?, ?)`;

    const values = [title, description, date, category];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
        };

        response.render("new-project.hbs", model);
      } else {
        response.redirect("/new-project-picture/" + this.lastID);
      }
    });
  } else {
    const model = {
      errorMessages,
      title,
      description,
      date,
      category,
    };

    response.render("new-project.hbs", model);
  }
});

app.get("/new-project-picture/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      project,
    };
    response.render("new-project-picture.hbs", model);
  });
});

// Renders the edit page for a project
app.get("/edit-project/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    // The variable for the selected date gets true
    let illustrationSelected =
      project.projCategory === "Illustration" ? true : false;
    let gameSelected =
      project.projCategory === "Game development" ? true : false;
    let websiteSelected = project.projCategory === "Website" ? true : false;
    let graphicDesignSelected =
      project.projCategory === "Graphic design" ? true : false;

    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      project,
      currentDate,
      illustrationSelected,
      gameSelected,
      websiteSelected,
      graphicDesignSelected,
    };
    response.render("edit-project.hbs", model);
  });
});

// Edits a project with a specific id
app.post("/edit-project/:id", function (request, response) {
  const id = request.params.id;

  const title = request.body.title;
  const description = request.body.description;
  const date = request.body.date;
  const category = request.body.category;

  const errorMessages = [];

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // validation for title
    if (title === "") {
      errorMessages.push("Title can't be empty");
    } else if (title.length > titleMaxLength) {
      errorMessages.push(
        "Title is more than " + titleMaxLength + " characters"
      );
    }

    // validation for description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (title.length > descriptionMaxLenght) {
      errorMessages.push(
        "Title is more than " + descriptionMaxLenght + " characters"
      );
    }

    // validation for category
    if (category === "") {
      errorMessages.push("Choose a category");
    } else if (category === "Choose an option") {
      errorMessages.push("Pick a specific category");
    }

    // validation for date
    if (date === "") {
      errorMessages.push("Pick a date");
    }
  }

  if (errorMessages.length === 0) {
    const query = `UPDATE projects SET projTitle = ?, projDescription = ?, projCreatedDate = ?, projCategory = ? WHERE projId = ?`;

    const values = [title, description, date, category, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          project: {
            projId: id,
            title,
            description,
            date,
            category,
          },
        };
        response.render("edit-project.hbs", model);
      } else {
        response.redirect("/project/" + id);
      }
    });
  } else {
    const query = `SELECT * FROM projects WHERE projId = ?`;
    const values = [id];

    db.get(query, values, function (error, project) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        project,
        title,
        description,
        date,
        category,
      };
      response.render("edit-project.hbs", model);
    });
  }
});

app.get("/edit-project/picture/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      project,
    };
    response.render("edit-project-picture.hbs", model);
  });
});

// Deletes a project with a specific id
app.post("/project/:id", function (request, response) {
  const id = request.params.id;

  const errorMessages = [];

  // Get file name of image
  const imgUrlQuery = `SELECT projPictureName FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(imgUrlQuery, values, function (error, project) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const pictureFileName = project.projPictureName;

    // Try to delete the file form the file system
    fs.unlink("public/uploads/" + pictureFileName, function (error) {
      if (error) {
        errorMessages.push(
          "Problem occured when deleting picture from file system"
        );
      }

      // If no error with deleting form filesystem, then delete from database
      const query = `DELETE FROM projects WHERE projId = ?`;
      const values = [id];

      db.run(query, values, function (error) {
        if (error) {
          errorMessages.push("Internal server error");

          const query = `SELECT * FROM projects WHERE projId = ?`;
          const values = [id];

          db.get(query, values, function (error, project) {
            if (error) {
              errorMessages.push("Internal server error");
            }
            const model = {
              project,
              errorMessages,
            };
            response.render("project-detail.hbs", model);
          });
        } else {
          response.redirect("/#projects");
        }
      });
      console.log("File is deleted.");
    });
  });
});

// Renders the page for creating a new blog post
app.get("/new-blog", function (request, response) {
  response.render("new-blogpost.hbs");
});

app.post("/new-blog", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;

  const errorMessages = [];

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // Validation for title
    if (title === "") {
      errorMessages.push("Title can't be empty");
    } else if (title.length > titleMaxLength) {
      errorMessages.push(
        "Title is more than " + titleMaxLength + " characters"
      );
    }

    // Validation for Description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (description.length > descriptionMaxLenght) {
      errorMessages.push(
        "Title is more than " + descriptionMaxLenght + " characters"
      );
    }
  }

  if (errorMessages.length === 0) {
    const query = `INSERT INTO blogposts (blogTitle, blogDescription, blogPublishedDate) VALUES (?, ?, ?)`;
    const values = [title, description, currentDate];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          title,
          description,
        };
        response.render("new-blogpost.hbs", model);
      } else {
        response.redirect("/new-blog-picture/" + this.lastID);
      }
    });
  } else {
    const model = {
      errorMessages,
      title,
      description,
    };
    response.render("new-blogpost.hbs", model);
  }
});

// Shows the edit page for a blog post
app.get("/edit-blog/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.query.page);

  const query = `SELECT * FROM blogposts WHERE blogID = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    const errorMessages = [];
    if (error) {
      errorMessages.push(
        "Internal server error when trying to go to the edit page"
      );
    }
    const model = {
      blog,
      pageNumber,
    };
    response.render("edit-blogpost.hbs", model);
  });
});

// Edits a blog post with a specific id
app.post("/edit-blog/:id", function (request, response) {
  const id = request.params.id;

  const pageNumber = parseInt(request.body.page);
  const title = request.body.title;
  const description = request.body.description;

  const errorMessages = [];

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // Validation for title
    if (title === "") {
      errorMessages.push("Title can't be empty");
    } else if (title.length > titleMaxLength) {
      errorMessages.push(
        "Title is more than " + titleMaxLength + " characters"
      );
    }

    // Validation for Description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (description.length > descriptionMaxLenght) {
      errorMessages.push(
        "Title is more than " + descriptionMaxLenght + " characters"
      );
    }
  }

  if (errorMessages.length === 0) {
    const query = `UPDATE blogposts SET blogTitle = ?, blogDescription = ? WHERE blogId = ?`;

    const values = [title, description, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          blog: {
            blogId: id,
            title,
            description,
          },
        };
        response.render("edit-blogpost.hbs", model);
      } else {
        response.redirect("/blog?page=" + pageNumber);
      }
    });
  } else {
    const query = `SELECT * FROM blogposts WHERE blogID = ?`;
    const values = [id];

    db.get(query, values, function (error, blog) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        blog,
        title,
        description,
      };
      response.render("edit-blogpost.hbs", model);
    });
  }
});

// Deletes a blog with a specific id
app.post("/delete-blog/:id", function (request, response) {
  const id = request.params.id;

  const errorMessages = [];

  // Get file name of image
  const imgUrlQuery = `SELECT blogPictureName FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.get(imgUrlQuery, values, function (error, blogpost) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const pictureFileName = blogpost.blogPictureName;

    // Try to delete the file form the file system
    fs.unlink("public/uploads/" + pictureFileName, function (error) {
      if (error) {
        errorMessages.push(
          "Problem occured when deleting picture from file system"
        );
      }

      // If no error with deleting form filesystem, then delete from database
      const blogpostQuery = `DELETE FROM blogposts WHERE blogId = ?`;
      const commentQuery = `DELETE FROM comments WHERE blogId = ?`;

      db.run(blogpostQuery, values, function (error) {
        const serverErrorMessages = [];
        if (error) {
          serverErrorMessages.push(
            "Internal server error when deleting blogpost"
          );
        }
        db.run(commentQuery, values, function (error) {
          if (error) {
            serverErrorMessages.push(
              "Internal server error when deleting comments connected to blogpost"
            );

            const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC`;
            const commentsQuery = `SELECT * FROM comments`;

            db.all(blogQuery, function (error, blogposts) {
              if (error) {
                serverErrorMessages.push("Internal server error");
              }
              db.all(commentsQuery, function (error, comments) {
                if (error) {
                  serverErrorMessages.push("Internal server error");
                }
                const model = {
                  blogposts,
                  comments,
                  serverErrorMessages,
                };
                response.render("blog.hbs", model);
              });
            });
          } else {
            response.redirect("/blog?page=1");
          }
        });
      });
    });
  });
});

// Edit comment page
app.get("/edit-comment/:id/page=:page", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.params.page);

  const query = `SELECT * FROM comments WHERE cmntId = ?`;
  const values = [id];

  db.get(query, values, function (error, comment) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      comment,
      pageNumber,
    };
    response.render("edit-comment.hbs", model);
  });
});

// Edits a comment with a specific id
app.post("/edit-comment/:id", function (request, response) {
  const id = request.params.id;

  const pageNumber = parseInt(request.body.page);
  const name = request.body.name;
  const comment = request.body.comment;

  const errorMessages = [];

  const nameMaxLength = 30;
  const commentMaxLenght = 200;

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // Validation of name
    if (name === "") {
      errorMessages.push("Name can't be empty");
    } else if (name.length > nameMaxLength) {
      errorMessages.push(
        "Name is longer than " + nameMaxLength + " characters"
      );
    }

    // Validation of comment
    if (comment === "") {
      errorMessages.push("Comment can't be empty");
    } else if (comment.length > commentMaxLenght) {
      errorMessages.push(
        "Comment is longer than " + commentMaxLenght + " characters"
      );
    }
  }

  if (errorMessages.length === 0) {
    const query = `UPD comments SET cmntName = ?, cmntContent = ? WHERE cmntId = ?`;
    const values = [name, comment, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          comment: {
            comntId: id,
            name,
            comment,
          },
          pageNumber,
        };
        response.render("edit-comment.hbs", model);
      } else {
        response.redirect("/blog?page=" + pageNumber);
      }
    });
  } else {
    const query = `SELECT * FROM comments WHERE cmntId = ?`;
    const values = [id];

    db.get(query, values, function (error, comment) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        comment,
        pageNumber,
      };
      response.render("edit-comment.hbs", model);
    });
  }
});

// Deletes a comment with a specific id
app.post("/delete-comment/:id", function (request, response) {
  const id = request.params.id;
  const blogId = request.body.blogId;

  const errorMessages = [];
  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    const query = `DELETE FROM comments WHERE cmntId = ?`;

    const values = [id];

    db.run(query, values, function (error) {
      const errorMessages = [];
      if (error) {
        errorMessages.push("Internal server error");
      }
      response.redirect("/blog/#blog/" + blogId);
    });
  }
});

app.listen(8080);
