import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Setup admin client to bypass email verification and RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// ==========================================
// ✏️ EDIT THESE TO RESET AN ACCOUNT:
// ==========================================
const TARGET_EMAIL = 'fake_email@almuqri.com'; // Change to the email of the account
const NEW_PASSWORD = 'NewPassword123!';      // Change to the new password you want

async function forceResetPassword() {
  console.log(`Looking up user: ${TARGET_EMAIL}...`);
  
  // 1. Find the user by email
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error("Failed to list users:", listError);
    return;
  }
  
  const user = usersData.users.find(u => u.email.toLowerCase() === TARGET_EMAIL.toLowerCase());
  
  if (!user) {
    console.log(`❌ No user found with email: ${TARGET_EMAIL}`);
    console.log(`Available users:`, usersData.users.map(u => u.email).join(', '));
    return;
  }

  console.log(`✅ User found (ID: ${user.id}). Forcing password reset...`);

  // 2. Administratively update the password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: NEW_PASSWORD, email_confirm: true }
  );

  if (updateError) {
    console.error("❌ Failed to update password:", updateError);
  } else {
    console.log(`🎉 Success! The password for ${TARGET_EMAIL} has been forcibly changed to: ${NEW_PASSWORD}`);
  }
}

forceResetPassword();
