const express = require("express");
const db = require("../db.js");

const router = express.Router();

// Values
const postPerPage = 5;

// Calculate today's date
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const monthCorrection = month + 1 < 10 ? "0" + (month + 1) : month + 1;
const date = today.getDate();
const dateCorrection = date < 10 ? "0" + date : date;
const currentDate = year + "-" + monthCorrection + "-" + dateCorrection;

// /comment/create

// Create comments on blog page
router.post("/create", function (request, response) {
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
    db.createComment(name, currentDate, comment, blogId, function (error) {
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

    db.countBlogposts(function (error, blogposts) {
      if (error) {
        serverErrorMessages.push("Internal server error");
        const model = {
          serverErrorMessages,
          blogposts,
          comment,
        };
        response.render("blog.hbs", model);
      } else {
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

        db.getBlogpostsByPage(
          postPerPage,
          offsetValue,
          function (error, blogposts) {
            if (error) {
              serverErrorMessages.push("Internal server error");
              model = [];
            }

            db.getAllComments(function (error, comments) {
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
          }
        );
      }
    });
  }
});

// /comment/edit/id

// Edit comment page
router.get("/edit/:id/page=:page", function (request, response) {
  const id = request.params.id;
  const pageNumber = parseInt(request.params.page);

  db.getCommentById(id, function (error, comment) {
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
router.post("/edit/:id", function (request, response) {
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
    db.updateComment(name, comment, id, function (error) {
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
    db.getCommentById(id, function (error, comment) {
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

// /comment/delete/id

// Deletes a comment with a specific id
router.post("/delete/:id", function (request, response) {
  const id = request.params.id;
  const blogId = request.body.blogId;

  const errorMessages = [];
  // Check if user is logged in
  if (!request.session.isLoggedIn) {
    errorMessages.push("You need to be logged in to perform this action");
  } else {
    db.deleteCommenById(id, function (error) {
      const errorMessages = [];
      if (error) {
        errorMessages.push("Internal server error");
      }
      response.redirect("/blog/#blog/" + blogId);
    });
  }
});

module.exports = router;
