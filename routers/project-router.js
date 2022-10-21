const express = require("express");
const db = require("../db.js");
const pathModule = require("path");
const fs = require("fs");
const router = express.Router();

// Variables
const titleMaxLength = 40;
const descriptionMaxLenght = 1000;
let oneStepBackInDir = pathModule.join(__dirname, "../");
const path = oneStepBackInDir + "public/uploads/";

// Calculate today's date
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
const date = today.getDate();
const dateCorrection = date < 10 ? "0" + date : date;
const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

// /project/create

router.get("/create", function (request, response) {
  const model = {
    currentDate,
  };
  response.render("new-project.hbs", model);
});

router.post("/create", function (request, response) {
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
      currentDate,
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

          const model = {
            currentDate,
            errorMessages,
            title,
            description,
            date,
            category,
          };

          response.render("new-project.hbs", model);
        } else {
          console.log("File moved");

          // When file upload has been uploaded to the file systen, create the project

          db.createProject(
            title,
            description,
            date,
            category,
            uniqueFileName,
            function (error) {
              if (error) {
                errorMessages.push("Internal server error");
                const model = {
                  errorMessages,
                  currentDate,
                };

                response.render("new-project.hbs", model);
              } else {
                response.redirect("/#projects");
              }
            }
          );
        }
      });
    } else {
      const model = {
        errorMessages,
        title,
        description,
        date,
        category,
        currentDate,
      };

      response.render("new-project.hbs", model);
    }
  }
});

// /project/edit/id

// Renders the edit page for a project
router.get("/edit/:id", function (request, response) {
  const id = request.params.id;

  db.getProjectById(id, function (error, project, category) {
    // The variable for the selected category gets true
    if (project != undefined) {
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
    } else {
      response.render("edit-project.hbs");
    }
  });
});

// Edits a project with a specific id
router.post("/edit/:id", function (request, response) {
  const id = request.params.id;

  const title = request.body.title;
  const description = request.body.description;
  const date = request.body.date;
  const category = request.body.category;

  let imageFile;
  let uploadPath;

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

    // Validation for file
    // Following line of code was made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
    if (!request.files || Object.keys(request.files).length === 0) {
      errorMessages.push("No file is selected");
    }
  }

  if (errorMessages.length === 0) {
    // Select old picture from the database
    db.getProjectPicture(id, function (error, project) {
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
          title,
          description,
          date,
        };

        response.render("edit-project.hbs", model);
      } else {
        const oldPictureName = project.projPictureName;
        console.log(oldPictureName);

        // Get the new image form the input
        imageFile = request.files.image;
        const uniqueFileName =
          Math.floor(Math.random() * 10000) + imageFile.name;
        uploadPath = path + uniqueFileName;

        // Move the uploaded file to the right place
        // Following line of code made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
        imageFile.mv(uploadPath, function (error) {
          if (error) {
            errorMessages.push("Error when uploading file");

            const model = {
              errorMessages,
              project: {
                projId: id,
                title,
                description,
                date,
                category,
              },
              title,
              description,
              date,
              oldPictureName,
            };

            response.render("edit-project.hbs", model);
          } else {
            console.log("file moved");

            db.updateProject(
              title,
              description,
              date,
              category,
              uniqueFileName,
              id,
              function (error) {
                if (error) {
                  errorMessages.push("Internal server error");

                  db.getProjectById(id, function (error, project) {
                    if (error) {
                      errorMessages.push("Internal server error");
                    }

                    // The variable for the selected category gets true
                    let illustrationSelected =
                      project.projCategory === "Illustration" ? true : false;
                    let gameSelected =
                      project.projCategory === "Game development"
                        ? true
                        : false;
                    let websiteSelected =
                      project.projCategory === "Website" ? true : false;
                    let graphicDesignSelected =
                      project.projCategory === "Graphic design" ? true : false;

                    const model = {
                      errorMessages,
                      project: {
                        projId: id,
                        title,
                        description,
                        date,
                        category,
                      },
                      title,
                      description,
                      date,
                      projectPicture: project.projPictureName,
                      illustrationSelected,
                      gameSelected,
                      websiteSelected,
                      graphicDesignSelected,
                    };

                    response.render("edit-project.hbs", model);
                  });
                } else {
                  // Check if old picture exists in files system

                  if (fs.existsSync("public/uploads/" + oldPictureName)) {
                    console.log("old picture exists");
                    // Try to delete the old picture from the file system
                    fs.unlink(
                      "public/uploads/" + oldPictureName,
                      function (error) {
                        if (error) {
                          errorMessages.push(
                            "Problem occured when deleting picture from file system"
                          );

                          const model = {
                            errorMessages,
                            project: {
                              projId: id,
                              title,
                              description,
                              date,
                              category,
                            },
                            title,
                            description,
                            date,
                            oldPictureName,
                          };

                          response.render("edit-project.hbs", model);
                        } else {
                          console.log("old picture deleted");

                          response.redirect("/project/" + id);
                        }
                      }
                    );
                  }
                }
              }
            );
          }
        });
      }
    });
  } else {
    db.getProjectById(id, function (error, project) {
      if (error) {
        errorMessages.push("Internal server error");
      }

      // The variable for the selected category gets true
      let illustrationSelected =
        project.projCategory === "Illustration" ? true : false;
      let gameSelected =
        project.projCategory === "Game development" ? true : false;
      let websiteSelected = project.projCategory === "Website" ? true : false;
      let graphicDesignSelected =
        project.projCategory === "Graphic design" ? true : false;

      const model = {
        errorMessages,
        project: {
          projId: id,
          title,
          description,
          date,
          category,
        },
        title,
        description,
        date,
        projectPicture: project.projPictureName,
        illustrationSelected,
        gameSelected,
        websiteSelected,
        graphicDesignSelected,
      };

      response.render("edit-project.hbs", model);
    });
  }
});

// /project/edit/picture/id

router.get("/edit/picture/:id", function (request, response) {
  const id = request.params.id;

  db.getProjectById(id, function (error, project) {
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

// /project/delete/id

// Deletes a project with a specific id
router.post("/delete/:id", function (request, response) {
  const id = request.params.id;

  const errorMessages = [];

  // Get file name of image

  db.getProjectPicture(id, function (error, project) {
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
      db.deleteProjectById(id, function (error) {
        if (error) {
          errorMessages.push("Internal server error");

          db.getProjectById(id, function (error, project) {
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

// / project/id

// Read projects with a specific id and render corresponding page
router.get("/:id", function (request, response) {
  const id = request.params.id;

  db.getProjectById(id, function (error, project) {
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

module.exports = router;
