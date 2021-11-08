const express = require("express");
const router = express.Router();
const jsonwebtoken = require("jsonwebtoken");
const config = require("../configs/jwt-config");
const ensureAuthenticated = require("../modules/ensureAuthenticated");
const User = require("../models/User");
const Cart = require("../models/Cart");
const CartClass = require("../modules/Cart");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const TypedError = require("../modules/ErrorHandler");

// Refresh tokens
const refreshTokens = {};

//POST /signup
router.post("/signup", function (req, res, next) {
  const { fullname, email, password, verifyPassword } = req.body;
  req.checkBody("fullname", "fullname is required").notEmpty();
  req.checkBody("email", "Email is required").notEmpty();
  req.checkBody("password", "Password is required").notEmpty();
  req.checkBody("verifyPassword", "verifyPassword is required").notEmpty();
  let missingFieldErrors = req.validationErrors();
  if (missingFieldErrors) {
    let err = new TypedError("signup error", 400, "missing_field", {
      errors: missingFieldErrors,
    });
    return next(err);
  }
  req.checkBody("email", "Email is not valid").isEmail();
  req
    .checkBody("password", "Passwords have to match")
    .equals(req.body.verifyPassword);
  let invalidFieldErrors = req.validationErrors();
  if (invalidFieldErrors) {
    let err = new TypedError("signup error", 400, "invalid_field", {
      errors: invalidFieldErrors,
    });
    return next(err);
  }
  var newUser = new User({
    fullname: fullname,
    password: password,
    email: email,
  });
  User.getUserByEmail(email, function (error, user) {
    if (error) return next(err);
    if (user) {
      let err = new TypedError("signup error", 409, "invalid_field", {
        message: "user is existed",
      });
      return next(err);
    }
    User.createUser(newUser, function (err, user) {
      if (err) return next(err);
      res.json({ message: "user created" });
    });
  });
});

//POST /login
router.post("/login", function (req, res, next) {
  const { email, password } = req.body.credential || {};
  const expiresIn = 1000 * 60 * 60 * 24 * 30;
  const refreshToken =
    Math.floor(Math.random() * (1000000000000000 - 1 + 1)) + 1;
  if (!email || !password) {
    let err = new TypedError("login error", 400, "missing_field", {
      message: "missing username or password",
    });
    return next(err);
  }
  User.getUserByEmail(email, function (err, user) {
    if (err) return next(err);
    if (!user) {
      let err = new TypedError("login error", 403, "invalid_field", {
        message: "Incorrect email or password",
      });
      return next(err);
    }
    User.comparePassword(password, user.password, function (err, isMatch) {
      if (err) return next(err);
      if (isMatch) {
        const accessToken = jsonwebtoken.sign(
          {
            id: user._id,
            username: user.email,
            picture: "https://github.com/nuxt.png",
            name: "User " + user.fullname,
            scope: ["test", "user"],
          },
          config.secret,
          {
            expiresIn,
          }
        );

        refreshTokens[refreshToken] = {
          accessToken,
          user: {
            id: user._id,
            username: user.email,
            picture: "https://github.com/nuxt.png",
            name: "User " + user.fullname,
          },
        };
        res.status(201).json({
          token: {
            accessToken,
            refreshToken,
          },
        });
      } else {
        let err = new TypedError("login error", 403, "invalid_field", {
          message: "Incorrect email or password",
        });
        return next(err);
      }
    });
  });
});

router.get("/me", ensureAuthenticated, function (req, res, next) {
  const id = req.userId;
  User.getUserById(id, function (err, user) {
    if (err) return next(err);
    return res.status(200).json({ user });
  });
});

