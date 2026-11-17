import { File, Paths } from 'expo-file-system';

/** Copies a picked photo into app storage so the bubble can read it later. */
export async function saveCompanionPhoto(sourceUri: string): Promise<string> {
  const dest = new File(Paths.document, 'companion-avatar.jpg');
  if (dest.exists) dest.delete();
  const source = new File(sourceUri);
  await source.copy(dest);
  return dest.uri;
}
