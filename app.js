const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const expressSession = require("express-session");

const db = new sqlite3.Database("portfolio-database.db");

const adminMail = "ALice.gmail";
const adminPassword = "123";

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

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

//Midleware function to handle expressSession
// app.use(
//   expressSession({
//     saveUninitalized: false,
//     resave: false,
//     secret: "aiuhkslao",
//   })
// );

app.get("/", function (request, response) {
  const query = `SELECT * FROM projects ORDER BY projId DESC`;

  db.all(query, function (error, projects) {
    const errorMessage = [];

    if (error) {
      errorMessage.push("Internal server error");
    }

    const model = {
      errorMessage,
      projects,
    };
    response.render("startpage.hbs", model);
  });
});

// app.get("/projects/illustrations", function (request, response) {
//   const query = `SELECT * FROM projects WHERE projCategory = "Website" ORDER BY projId DESC`;

//   db.all(query, function (error, projects) {
//     const errorMessage = [];

//     if (error) {
//       errorMessage.push("Inernal server error");
//     }

//     const model = {
//       errorMessage,
//       projects,
//     };
//     response.render("startpage.hbs", model);
//   });
// });

// Read projects with a specific id and render corresponding page
app.get("/projects/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
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

  db.all(blogQuery, function (error, blogposts) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
    }
    db.all(commentsQuery, function (error, comments) {
      const errorMessage = [];
      if (error) {
        errorMessage.push("Internal server error");
      }
      const model = {
        blogposts,
        comments,
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

// Create comments on blog page
app.post("/blog/:id", function (request, response) {
  const blogId = request.params.id;

  const name = request.body.name;
  const comment = request.body.comment;

  // Calculate today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthCorrection = month < 10 ? "0" + (month + 1) : month + 1;
  const date = today.getDate();
  const currentDate = year + "-" + monthCorrection + "-" + date;

  const errorMessage = [];

  const nameMaxLength = 50;
  const commentMaxLenght = 200;

  // Validation of name
  if (name === "") {
    errorMessage.push("Name can't be empty");
  } else if (name > nameMaxLength) {
    errorMessage.push("Name is longer than " + nameMaxLength + " characters");
  }

  // Validation of comment
  if (comment === "") {
    errorMessage.push("Comment can't be empty");
  } else if (comment > commentMaxLenght) {
    errorMessage.push(
      "Comment is longer than " + commentMaxLenght + " characters"
    );
  }

  if (errorMessage.length === 0) {
    const query = `INSERT INTO comments (cmntName, cmntDate, cmntContent, blogId) VALUES (?, ?, ?, ?)`;
    const values = [name, currentDate, comment, blogId];

    db.get(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };
        response.render("/blog", model);
      }
      response.redirect("/blog#comment-section/" + blogId);
    });
  } else {
    const model = {
      errorMessage,
    };
    response.render("/blog", model);
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

let isLoggedIn = false;

app.post("/login", function (request, response) {
  const mail = request.body.mail;
  const password = request.body.password;

  if (mail == adminMail && password == adminPassword) {
    request.session.isLoggedIn = true;

    response.redirect("/");
  } else {
    const model = {
      failedToLogin: false,
    };

    response.render("login.hbs");
  }

  response.redirect("account.hbs");
});

app.get("/account", function (request, response) {
  const query = `SELECT * FROM admin`;

  db.all(query, function (error, admin) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
    }
    const model = {
      admin,
    };

    response.render("account.hbs", model);
  });
});

app.get("/new-project", function (request, response) {
  response.render("new-project.hbs");
});

const titleMaxLength = 40;
const descriptionMaxLenght = 1000;

app.post("/new-project", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const date = request.body.date;
  const category = request.body.category;
  const file = request.body.file;

  const errorMessage = [];

  // validation for title
  if (title === "") {
    errorMessage.push("Title can't be empty");
  } else if (title.length > titleMaxLength) {
    errorMessage.push("Title is more than " + titleMaxLength + " characters");
  }

  // validation for description
  if (description === "") {
    errorMessage.push("Description can't be empty");
  } else if (title.length > descriptionMaxLenght) {
    errorMessage.push(
      "Title is more than " + descriptionMaxLenght + " characters"
    );
  }

  // validation for category
  if (category === "") {
    errorMessage.push("Choose a category");
  } else if (category === "Choose an option") {
    errorMessage.push("Category can't be: Choose an option");
  }

  // validation for date
  if (date === "") {
    errorMessage.push("Pick a date");
  }

  // validation for picture
  if (file === "") {
    errorMessage.push("Choose a picture");
  }

  if (errorMessage.length === 0) {
    const query = `INSERT INTO projects (projTitle, projDescription, projDate, projCategory, projPicture) VALUES (?, ?, ?, ?, ?)`;

    const values = [title, description, date, category, file];

    db.run(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };

        response.render("new-project.hbs", model);
      } else {
        response.redirect("/#projects");
      }
    });
  } else {
    const model = {
      errorMessage,
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
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
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

  const errorMessage = [];

  // validation for title
  if (title === "") {
    errorMessage.push("Title can't be empty");
  } else if (title.length > titleMaxLength) {
    errorMessage.push("Title is more than " + titleMaxLength + " characters");
  }

  // validation for description
  if (description === "") {
    errorMessage.push("Description can't be empty");
  } else if (title.length > descriptionMaxLenght) {
    errorMessage.push(
      "Title is more than " + descriptionMaxLenght + " characters"
    );
  }

  // validation for category
  if (category === "") {
    errorMessage.push("Choose a category");
  } else if (category === "Choose an option") {
    errorMessage.push("Category can't be: Choose an option");
  }

  // validation for date
  if (date === "") {
    errorMessage.push("Pick a date");
  }

  // validation for picture
  if (file === "") {
    errorMessage.push("Choose a picture");
  }

  if (errorMessage.length === 0) {
    const query = `UPDATE projects SET projTitle = ?, projDescription = ?, projDate = ?, projCategory = ?, projPicture = ? WHERE projId = ?`;

    const values = [title, description, date, category, file, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };
        response.render("edit-project.hbs", model);
      } else {
        response.redirect("/projects/" + id);
      }
    });
  } else {
    const model = {
      errorMessage,
    };

    response.render("edit-project.hbs", model);
  }
});

