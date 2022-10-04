const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const connectSqLite3 = require("connect-sqlite3");
const SQLiteStore = connectSqLite3(expressSession);

// Variables
const titleMaxLength = 40;
const descriptionMaxLenght = 1000;

// Database
const db = new sqlite3.Database("portfolio-database.db");

// Hardcoded mail and password for login
const adminMail = "admin@gmail.com";
const adminPassword = "123456";

// const test = `SELECT adminMail FROM admin where adminId = 1`;
// console.log(test);

// Database tables
db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    projId INTEGER PRIMARY KEY,
    projTitle TEXT,
    projDescription TEXT,
    projCategory TEXT,
    projDate TEXT,
    projPicture TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS blogposts (
    blogId INTEGER PRIMARY KEY,
    blogTitle TEXT,
    blogDate TEXT,
    blogDescription TEXT,
    blogPicture TEXT
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

db.run(`
  CREATE TABLE IF NOT EXISTS admin (
    adminId INTEGER PRIMARY KEY,
    adminName TEXT,
    adminMail TEXT,
    adminPassword TEXT
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

  db.all(query, function (error, project) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }

    const model = {
      // session: request.session,
      errorMessages,
      project,
    };

    response.render("startpage.hbs", model);
  });
});

// app.get("/project/illustrations", function (request, response) {
//   const query = `SELECT * FROM projects WHERE projCategory = "Website" ORDER BY projId DESC`;

//   db.all(query, function (error, projects) {
//     const errorMessages = [];

//     if (error) {
//       errorMessages.push("Inernal server error");
//     }

//     const model = {
//       errorMessages,
//       projects,
//     };
//     response.render("startpage.hbs", model);
//   });
// });

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

// Renders blog page
app.get("/blog", function (request, response) {
  const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC`;
  const commentsQuery = `SELECT * FROM comments`;

  db.all(blogQuery, function (error, blogpost) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    db.all(commentsQuery, function (error, comment) {
      const errorMessages = [];
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        blogpost,
        comment,
      };
      response.render("blog.hbs", model);
    });
  });
});

//An attempt to put blogposts and comments on the same page
// app.get("/blog", function (request, response) {
//   const query = `SELECT blogposts.*, comments.* FROM blogposts LEFT OUTER JOIN comments ON blogposts.blogId = comments.blogId`;
//   db.all(query, function (error, blogposts, hello) {
//     const model = {
//       blogposts,
//       hello,
//     };
//     response.render("blog.hbs", model);
//   });
// });

// app.get("/about", function (request, response) {
//   const query = `SELECT * FROM blogposts LEFT OUTER JOIN comments ON blogposts.blogId = comments.blogId`;
//   db.all(query, function (error, blogposts) {
//     const model = {
//       blogposts,
//     };
//     response.render("about.hbs", model);
//   });
// });

