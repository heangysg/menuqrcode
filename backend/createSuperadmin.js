const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User'); // Adjust path if needed

async function createSuperadmin() {
  try {
   await mongoose.connect(process.env.MONGODB_URI);


    const existingUser = await User.findOne({ email: 'yeungshiqrcode953@gmail.com' });
    if (existingUser) {
      console.log('⚠️ User already exists!');
      return process.exit(0);
    }

    const hashedPassword = '$2b$10$rg60RgVtw2NxV1dIHzvKeuQnvlAOXtF/Ut8T.zWOmHEQuOdyTcxy6';

const superadmin = new User({
  name: 'Heang Chhaiheang',       // or whatever name you want
  email: 'yeungshiqrcode953@gmail.com',
  password: hashedPassword,
  role: 'superadmin',
});

    await superadmin.save();
    console.log('✅ Superadmin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();
