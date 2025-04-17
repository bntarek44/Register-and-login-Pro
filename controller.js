const bcrypt = require("bcryptjs");  // التعديل هنا لتصحيح الاسم
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { UserModel, validateUser, validateLogin , validateUpdate } = require("./model");


// function for registering
exports.register = async function (req, res) {
    try {
      // التحقق من البيانات باستخدام Joi
      const { error } = validateUser(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
  
      // تحقق من وجود البريد الإلكتروني في قاعدة البيانات
      let existingUser = await UserModel.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
  
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      // إعداد بيانات المستخدم الجديد
      const newUser = new UserModel({
        ...req.body,
        password: hashedPassword,
      });
  
      // حفظ المستخدم الجديد في قاعدة البيانات
      await newUser.save();
  
      // استجابة ناجحة بعد التسجيل
      return res.status(201).json({
        message: 'User registered successfully',
        USER: { id: newUser._id, email: newUser.email, name: newUser.name },
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send({ message: 'Internal server error' }); // تحسين الخطأ إلى 500 في حالة حدوث خطأ داخلي
    }
  };
  





// function for logging in
exports.login = async (req, res) => {
    try {
        // التحقق من البيانات باستخدام Joi
        const { error } = validateLogin(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}


        const { email, password } = req.body;

        // البحث عن المستخدم في قاعدة البيانات
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User is not found, please go to SIGN UP page to register " , link: req.protocol + "://" + req.get("host") + "/api/users/getusers" });
        }

        // التحقق من كلمة المرور (حسب التشفير المستخدم)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // إصدار التوكن مع مدة صلاحية لمدة 2 يوم
        const token = jwt.sign(
            { email: user.email, id: user._id, role: user.role },
            process.env.secretKey,
            { expiresIn: '2d' } // مدة صلاحية التوكن (يمكنك تعديلها حسب احتياجاتك)
        );

        return res.status(200).json({
            message: "User logged in successfully",
            data: {
                id: user._id,
                email: user.email,
                name: user.name,
                jwt: token
            }
        });

    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ error: "Server error occurred while processing your request." });
    }
};









// function for reading all users (only access for Admins)
exports.getUsers = async function (req , res) {
    try{
        if(req.user.userRole !== "admin"){
            return res.status(403).json({message: "Only Admins can see all users"})
        }
        let users =await UserModel.find();
        if(users.length === 0){
            return res.status(200).json({message : "No Users are found"})
        }
        res.json({message : "Hello, These are all users" , count : users.length, data : users});
        


    }catch(err){
        console.log(err);
        res.status(400).send({message : err})
    }
}

//function foe deleting users


exports.delete = async function (req, res) {
    try {
        const { id } = req.params;

        // التحقق من أن الـ ID صحيح
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        // التحقق من الصلاحيات
        const isAdmin = req.user.userRole === "admin";
        const isSelf = req.user.userId === id; // ← هنا التعديل

        if (!isAdmin && !isSelf) {
            return res.status(403).json({
                message: "Unauthorized. Only admins or the user themself can delete this account."
            });
        }

        // التأكد من وجود المستخدم
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // حذف المستخدم
        await UserModel.findByIdAndDelete(id);
       
        res.json({
            message: "User has been deleted successfully",
            data: []
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong while deleting the user" });
    }
};





//function foe updating users
exports.update = async function (req, res) {
    try {
        const userId = req.params.id;

        // التحقق من صحة ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID." });
        }
        // Validation for Update
        const { error } = validateUpdate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
}


        // التحقق من تكرار الإيميل لو اتبعت
        const { email, password , role} = req.body;

        if (role && req.user.userRole !== "admin" && req.body.role === "admin") {
            return res.status(403).json({ error: "Only admins can update roles." });
          }


        if (email) {
            const existingUser = await UserModel.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ error: "Email already exists, please choose another email." });
            }
        }

        let newData = { ...req.body };

        // فقط لو كلمة السر اتبعت، نعمل لها hash
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            newData.password = hashedPassword;
        }

        const updatedUser = await UserModel.findByIdAndUpdate(userId, newData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User is not found" });
        }

        res.json({ message: "User updated successfully", data: updatedUser });
    } catch (err) {
        console.log(err );
        res.status(500).send({ message: "Something went wrong" });
    }
};