// Deletes a project with a specific id
app.post("/projects/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM projects WHERE projId = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
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
  const monthCorrection = month < 10 ? "0" + (month + 1) : month + 1;
  const date = today.getDate();
  const currentDate = year + "-" + monthCorrection + "-" + date;

  const file = request.body.file;

  const errorMessage = [];

  // Validation for title
  if (title === "") {
    errorMessage.push("Title can't be empty");
  } else if (title.length > titleMaxLength) {
    errorMessage.push("Title is more than " + titleMaxLength + " characters");
  }

  // Validation for Description
  if (description === "") {
    errorMessage.push("Description can't be empty");
  } else if (description.length > descriptionMaxLenght) {
    errorMessage.push(
      "Title is more than " + descriptionMaxLenght + " characters"
    );
  }

  // Validation for picture
  if (file === "") {
    errorMessage.push("Choose a picture");
  }

  if (errorMessage.length === 0) {
    const query = `INSERT INTO blogposts (blogTitle, blogDescription, blogDate, blogPicture) VALUES (?, ?, ?, ?)`;
    const values = [title, description, currentDate, file];

    db.run(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };
        response.render("new-blogpost.hbs", model);
      } else {
        response.redirect("/blog");
      }
    });
  } else {
    const model = {
      errorMessage,
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
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
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

  const errorMessage = [];

  // Validation for title
  if (title === "") {
    errorMessage.push("Title can't be empty");
  } else if (title.length > titleMaxLength) {
    errorMessage.push("Title is more than " + titleMaxLength + " characters");
  }

  // Validation for Description
  if (description === "") {
    errorMessage.push("Description can't be empty");
  } else if (description.length > descriptionMaxLenght) {
    errorMessage.push(
      "Title is more than " + descriptionMaxLenght + " characters"
    );
  }

  // Validation for picture
  if (file === "") {
    errorMessage.push("Choose a picture");
  }

  if (errorMessage.length === 0) {
    const query = `UPDATE blogposts SET blogTitle = ?, blogDescription = ?, blogPicture = ? WHERE blogId = ?`;

    const values = [title, description, file, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };
        response.render("edit-blogpost.hbs", model);
      }
      response.redirect("/blog");
    });
  } else {
    const model = {
      errorMessage,
    };
    response.render("edit-blogpost.hbs", model);
  }
});

// Deletes a blog with a specific id
app.post("/delete-blog/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM blogposts WHERE blogId = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
    }
    response.redirect("/blog");
  });
});

// Edit comment page
app.get("/edit-comment/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM comments WHERE cmntId = ?`;
  const values = [id];

  db.get(query, values, function (error, comment) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
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

  const errorMessage = [];

  const nameMaxLength = 50;
  const commentMaxLenght = 200;

  // Validation of name
  if (name === "") {
    errorMessage.push("Name can't be empty");
  } else if (name > nameMaxLength) {
    errorMessage.push("Name is longer than " + nameMaxLength + " characters");
  }

  // Validation of comment
  if (comment === "") {
    errorMessage.push("Comment can't be empty");
  } else if (comment > commentMaxLenght) {
    errorMessage.push(
      "Comment is longer than " + commentMaxLenght + " characters"
    );
  }

  if (errorMessage.length === 0) {
    const query = `UPDATE comments SET cmntName = ?, cmntContent = ? WHERE cmntId = ?`;
    const values = [name, comment, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessage.push("Internal server error");
        const model = {
          errorMessage,
        };
        response.render("edit-comment.hbs", model);
      }
      response.redirect("/blog");
    });
  } else {
    const model = {
      errorMessage,
    };
    response.render("edit-comment.hbs", model);
  }
});

// Deletes a comment with a specific id
app.post("/delete-comment/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM comments WHERE cmntId = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    const errorMessage = [];
    if (error) {
      errorMessage.push("Internal server error");
    }
    response.redirect("/blog");
  });
});

app.listen(8080);
