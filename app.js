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
  const model = {
    blogposts: data.blogposts,
    comments: data.comments,
  };
  response.render("blog.hbs", model);
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

app.get("/new-project", function (request, response) {
  response.render("new-project.hbs");
});

app.get("/new-blog", function (request, response) {
  response.render("blogpost.hbs");
});

app.listen(8080);
