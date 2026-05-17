"use server"

import { NextResponse } from "next/server"

/**
 * GET /api/setup-storage
 * 
 * Returns the SQL that needs to be run in the Supabase SQL Editor to
 * create the 'avatars' storage bucket and its RLS policies.
 * 
 * Steps:
 *   1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
 *   2. Select your project
 *   3. Go to SQL Editor
 *   4. Paste the SQL from this endpoint and click "Run"
 */
export async function GET() {
  const sql = `
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "avatar_read_all" ON storage.objects;
CREATE POLICY "avatar_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_upload_own" ON storage.objects;
CREATE POLICY "avatar_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
`.trim()

  return NextResponse.json({
    message: "Run this SQL in your Supabase Dashboard → SQL Editor to fix the 'Bucket not found' error.",
    sql,
  })
}
