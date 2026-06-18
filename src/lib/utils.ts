import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines tailwind and conditional classes cleanly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Google Drive link to its web preview equivalent.
 * This conversion allows public viewing of files shared as "Anyone with the link can view"
 * without prompting students to log into Google/Drive accounts.
 */
export function formatDriveUrl(url: string): string {
  if (!url) return '';
  
  // Clean up whitespace
  const cleanUrl = url.trim();

  // Match file ID from typical Google Drive URLs
  // e.g., https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // or https://docs.google.com/file/d/FILE_ID/edit
  let fileId = '';
  const d1 = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (d1 && d1[1]) {
    fileId = d1[1];
  } else {
    // Or open?id=FILE_ID
    const d2 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (d2 && d2[1]) {
      fileId = d2[1];
    }
  }

  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return cleanUrl;
}
