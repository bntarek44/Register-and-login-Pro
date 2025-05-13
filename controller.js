const bcrypt = require("bcryptjs");  // التعديل هنا لتصحيح الاسم
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require("crypto");
const { UserModel, validateUser, validateLogin , validateUpdate } = require("./model");
const { Resend } = require('resend');



const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (userEmail, userName, verificationLink, type = "register") => {
  try {
    const subject =
      type === "register"
        ? "Verify your email to activate your account"
        : "Verify your new email address";

    const greeting = `Hello <b>${userName}</b>,`;
    const intro =
      type === "register"
        ? "Thank you for registering. Please verify your email by clicking the link below:"
        : "You recently updated your email address. Please verify the new address by clicking the link below:";

    const htmlContent = `
      <p>${greeting}</p>
      <p>${intro}</p>
      <p><a href="${verificationLink}">Click here to verify your email</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    const { data, error } = await resend.emails.send({
      from: 'My Backend <ztmzyad@resend.dev>',
      to: userEmail,
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return;
    }

    console.log('✅ Email sent via Resend:', data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
};




  
  
  // فانكشن الريجيستر
  exports.register = async function (req, res) {
    try {
      const { name, email, password, age, role } = req.body;
  
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
  
      if (role && role === "admin") {
        return res.status(400).json({ message: "You cannot register as an admin" });
      }
  
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      // توليد توكن التحقق و تحديد مدة صلاحيته
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 ساعة
      // إعداد بيانات المستخدم الجديد
      const newUser = new UserModel({
        name,
        email,
        age,
        password: hashedPassword,
        role: "user",
        verificationToken,
        verificationTokenExpires,
        isVerified: false, // تعيين الحالة إلى false عند التسجيل
      });
  
      // حفظ المستخدم في قاعدة البيانات
      await newUser.save();

      const verificationLink = `http://localhost:${process.env.PORT}/api/users/verify-email/${newUser._id}/${verificationToken}`;

  
      // إرسال إيميل التحقق بعد التسجيل
      await sendVerificationEmail(newUser.email,newUser.name,verificationLink);
  
      // استجابة ناجحة بعد التسجيل
      return res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        USER: { id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role },
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send({ message: 'Internal server error' });
    }
  };
  

  exports.verifyEmail = async function (req, res) {
    try {
      const { userId, token } = req.params;
  
      // 1️⃣ دور على المستخدم بالتوكن وتأكد إن التوكن ما انتهتش صلاحيته
      const user = await UserModel.findOne({
        _id: userId,
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() } // يعني لسه صالح
      });
  
      // 2️⃣ لو مش لاقي المستخدم أو التوكن انتهت
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification link." });
      }
  
      // 3️⃣ فعل الحساب
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
  
      await user.save();
      


  
      // 4️⃣ رد على العميل إنه اتفعل
      return res.status(200).json({message :"Your email has been verified successfully! , now , You can login",
      linkToLogin : `${req.protocol}://${req.get("host")}/api/users/login`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error." });
    }
  };
  





// function for logging in
exports.login = async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "User is not found",
        suggestion: "Please register first",
        signUpLink: `${req.protocol}://${req.get("host")}/api/users/register`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.isVerified === false) {
      // التحقق من صلاحية التوكن الحالي
      const tokenStillValid = user.verificationToken && user.verificationTokenExpires > Date.now();

      // التحقق من عدد الإيميلات خلال آخر 24 ساعة
      const now = Date.now();
      const resetWindow = 1000 * 60 * 60 * 24; // 24 ساعة
// بقله يعين وقت اخر دخول وهو تاريخ دلوقتي وكمان بقوله لو هو اول مرة يدخل او اول مرة يدخل من اكتر من 24 ساعة يصفر العداد من الاول
      if (!user.lastVerificationReset || now - user.lastVerificationReset.getTime() > resetWindow) {
        user.verificationEmailSentCount = 0;
        user.lastVerificationReset = new Date();
      }
// لو التوكن لسة صالح روح فعله مش هعمل واحد جديد غير بعد ساعة
      if (tokenStillValid) {
        return res.status(403).json({
          message: 'Your account is not verified. Please check your email for the verification link.',
          info: 'You can only request a new verification link once the previous one expires.',
          expire_in: "1 hour from the time the email was sent",
        });
      }
// لو دخل 5 مرات يقوله معلش كمل بكرة
      if (user.verificationEmailSentCount >= 5) {
        return res.status(429).json({
          message: 'Too many verification emails sent.',
          info: 'Please try again after 24 hours.',
        });
      }

// توليد توكن جديد وإرساله
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 ساعة

      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
       user.verificationEmailSentCount += 1; //هنا بقوله لما يدخل زود العداد  

      await user.save();

      const verificationLink = `${req.protocol}://${req.get("host")}/api/users/verify-email/${user._id}/${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationLink);

      return res.status(403).json({
        message: 'Your account is not verified. A new verification email has been sent.',
        info: 'Please check your inbox.',
      });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.secretKey,
    );

    return res.status(200).json({
      message: "User logged in successfully",
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        token: token
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
        res.status(500).send({message : err})
    }
};

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
                message: "Unauthorized. You can only delete your own account or be an admin to delete others."
              });              
        }

        // التأكد من وجود المستخدم
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User is not found" });
        }

        // حذف المستخدم
        await UserModel.findByIdAndDelete(id);
       
        res.json({
            message: "User has been deleted successfully",
            data: { id: user._id, name: user.name, email: user.email }
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
     const currentUser = await UserModel.findById(userId);
         if (!currentUser) {
      return res.status(404).json({ message: `User with id ${userId} not found` });
    }
        // التحقق من الشخص هو نفسه أو أدمن
    const isSelfUpdate = req.user.userId === userId;
    if (!isSelfUpdate && req.user.userRole !== "admin") {
      return res.status(403).json({ error: "You are not authorized to update other users' information." });
    }

    // Validation for Update
    const { error } = validateUpdate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, role } = req.body;

    if (email) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ error: "Email already exists, please choose another email." });
      }
    }

    if (role && req.user.userRole !== "admin" && role === "admin") {
      return res.status(403).json({ error: "Only admins can update roles." });
    }

    let newData = { ...req.body };

    // فقط لو كلمة السر اتبعت، نعمل لها hash
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      newData.password = hashedPassword;
    }

    let emailChanged = false;

    if (email) {
      if (currentUser.email !== email) {
        emailChanged = true;
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 ساعة

        newData.isVerified = false;
        newData.verificationToken = verificationToken;
        newData.verificationTokenExpires = verificationTokenExpires;

        const verificationLink = `${req.protocol}://${req.get("host")}/api/users/verify-email/${userId}/${verificationToken}`;

        await sendVerificationEmail(email, currentUser.name, verificationLink, "update");
      
        return res.status(200).json({
        message: "Email updated successfully. Please verify your new email. we sent you a verification email.",
        data: { id: userId, email: email, name: currentUser.name }})
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(userId, newData, { new: true });

    let successMessage = "User updated successfully.";
    if (emailChanged) {
      successMessage += " Please check your new email to verify it.";
    }

    res.json({
      message: successMessage,
      data: updatedUser
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong" });
  }
};