router.post("/refresh", (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken in refreshTokens) {
    const user = refreshTokens[refreshToken].user;
    const expiresIn = 1000 * 60 * 60 * 24 * 30;
    const newRefreshToken = expiresIn;
    delete refreshTokens[refreshToken];
    const accessToken = jsonwebtoken.sign(
      {
        user: user.username,
        picture: "https://github.com/nuxt.png",
        name: "User " + user.username,
        scope: ["test", "user"],
      },
      "dummy",
      {
        expiresIn,
      }
    );

    refreshTokens[newRefreshToken] = {
      accessToken,
      user,
    };

    res.json({
      token: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } else {
    let err = new TypedError("login error", 403, "invalid_field", {
      message: "Incorrect email or password",
    });
    return next(err);
  }
});

//GET cart
router.get("/:userId/cart", ensureAuthenticated, function (req, res, next) {
  let userId = req.params.userId;
  Cart.getCartByUserId(userId, function (err, cart) {
    if (err) return next(err);
    /*
    if (cart.length < 1) {
      let err = new TypedError("cart error", 404, "not_found", {
        message: "create a cart first",
      });
      return next(err);
    }
     */
    return res.json({ cart: cart[0] });
  });
});

//POST cart
router.post("/:userId/cart", ensureAuthenticated, function (req, res, next) {
  let userId = req.params.userId;
  let { productId, increase, decrease } = req.body;

  Cart.getCartByUserId(userId, function (err, c) {
    if (err) return next(err);
    let oldCart = new CartClass(c[0] || { userId });
    // no cart save empty cart to database then return response
    if (c.length < 1 && !productId) {
      return Cart.createCart(
        oldCart.generateModel(),
        function (err, resultCart) {
          if (err) return next(err);
          return res.status(201).json({ cart: resultCart });
        }
      );
    }
    Product.findById(productId, function (e, product) {
      if (e) {
        e.status = 406;
        return next(e);
      }
      if (product) {
        if (decrease) {
          oldCart.decreaseQty(product.id);
        } else if (increase) {
          oldCart.increaseQty(product.id);
        } else {
          oldCart.add(product, product.id);
        }
        let newCart = oldCart.generateModel();
        Cart.updateCartByUserId(userId, newCart, function (err, result) {
          if (err) return next(err);
          return res.status(200).json({ cart: result });
        });
      } else {
        // apply variant
        Variant.getVariantByID(productId, function (e, variant) {
          if (e) {
            e.status = 406;
            return next(e);
          }
          if (variant) {
            Product.getProductByID(variant.productID, function (e, p) {
              let color = variant.color ? "- " + variant.color : "";
              let size = variant.size ? "- " + variant.size : "";
              variant.title = p.title + " " + color + size;
              variant.price = p.price;
              if (decrease) {
                oldCart.decreaseQty(variant.id);
              } else if (increase) {
                oldCart.increaseQty(variant.id);
              } else {
                oldCart.add(variant, variant.id);
              }
              let newCart = oldCart.generateModel();
              Cart.updateCartByUserId(userId, newCart, function (err, result) {
                if (err) return next(err);
                res.status(200).json({ cart: result });
              });
            });
          }
          // no product and no variant find
          else {
            let err = new TypedError("/cart", 400, "invalid_field", {
              message: "invalid request body",
            });
            return next(err);
          }
        });
      }
    });
  });
});

//PUT cart
router.put("/:userId/cart", ensureAuthenticated, function (req, res, next) {
  let userId = req.params.userId;
  let requestProduct = req.body;
  let { productId, color, size } = requestProduct.product;

  Cart.getCartByUserId(userId, function (err, c) {
    if (err) return next(err);
    let oldCart = new CartClass(c[0] || {});
    Product.getProductByID(productId, function (err, p) {
      if (err) return next(err);
      let newCart = oldCart.add(p, productId, { color, size });

      //exist cart in databse
      if (c.length > 0) {
        Cart.updateCartByUserId(
          userId,
          {
            items: newCart.items,
            totalQty: newCart.totalQty,
            totalPrice: newCart.totalPrice,
            userId: userId,
          },
          function (err, result) {
            if (err) return next(err);
            res.json(result);
          }
        );
      } else {
        //no cart in database
        newCart = new Cart({
          items: newCart.items,
          totalQty: newCart.totalQty,
          totalPrice: newCart.totalPrice,
          userId: userId,
        });
        Cart.createCart(newCart, function (err, resultCart) {
          if (err) return next(err);
          res.status(201).json(resultCart);
        });
      }
    });
  });
});

module.exports = router;
