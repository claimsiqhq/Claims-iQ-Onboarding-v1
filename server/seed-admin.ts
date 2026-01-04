import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAdminUser() {
  const email = 'john@claimsiq.ai';
  const password = 'Admin123!';
  const authUserId = '257cac0c-363f-4f45-bdc8-cc012a891939';

  console.log(`Setting up admin user: ${email}...`);

  // Check if contact already exists
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  let contactId: string;

  if (existingContact) {
    console.log('Contact already exists:', existingContact.id);
    contactId = existingContact.id;
  } else {
    // Create contact
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        email: email.toLowerCase(),
        first_name: 'John',
        last_name: 'Admin',
        is_primary: true,
      })
      .select('id')
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError.message);
      process.exit(1);
    }
    console.log('Contact created:', newContact.id);
    contactId = newContact.id;
  }

  // Check if portal_user already exists
  const { data: existingPortalUser } = await supabase
    .from('portal_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (existingPortalUser) {
    console.log('Portal user already exists:', existingPortalUser.id);
    
    // Update password hash
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await supabase
      .from('portal_users')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        auth_method: 'both',
      })
      .eq('id', existingPortalUser.id);

    if (updateError) {
      console.error('Error updating password:', updateError.message);
      process.exit(1);
    }
    console.log('Password updated successfully');
  } else {
    // Create portal_user with password hash
    const passwordHash = await bcrypt.hash(password, 12);
    
    const { data: newPortalUser, error: portalUserError } = await supabase
      .from('portal_users')
      .insert({
        auth_user_id: authUserId,
        contact_id: contactId,
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        auth_method: 'both',
        status: 'active',
      })
      .select('id')
      .single();

    if (portalUserError) {
      console.error('Error creating portal user:', portalUserError.message);
      process.exit(1);
    }
    console.log('Portal user created:', newPortalUser.id);
  }

  // Update Supabase Auth user password to match
  const { error: authError } = await supabase.auth.admin.updateUserById(authUserId, {
    password: password,
  });

  if (authError) {
    console.error('Error updating auth password:', authError.message);
  } else {
    console.log('Supabase Auth password updated');
  }

  console.log('\nAdmin user setup complete!');
  console.log('Email:', email);
  console.log('Password:', password);
}

seedAdminUser();
