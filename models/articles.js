var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Articleschema = new Schema({
	title: {
		type: String,
		required: true,
	},
	link: {
		type: String,
		required: true,
	},
	summary: {
		type: String,
		default: "Summary unavailable."
	},
	img: {
		type: String,
		default: "/assets/images/Coming-Soon.png"
	},
	issaved: {
		type: Boolean,
		default: false
	},
	status: {
		type: String,
		default: "Save Article"
	},
	created: {
		type: Date,
		default: Date.now
	},
	comments: {
		type: Schema.Types.ObjectId,
		ref: "comments"
	}
});

Articleschema.index({title: "text"});

var articles  = mongoose.model("articles", Articleschema);
module.exports = articles;