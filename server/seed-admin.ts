import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAdminUser() {
  const email = 'john@claimsiq.ai';
  const password = 'admin123';

  console.log(`Creating admin user: ${email}...`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('Admin user already exists.');
      return;
    }
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }

  console.log('Admin user created successfully!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
}

seedAdminUser();
