const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");

// Load Input VAlidation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// Load User model
const User = require("../../models/User");

//@route    GET api/users/test
//@des      Tests users route
//@access   Public
router.get("/test", (req, res) => res.json({ msg: "Users Works!" }));

//@route    POST api/users/register
//@des      Register user
//@access   Public
router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check Validation (first line of validations)
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }) // verify no duplicated email
    .then((user) => {
      if (user) {
        return res.status(400).json({ email: "Email already exists!" });
      } else {
        const avatar = gravatar.url(req.body.email, {
          s: "200", // Size
          r: "pg", //Rating
          d: "mm", // Default
        });

        const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          avatar,
          password: req.body.password,
        });

        // Encrypting the password
        bcrypt.genSalt(10, (erro, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then((user) => res.json(user))
              .catch((err) => console.log(err));
          });
        });
      }
    });
});

//@route    POST api/users/login
//@des      Login User / Returning JWT Token
//@access   Public
router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  // Check Validation (first line of validations)
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email; // im using bodyparser
  const password = req.body.password;

  // Find user by email, using user model mongoose
  User.findOne({ email }).then((user) => {
    // Check for user
    if (!user) {
      errors.email = "User not found !";
      return res.status(400).json(errors);
    }

    // Check Password (remember: the pass that user put is in text, the pass in the DB is in hash) use bcrypt to compare both.
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        //res.json({ msg: "Success !!" });
        //  User Matched

        const payload = {
          // Create JWT payload
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        };

        // Sing Token
        jwt.sign(
          payload,
          keys.secretOrKey,
          { expiresIn: 3600 },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token,
            });
          }
        );
      } else {
        errors.password = "Password incorrect";
        return res.status(400).json(errors);
      }
    });
  });
});

//@route    GET api/users/current
//@des      Return current user
//@access   Private
router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    });
  }
);

module.exports = router;
