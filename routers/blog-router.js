const express = require("express");
const db = require("../db.js");
const fs = require("fs");
const pathModule = require("path");

const router = express.Router();

// Variables
const titleMaxLength = 40;
const descriptionMaxLenght = 1000;
const postPerPage = 5;
let oneStepBackInDir = pathModule.join(__dirname, "../");
const path = oneStepBackInDir + "public/uploads/";

console.log(path);

// Calculate today's date
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
const date = today.getDate();
const dateCorrection = date < 10 ? "0" + date : date;
const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

// Renders blog page and pagination
router.get("/", function (request, response) {
  const pageNumber = parseInt(request.query.page);
  let nextPageUrl;
  let nextPageDisabled;
  let previousPageUrl = pageNumber != 1 ? "/blog?page=" + (pageNumber - 1) : "#";
  let previousPageDisabled = pageNumber != 1 ? false : true;
  const offsetValue = (pageNumber - 1) * postPerPage;

  const errorMessages = [];
  const serverErrorMessages = [];

  // Count how many blogposts

  db.countBlogposts(function (error, blogposts) {
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
      nextPageUrl = pageNumber != numberOfPages ? "/blog?page=" + (pageNumber + 1) : "#";
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
      db.getBlogpostsByPage(postPerPage, offsetValue, function (error, blogposts) {
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
          db.getAllComments(function (error, comments) {
            if (error) {
              serverErrorMessages.push("Internal server error when selecting comments");

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
  });
});

// Renders the page for creating a new blog post
// /blog/create
router.get("/create", function (request, response) {
  response.render("new-blogpost.hbs");
});

// /blog/create
router.post("/create", function (request, response) {
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
      errorMessages.push("Title is more than " + titleMaxLength + " characters");
    }

    // Validation for Description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (description.length > descriptionMaxLenght) {
      errorMessages.push("Title is more than " + descriptionMaxLenght + " characters");
    }
  }

  // Validation of file
  if (!request.files) {
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
      // Following line of code is made with help from
      // https://www.youtube.com/watch?v=hyJiNTFtQic, retrieved: 2022-10-06
      imageFile.mv(uploadPath, function (error) {
        if (error) {
          errorMessages.push("Error when uploading file");

          const model = {
            errorMessages,
            title,
            description,
          };

          response.render("new-blogpost.hbs", model);
        } else {
          console.log("File moved");

          // When file is uploaded to the file system, create the blog

          db.createBlog(title, description, currentDate, uniqueFileName, function (error) {
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
  }
});

// /blog/edit/id

// Shows the edit page for a blog post
router.get("/edit/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.query.page);

  db.getBlogpostById(id, function (error, blog) {
    const errorMessages = [];
    if (error) {
      errorMessages.push("Internal server error when trying to go to the edit page");
    }
    const model = {
      blog,
      pageNumber,
      errorMessages,
    };
    response.render("edit-blogpost.hbs", model);
  });
});

// Edits a blog post with a specific id
router.post("/edit/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.body.page);

  const title = request.body.title;
  const description = request.body.description;

  let imageFile;
  let uploadPath;
  let uniqueFileName = "";

  const errorMessages = [];

  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    // Validation for title
    if (title === "") {
      errorMessages.push("Title can't be empty");
    } else if (title.length > titleMaxLength) {
      errorMessages.push("Title is more than " + titleMaxLength + " characters");
    }

    // Validation for Description
    if (description === "") {
      errorMessages.push("Description can't be empty");
    } else if (description.length > descriptionMaxLenght) {
      errorMessages.push("Title is more than " + descriptionMaxLenght + " characters");
    }
  }

  if (errorMessages.length === 0) {
    // Select old picture name from the database
    db.getBlogPicture(id, function (error, blog) {
      if (error) {
        errorMessages.push("Internal server error");

        errorEditBlog(id, errorMessages, title, description, pageNumber, response);
      } else {
        const oldPictureName = blog.blogPictureName;
        console.log(oldPictureName);

        // Get the new image form the input
        if (request.files != undefined) {
          imageFile = request.files.image;
          uniqueFileName = Math.floor(Math.random() * 10000) + imageFile.name;
          uploadPath = path + uniqueFileName;

          // Move the uploaded file to the right place
          // Following line of code made with help by https://www.youtube.com/watch?v=hyJiNTFtQic retrieved: 2022-10-06
          imageFile.mv(uploadPath, function (error) {
            if (error) {
              errorMessages.push("Error when uploading file");

              errorEditBlog(id, errorMessages, title, description, pageNumber, response);
            } else {
              console.log("file moved");
              db.updateBlogpost(title, description, uniqueFileName, id, function (error) {
                if (error) {
                  errorMessages.push("Internal server error");

                  errorEditBlog(id, errorMessages, title, description, pageNumber, response);
                } else {
                  // Check if old picture exists in files system

                  if (fs.existsSync("public/uploads/" + oldPictureName)) {
                    console.log("old picture exists");
                    // Try to delete the old picture from the file system
                    fs.unlink("public/uploads/" + oldPictureName, function (error) {
                      if (error) {
                        errorMessages.push("Problem occured when deleting picture from file system");

                        errorEditBlog(id, errorMessages, title, description, pageNumber, response);
                      } else {
                        console.log("old picture deleted");

                        response.redirect("/blog?page=" + pageNumber);
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          db.updateBlogpost(title, description, uniqueFileName, id, function (error) {
            if (error) {
              errorMessages.push("Internal server error");

              errorEditBlog(id, errorMessages, title, description, pageNumber, response);
            } else {
              response.redirect("/blog?page=" + pageNumber);
            }
          });
        }
      }
    });
  } else {
    errorEditBlog(id, errorMessages, title, description, pageNumber, response);
  }
});

// /blog/delete/id

// Deletes a blog with a specific id
router.post("/delete/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.query.page);
  const offsetValue = (pageNumber - 1) * postPerPage;

  const errorMessages = [];

  // Get file name of image
  db.getBlogPicture(id, function (error, blogpost) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const pictureFileName = blogpost.blogPictureName;

    // Try to delete the file form the file system
    fs.unlink("public/uploads/" + pictureFileName, function (error) {
      if (error) {
        errorMessages.push("Problem occured when deleting picture from file system");
      }

      // If no error with deleting form filesystem, then delete from database
      db.deleteBlogById(id, function (error) {
        const serverErrorMessages = [];
        if (error) {
          serverErrorMessages.push("Internal server error when deleting blogpost");
        }
        db.deleteCommentsWithBlogpost(id, function (error) {
          if (error) {
            serverErrorMessages.push("Internal server error when deleting comments connected to blogpost");

            db.getBlogpostsByPage(postPerPage, offsetValue, function (error, blogposts) {
              if (error) {
                serverErrorMessages.push("Internal server error");
              }

              db.getAllComments(function (error, comments) {
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

// /blog/edit/picture/id

router.get("/edit/picture/:id", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.query.page);

  db.getBlogpostById(id, function (error, blog) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }

    const model = {
      blog,
      pageNumber,
      errorMessages,
    };
    response.render("edit-blog-picture.hbs", model);
  });
});

function errorEditBlog(id, errorMessages, title, description, pageNumber, response) {
  db.getBlogpostById(id, function (error, blog) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      errorMessages,
      blog: {
        blogId: id,
        title,
        description,
      },
      blogPictureName: blog.blogPictureName,
      title,
      description,
      pageNumber,
    };

    response.render("edit-blogpost.hbs", model);
  });
}

module.exports = router;
