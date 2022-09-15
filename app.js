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
  response.render("projects.hbs", model);
});

app.get("/projects/:id", function (request, response) {
  const id = request.params.id;

  const project = data.projects.find((p) => p.id == id);

  const model = {
    project: project,
  };
  response.render("project-detail.hbs", model);
});

app.listen(8080);
