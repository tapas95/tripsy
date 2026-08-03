import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

// Supabase Storage bucket name (create this in your Supabase dashboard:
//   Storage → New bucket → name: "receipts" → Public: false)
const BUCKET = 'receipts';

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
