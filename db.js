const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("portfolio-database.db");

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
    FOREIGN KEY(blogId) REFERENCES blogposts (blogId)
  )
`);

// For project

exports.getAllProjects = function (callback) {
  const query = `SELECT * FROM projects ORDER BY projId DESC`;

  db.all(query, function (error, projects) {
    callback(error, projects);
  });
};

exports.getProjectsByCategory = function (category, callback) {
  const query = `SELECT * FROM projects WHERE projCategory = ? ORDER BY projId DESC`;
  const values = [category];

  db.all(query, values, function (error, projects) {
    callback(error, projects);
  });
};

exports.getProjectById = function (id, callback) {
  const query = `SELECT * FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(query, values, function (error, project) {
    callback(error, project);
  });
};

exports.getProjectPicture = function (id, callback) {
  const imgUrlQuery = `SELECT projPictureName FROM projects WHERE projId = ?`;
  const values = [id];

  db.get(imgUrlQuery, values, function (error, project) {
    callback(error, project);
  });
};

exports.createProject = function (title, description, date, category, uniqueFileName, callback) {
  const query = `INSERT INTO projects (projTitle, projDescription, projCreatedDate, projCategory, projPictureName) VALUES (?, ?, ?, ?, ?)`;
  const values = [title, description, date, category, uniqueFileName];

  db.run(query, values, function (error) {
    callback(error);
  });
};

exports.updateProject = function (title, description, date, category, uniqueFileName, id, callback) {
  if (uniqueFileName === "") {
    const query = `UPDATE projects SET projTitle = ?, projDescription = ?, projCreatedDate = ?, projCategory = ? WHERE projId = ?`;
    const values = [title, description, date, category, id];

    db.run(query, values, function (error) {
      callback(error);
    });
  } else {
    const query = `UPDATE projects SET projTitle = ?, projDescription = ?, projCreatedDate = ?, projCategory = ?, projPictureName = ? WHERE projId = ?`;
    const values = [title, description, date, category, uniqueFileName, id];

    db.run(query, values, function (error) {
      callback(error);
    });
  }
};

exports.deleteProjectById = function (id, callback) {
  const query = `DELETE FROM projects WHERE projId = ?`;
  const values = [id];

  db.run(query, values, function (error) {
    callback(error);
  });
};

// For blogposts

exports.countBlogposts = function (callback) {
  const countQuery = `SELECT COUNT(*) as tableRows FROM blogposts`;

  db.all(countQuery, function (error, blogposts) {
    callback(error, blogposts);
  });
};

exports.getBlogpostsByPage = function (postPerPage, offsetValue, callback) {
  const blogQuery = `SELECT * FROM blogposts ORDER BY blogId DESC LIMIT ? OFFSET ?`;
  const values = [postPerPage, offsetValue];

  db.all(blogQuery, values, function (error, blogposts) {
    callback(error, blogposts);
  });
};

exports.getBlogpostById = function (id, callback) {
  const query = `SELECT * FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.get(query, values, function (error, blog) {
    callback(error, blog);
  });
};

exports.getBlogPicture = function (id, callback) {
  const imgUrlQuery = `SELECT blogPictureName FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.get(imgUrlQuery, values, function (error, blogpost) {
    callback(error, blogpost);
  });
};

exports.createBlog = function (title, description, currentDate, uniqueFileName, callback) {
  const query = `INSERT INTO blogposts (blogTitle, blogDescription, blogPublishedDate, blogPictureName) VALUES (?, ?, ?, ?)`;
  const values = [title, description, currentDate, uniqueFileName];

  db.run(query, values, function (error) {
    callback(error);
  });
};

exports.updateBlogpost = function (title, description, uniqueFileName, id, callback) {
  if (uniqueFileName === "") {
    const query = `UPDATE blogposts SET blogTitle = ?, blogDescription = ? WHERE blogId = ?`;
    const values = [title, description, id];

    db.run(query, values, function (error) {
      callback(error);
    });
  } else {
    const query = `UPDATE blogposts SET blogTitle = ?, blogDescription = ?, blogPictureName = ? WHERE blogId = ?`;
    const values = [title, description, uniqueFileName, id];

    db.run(query, values, function (error) {
      callback(error);
    });
  }
};

exports.deleteBlogById = function (id, callback) {
  const blogpostQuery = `DELETE FROM blogposts WHERE blogId = ?`;
  const values = [id];

  db.run(blogpostQuery, values, function (error) {
    callback(error);
  });
};

// For comments

exports.getAllComments = function (callback) {
  const commentsQuery = `SELECT * FROM comments`;

  db.all(commentsQuery, function (error, comments) {
    callback(error, comments);
  });
};

exports.getCommentById = function (id, callback) {
  const query = `SELECT * FROM comments WHERE cmntId = ?`;
  const values = [id];

  db.get(query, values, function (error, comment) {
    callback(error, comment);
  });
};

exports.createComment = function (name, currentDate, comment, blogId, callback) {
  const query = `INSERT INTO comments (cmntName, cmntPublishedDate, cmntContent, blogId) VALUES (?, ?, ?, ?)`;
  const values = [name, currentDate, comment, blogId];

  db.run(query, values, function (error) {
    callback(error);
  });
};

exports.updateComment = function (name, comment, id, callback) {
  const query = `UPDATE comments SET cmntName = ?, cmntContent = ? WHERE cmntId = ?`;
  const values = [name, comment, id];

  db.run(query, values, function (error) {
    callback(error);
  });
};

exports.deleteCommentsWithBlogpost = function (id, callback) {
  const commentQuery = `DELETE FROM comments WHERE blogId = ?`;
  const values = [id];

  db.run(commentQuery, values, function (error) {
    callback(error);
  });
};

exports.deleteCommenById = function (id, callback) {
  const query = `DELETE FROM comments WHERE cmntId = ?`;
  const values = [id];

  db.run(query, values, function (error) {
    callback(error);
  });
};
