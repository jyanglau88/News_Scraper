var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");


var method = require("method-override");
var body = require("body-parser");
var exphbs = require("express-handlebars");
var request = require("request");

var comments = require("./models/comments");
var articles = require("./models/articles");

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });


// Require all models
var db = require("./models");

// Initialize Express
var app = express();
var port = process.env.PORT || 3000;

// Use morgan logger for logging requests
app.use(logger("dev"));

app.use(express.static(__dirname + '/public'));

// Parse request body as JSON
app.use(body.urlencoded({ extended: false }));
app.use(method("_method"));
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.listen(port, function () {
    console.log("Listening on port " + port);
})

// Routes

app.get("/", function (req, res) {
    articles.find({}, null, { sort: { created: -1 } }, function (err, data) {
        if (data.length === 0) {
            res.render("placeholder", { message: "Welcome!" });
        }
        else {
            res.render("index", { articles: data });
        }
    });
});

// A GET route for scraping the New York Times website
app.get("/scrape", function (req, res) {
    
//axios
        axios.get("https://www.nytimes.com/section/world").then(function(response) {
            // Then, we load that into cheerio and save it to $ for a shorthand selector
            var $ = cheerio.load(response.data);

        var result = {};
        $("div.story-body").each(function (i, element) {
            var link = $(element).find("a").attr("href");
            var title = $(element).find("h2.headline").text().trim();
            var summary = $(element).find("p.summary").text().trim();
            var img = $(element).parent().find("figure.media").find("img").attr("src");
            result.link = link;
            result.title = title;
            if (summary) {
                result.summary = summary;
            };
            if (img) {
                result.img = img;
            }
            else {
                result.img = $(element).find(".wide-thumb").find("img").attr("src");
            };
            var entry = new articles(result);
            articles.find({ title: result.title }, function (err, data) {
                if (data.length === 0) {
                    entry.save(function (err, data) {
                        if (err) throw err;
                    });
                }
            });
        });
        console.log("Articles Scraped.");
        res.redirect("/");
    });
});

app.get("/saved", function (req, res) {
    articles.find({ issaved: true }, null, { sort: { created: -1 } }, function (err, data) {
        if (data.length === 0) {
            res.render("placeholder", { message: "There are no saved articles yet. To save just click \"Save Article\"!" });
        }
        else {
            res.render("saved", { saved: data });
        }
    });
});

app.get("/:id", function (req, res) {
    articles.findById(req.params.id, function (err, data) {
        res.json(data);
    })
})

app.post("/search", function (req, res) {
    console.log(req.body.search);
    articles.find({ $text: { $search: req.body.search, $caseSensitive: false } }, null, { sort: { created: -1 } }, function (err, data) {
        console.log(data);
        if (data.length === 0) {
            res.render("placeholder", { message: "Nothing found. Please try again." });
        }
        else {
            res.render("search", { search: data })
        }
    })
});

app.post("/save/:id", function (req, res) {
    articles.findById(req.params.id, function (err, data) {
        if (data.issaved) {
            articles.findByIdAndUpdate(req.params.id, { $set: { issaved: false, status: "Save Article" } }, { new: true }, function (err, data) {
                res.redirect("/");
            });
        }
        else {
            articles.findByIdAndUpdate(req.params.id, { $set: { issaved: true, status: "Saved" } }, { new: true }, function (err, data) {
                res.redirect("/saved");
            });
        }
    });
});

app.post("/comments/:id", function (req, res) {
    var comments = new comments(req.body);
    comments.save(function (err, doc) {
        if (err) throw err;
        articles.findByIdAndUpdate(req.params.id, { $set: { "comments": doc._id } }, { new: true }, function (err, newdoc) {
            if (err) throw err;
            else {
                res.send(newdoc);
            }
        });
    });
});

app.get("/comments/:id", function (req, res) {
    var id = req.params.id;
    articles.findById(id).populate("comments").exec(function (err, data) {
        res.send(data.comments);
    })
})