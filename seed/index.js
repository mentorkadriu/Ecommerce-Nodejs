const jsonData = require("../zara_us_sample_data.json");
var User = require("../models/User");
var Category = require("../models/Category");
var Color = require("../models/Color");
var Department = require("../models/Department");
const Product = require("../models/Product");
var mongoose = require("mongoose");
const faker = require("faker");
const mongoConfig = require("../configs/mongo-config");
mongoose.connect(mongoConfig.url, {
  useNewUrlParser: true,
  useCreateIndex: true,
});

/*
var categories = [
  new Category({
    categoryName: "Basics",
  }),
  new Category({
    categoryName: "Blazer",
  }),
  new Category({
    categoryName: "Knitwear",
  }),
  new Category({
    categoryName: "Jeans",
  }),
  new Category({
    categoryName: "Jackets",
  }),
  new Category({
    categoryName: "Girl",
  }),
  new Category({
    categoryName: "Boy",
  }),
];

for (let i = 0; i < categories.length; i++) {
  categories[i].save(function (e, r) {
    if (i === categories.length - 1) {
      exit();
    }
  });
}

var departments = [
  new Department({
    departmentName: "Women",
    categories: "Basics,Blazer",
  }),
  new Department({
    departmentName: "Men",
    categories: "Knitwear,Jeans,Jackets",
  }),
  new Department({
    departmentName: "Kids",
    categories: "Girl,Boy",
  }),
];

for (let i = 0; i < departments.length; i++) {
  departments[i].save(function (e, r) {
    if (i === departments.length - 1) {
      exit();
    }
  });
}

const colors = [
  new Color({
    name: "Cinder",
    code: "#0b090c",
  }),
  new Color({
    name: "Cello",
    code: "#20315f",
  }),
  new Color({
    name: "Sany Brown",
    code: "#f1af4d",
  }),
];

for (let i = 0; i < colors.length; i++) {
  colors[i].save(function () {
    if (i === colors.length - 1) {
      exit();
    }
  });
}
*/
/*
var newUser = new User({
  email: "admin@admin.com",
  username: "admin@admin.com",
  password: "admin",
  fullname: "Cuneyt Celebican",
  admin: true,
});
User.createUser(newUser, function (err, user) {
  if (err) throw err;
  console.log(user);
});

 */

for (let i = 0; i < 100; i++) {
  const zara = jsonData[i];
  const imageCategory = zara.name.split(" ").join(",");
  const color = zara.color.split(" ")[1] || "White";

  const randomColor = faker.random.arrayElement([
    "6182a80d370524bc032d8d76",
    "6182a80d370524bc032d8d77",
    "6182a80d370524bc032d8d78",
  ]);
  const newProduct = new Product({
    imagePath: zara.url,
    title: zara.name || "",
    description: zara.description || "",
    price: zara.price || "20.00",
    brand: zara.brand || "HOME",
    color: color,
    size: faker.random.arrayElements(["XS", "S", "M", "L", "XL", "XXL"], 1),
    quantity: faker.random.number({ min: 10, max: 200 }),
    department: faker.random.arrayElements(["Women", "Man", "Kids"], 1),
    category: faker.random.arrayElements(
      ["Product", "Bags", "Shoes", "Fashion", "Clothing", "Hats"],
      1
    ),
  });
  Product.createProduct(newProduct, function (err, user) {
    if (err) throw err;
    console.log(user);
  });
}

function exit() {
  mongoose.disconnect();
}
