var express = require("express");
var method = require("method-override");
var body = require("body-parser");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var logger = require("morgan");
var cheerio = require("cheerio");
var request = require("request");

var comments = require("./models/comments");
var articles = require("./models/articles");
var databaseUrl = 'mongodb://localhost/nyt';

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
}
else {
    mongoose.connect(databaseUrl);
};

mongoose.Promise = Promise;
var db = mongoose.connection;

db.on("error", function (error) {
    console.log("Mongoose Error: ", error);
});

db.once("open", function () {
    console.log("Mongoose connection successful.");
});

var app = express();
var port = process.env.PORT || 3000;

app.use(logger("dev"));
app.use(express.static("public"));
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
            res.render("placeholder", { message: "There's nothing scraped yet. Please click \"Scrape For Newest Articles\" for fresh and delicious news." });
        }
        else {
            res.render("index", { articles: data });
        }
    });
});

app.get("/scrape", function (req, res) {
    request("https://www.nytimes.com/section/world", function (error, response, html) {
        var $ = cheerio.load(html);
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
        console.log("Scrape finished.");
        res.redirect("/");
    });
});

app.get("/saved", function (req, res) {
    articles.find({ issaved: true }, null, { sort: { created: -1 } }, function (err, data) {
        if (data.length === 0) {
            res.render("placeholder", { message: "You have not saved any articles yet. Try to save some delicious news by simply clicking \"Save Article\"!" });
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
            res.render("placeholder", { message: "Nothing has been found. Please try other keywords." });
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