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
const path = __dirname + "/public/uploads/";

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
    cmntPublishedDate TEXT,
    cmntContent TEXT,
    blogId INTEGER,
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

  const errorMessages = [];
  const serverErrorMessages = [];

  // Count how many blogposts
  db.all(
    `SELECT COUNT(*) as tableRows FROM blogposts`,
    function (error, blogposts) {
      if (error) {
        serverErrorMessages.push("Internal server error");

        const model = {
          blogposts,
          errorMessages,
        };

        response.render("blog.hbs", model);
      } else {
        // Calculate number of pages
        const numberOfRows = blogposts[0].tableRows;
        const numberOfPages = Math.ceil(numberOfRows / postPerPage);
        nextPageUrl =
          pageNumber != numberOfPages ? "/blog?page=" + (pageNumber + 1) : "#";
        nextPageDisabled = pageNumber != numberOfPages ? false : true;

        let pageNumbers = [];
        let pageActive;

        // Splits number of pages into an array with each page number
        for (let i = 1; i <= numberOfPages; i++) {
          if (i === pageNumber) {
            pageActive = true;
          } else {
            pageActive = false;
          }
          pageNumbers.push({ page: i, active: pageActive });
        }

        // Select blogposts
        const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC LIMIT ? OFFSET ?`;
        const values = [postPerPage, offsetValue];

        db.all(blogQuery, values, function (error, blogposts) {
          if (error) {
            serverErrorMessages.push("Internal server error");

            const model = {
              blogposts,
              serverErrorMessages,
              pageNumber,
              pageNumbers,
            };

            response.render("blog.hbs", model);
          } else {
            // Select comments
            const commentsQuery = `SELECT * FROM comments`;

            db.all(commentsQuery, function (error, comments) {
              if (error) {
                serverErrorMessages.push(
                  "Internal server error when selecting comments"
                );

                const model = {
                  blogposts,
                  serverErrorMessages,
                  pageNumber,
                  pageNumbers,
                };

                response.render("blog.hbs", model);
              } else {
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
              }
            });
          }
        });
      }
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
  const serverErrorMessages = [];

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
    const query = `INSERT INTO comments (cmntName, cmntPublishedDate, cmntContent, blogId) VALUES (?, ?, ?, ?)`;
    const values = [name, currentDate, comment, blogId];

    db.run(query, values, function (error) {
      if (error) {
        serverErrorMessages.push("Internal server error");
        const model = {
          serverErrorMessages,
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
    // If error when creating comment
    let nextPageUrl;
    let nextPageDisabled;
    let previousPageUrl =
      pageNumber != 1 ? "/blog?page=" + (pageNumber - 1) : "#";
    let previousPageDisabled = pageNumber != 1 ? false : true;
    const offsetValue = (pageNumber - 1) * postPerPage;

    db.all(
      `SELECT COUNT(*) as tableRows FROM blogposts`,
      function (error, blogposts) {
        if (error) {
          serverErrorMessages.push("Internal server error");
          const model = {
            serverErrorMessages,
            blogpost,
            comment,
          };
          response.render("blog.hbs", model);
        } else {
          const numberOfRows = blogposts[0].tableRows;
          const numberOfPages = Math.ceil(numberOfRows / postPerPage);
          nextPageUrl =
            pageNumber != numberOfPages
              ? "/blog?page=" + (pageNumber + 1)
              : "#";
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
              serverErrorMessages.push("Internal server error");
              model = [];
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

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/login");
});

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

  function pictureOrBlogIfELse(forProject, forBlog, method) {
    if (method === "redirect") {
      if (destination === "project") {
        response.redirect(forProject);
      } else if (destination === "blog") {
        response.redirect(forBlog);
      }
    } else {
      if (destination === "project") {
        response.render(forProject);
      } else if (destination === "blog") {
        response.render(forBlog);
      }
    }
  }

  // Following line of code was made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
  if (!request.files || Object.keys(request.files).length === 0) {
    errorMessages.push("No file is selected");

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
  } else {
    // Delete old picture from file system

    if (destination === "project") {
      // Select old picture name from the database
      const oldPictureQuery = `SELECT projPictureName FROM projects WHERE projId = ?`;
      const values = [id];

      db.get(oldPictureQuery, values, function (error, project) {
        if (error) {
          errorMessages.push("Internal server error");
        }

        const oldPictureName = project.projPictureName;

        // Delete old picture
        deleteOldPicture(oldPictureName);
      });
    } else if (destination === "blog") {
      // Select old picture name from the database
      const oldPictureQuery = `SELECT blogPictureName FROM blogposts WHERE blogId = ?`;
      const values = [id];

      db.get(oldPictureQuery, values, function (error, blog) {
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
        }
        console.log("file moved");
      });

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
          pictureOrBlogIfELse(
            "edit-project-picture.hbs",
            model,
            "edit-blog-picture.hbs",
            model,
            "render"
          );
        } else {
          console.log("database updated");
          // Redirect to another page when upload is completed
          pictureOrBlogIfELse(
            "/edit-project/" + id,
            "/edit-blog/" + id + "/?page=" + pageNumber,
            "redirect"
          );
        }
      });
    } else {
      const model = {
        errorMessages,
      };
      // Render the same page when error occured
      pictureOrBlogIfELse(
        "edit-project-picture.hbs",
        model,
        "edit-blog-picture.hbs",
        model,
        "render"
      );
    }
  }
});

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

  let uniqueFileName;

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

  // Following two lines of code are done with help form a tutorial by Raddy on youtube: https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
  if (!request.files || Object.keys(request.files).length === 0) {
    errorMessages.push("No file is selected");

    const model = {
      errorMessages,
      title,
      description,
      date,
      category,
    };

    response.render("new-project.hbs", model);
  } else {
    // Following line of code is done with help from  https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
    // imageFile is the name of the input
    let imageFile = request.files.image;
    uniqueFileName = Math.floor(Math.random() * 10000) + imageFile.name;
    let uploadPath = path + uniqueFileName;
    console.log(uniqueFileName);

    if (errorMessages.length === 0) {
      // Move the uploaded file to the right place
      // Following line of code is done with help from https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
      imageFile.mv(uploadPath, function (error) {
        if (error) {
          errorMessages.push("Error when uploading file");
        }
        console.log("File moved");

        // When file upload has been uploaded to the file systen, create the project

        const query = `INSERT INTO projects (projTitle, projDescription, projCreatedDate, projCategory, projPictureName) VALUES (?, ?, ?, ?, ?)`;
        const values = [title, description, date, category, uniqueFileName];

        db.run(query, values, function (error) {
          if (error) {
            errorMessages.push("Internal server error");
            const model = {
              errorMessages,
            };

            response.render("new-project.hbs", model);
          } else {
            response.redirect("/#projects");
          }
        });
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

  let uniqueFileName;
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

  // Following two lines of code are done with help form a tutorial by Raddy on youtube: https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
  if (!request.files || Object.keys(request.files).length === 0) {
    errorMessages.push("No file is selected");

    const model = {
      errorMessages,
      title,
      description,
    };

    response.render("new-blogpost.hbs", model);
  } else {
    // Following line of code is done with help from  https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
    // imageFile is the name of the input
    let imageFile = request.files.image;
    uniqueFileName = Math.floor(Math.random() * 10000) + imageFile.name;
    let uploadPath = path + uniqueFileName;
    console.log(uniqueFileName);

    if (errorMessages.length === 0) {
      // Move the uploaded file to the right place
      // Following line of code is done with help from https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
      imageFile.mv(uploadPath, function (error) {
        if (error) {
          errorMessages.push("Error when uploading file");
        }
        console.log("File moved");

        // When file is uploaded to the file system, create the broject

        const query = `INSERT INTO blogposts (blogTitle, blogDescription, blogPublishedDate, blogPictureName) VALUES (?, ?, ?, ?)`;
        const values = [title, description, currentDate, uniqueFileName];

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
            response.redirect("/blog?page=1");
          }
        });
      });
    } else {
      const model = {
        errorMessages,
        title,
        description,
      };
      response.render("new-blogpost.hbs", model);
    }
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
