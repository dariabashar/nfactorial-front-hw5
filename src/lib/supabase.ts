import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xlbbdioderbzddwsqlxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsYmJkaW9kZXJiemRkd3NxbHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODYwMTgsImV4cCI6MjA2NDc2MjAxOH0.r4gEBeH34ASMtHN10Io6rL_8GQCrMp0RofmDzaIeXRk';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to create the players table
export const createPlayersTable = async () => {
  try {
    // First check if the table exists
    const { error: checkError } = await supabase
      .from('players')
      .select('count')
      .limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      console.log('Players table does not exist, creating it...');
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('create_players_table', {
        sql: `
          create table if not exists public.players (
            id uuid primary key,
            name text not null,
            x integer not null,
            y integer not null,
            color text not null,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null
          );

          -- Enable Row Level Security (RLS)
          alter table public.players enable row level security;

          -- Create a policy that allows all operations
          create policy "Allow all operations" on public.players
            for all
            using (true)
            with check (true);
        `
      });

      if (createError) {
        console.error('Error creating players table:', createError);
        return false;
      }

      console.log('Players table created successfully');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error creating players table:', error);
    return false;
  }
}; 