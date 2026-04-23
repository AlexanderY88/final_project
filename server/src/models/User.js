const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name: {
        first: {
            type: String,
            required: true,
        },
        middle: {
            type: String,
            required: false,
        },
        last: {
            type: String,
            required: true,
        }
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    image: {
        url: {
            type: String
        },
        alt: {
            type: String
        }
    },
    address: {
        state: {
            type: String
        },
        country: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        houseNumber: {
            type: Number,
            required: true
        },
        zip: {
            type: Number,
            required: true
        }
    },
    isMainBranch: {
        type: Boolean,
        required: true,
        default: true
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    branches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "branches"
    }]

}, {
    timestamps: true // add createdAt and updatedAt fields
});


const User = mongoose.model("users", userSchema);
module.exports = User;
