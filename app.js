const express = require("express");
const expressHandlebars = require("express-handlebars");
const data = require("./data");

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
  const model = {
    projects: data.projects,
  };
  response.render("startpage.hbs", model);
});

app.get("/projects/:id", function (request, response) {
  const id = request.params.id;

  const project = data.projects.find((p) => p.id == id);

  const model = {
    project: project,
  };
  response.render("project-detail.hbs", model);
});

app.get("/blog", function (request, response) {
  // const comments = data.comments.filter((c) => c.blogId == 3);

  const model = {
    blogposts: data.blogposts,
    comments: data.comments,
  };
  response.render("blog.hbs", model);
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
  const user = data.users.find((u) => u.id == 1);

  const model = {
    user: user,
  };

  response.render("account.hbs", model);
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

  const project = data.projects.find((p) => p.id == id);

  const model = {
    project: project,
  };
  response.render("edit-project.hbs", model);
});

app.get("/edit-blog/:id", function (request, response) {
  const id = request.params.id;

  const blog = data.blogposts.find((b) => b.id == id);

  const model = {
    blog: blog,
  };
  response.render("edit-blogpost.hbs", model);
});

app.listen(8080);
