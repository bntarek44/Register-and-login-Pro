const mongoose = require("mongoose");
const Joi = require("joi");

// تعريف Mongoose Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum : ['user' , 'admin'] , default: "user" },
  age: { type: Number, min: 10, required: true }
});

// إنشاء Mongoose Model
const UserModel = mongoose.model("User", userSchema);

// تعريف Joi Schema للتحقق من البيانات قبل الحفظ
const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "admin").default("user"),
  age: Joi.number().integer().min(10).required()
});

// تعريف Joi Schema للتحقق من البيانات أثناء تسجيل الدخول
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.empty": "Email cannot be empty",
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required"
    }),
    password: Joi.string().min(6).required().messages({
      "string.empty": "Password cannot be empty",
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required"
    })
  });




const updateUserSchema = Joi.object({
  name: Joi.string().min(3),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  age: Joi.number().integer().min(10),
  role: Joi.string().valid("user", "admin")
}).min(1); // دي معناها لازم يبعت على الأقل حقل واحد للتعديل


// دالة للتحقق باستخدام Joi قبل الحفظ
const validateUser = (userData) => {
  return registerSchema.validate(userData);
};

// دالة للتحقق باستخدام Joi أثناء تسجيل الدخول
const validateLogin = (loginData) => {
  return loginSchema.validate(loginData);
};



const validateUpdate = (data) => {
    return updateUserSchema.validate(data);
  };
  
module.exports = {
  UserModel,
  validateUser,
  validateLogin ,
  validateUpdate // تصدير دالة التحقق من بيانات تسجيل الدخول
};
