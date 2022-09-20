const express = require("express");
const expressHandlebars = require("express-handlebars");
// const data = require("./data");
const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("portfolio-database.db");

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
    cmnttId INTEGER PRIMARY KEY,
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

app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.get("/", function (request, response) {
  const query = `SELECT * FROM projects`;

  db.all(query, function (error, projects) {
    const model = {
      projects,
    };
    response.render("startpage.hbs", model);
  });
});

app.get("/projects/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const model = {
      project,
    };
    response.render("project-detail.hbs", model);
  });
});

app.get("/blog", function (request, response) {
  const query = `SELECT * FROM blogposts`;

  db.all(query, function (error, blogposts) {
    const model = {
      blogposts,
      // comments: data.comments,
    };
    response.render("blog.hbs", model);
  });
});

app.post("/blog/:id", function (request, response) {
  const blogId = request.params.id;

  const name = request.body.name;
  const comment = request.body.comment;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthCorrection = month.length <= 1 ? "0" + month + 1 : month + 1;
  const date = today.getDate();
  const time = year + "-" + monthCorrection + "-" + date;

  data.comments.push({
    id: data.comments.at(-1).id + 1,
    name: name,
    content: comment,
    date: time,
    blogId: blogId,
  });
  response.redirect("/blog");
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

app.get("/account", function (request, response) {
  const query = `SELECT * FROM admin`;

  db.all(query, function (error, admin) {
    const model = {
      admin,
    };

    response.render("account.hbs", model);
  });
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

  data.projects.unshift({
    id: data.projects.at(0).id + 1,
    Title: title,
    Description: description,
    Date: date,
    Category: category,
    Picture: file,
  });

  response.redirect("/projects/" + data.projects.length);
});

app.get("/new-blog", function (request, response) {
  response.render("new-blogpost.hbs");
});

app.post("/new-blog", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const date = new Date();
  const file = request.body.file;

  data.blogposts.unshift({
    id: data.blogposts.at(0).id + 1,
    Title: title,
    Description: description,
    Date: date,
    Picture: file,
  });

  response.redirect("/blog");
});

app.get("/edit-project/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    const model = {
      project,
    };
    response.render("edit-project.hbs", model);
  });
});

app.get("/edit-blog/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM blogposts WHERE blogID = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    const model = {
      blog,
    };
    response.render("edit-blogpost.hbs", model);
  });
});

app.listen(8080);
