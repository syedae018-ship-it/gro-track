import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (!profile || !['admin_ops', 'admin_finance', 'managing_director'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Attempt to use Google Admin SDK to fetch users
    // If credentials are not provided, we will mock the sync or throw a clear error
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn("Google Workspace credentials missing. Skipping real sync.");
      // For demonstration, we could return a 501 or just a success message stating it's unconfigured.
      return NextResponse.json({ 
        message: 'Google Workspace credentials missing in Environment Variables. Please add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
        success: false
      }, { status: 501 });
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      subject: process.env.GOOGLE_ADMIN_EMAIL, // Must impersonate an admin
    });

    const admin = google.admin({ version: 'directory_v1', auth });

    const response = await admin.users.list({
      domain: 'groitup.com',
      maxResults: 100,
    });

    const users = response.data.users || [];
    let syncedCount = 0;

    // We need to fetch the highest EMP ID to increment
    const { data: highestEmp } = await supabase
      .from('profiles')
      .select('employee_id')
      .not('employee_id', 'is', null)
      .order('employee_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextEmpNum = 1;
    if (highestEmp?.employee_id) {
      const match = highestEmp.employee_id.match(/EMP-(\d+)/);
      if (match) nextEmpNum = parseInt(match[1], 10) + 1;
    }

    for (const u of users) {
      if (!u.primaryEmail) continue;

      // Check if exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, employee_id')
        .eq('email', u.primaryEmail)
        .maybeSingle();

      if (!existing) {
        // Create new user profile in DB (Syncing)
        // Note: Supabase Auth will still need to handle them if they login via NextAuth and we rely on Supabase trigger,
        // BUT we are shifting to NextAuth. So we insert directly into profiles.
        const newEmpId = `EMP-${nextEmpNum.toString().padStart(3, '0')}`;
        
        await supabase.from('profiles').insert({
          email: u.primaryEmail,
          full_name: u.name?.fullName || u.primaryEmail.split('@')[0],
          google_user_id: u.id,
          employee_id: newEmpId,
          role: 'employee',
          designation: u.organizations?.[0]?.title || 'Staff',
          is_active: !u.suspended,
        });

        nextEmpNum++;
        syncedCount++;
      } else {
        // Update existing if needed
        await supabase.from('profiles').update({
          google_user_id: u.id,
          is_active: !u.suspended,
          designation: u.organizations?.[0]?.title || undefined,
        }).eq('email', u.primaryEmail);
      }
    }

    return NextResponse.json({ success: true, message: `Successfully synced ${syncedCount} new employees.` });
  } catch (error: any) {
    console.error('Workspace sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
