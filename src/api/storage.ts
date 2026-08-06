import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

// Supabase Storage bucket name (create this in your Supabase dashboard:
//   Storage → New bucket → name: "receipts" → Public: false)
const BUCKET = 'receipts';

// Separate public bucket for user avatars.
// Create in Supabase dashboard: Storage → New bucket → name: "avatars" → Public: ON
const AVATAR_BUCKET = 'avatars';

/**
 * Uploads a local image URI to Supabase Storage under
 * receipts/{tripId}/{expenseId}/{timestamp}.jpg
 *
 * Returns the public URL of the uploaded file.
 *
 * Why FormData + fetch instead of supabase.storage.from().upload()?
 * The JS Supabase client's upload() expects a Blob/File which isn't
 * natively available in React Native. Using fetch + FormData is the
 * standard workaround for RN — the raw multipart upload goes directly
 * to the Storage REST endpoint.
 */
export const uploadReceipt = async (
  localUri: string,
  tripId: string,
  expenseId: string
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const timestamp = Date.now();
  const filePath  = `${tripId}/${expenseId}/${timestamp}.jpg`;
  const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`;

  const response = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    if (response.body && (response.body.includes('Bucket not found') || response.body.includes('not_found'))) {
      throw new Error("Storage bucket 'receipts' does not exist. Please create the 'receipts' bucket in your Supabase Dashboard under Storage.");
    }
    throw new Error(`Upload failed (${response.status}): ${response.body}`);
  }

  // Build a signed URL (1 year TTL) so the receipt is viewable in-app
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message ?? 'Could not generate receipt URL.');
  }

  return signedData.signedUrl;
};

/**
 * Deletes a receipt from Supabase Storage given its full signed or public URL.
 * Extracts the path component after the bucket name from the URL.
 */
export const deleteReceiptByUrl = async (receiptUrl: string): Promise<void> => {
  // Extract the storage path from the URL
  // Signed URL format: .../storage/v1/object/sign/receipts/tripId/expId/ts.jpg?token=...
  // Public  URL format: .../storage/v1/object/public/receipts/tripId/expId/ts.jpg
  const match = receiptUrl.match(new RegExp(`/${BUCKET}/(.+?)(?:\\?|$)`));
  if (!match?.[1]) return; // Can't parse path — silently skip

  const filePath = decodeURIComponent(match[1]);
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw new Error(error.message);
};

/**
 * Saves the receipt URL back to the expense row.
 */
export const setExpenseReceiptUrl = async (
  expenseId: string,
  receiptUrl: string | null
): Promise<void> => {
  const { error } = await (supabase.from('expenses') as any)
    .update({ receipt_url: receiptUrl })
    .eq('id', expenseId);

  if (error) throw new Error(error.message);
};

/**
 * Uploads a local image URI as the user's avatar.
 *
 * Path: avatars/{userId}.jpg — one file per user, each upload overwrites the previous.
 * The avatar bucket is PUBLIC so the URL never expires (unlike receipts which use signed URLs).
 *
 * Why overwrite instead of a timestamp suffix? Avatars don't need history, and
 * overwriting keeps storage usage minimal and the URL stable after the first set.
 */
export const uploadAvatar = async (
  localUri: string,
  userId: string
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const timestamp = Date.now();
  const filePath  = `${userId}.jpg`;
  const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}/${filePath}`;

  // x-upsert: true overwrites the existing file so the URL stays the same.
  const response = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
      'x-upsert': 'true',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Avatar upload failed (${response.status}): ${response.body}`);
  }

  // Public bucket → getPublicUrl with timestamp to break image caching
  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return `${data.publicUrl}?t=${timestamp}`;
};

/**
 * Deletes the user's avatar image from the avatars bucket.
 */
export const deleteAvatar = async (userId: string): Promise<void> => {
  const filePath = `${userId}.jpg`;
  await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);
};