// Create comments on blog page
app.post("/blog/:id", function (request, response) {
  const blogId = request.params.id;

  const name = request.body.name;
  const comment = request.body.comment;

  // Calculate today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
  const date = today.getDate();
  const dateCorrection = date < 10 ? "0" + date : date;
  const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

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
        response.redirect("/blog#comment-section/" + blogId);
      }
    });
  } else {
    const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC`;
    const commentsQuery = `SELECT * FROM comments`;

    const errorOccured = blogId;

    db.all(blogQuery, function (error, blogpost) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      db.all(commentsQuery, function (error, comment) {
        if (error) {
          errorMessages.push("Internal server error");
        }
        const model = {
          blogpost,
          comment,
          errorMessages,
          errorOccured,
        };
        response.render("blog.hbs", model);
      });
    });
  }
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

  const correctEnteredMail = enteredMail.includes("@");
  const mailMaxLenght = 60;
  const passwordMaxLenght = 8;

  const errorMessages = [];

  // Validation of mail
  if (enteredMail === "") {
    errorMessages.push("Mail can't be empty");
  } else if (correctEnteredMail === false) {
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

  if (enteredMail === adminMail && enteredPassword === adminPassword) {
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

app.get("/account", function (request, response) {
  const query = `SELECT * FROM admin`;

  db.all(query, function (error, admin) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      admin,
    };

    response.render("account.hbs", model);
  });
});

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/login");
});

app.get("/new-project", function (request, response) {
  response.render("new-project.hbs");
});

app.post("/new-project", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const date = request.body.date;
  const category = request.body.category;
  const file = request.body.file;

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

    // validation for picture
    if (file === "") {
      errorMessages.push("Choose a picture");
    }
  }

  if (errorMessages.length === 0) {
    const query = `INSERT INTO projects (projTitle, projDescription, projDate, projCategory, projPicture) VALUES (?, ?, ?, ?, ?)`;

    const values = [title, description, date, category, file];

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
  } else {
    const model = {
      errorMessages,
    };

    response.render("new-project.hbs", model);
  }
});

// Renders the edit page for a project
app.get("/edit-project/:id", function (request, response) {
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
  const file = request.body.file;

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

    // validation for picture
    if (file === "") {
      errorMessages.push("Choose a picture");
    }
  }

  if (errorMessages.length === 0) {
    const query = `UPDATE projects SET projTitle = ?, projDescription = ?, projDate = ?, projCategory = ?, projPicture = ? WHERE projId = ?`;

    const values = [title, description, date, category, file, id];

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
            file,
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
      };
      response.render("edit-project.hbs", model);
    });
  }
});

// Deletes a project with a specific id
app.post("/project/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM projects WHERE projId = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    response.redirect("/#projects");
  });
});

// Renders the page for creating a new blog post
app.get("/new-blog", function (request, response) {
  response.render("new-blogpost.hbs");
});

app.post("/new-blog", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;

  // Calculate today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
  const date = today.getDate();
  const dateCorrection = date < 10 ? "0" + date : date;
  const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

  const file = request.body.file;

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

    // Validation for picture
    if (file === "") {
      errorMessages.push("Choose a picture");
    }
  }

  if (errorMessages.length === 0) {
    const query = `INSERT INTO blogposts (blogTitle, blogDescription, blogDate, blogPicture) VALUES (?, ?, ?, ?)`;
    const values = [title, description, currentDate, file];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
        };
        response.render("new-blogpost.hbs", model);
      } else {
        response.redirect("/blog");
      }
    });
  } else {
    const model = {
      errorMessages,
    };
    response.render("new-blogpost.hbs", model);
  }
});

// Shows the edit page for a blog post
app.get("/edit-blog/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM blogposts WHERE blogID = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      blog,
    };
    response.render("edit-blogpost.hbs", model);
  });
});

// Edits a blog post with a specific id
app.post("/edit-blog/:id", function (request, response) {
  const id = request.params.id;

  const title = request.body.title;
  const description = request.body.description;
  const file = request.body.file;

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

    // Validation for picture
    if (file === "") {
      errorMessages.push("Choose a picture");
    }
  }

  if (errorMessages.length === 0) {
    const query = `UPDATE blogposts SET blogTitle = ?, blogDescription = ?, blogPicture = ? WHERE blogId = ?`;

    const values = [title, description, file, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          blog: {
            blogId: id,
            title,
            description,
            file,
          },
        };
        response.render("edit-blogpost.hbs", model);
      } else {
        response.redirect("/blog");
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
      };
      response.render("edit-blogpost.hbs", model);
    });
  }
});

// Deletes a blog with a specific id
app.post("/delete-blog/:id", function (request, response) {
  const id = request.params.id;

  const blogpostQuery = `DELETE FROM blogposts WHERE blogId = ?`;
  const commentQuery = `DELETE FROM comments WHERE blogId = ?`;

  const values = [id];

  db.run(blogpostQuery, values, function (error) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    db.run(commentQuery, values, function (error) {
      const errorMessages = [];
      if (error) {
        errorMessages.push("Internal server error");
      }
      response.redirect("/blog");
    });
  });
});

// Edit comment page
app.get("/edit-comment/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM comments WHERE cmntId = ?`;
  const values = [id];

  db.get(query, values, function (error, comment) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      comment,
    };
    response.render("edit-comment.hbs", model);
  });
});

// Edits a comment with a specific id
app.post("/edit-comment/:id", function (request, response) {
  const id = request.params.id;

  const name = request.body.name;
  const comment = request.body.comment;

  const errorMessages = [];

  const nameMaxLength = 20;
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
    const query = `UPDATE comments SET cmntName = ?, cmntContent = ? WHERE cmntId = ?`;
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
        };
        response.render("edit-comment.hbs", model);
      }
      response.redirect("/blog");
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
      };
      response.render("edit-comment.hbs", model);
    });
  }
});

// Deletes a comment with a specific id
app.post("/delete-comment/:id", function (request, response) {
  const id = request.params.id;

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
      response.redirect("/blog");
    });
  }
});

app.listen(8080);
