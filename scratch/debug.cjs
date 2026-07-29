const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqwumrybobuqdwoplwfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxd3Vtcnlib2J1cWR3b3Bsd2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTIxMTcsImV4cCI6MjEwMDg4ODExN30.q9I07GlSLxzuJMQug6eR4EuIH1gLeBfC8bCReml7qQY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('--- FETCHING ALL CLASSES ---');
  const { data: classes, error: err1 } = await supabase.from('classes').select('*');
  if (err1) {
    console.error('Error fetching classes:', err1);
  } else {
    console.log(classes);
  }

  console.log('--- CALLING get_public_wallet FOR MUIOY54C ---');
  const { data: rpcData, error: err2 } = await supabase.rpc('get_public_wallet', {
    p_public_token: 'MUIOY54C'
  });
  if (err2) {
    console.error('Error calling get_public_wallet:', err2);
  } else {
    console.log(rpcData);
  }
}

debug();
